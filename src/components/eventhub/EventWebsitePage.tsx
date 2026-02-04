import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useEventForm } from '../../contexts/EventFormContext'
import { useWebsitePages } from '../../contexts/WebsitePagesContext'
import EventHubNavbar from './EventHubNavbar'
import EventHubSidebar from './EventHubSidebar'
import { defaultCards, ContentCard } from './EventHubContent'
import PageCreationModal, { type PageType } from '../page/PageCreationModal'
import CreateNavFolderModal from './CreateNavFolderModal'
import {
  createWebpage,
  fetchWebpages,
  fetchWebsiteIndex,
  type CreateWebpageRequest,
  type WebpageData,
  type WebsiteIndexTag
} from '../../services/webpageService'
import { publishEvent } from '../../services/eventService'
import { fetchPublicEvent } from '../../services/publicEventService'
import { fetchPublicWebpages } from '../../services/publicWebpageService'
import Button from '../ui/untitled/Button'
import { readEventStoreJSON } from '../../utils/eventLocalStore'
import { showToast } from '../../utils/toast'
import { getDefaultTemplateData } from '../../hooks/usePageManagement'
import type { NavigationFolderItem, NavigationItem, NavigationPageItem } from '../../types/navigation'
import {
  isFolder,
  isPage,
  loadNavigationConfigFromStorage,
  saveNavigationConfigToStorage,
  upsertMissingPagesToRoot
} from '../../utils/navigationTree'
import { NAV_ICON_KEYS, renderNavIcon } from '../../utils/navIcons'
import { 
  InfoCircle, 
  CodeBrowser, 
  Globe01,
  Copy01,
  Eye,
  EyeOff,
  Edit05,
  Trash01,
  Plus,
  FileSearch02
} from '@untitled-ui/icons-react'

interface EventWebsitePageProps {
  onBackClick?: () => void
  userAvatarUrl?: string
  hideNavbarAndSidebar?: boolean
}

const EventWebsitePage: React.FC<EventWebsitePageProps> = ({
  onBackClick,
  userAvatarUrl,
  hideNavbarAndSidebar = false
}) => {
  const { eventData, createdEvent } = useEventForm()
  const { pages, addPage, deletePage, initializePages } = useWebsitePages()

  // Prioritize createdEvent data from API, fallback to eventData from form
  // Use useMemo to ensure we always get the latest value and prevent stale reads
  const displayEventName = useMemo(() => {
    const name = createdEvent?.eventName || eventData?.eventName
    return name
  }, [createdEvent?.eventName, createdEvent?.uuid, eventData?.eventName])
  const [activeSubItem, setActiveSubItem] = useState('website-pages')
  const [showPageCreationModal, setShowPageCreationModal] = useState(false)
  const [showCreateNavFolderModal, setShowCreateNavFolderModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [webpages, setWebpages] = useState<WebpageData[]>([])
  const [isLoadingWebpages, setIsLoadingWebpages] = useState(false)
  const [indexWebpages, setIndexWebpages] = useState<WebpageData[]>([])
  const [indexSpeakerTags, setIndexSpeakerTags] = useState<WebsiteIndexTag[]>([])
  const [indexAttendeeTags, setIndexAttendeeTags] = useState<WebsiteIndexTag[]>([])
  const [isLoadingIndexWebpages, setIsLoadingIndexWebpages] = useState(false)
  const [navigationPreviewActive, setNavigationPreviewActive] = useState<string | null>(null)
  const [iconPickerForNavId, setIconPickerForNavId] = useState<string | null>(null)
  const [iconPickerQuery, setIconPickerQuery] = useState('')
  const [iconPickerAnchor, setIconPickerAnchor] = useState<{ top: number; left: number; width: number } | null>(null)
  const iconPopoverRef = useRef<HTMLDivElement | null>(null)
  const ensuredWelcomeWebpageForEventRef = useRef<string | null>(null)
  const [navigationOrderIds, setNavigationOrderIds] = useState<string[]>([])
  const [draggingNavId, setDraggingNavId] = useState<string | null>(null)
  const [dragOverNavId, setDragOverNavId] = useState<string | null>(null)
  const [navTreeRefresh, setNavTreeRefresh] = useState(0)
  const [isPublishing, setIsPublishing] = useState(false)

  const closeIconPicker = useCallback(() => {
    setIconPickerForNavId(null)
    setIconPickerQuery('')
    setIconPickerAnchor(null)
  }, [])

  // Close icon popover on outside click / Esc
  useEffect(() => {
    if (!iconPickerForNavId) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeIconPicker()
    }

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (iconPopoverRef.current && iconPopoverRef.current.contains(target)) return
      closeIconPicker()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onMouseDown)
    }
  }, [iconPickerForNavId, closeIconPicker])

  const eventUuidForNavigation = useMemo(
    () => createdEvent?.uuid ?? localStorage.getItem('currentEventUuid') ?? '',
    [createdEvent?.uuid]
  )

  const getNavigationOrderStorageKey = (eventUuid: string) => `navigation-order-${eventUuid}`
  const getNavigationHiddenStorageKey = (eventUuid: string) => `navigation-hidden-${eventUuid}`
  const getNavigationTreeStorageKey = (eventUuid: string) => `navigation-tree-${eventUuid}`

  const [hiddenNavIds, setHiddenNavIds] = useState<Set<string>>(() => new Set())

  // Load hidden menu items per event
  useEffect(() => {
    if (!eventUuidForNavigation) return
    try {
      const raw = localStorage.getItem(getNavigationHiddenStorageKey(eventUuidForNavigation))
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) {
        setHiddenNavIds(new Set(parsed.map(String)))
      } else {
        setHiddenNavIds(new Set())
      }
    } catch {
      setHiddenNavIds(new Set())
    }
  }, [eventUuidForNavigation])

  const toggleHiddenNavId = useCallback(
    (id: string) => {
      if (!eventUuidForNavigation) return
      setHiddenNavIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        try {
          localStorage.setItem(getNavigationHiddenStorageKey(eventUuidForNavigation), JSON.stringify(Array.from(next)))
        } catch {
          // ignore
        }
        return next
      })
    },
    [eventUuidForNavigation]
  )

  const systemItemsForNavigation = useMemo(() => {
    const eventUuid = eventUuidForNavigation
    if (!eventUuid) return [] as Array<{ id: string; label: string; kind: 'system' }>
    const speakers = readEventStoreJSON<any[]>(eventUuid, 'speakers', [])
    const attendees = readEventStoreJSON<any[]>(eventUuid, 'attendees', [])
    const organizations = readEventStoreJSON<any[]>(eventUuid, 'organizations', [])
    const sessionsMap = readEventStoreJSON<Record<string, any[]>>(eventUuid, 'sessions', {})
    const sessionsCount = Object.values(sessionsMap || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)

    const hasNamedItem = (arr: any[], fields: string[]) => {
      return (Array.isArray(arr) ? arr : []).some((x) =>
        fields.some((f) => String((x as any)?.[f] ?? '').trim().length > 0)
      )
    }

    // Only show system pages when there is real data (not placeholders)
    const hasOrganizations = hasNamedItem(organizations, ['name', 'title', 'company', 'organization', 'organisation'])
    const hasSpeakers = hasNamedItem(speakers, ['name', 'email'])
    const hasAttendees = hasNamedItem(attendees, ['name', 'email'])
    // For schedule, require sessions (a schedule record can exist without any sessions)
    const hasSchedule = sessionsCount > 0

    const out: Array<{ id: string; label: string; kind: 'system' }> = []
    if (hasOrganizations) out.push({ id: 'system:organizations', label: 'Organizations', kind: 'system' })
    if (hasSpeakers) out.push({ id: 'system:speakers', label: 'Speakers', kind: 'system' })
    if (hasAttendees) out.push({ id: 'system:attendees', label: 'Attendees', kind: 'system' })
    if (hasSchedule) out.push({ id: 'system:schedule', label: 'Schedule', kind: 'system' })
    return out
  }, [eventUuidForNavigation])

  // Load + reconcile persisted navigation order per event (include speaker/attendee tag ids and folder ids)
  const speakerTagIds = useMemo(
    () => indexSpeakerTags.map((t) => `speaker-tag:${t.uuid}`),
    [indexSpeakerTags]
  )
  const attendeeTagIds = useMemo(
    () => indexAttendeeTags.map((t) => `attendee-tag:${t.uuid}`),
    [indexAttendeeTags]
  )
  useEffect(() => {
    if (!eventUuidForNavigation) return
    const availableIds = [
      ...systemItemsForNavigation.map((i) => i.id),
      ...(indexSpeakerTags.length > 0 ? ['folder:speaker', ...speakerTagIds] : []),
      ...(indexAttendeeTags.length > 0 ? ['folder:attendees', ...attendeeTagIds] : []),
      ...indexWebpages.map((w) => w.uuid).filter(Boolean)
    ]
    if (availableIds.length === 0) {
      setNavigationOrderIds([])
      return
    }

    let stored: unknown = null
    try {
      const raw = localStorage.getItem(getNavigationOrderStorageKey(eventUuidForNavigation))
      stored = raw ? JSON.parse(raw) : null
    } catch {
      stored = null
    }

    const storedIds = Array.isArray(stored) ? (stored as unknown[]).map(String) : []
    const reconciled = [
      ...storedIds.filter((id) => availableIds.includes(id)),
      ...availableIds.filter((id) => !storedIds.includes(id))
    ]

    setNavigationOrderIds((prev) => {
      const prevNormalized = prev.length ? prev : []
      if (
        prevNormalized.length === reconciled.length &&
        prevNormalized.every((id, idx) => id === reconciled[idx])
      ) {
        return prevNormalized
      }
      return reconciled
    })
  }, [eventUuidForNavigation, indexWebpages, indexSpeakerTags, indexAttendeeTags, speakerTagIds, attendeeTagIds, systemItemsForNavigation])

  const orderedWebpagesForNavigation = useMemo(() => {
    if (indexWebpages.length === 0) return []
    const byId = new Map(indexWebpages.map((w) => [w.uuid, w]))
    const baseIds = navigationOrderIds.length ? navigationOrderIds : indexWebpages.map((w) => w.uuid)
    const ordered = baseIds.map((id) => byId.get(id)).filter(Boolean) as WebpageData[]
    const missing = indexWebpages.filter((w) => !baseIds.includes(w.uuid))
    return [...ordered, ...missing]
  }, [indexWebpages, navigationOrderIds])

  const navigationTreeItems = useMemo(() => {
    const eventUuid = eventUuidForNavigation
    if (!eventUuid) return [] as NavigationItem[]

    const treeKey = getNavigationTreeStorageKey(eventUuid)
    const slugify = (s: string) =>
      String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page'

    const systemPages: NavigationPageItem[] = systemItemsForNavigation.map((p) => ({
      id: p.id,
      type: 'page',
      title: p.label,
      slug: p.id,
      pageId: p.id
    }))

    const speakerTagPages: NavigationPageItem[] = indexSpeakerTags.map((t) => ({
      id: `speaker-tag:${t.uuid}`,
      type: 'page' as const,
      title: t.name,
      slug: slugify(t.name),
      pageId: `speaker-tag:${t.uuid}`
    }))
    const speakerFolder: NavigationFolderItem | null =
      speakerTagPages.length > 0
        ? { id: 'folder:speaker', type: 'folder', title: 'Speaker', children: speakerTagPages }
        : null

    const attendeeTagPages: NavigationPageItem[] = indexAttendeeTags.map((t) => ({
      id: `attendee-tag:${t.uuid}`,
      type: 'page' as const,
      title: t.name,
      slug: slugify(t.name),
      pageId: `attendee-tag:${t.uuid}`
    }))
    const attendeeFolder: NavigationFolderItem | null =
      attendeeTagPages.length > 0
        ? { id: 'folder:attendees', type: 'folder', title: 'Attendees', children: attendeeTagPages }
        : null

    const webpagePages: NavigationPageItem[] = orderedWebpagesForNavigation.map((w) => ({
      id: String(w.uuid),
      type: 'page',
      title: w.name,
      slug: String(w.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      pageId: String(w.uuid)
    }))

    const defaultItems: NavigationItem[] = [
      ...systemPages,
      ...(speakerFolder ? [speakerFolder] : []),
      ...(attendeeFolder ? [attendeeFolder] : []),
      ...webpagePages
    ]
    // Only upsert system + webpages to root; never add speaker-tag/attendee-tag pages to root (they belong in folders)
    const defaultFlatPagesForUpsert: NavigationPageItem[] = [...systemPages, ...webpagePages]
    const allowedSystemIds = new Set(systemPages.map((p) => String(p.pageId)))

    const pruneUnavailableSystemPages = (items: NavigationItem[]): NavigationItem[] => {
      const out: NavigationItem[] = []
      for (const it of items) {
        if (isFolder(it)) {
          out.push({ ...it, children: pruneUnavailableSystemPages(it.children || []) })
          continue
        }
        const pageId = String((it as any)?.pageId ?? '')
        if (pageId.startsWith('system:') && !allowedSystemIds.has(pageId)) continue
        out.push(it)
      }
      return out
    }

    const hasFolder = (items: NavigationItem[], folderId: string) =>
      items.some((it) => (it as any)?.id === folderId)

    const insertFoldersIfMissing = (
      items: NavigationItem[],
      speaker: NavigationFolderItem | null,
      attendee: NavigationFolderItem | null
    ): NavigationItem[] => {
      let out = items
      const systemCount = systemPages.length
      if (speaker && !hasFolder(out, 'folder:speaker')) {
        out = [...out.slice(0, systemCount), speaker, ...out.slice(systemCount)]
      }
      if (attendee && !hasFolder(out, 'folder:attendees')) {
        const insertAfter = out.findIndex((it) => (it as any)?.id === 'folder:speaker')
        const idx = insertAfter >= 0 ? insertAfter + 1 : systemCount
        out = [...out.slice(0, idx), attendee, ...out.slice(idx)]
      }
      return out
    }

    // Sync folder children with website index so all published tags show (stored config may have stale single child)
    const syncFolderChildrenWithIndex = (items: NavigationItem[]): NavigationItem[] =>
      items.map((it) => {
        if (!isFolder(it)) return it
        if (it.id === 'folder:speaker' && speakerFolder) return { ...it, children: speakerFolder.children }
        if (it.id === 'folder:attendees' && attendeeFolder) return { ...it, children: attendeeFolder.children }
        return it
      })

    // Remove speaker-tag/attendee-tag pages that were saved at root (they belong only inside folders)
    const removeRootLevelTagPages = (items: NavigationItem[]): NavigationItem[] =>
      items.filter((it) => {
        if (isFolder(it)) return true
        const pageId = String((it as any)?.pageId ?? '')
        return !pageId.startsWith('speaker-tag:') && !pageId.startsWith('attendee-tag:')
      })

    const stored = loadNavigationConfigFromStorage(treeKey)
    const baseItems =
      stored?.items && Array.isArray(stored.items)
        ? (stored.items as NavigationItem[])
        : defaultItems

    const prunedBaseItems = pruneUnavailableSystemPages(baseItems)
    const withoutRootTagPages = removeRootLevelTagPages(prunedBaseItems)
    let reconciled = upsertMissingPagesToRoot(withoutRootTagPages, defaultFlatPagesForUpsert)
    reconciled = insertFoldersIfMissing(reconciled, speakerFolder, attendeeFolder)
    reconciled = syncFolderChildrenWithIndex(reconciled)

    try {
      saveNavigationConfigToStorage(treeKey, reconciled)
    } catch {
      // ignore
    }

    return reconciled
  }, [
    eventUuidForNavigation,
    systemItemsForNavigation,
    orderedWebpagesForNavigation,
    indexSpeakerTags,
    indexAttendeeTags,
    navTreeRefresh
  ])

  const moveNavigationTreeItem = useCallback(
    (dragId: string, targetId: string) => {
      const eventUuid = eventUuidForNavigation
      if (!eventUuid) return
      if (!dragId || !targetId || dragId === targetId) return

      const treeKey = getNavigationTreeStorageKey(eventUuid)
      const stored = loadNavigationConfigFromStorage(treeKey)
      const current =
        stored?.items && Array.isArray(stored.items)
          ? (stored.items as NavigationItem[])
          : navigationTreeItems

      const fromIndex = current.findIndex((it) => it.id === dragId)
      const toIndex = current.findIndex((it) => it.id === targetId)
      if (fromIndex === -1 || toIndex === -1) return

      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)

      try {
        saveNavigationConfigToStorage(treeKey, next)
      } catch {
        // ignore
      }
      setNavTreeRefresh((x) => x + 1)
    },
    [eventUuidForNavigation, navigationTreeItems]
  )

  // Fetch website index pages (used in Navigation tab)
  const loadWebsiteIndexPages = useCallback(async () => {
    if (!createdEvent?.uuid) {
      setIndexWebpages([])
      return
    }

    setIsLoadingIndexWebpages(true)
    try {
      const indexData = await fetchWebsiteIndex(createdEvent.uuid)
      const serverWebpages = indexData.webpages ?? []
      setIndexWebpages(serverWebpages)
      setIndexSpeakerTags(indexData.speaker_tags ?? [])
      setIndexAttendeeTags(indexData.attendee_tags ?? [])
    } catch (e) {
      console.error('❌ [EventWebsitePage] Error fetching website index:', e)
      setIndexWebpages([])
      setIndexSpeakerTags([])
      setIndexAttendeeTags([])
    } finally {
      setIsLoadingIndexWebpages(false)
    }
  }, [createdEvent?.uuid])

  useEffect(() => {
    if (activeSubItem !== 'website-header') return
    loadWebsiteIndexPages()
  }, [activeSubItem, loadWebsiteIndexPages])

  // Fetch webpages for event website listing from WEBPAGE.LIST endpoint
  const loadWebpages = useCallback(async () => {
    if (!createdEvent?.uuid) {
      // Clear webpages when event UUID is not available to prevent stale data
      setWebpages([])
      return
    }

    setIsLoadingWebpages(true)
    try {
      console.log('📄 [EventWebsitePage] Fetching webpages for event:', createdEvent.uuid)
      const serverWebpages = await fetchWebpages(createdEvent.uuid)
      console.log('📄 [EventWebsitePage] Fetched webpages:', serverWebpages.length, 'pages')

      // If the backend has no Welcome page yet, auto-create it so it appears in listing by default.
      // This keeps "default template" behavior consistent with the listing view.
      const isScratchMode = (() => {
        try {
          const urlParams = new URLSearchParams(window.location.search)
          return (
            urlParams.get('mode') === 'blank' ||
            localStorage.getItem('create-from-scratch') === 'true'
          )
        } catch {
          return false
        }
      })()

      const hasWelcomeOnServer = serverWebpages.some((w) => {
        const name = String((w as any)?.name ?? '').trim().toLowerCase()
        const slug = String((w as any)?.slug ?? '').trim().toLowerCase()
        return name === 'welcome' || slug === 'welcome'
      })

      if (
        !isScratchMode &&
        !hasWelcomeOnServer &&
        ensuredWelcomeWebpageForEventRef.current !== createdEvent.uuid
      ) {
        ensuredWelcomeWebpageForEventRef.current = createdEvent.uuid
        try {
          const welcomeName = 'Welcome'
          const slug = 'welcome'
          const pageId = 'welcome'

          const templateEventData = {
            eventName: (createdEvent as any)?.eventName,
            startDate: (createdEvent as any)?.startDate,
            endDate: (createdEvent as any)?.endDate,
            location: (createdEvent as any)?.location
          }

          const puckData = getDefaultTemplateData(welcomeName, templateEventData)

          const request: CreateWebpageRequest = {
            event_uuid: createdEvent.uuid,
            name: welcomeName,
            content: {
              [pageId]: {
                title: welcomeName,
                slug,
                data: {
                  [slug]: puckData
                }
              }
            }
          }

          await createWebpage(request)

          // Refresh list so the newly created Welcome shows in listing immediately.
          const refreshed = await fetchWebpages(createdEvent.uuid)
          setWebpages(refreshed ?? [])
          // Seed index pages list too (Navigation tab) if it hasn't been loaded yet.
          setIndexWebpages((prev) => (prev.length ? prev : (refreshed ?? [])))
          return
        } catch (e) {
          // Don't block listing; just fall back to what the server returned.
          console.error('❌ [EventWebsitePage] Failed to auto-create Welcome webpage:', e)
          showToast.error('Failed to create default Welcome page')
        }
      }

      setWebpages(serverWebpages)
      // Seed index pages list too (Navigation tab) if it hasn't been loaded yet.
      setIndexWebpages((prev) => (prev.length ? prev : serverWebpages))
    } catch (error) {
      console.error('? [EventWebsitePage] Error fetching website index:', error)
      // Error is handled by errorHandler
    } finally {
      setIsLoadingWebpages(false)
    }
  }, [createdEvent?.uuid])

  useEffect(() => {
    loadWebpages()
  }, [loadWebpages])

  // Listen for webpage-saved events to refresh the list and navigation (e.g. after Build page checkbox)
  useEffect(() => {
    const handleWebpageSaved = (event: CustomEvent) => {
      const { eventUuid } = event.detail
      if (eventUuid === createdEvent?.uuid) {
        loadWebpages()
        loadWebsiteIndexPages()
      }
    }

    window.addEventListener('webpage-saved', handleWebpageSaved as EventListener)
    return () => {
      window.removeEventListener('webpage-saved', handleWebpageSaved as EventListener)
    }
  }, [createdEvent?.uuid, loadWebpages, loadWebsiteIndexPages])

  // Initialize pages based on template selection on mount
  useEffect(() => {
    // Check if we're creating from scratch (check URL param as flag may be cleared)
    const urlParams = new URLSearchParams(window.location.search)
    const isFromScratch = urlParams.get('mode') === 'blank' || 
                          localStorage.getItem('create-from-scratch') === 'true'
    
    // If creating from scratch, clear WebsitePagesContext and don't initialize
    // Pages should come from Puck's internal state (page1) only
    if (isFromScratch) {
      // Clear any existing pages in WebsitePagesContext (especially welcome pages)
      if (pages.length > 0) {
        pages.forEach(page => {
          // Delete all pages, especially welcome pages
          if (page.name?.toLowerCase() === 'welcome' || page.id?.toLowerCase() === 'welcome') {
            deletePage(page.id)
          } else {
            deletePage(page.id)
          }
        })
      }
      
      // Clear WebsitePagesContext localStorage cache
      try {
        localStorage.removeItem('website-pages')
      } catch (error) {
        console.error('Error clearing website-pages cache:', error)
      }
      
      // Initialize with only page1 for scratch mode
      if (pages.length === 0) {
        initializePages('scratch')
      }
      return
    }

    // Check if pages are already initialized (for template mode)
    if (pages.length > 0) return

    // Default template - create Welcome page
    initializePages('default-template')
  }, [pages.length, initializePages, deletePage])

  // Remove Schedule pages - only keep Welcome page
  useEffect(() => {
    const schedulePages = pages.filter(page => 
      page.name.toLowerCase() === 'schedule' || 
      (page as any).type === 'schedule'
    )
    
    if (schedulePages.length > 0) {
      schedulePages.forEach(schedulePage => {
        deletePage(schedulePage.id)
      })
    }
  }, [pages, deletePage])

  const handleSearchClick = () => {
    // TODO: Implement search functionality
  }

  const handleNotificationClick = () => {
    // TODO: Implement notification functionality
  }

  const handleProfileClick = () => {
    // TODO: Implement profile functionality
  }

  // Create sidebar items - Event Hub has sub-items, Event Website does not
  const sidebarItems = useMemo(() => {
    const eventHubSubItems = defaultCards.map((card: ContentCard) => ({
      id: card.id,
      label: card.title,
      icon: card.icon
    }))

    return [
      { id: 'overview', label: 'Overview', icon: <InfoCircle className="h-5 w-5" /> },
      { id: 'event-website', label: 'Event website', icon: <CodeBrowser className="h-5 w-5" /> },
      {
        id: 'event-hub',
        label: 'Event Hub',
        icon: <Globe01 className="h-5 w-5" />,
        subItems: eventHubSubItems
      }
    ]
  }, [])

  const handleSidebarItemClick = (itemId: string) => {
    if (hideNavbarAndSidebar) {
      return
    }
    
    // Top-level navigation items
    if (itemId === 'overview') {
      window.history.pushState({ section: 'overview' }, '', '/event/hub?section=overview')
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }
    if (itemId === 'event-website') {
      window.history.pushState({ section: 'event-website' }, '', '/event/hub?section=event-website')
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }

    if (itemId === 'event-hub') {
      window.history.pushState({}, '', '/event/hub')
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }
    
    const isCardId = defaultCards.some((card) => card.id === itemId)
    if (isCardId) {
      window.history.pushState({ section: itemId }, '', `/event/hub?section=${itemId}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }
  }

  const handlePreview = () => {
    // Navigate to preview of the first webpage
    if (orderedWebpagesForNavigation.length > 0) {
      const firstWebpage = orderedWebpagesForNavigation[0]
      window.history.pushState({}, '', `/event/website/preview/${firstWebpage.uuid}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const handlePublishWebsite = async () => {
    const eventUuid = createdEvent?.uuid ?? localStorage.getItem('currentEventUuid')
    if (!eventUuid) return

    if (isPublishing) return
    setIsPublishing(true)
    try {
      showToast.info('Publishing event…')
      await publishEvent(eventUuid)

      // Fetch website index (indexed menus) and store so published navbar can use the same order.
      try {
        const indexData = await fetchWebsiteIndex(eventUuid)
        localStorage.setItem(`website-index-${eventUuid}`, JSON.stringify(indexData))
      } catch {
        // ignore; published tab will fall back to API webpages order
      }

      // Backend may take a moment to expose the event on the public API. Wait for both event and webpages.
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
      let published = false
      const maxAttempts = 10
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          await Promise.all([
            fetchPublicEvent(eventUuid),
            fetchPublicWebpages(eventUuid)
          ])
          published = true
          break
        } catch {
          await sleep(attempt === 0 ? 500 : 1200)
        }
      }

      if (!published) {
        showToast.error(
          'Event is published, but the public site is not ready yet. Try opening the link in a minute or refresh the public tab.'
        )
        const url = `${window.location.origin}/events/${eventUuid}`
        setTimeout(() => {
          window.open(url, '_blank', 'noopener,noreferrer')
        }, 100)
        return
      }

      showToast.success('Published. Opening site…')
      const url = `${window.location.origin}/events/${eventUuid}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setIsPublishing(false)
    }
  }

  const createNavigationFolder = useCallback(
    (name: string) => {
      const eventUuid = eventUuidForNavigation
      if (!eventUuid) return

      const treeKey = getNavigationTreeStorageKey(eventUuid)
      const stored = loadNavigationConfigFromStorage(treeKey)
      const existing: NavigationItem[] =
        stored?.items && Array.isArray(stored.items) ? (stored.items as NavigationItem[]) : []

      const folder: NavigationFolderItem = {
        id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'folder',
        title: name.trim(),
        children: []
      }

      const next: NavigationItem[] = [...existing, folder]
      try {
        saveNavigationConfigToStorage(treeKey, next)
      } catch {
        // ignore
      }
      setShowCreateNavFolderModal(false)
      setNavTreeRefresh((x) => x + 1)
    },
    [eventUuidForNavigation]
  )

  const renderNavigationTab = () => {
    const eventUuid = eventUuidForNavigation
    const flatten = (list: NavigationItem[], depth = 0): Array<{ item: NavigationItem; depth: number }> => {
      const out: Array<{ item: NavigationItem; depth: number }> = []
      for (const it of list) {
        out.push({ item: it, depth })
        if (isFolder(it) && Array.isArray(it.children) && it.children.length) {
          out.push(...flatten(it.children, depth + 1))
        }
      }
      return out
    }

    const items = navigationTreeItems
    // For the editor preview, keep folders visible even if they have no children.
    // (The public website prunes empty folders, but in the editor it's useful to show them.)
    const applyHiddenKeepEmptyFolders = (list: NavigationItem[]): NavigationItem[] => {
      const out: NavigationItem[] = []
      for (const it of list) {
        if (hiddenNavIds.has(it.id)) continue
        if (isFolder(it)) {
          out.push({ ...it, children: applyHiddenKeepEmptyFolders(it.children || []) })
        } else {
          out.push(it)
        }
      }
      return out
    }
    const visibleTree = applyHiddenKeepEmptyFolders(items)
    const flat = flatten(items)
    const visibleFlat = flatten(visibleTree)

    const activeId = navigationPreviewActive ?? visibleFlat[0]?.item?.id ?? null

    const setNavItemIcon = (targetId: string, iconKey?: string) => {
      if (!eventUuid) return
      const treeKey = getNavigationTreeStorageKey(eventUuid)
      const stored = loadNavigationConfigFromStorage(treeKey)
      const current =
        stored?.items && Array.isArray(stored.items)
          ? (stored.items as NavigationItem[])
          : items

      const walk = (list: NavigationItem[]): NavigationItem[] =>
        list.map((it) => {
          if (isFolder(it)) {
            return { ...it, children: walk(it.children || []) }
          }
          if (it.id !== targetId) return it
          return { ...it, iconKey: iconKey || undefined }
        })

      const next = walk(current)
      try {
        saveNavigationConfigToStorage(treeKey, next)
      } catch {
        // ignore
      }
      setNavTreeRefresh((x) => x + 1)
    }

    const findNavItemById = (list: NavigationItem[], id: string): NavigationItem | null => {
      for (const it of list) {
        if (it.id === id) return it
        if (isFolder(it)) {
          const nested = findNavItemById(it.children || [], id)
          if (nested) return nested
        }
      }
      return null
    }

    const removeNavItemById = (
      list: NavigationItem[],
      id: string
    ): { item: NavigationItem | null; next: NavigationItem[] } => {
      let found: NavigationItem | null = null
      const next: NavigationItem[] = []
      for (const it of list) {
        if (it.id === id) {
          found = it
          continue
        }
        if (isFolder(it)) {
          const res = removeNavItemById(it.children || [], id)
          if (res.item) {
            found = res.item
            next.push({ ...it, children: res.next })
          } else {
            next.push(it)
          }
        } else {
          next.push(it)
        }
      }
      return { item: found, next }
    }

    const insertNavItemIntoFolder = (
      list: NavigationItem[],
      folderId: string,
      toInsert: NavigationItem
    ): { inserted: boolean; next: NavigationItem[] } => {
      let inserted = false
      const next = list.map((it) => {
        if (isFolder(it)) {
          if (it.id === folderId) {
            inserted = true
            return { ...it, children: [...(it.children || []), toInsert] }
          }
          const res = insertNavItemIntoFolder(it.children || [], folderId, toInsert)
          if (res.inserted) {
            inserted = true
            return { ...it, children: res.next }
          }
        }
        return it
      })
      return { inserted, next }
    }

    const moveNavPageIntoFolder = (dragId: string, folderId: string) => {
      if (!eventUuid) return
      if (!dragId || !folderId || dragId === folderId) return

      const treeKey = getNavigationTreeStorageKey(eventUuid)
      const stored = loadNavigationConfigFromStorage(treeKey)
      const current =
        stored?.items && Array.isArray(stored.items)
          ? (stored.items as NavigationItem[])
          : items

      const draggedItem = findNavItemById(current, dragId)
      if (!draggedItem || !isPage(draggedItem)) return

      const { item: removed, next: removedTree } = removeNavItemById(current, dragId)
      if (!removed) return

      const insertedRes = insertNavItemIntoFolder(removedTree, folderId, removed)
      if (!insertedRes.inserted) return

      try {
        saveNavigationConfigToStorage(treeKey, insertedRes.next)
      } catch {
        // ignore
      }
      setNavTreeRefresh((x) => x + 1)
    }

    const filteredIconKeys = (() => {
      const q = iconPickerQuery.trim().toLowerCase()
      if (!q) return NAV_ICON_KEYS
      return NAV_ICON_KEYS.filter((k) => k.toLowerCase().includes(q))
    })()

    const limitedIconKeys = filteredIconKeys.slice(0, 180)

    return (
      <div className="flex flex-col gap-6 min-h-[520px]">
        {/* List of menu items (webpages) that will appear in published navbar */}
        <div className="space-y-2 flex-1">
          <div className="text-sm font-semibold text-slate-900">Menu items</div>
          <div className="text-sm text-slate-600">
            These are the pages that will appear in the published website navbar.
          </div>

          <div className="space-y-0 border border-slate-200 rounded-lg bg-white">
            {isLoadingIndexWebpages ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <p>Loading index pages...</p>
              </div>
            ) : flat.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <p>No menu items yet. Create pages or folders to see them here.</p>
              </div>
            ) : (
              flat.map(({ item, depth }) => {
                const folder = isFolder(item)
                const page = isPage(item)
                const isSystemPage = page && String(item.pageId).startsWith('system:')
                const isWebpage = page && !isSystemPage
                const isWelcome = isWebpage && String(item.title || '').toLowerCase() === 'welcome'
                const isHidden = hiddenNavIds.has(item.id)
                const currentIcon = page ? (item as any).iconKey : undefined
                const publicUrl =
                  !eventUuid || !page
                    ? ''
                    : isWebpage
                      ? `${window.location.origin}/events/${eventUuid}/webpages/${item.pageId}`
                      : item.pageId === 'system:organizations'
                        ? `${window.location.origin}/events/${eventUuid}/organizations`
                        : item.pageId === 'system:speakers'
                          ? `${window.location.origin}/events/${eventUuid}/speakers`
                          : item.pageId === 'system:attendees'
                            ? `${window.location.origin}/events/${eventUuid}/attendees`
                            : item.pageId === 'system:schedule'
                              ? `${window.location.origin}/events/${eventUuid}/schedule`
                              : `${window.location.origin}/events/${eventUuid}/sessions`
                return (
                  <div
                    key={item.id}
                    onDragOver={(e) => {
                      // Allow dropping pages onto folders (any depth).
                      if (folder) {
                        e.preventDefault()
                        if (dragOverNavId !== item.id) setDragOverNavId(item.id)
                        return
                      }
                      // Keep root reordering behavior.
                      if (depth !== 0) return
                      e.preventDefault()
                      if (dragOverNavId !== item.id) setDragOverNavId(item.id)
                    }}
                    onDragLeave={() => {
                      setDragOverNavId((prev) => (prev === item.id ? null : prev))
                    }}
                    onDrop={(e) => {
                      // Dropping a PAGE onto a FOLDER moves the page into that folder.
                      if (folder) {
                        e.preventDefault()
                        if (draggingNavId) moveNavPageIntoFolder(draggingNavId, item.id)
                        setDraggingNavId(null)
                        setDragOverNavId(null)
                        return
                      }

                      // Otherwise, only support root reordering (existing behavior).
                      if (depth !== 0) return
                      e.preventDefault()
                      if (draggingNavId) moveNavigationTreeItem(draggingNavId, item.id)
                      setDraggingNavId(null)
                      setDragOverNavId(null)
                    }}
                    className={[
                      'flex items-center justify-between gap-3 py-2 px-4 border-b border-slate-200 last:border-b-0 transition-colors',
                      dragOverNavId === item.id ? 'bg-violet-50' : 'hover:bg-slate-50'
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3 min-w-0" style={{ paddingLeft: depth * 16 }}>
                      <span
                        className="text-slate-400 cursor-grab select-none"
                        aria-hidden="true"
                        draggable
                        onDragStart={(e) => {
                          setDraggingNavId(item.id)
                          try {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', item.id)
                          } catch {
                            // ignore
                          }
                        }}
                        onDragEnd={() => {
                          setDraggingNavId(null)
                          setDragOverNavId(null)
                        }}
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
                        </svg>
                      </span>
                      {page ? (
                        <span className={`shrink-0 ${isHidden ? 'text-slate-300' : 'text-slate-500'}`} aria-hidden="true">
                          {renderNavIcon(currentIcon, 'h-4 w-4')}
                        </span>
                      ) : null}
                      <span className={`text-sm font-medium capitalize truncate ${isHidden ? 'text-slate-400' : 'text-slate-900'}`}>
                        {folder ? item.title : item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {page ? (
                        <>
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={(e) => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              const popoverWidth = 380
                              const margin = 12
                              const left = Math.min(
                                Math.max(rect.left, margin),
                                window.innerWidth - popoverWidth - margin
                              )
                              const top = Math.min(rect.bottom + 8, window.innerHeight - 420)
                              setIconPickerAnchor({ top, left, width: popoverWidth })
                              setIconPickerForNavId(item.id)
                              setIconPickerQuery('')
                            }}
                            className="px-2"
                            iconLeading={renderNavIcon(currentIcon, 'h-4 w-4')}
                          >
                            {currentIcon ? 'Change icon' : 'Add icon'}
                          </Button>
                          {currentIcon ? (
                            <Button
                              variant="tertiary"
                              size="sm"
                              onClick={() => setNavItemIcon(item.id, undefined)}
                              className="px-2 text-slate-400 hover:text-red-600"
                              aria-label="Remove icon"
                            >
                              Remove
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                      <Button
                        variant="tertiary"
                        size="sm"
                        onClick={() => {
                          void publicUrl
                          toggleHiddenNavId(item.id)
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600"
                        aria-label={isHidden ? 'Show in navbar' : 'Hide from navbar'}
                        iconLeading={isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      />

                      {isWebpage ? (
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={() => handlePageAction(item.id, 'delete')}
                          className={`p-2 hover:text-red-600 ${
                            isWelcome ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-400'
                          }`}
                          aria-label="Delete"
                          disabled={isWelcome}
                          iconLeading={<Trash01 className="h-4 w-4" />}
                        />
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {iconPickerForNavId && iconPickerAnchor ? (
          <div
            className="fixed inset-0 z-[10000]"
            aria-hidden="true"
          >
            <div
              ref={iconPopoverRef}
              className="fixed rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
              style={{
                top: iconPickerAnchor.top,
                left: iconPickerAnchor.left,
                width: iconPickerAnchor.width,
                maxHeight: 420
              }}
              role="dialog"
              aria-label="Choose an icon"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">Choose an icon</div>
                <button
                  type="button"
                  onClick={closeIconPicker}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>

              <div className="mt-2">
                <input
                  value={iconPickerQuery}
                  onChange={(e) => setIconPickerQuery(e.target.value)}
                  placeholder="Search icons…"
                  className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {limitedIconKeys.length} results
                  {filteredIconKeys.length > limitedIconKeys.length ? ' (refine search)' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNavItemIcon(iconPickerForNavId, undefined)
                    closeIconPicker()
                  }}
                  className="rounded-md px-2 py-1 font-semibold text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  Remove
                </button>
              </div>

              <div className="mt-2 overflow-auto pr-1" style={{ maxHeight: 320 }}>
                <div className="grid grid-cols-4 gap-2">
                  {limitedIconKeys.map((key) => {
                    const found = flat.find((x) => x.item.id === iconPickerForNavId)
                    const isSelected =
                      isPage(found?.item as any) && (found?.item as any)?.iconKey === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setNavItemIcon(iconPickerForNavId, key)
                          closeIconPicker()
                        }}
                        className={[
                          'flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors',
                          isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'
                        ].join(' ')}
                        title={key}
                      >
                        <span className="text-slate-700">{renderNavIcon(key, 'h-5 w-5')}</span>
                        <span className="w-full truncate text-[10px] text-slate-600">{key}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Demo navbar preview: show folders with their children nested under the folder */}
        <div className="space-y-2 mt-auto">
          <div className="text-sm font-semibold text-slate-900">Preview</div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 overflow-x-auto">
              {visibleTree.length === 0 ? (
                <span className="text-sm text-slate-500">No menu items to preview.</span>
              ) : (
                visibleTree.map((item) => {
                  if (isFolder(item)) {
                    const children = item.children || []
                    return (
                      <div key={item.id} className="inline-flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-slate-500  tracking-wide">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {children.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">(empty)</span>
                          ) : (
                            children.map((child) => {
                              const isActive = child.id === activeId
                              const iconKey = isPage(child) ? (child as any).iconKey : undefined
                              return (
                                <button
                                  key={child.id}
                                  type="button"
                                  onClick={() => setNavigationPreviewActive(child.id)}
                                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    isActive
                                      ? 'bg-violet-100 text-violet-700'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    {renderNavIcon(iconKey, 'h-3.5 w-3.5')}
                                    <span>{child.title}</span>
                                  </span>
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  }
                  const isActive = item.id === activeId
                  const iconKey = isPage(item) ? (item as any).iconKey : undefined
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNavigationPreviewActive(item.id)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {renderNavIcon(iconKey, 'h-4 w-4')}
                        <span>{item.title}</span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Reusable header buttons component to avoid duplication
  const renderHeaderButtons = () => (
    <div className="flex items-center gap-3 flex-nowrap overflow-visible">
      <Button
        variant="secondary"
        size="md"
        onClick={handlePreview}
        iconLeading={<Eye className="h-4 w-4" />}
      >
        Preview
      </Button>
      <Button
        variant="primary"
        size="md"
        onClick={handlePublishWebsite}
        disabled={isPublishing}
        data-custom-publish-button="true"
        className="bg-[#6938EF] hover:bg-[#5925DC] text-white whitespace-nowrap"
        iconLeading={<Globe01 className="h-4 w-4 flex-shrink-0" />}
        aria-label="Publish"
      >
        {isPublishing ? 'Publishing...' : 'Publish'}
      </Button>
    </div>
  )

  const handleNewPage = () => {
    setShowPageCreationModal(true)
  }

  // Get page name from PageType
  const getPageNameFromType = (pageType: PageType): string => {
    const pageTypeNames: Record<PageType, string> = {
      'scratch': 'Create from scratch',
      'attendee': 'Attendee page',
      'schedule': 'Schedule',
      'html-general': 'HTML/General page',
      'folder': 'Folder',
      'organization': 'Organization page',
      'hyperlink': 'Hyperlink',
      'qr-scanner': 'App QR Scanner',
      'documents': 'Documents list',
      'gallery': 'Gallery page',
      'forms': 'Forms',
      'meeting-room': 'Meeting room'
    }
    return pageTypeNames[pageType] || 'New Page'
  }

  const handlePageTypeSelect = async (pageType: PageType) => {
    setShowPageCreationModal(false)
    
    // Create from scratch (blank editor)
    if (pageType === 'scratch') {
      const emptyPage1Data = {
        content: [],
        root: {
          props: {
            title: 'Page 1',
            pageTitle: 'Page 1'
          }
        },
        zones: {}
      }

      localStorage.setItem('create-from-scratch-page1', JSON.stringify(emptyPage1Data))
      localStorage.setItem('create-from-scratch', 'true')
      // Track where scratch flow started (for back navigation behavior)
      localStorage.setItem('create-from-scratch-origin', 'event-website')
      // Also store origin per-event to avoid cross-event/refresh issues
      try {
        const eventUuid = createdEvent?.uuid ?? localStorage.getItem('currentEventUuid')
        if (eventUuid) {
          localStorage.setItem(`create-from-scratch-origin-${eventUuid}`, 'event-website')
        }
      } catch {
        // ignore
      }

      window.history.pushState({}, '', '/event/website/editor/page1?mode=blank')
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }

    const pageName = getPageNameFromType(pageType)
    const pageId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Handle schedule page creation with special metadata
    if (pageType === 'schedule') {
      // Add Schedule page to context with correct metadata
      addPage({
        id: pageId,
        name: pageName,
        slug: pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        source: 'advanced-component',
        type: 'schedule',
        component: 'SchedulePage'
      })
      await createSchedulePage(pageId, pageName)
    } else {
      // Add other page types to context
      addPage({
        id: pageId,
        name: pageName,
        slug: pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        source: 'modal-created'
      })
      // For other page types, navigate to editor
      window.history.pushState({}, '', `/event/website/editor/${pageId}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const createSchedulePage = async (pageId: string, pageName: string) => {
    try {
      void pageId
      const schedulePageData = {
        content: [
          {
            type: 'SchedulePage',
            props: {
              title: pageName,
              events: [
                {
                  id: "1",
                  title: "Welcome presentation",
                  startTime: "08:00 AM",
                  endTime: "09:00 AM",
                  location: "Room A",
                  type: "In-Person",
                  description: "Welcome presentation for all attendees",
                  participants: "",
                  tags: "",
                  attachments: 1,
                  isCompleted: false,
                  isExpanded: false,
                  parentSessionId: undefined
                }
              ]
            },
            id: `schedule-page-${Date.now()}`
          }
        ],
        root: {
          props: {
            title: pageName,
            pageTitle: pageName,
            pageType: 'schedule'
          }
        },
        zones: {}
      }
      void schedulePageData
      
      // // Save page to server
      // const apiUrl = API_ENDPOINTS.SAVE_PAGE || '/api/save-page'
      // const response = await fetch(apiUrl, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     data: schedulePageData,
      //     filename: `${pageId}.json`
      //   })
      // })
      
      // if (response.ok) {
      //   // Navigate to editor with the new schedule page
      //   window.history.pushState({}, '', `/event/website/editor/${pageId}`)
      //   window.dispatchEvent(new PopStateEvent('popstate'))
      // } else {
      //   // Handle error
      // }
    } catch (error) {
      // Error handled silently
    }
  }

  const handlePageAction = (pageId: string, action: string) => {
    const webpage = webpages.find(w => w.uuid === pageId)
    if (!webpage) return

    // Check if this is the welcome page (cannot be deleted)
    const isFirstPage = webpage.name.toLowerCase() === 'welcome'

    switch (action) {
      case 'view':
        // Navigate to preview page
        window.history.pushState({}, '', `/event/website/preview/${pageId}`)
        window.dispatchEvent(new PopStateEvent('popstate'))
        break
      case 'edit':
        // Navigate to editor page
        window.history.pushState({}, '', `/event/website/editor/${pageId}`)
        window.dispatchEvent(new PopStateEvent('popstate'))
        break
      case 'duplicate':
        // TODO: Implement backend API call to duplicate webpage
        // duplicatePage(pageId) // This is for local pages, not backend webpages
        break
      case 'delete':
        if (isFirstPage) {
          // Show error or prevent deletion
          alert('The welcome page cannot be deleted.')
          return
        }
        setShowDeleteConfirm({ id: pageId, name: webpage.name })
        break
      default:
        break
    }
  }

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      // TODO: Implement backend API call to delete webpage
      // deletePage(showDeleteConfirm.id) // This is for local pages, not backend webpages
      // For now, remove from local state and refresh the list
      setWebpages(prev => prev.filter(w => w.uuid !== showDeleteConfirm.id))
      setShowDeleteConfirm(null)
      // TODO: Call backend API to delete webpage: deleteWebpage(showDeleteConfirm.id, createdEvent?.uuid)
    }
  }

  // Render content for embedded mode (without navbar/sidebar)
  if (hideNavbarAndSidebar) {
    return (
      <div className="w-full h-full">
        <div className="flex-1 p-8 bg-white overflow-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 w-full">
            <h1 className="text-[26px] font-bold text-primary-dark">Event website</h1>
            {renderHeaderButtons()}
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between mb-6 border-b border-slate-200">
            <div className="flex gap-6">
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setActiveSubItem('website-pages')}
                className={`pb-3 px-1 h-auto rounded-none border-b-2 transition-colors relative ${
                  activeSubItem === 'website-pages'
                    ? 'text-primary border-b-primary'
                    : 'text-slate-600 hover:text-slate-900 border-b-transparent'
                }`}
              >
                Website pages
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setActiveSubItem('website-header')}
                className={`pb-3 px-1 h-auto rounded-none border-b-2 transition-colors relative ${
                  activeSubItem === 'website-header'
                    ? 'text-primary border-b-primary'
                    : 'text-slate-600 hover:text-slate-900 border-b-transparent'
                }`}
              >
                Navigation
              </Button>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={
                activeSubItem === 'website-header'
                  ? () => setShowCreateNavFolderModal(true)
                  : handleNewPage
              }
              iconLeading={<Plus className="h-4 w-4" />}
            >
              {activeSubItem === 'website-header' ? 'New folder' : 'New page'}
            </Button>
          </div>

          {/* Content based on active tab */}
          {activeSubItem === 'website-pages' && (
            <div>
              {/* Pages List */}
              <div className="space-y-0 border border-slate-200 rounded-lg bg-white">
                {isLoadingWebpages ? (
                  <div className="flex items-center justify-center py-8 text-slate-500">
                    <p>Loading webpages...</p>
                  </div>
                ) : webpages.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-slate-500">
                    <p>No pages yet. Click "+ New Page" to create one.</p>
                  </div>
                ) : (
                  webpages.map((webpage) => {
                    const isFirstPage = webpage.name.toLowerCase() === 'welcome'
                    return (
                      <div
                        key={webpage.uuid}
                        className="flex items-center justify-between py-2 px-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-slate-900 capitalize">
                          {webpage.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handlePageAction(webpage.uuid, 'view')}
                            className="p-2 text-slate-400 hover:text-slate-600"
                            aria-label="View"
                            iconLeading={<FileSearch02 className="h-4 w-4" />}
                          />
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handlePageAction(webpage.uuid, 'edit')}
                            className="p-2 text-slate-400 hover:text-slate-600"
                            aria-label="Edit"
                            iconLeading={<Edit05 className="h-4 w-4" />}
                          />
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handlePageAction(webpage.uuid, 'duplicate')}
                            className="p-2 text-slate-400 hover:text-slate-600"
                            aria-label="Duplicate"
                            iconLeading={<Copy01 className="h-4 w-4" />}
                          />
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handlePageAction(webpage.uuid, 'delete')}
                            className={`p-2 hover:text-red-600 ${
                              isFirstPage 
                                ? 'text-slate-300 cursor-not-allowed opacity-50' 
                                : 'text-slate-400'
                            }`}
                            aria-label="Delete"
                            disabled={isFirstPage}
                            iconLeading={<Trash01 className="h-4 w-4" />}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {activeSubItem === 'website-header' && renderNavigationTab()}
        </div>

        {/* Page Creation Modal */}
        <PageCreationModal
          isVisible={showPageCreationModal}
          onClose={() => setShowPageCreationModal(false)}
          onSelect={handlePageTypeSelect}
        />

        <CreateNavFolderModal
          isVisible={showCreateNavFolderModal}
          onClose={() => setShowCreateNavFolderModal(false)}
          onConfirm={createNavigationFolder}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Page</h3>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to delete "{showDeleteConfirm.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render full page with navbar and sidebar
  return (
    <div className="h-screen bg-white">
      {/* Navbar */}
      <EventHubNavbar
        key={createdEvent?.uuid || 'no-event'} // Force re-render when event changes
        eventName={displayEventName || 'Highly important conference of 2025'}
        isDraft={true}
        onBackClick={onBackClick}
        onSearchClick={handleSearchClick}
        onNotificationClick={handleNotificationClick}
        onProfileClick={handleProfileClick}
        userAvatarUrl={userAvatarUrl}
      />

      {/* Sidebar */}
      <EventHubSidebar
        items={sidebarItems}
        activeItemId="event-website"
        onItemClick={handleSidebarItemClick}
      />

      {/* Main Content */}
      <main className="fixed left-0 right-0 top-16 bottom-0 overflow-y-auto overflow-x-hidden bg-white md:left-[250px]">
        <div className="min-w-0 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6 w-full sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-[26px] font-bold text-primary-dark">Event Website</h1>
            {renderHeaderButtons()}
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between mb-6 border-b border-slate-200">
            <div className="flex gap-6">
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setActiveSubItem('website-pages')}
                className={`pb-3 px-1 h-auto rounded-none border-b-2 transition-colors relative ${
                  activeSubItem === 'website-pages'
                    ? 'text-primary border-b-primary'
                    : 'text-slate-600 hover:text-slate-900 border-b-transparent'
                }`}
              >
                Website pages
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setActiveSubItem('website-header')}
                className={`pb-3 px-1 h-auto rounded-none border-b-2 transition-colors relative ${
                  activeSubItem === 'website-header'
                    ? 'text-primary border-b-primary'
                    : 'text-slate-600 hover:text-slate-900 border-b-transparent'
                }`}
              >
                Navigation
              </Button>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={
                activeSubItem === 'website-header'
                  ? () => setShowCreateNavFolderModal(true)
                  : handleNewPage
              }
              iconLeading={<Plus className="h-4 w-4" />}
            >
              {activeSubItem === 'website-header' ? 'New folder' : 'New page'}
            </Button>
          </div>

          {/* Content based on active tab */}
          {activeSubItem === 'website-pages' && (
            <div>
              {/* Pages List */}
              <div className="space-y-0 border border-slate-200 rounded-lg bg-white">
                {isLoadingWebpages ? (
                  <div className="flex items-center justify-center py-8 text-slate-500">
                    <p>Loading webpages...</p>
                  </div>
                ) : webpages.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-slate-500">
                    <p>No pages yet. Click "+ New Page" to create one.</p>
                  </div>
                ) : (
                  webpages.map((webpage) => {
                    const isFirstPage = webpage.name.toLowerCase() === 'welcome'
                    return (
                      <div
                        key={webpage.uuid}
                        className="flex items-center justify-between py-2 px-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-slate-900 capitalize">
                          {webpage.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handlePageAction(webpage.uuid, 'view')}
                            className="p-2 text-slate-400 hover:text-slate-600"
                            aria-label="View"
                            iconLeading={<FileSearch02 className="h-4 w-4" />}
                          />
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handlePageAction(webpage.uuid, 'edit')}
                            className="p-2 text-slate-400 hover:text-slate-600"
                            aria-label="Edit"
                            iconLeading={<Edit05 className="h-4 w-4" />}
                          />
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handlePageAction(webpage.uuid, 'duplicate')}
                            className="p-2 text-slate-400 hover:text-slate-600"
                            aria-label="Duplicate"
                            iconLeading={<Copy01 className="h-4 w-4" />}
                          />
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handlePageAction(webpage.uuid, 'delete')}
                            className={`p-2 hover:text-red-600 ${
                              isFirstPage
                                ? 'text-slate-300 cursor-not-allowed opacity-50'
                                : 'text-slate-400'
                            }`}
                            aria-label="Delete"
                            disabled={isFirstPage}
                            iconLeading={<Trash01 className="h-4 w-4" />}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {activeSubItem === 'website-header' && renderNavigationTab()}
        </div>
      </main>

      {/* Page Creation Modal */}
      <PageCreationModal
        isVisible={showPageCreationModal}
        onClose={() => setShowPageCreationModal(false)}
        onSelect={handlePageTypeSelect}
      />

      <CreateNavFolderModal
        isVisible={showCreateNavFolderModal}
        onClose={() => setShowCreateNavFolderModal(false)}
        onConfirm={createNavigationFolder}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Page</h3>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete "{showDeleteConfirm.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventWebsitePage
