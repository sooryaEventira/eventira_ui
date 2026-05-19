import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import { useWebsitePages } from '../../../contexts/WebsitePagesContext'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import { defaultCards, ContentCard } from '../EventHubContent'
import PageCreationModal, { type PageType } from '../../page/PageCreationModal'
import CreateNavFolderModal from './CreateNavFolderModal'
import {
  createWebpage,
  fetchWebsiteIndex,
  fetchNavigationContent,
  fetchWebsitePageConfigs,
  fetchWebsitePageConfigDetail,
  deleteWebpage,
  type CreateWebpageRequest,
  type WebpageData,
  type WebsiteIndexTag,
  type NavigationContentData,
  type WebsitePageConfigItem,
} from '../../../services/webpageService'
import { createNavigationFolder as createNavigationFolderApi, deleteNavigationFolder as deleteNavigationFolderApi, fetchAvailableNavigationPages, fetchEventNavigation, updateNavigationItemIcon, saveNavigation } from '../../../services/navigationService'
import { publishEvent } from '../../../services/eventService'
import { fetchPublicEvent } from '../../../services/publicEventService'
import { fetchPublicWebpages } from '../../../services/publicWebpageService'
import Button from '../../ui/untitled/Button'
import { showToast } from '../../../utils/toast'
import { getDefaultTemplateData } from '../../../hooks/usePageManagement'
import type { NavigationItem } from '../../../types/navigation'
import { isFolder, isPage } from '../../../utils/navigationTree'
import { NAV_ICON_KEYS, renderNavIcon, ICONSAX_VARIANTS, buildIconKey, parseIconKey } from '../../../utils/navIcons'
import WebsitePagesList from './WebsitePagesList'
import AddMenuItemModal from './AddMenuItemModal'
import { InfoCircle, CodeBrowser, Globe01, Trash01, ChevronDown, ChevronUp, Folder } from '@untitled-ui/icons-react'
import ConfirmDeleteModal from '../../ui/ConfirmDeleteModal'
import { Suspense, lazy } from 'react'
const UserProfilePage = lazy(() => import('../../dashboard/UserProfilePage'))
import WebsiteHeaderActions from './WebsiteHeaderActions'
import WebsiteConfigurationTab from './WebsiteConfigurationTab'
import WebsiteTabsBar from './WebsiteTabsBar'
import UnsavedNavigationModal from './UnsavedNavigationModal'

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
  const eventStatus = (createdEvent as { status?: string } | null)?.status ?? (eventData as { status?: string } | null)?.status
  const [activeSubItem, setActiveSubItem] = useState('website-pages')
  const [showPageCreationModal, setShowPageCreationModal] = useState(false)
  const [showCreateNavFolderModal, setShowCreateNavFolderModal] = useState(false)
  const [showAddMenuItemModal, setShowAddMenuItemModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [webpages, setWebpages] = useState<WebpageData[]>([])
  const [isLoadingWebpages, setIsLoadingWebpages] = useState(false)
  const [navContent, setNavContent] = useState<NavigationContentData>({ pages: [], participant_groups: [], schedules: [] })
  const [pageConfigs, setPageConfigs] = useState<WebsitePageConfigItem[]>([])
  const [isLoadingPageConfigs, setIsLoadingPageConfigs] = useState(false)
  const [indexWebpages, setIndexWebpages] = useState<WebpageData[]>([])
  const [indexSpeakerTags, setIndexSpeakerTags] = useState<WebsiteIndexTag[]>([])
  const [indexAttendeeTags, setIndexAttendeeTags] = useState<WebsiteIndexTag[]>([])
  const [isLoadingIndexWebpages, setIsLoadingIndexWebpages] = useState(false)
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false)
  const [navigationFromApi, setNavigationFromApi] = useState<NavigationItem[]>([])
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())
  const [availableNavPages, setAvailableNavPages] = useState<{ uuid: string; name: string; slug: string; is_added: boolean }[]>([])
  const [availableNavSchedules, setAvailableNavSchedules] = useState<{ uuid: string; title: string; is_added: boolean }[]>([])
  const [availableNavParticipants, setAvailableNavParticipants] = useState<{ uuid: string; name: string; is_added: boolean }[]>([])
  const [_navigationPreviewActive, setNavigationPreviewActive] = useState<string | null>(null)
  const [iconPickerForNavId, setIconPickerForNavId] = useState<string | null>(null)
  const [iconPickerQuery, setIconPickerQuery] = useState('')
  const [iconPickerVariant, setIconPickerVariant] = useState<string>('Outline')
  const [iconPickerAnchor, setIconPickerAnchor] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)
  const iconPopoverRef = useRef<HTMLDivElement | null>(null)
  const ensuredWelcomeWebpageForEventRef = useRef<string | null>(null)
  const [navigationOrderIds, setNavigationOrderIds] = useState<string[]>([])
  const [draggingNavId, setDraggingNavId] = useState<string | null>(null)
  const [dragOverNavId, setDragOverNavId] = useState<string | null>(null)
  const [dragHalf, setDragHalf] = useState<'top' | 'bottom' | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [deleteFolderCandidate, setDeleteFolderCandidate] = useState<{ id: string; name: string } | null>(null)
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)
  const [navSavedJson, setNavSavedJson] = useState<string>('[]')
  const [showUnsavedNavModal, setShowUnsavedNavModal] = useState(false)
  const [pendingNavCallback, setPendingNavCallback] = useState<(() => void) | null>(null)


const handleAddMenuItem = useCallback(
    (pageUuid: string) => {
      const page = availableNavPages.find((p) => p.uuid === pageUuid)
      if (!page || page.is_added) return

      const title = page.name || 'Untitled'
      const slug =
        (page.slug || '')
          .toString()
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'page'

      const newItem: NavigationItem = {
        id: page.uuid,
        type: 'page',
        title,
        slug,
        pageId: page.uuid,
        webpageUuid: page.uuid
      }

      const pageExistsInTree = (list: NavigationItem[], targetPageId: string): boolean => {
        for (const it of list) {
          if (isFolder(it)) {
            if (pageExistsInTree(it.children || [], targetPageId)) return true
          } else if ((it as any).pageId === targetPageId) {
            return true
          }
        }
        return false
      }

      // Append as a root-level nav item only if it doesn't already exist anywhere in the tree
      setNavigationFromApi((prev) => {
        if (pageExistsInTree(prev, page.uuid)) return prev
        return [...prev, newItem]
      })

      // Mark as added so the modal shows "Added"
      setAvailableNavPages((prev) =>
        prev.map((p) => (p.uuid === page.uuid ? { ...p, is_added: true } : p))
      )
    },
    [availableNavPages]
  )

  const handleAddSchedule = useCallback(
    (scheduleUuid: string) => {
      const schedule = availableNavSchedules.find((s) => s.uuid === scheduleUuid)
      if (!schedule || schedule.is_added) return

      const newItem: NavigationItem = {
        id: schedule.uuid,
        type: 'page',
        title: schedule.title,
        slug: schedule.uuid,
        pageId: schedule.uuid,
        webpageUuid: schedule.uuid,
        itemType: 'schedule',
      }

      setNavigationFromApi((prev) => {
        const exists = prev.some((it) => it.id === schedule.uuid)
        if (exists) return prev
        return [...prev, newItem]
      })

      setAvailableNavSchedules((prev) =>
        prev.map((s) => (s.uuid === schedule.uuid ? { ...s, is_added: true } : s))
      )
    },
    [availableNavSchedules]
  )

  const handleAddParticipant = useCallback(
    (participantUuid: string) => {
      const participant = availableNavParticipants.find((p) => p.uuid === participantUuid)
      if (!participant || participant.is_added) return

      const newItem: NavigationItem = {
        id: participant.uuid,
        type: 'page',
        title: participant.name,
        slug: participant.uuid,
        pageId: participant.uuid,
        webpageUuid: participant.uuid,
        itemType: 'participant',
      }

      setNavigationFromApi((prev) => {
        const exists = prev.some((it) => it.id === participant.uuid)
        if (exists) return prev
        return [...prev, newItem]
      })

      setAvailableNavParticipants((prev) =>
        prev.map((p) => (p.uuid === participant.uuid ? { ...p, is_added: true } : p))
      )
    },
    [availableNavParticipants]
  )

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

  // Close dropdown on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdownId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const eventUuidForNavigation = useMemo(
    () => createdEvent?.uuid ?? localStorage.getItem('currentEventUuid') ?? '',
    [createdEvent?.uuid]
  )

  const getNavigationOrderStorageKey = (eventUuid: string) => `navigation-order-${eventUuid}`
  const getNavigationHiddenStorageKey = (eventUuid: string) => `navigation-hidden-${eventUuid}`

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

  // No auto-generated system pages; navigation only shows pages from API (webpages, speaker/attendee tags from index)
  const systemItemsForNavigation = useMemo(() => [] as Array<{ id: string; label: string; kind: 'system' }>, [])

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

  const sortedWebpagesForListing = useMemo(() => webpages, [webpages])

  const moveNavigationTreeItem = useCallback(
    (dragId: string, targetId: string, insertAfter = false) => {
      if (!dragId || !targetId || dragId === targetId) return

      const removeFromTree = (
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
            const res = removeFromTree(it.children || [], id)
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

      setNavigationFromApi((prev) => {
        const { item, next } = removeFromTree(prev, dragId)
        if (!item) return prev

        const root = [...next]
        const toIndex = root.findIndex((it) => it.id === targetId)
        if (toIndex === -1) return prev

        root.splice(toIndex + (insertAfter ? 1 : 0), 0, item)
        return root
      })
    },
    []
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

 // Inside EventWebsitePage component -> loadNavigationFromApi function

const loadNavigationFromApi = useCallback(async () => {
  const eventUuid = createdEvent?.uuid
  if (!eventUuid) {
    setNavigationFromApi([])
    return
  }

  const slugify = (s: string) =>
    String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page'

  // Map navigation items from API:
  // - Deduplicate only among siblings at the same level (not globally),
  //   so a page can safely appear under multiple groups if the backend wants that.
  // - Treat *_group items as folder/group containers.
  const mapItems = (list: any[]): NavigationItem[] => {
    const out: NavigationItem[] = []
    const seenAtLevel = new Set<string>()

    for (const raw of Array.isArray(list) ? list : []) {
      const itemType = String(raw?.item_type || '').toLowerCase()
      const uuid = String(raw?.uuid ?? '').trim()
      if (!uuid || seenAtLevel.has(uuid)) continue
      seenAtLevel.add(uuid)

      const title = String(raw?.title ?? raw?.name ?? '').trim() || 'Untitled'

      // ref_uuid is the actual resource UUID (webpage/tag/schedule); uuid is the nav-item UUID
      const refUuid = String(raw?.ref_uuid ?? raw?.webpage_uuid ?? '').trim() || uuid

      // Treat folder, participant, schedule, and *_group items accordingly
      if (itemType === 'folder' || itemType.endsWith('_group')) {
        const children = mapItems(raw?.items || [])
        const folderIconKey = raw?.icon ? String(raw.icon) : undefined
        out.push({
          id: uuid,
          type: 'folder',
          title,
          children,
          originalItemType: itemType,
          iconKey: folderIconKey,
          webpageUuid: refUuid || uuid,
        } as any)
        continue
      }

      if (itemType === 'participant' || itemType === 'schedule') {
        const iconKey = raw?.icon ? String(raw.icon) : undefined
        out.push({
          id: refUuid,
          type: 'page',
          title,
          slug: refUuid,
          pageId: refUuid,
          webpageUuid: refUuid,
          itemType: itemType as 'participant' | 'schedule',
          iconKey,
        } as any)
        continue
      }

      // Default: page item
      const iconKey = raw?.icon ? String(raw.icon) : undefined
      const slugFromApi = raw?.slug != null && String(raw.slug).trim() !== '' ? String(raw.slug).trim() : ''
      const slug = slugFromApi || slugify(title)
      out.push({ id: refUuid, type: 'page', title, slug, pageId: refUuid, iconKey, webpageUuid: refUuid })
    }

    return out
  }

  const normalizeNavigationTree = (list: NavigationItem[]): NavigationItem[] => {
    return list.map((item) => {
      if (!isFolder(item)) return item

      const seenChildIds = new Set<string>()
      const seenPageKeys = new Set<string>()
      const dedupedChildren: NavigationItem[] = []

      for (const child of item.children || []) {
        if (child.id === item.id) continue
        if (seenChildIds.has(child.id)) continue
        seenChildIds.add(child.id)
        if (isFolder(child)) {
          dedupedChildren.push(child)
        } else {
          const pageId = (child as any).pageId as string | undefined
          const slug = (child as any).slug as string | undefined
          const title = child.title
          const key = pageId || slug || title
          if (!key || seenPageKeys.has(key)) continue
          seenPageKeys.add(key)
          dedupedChildren.push(child)
        }
      }

      return {
        ...item,
        children: normalizeNavigationTree(dedupedChildren)
      }
    })
  }

  // Fix items that were previously saved as item_type:'page' but are actually schedules/participants,
  // and remove stale items whose UUID no longer exists in any valid set (deleted pages/participants/schedules).
  const sanitizeNavTree = (
    items: NavigationItem[],
    allValidUuids: Set<string>,
    scheduleUuids: Set<string>,
    participantUuids: Set<string>,
  ): NavigationItem[] => {
    return items
      .filter((item) => {
        if (isFolder(item)) return true
        const uuid = (item as any).webpageUuid ?? item.id
        return allValidUuids.has(uuid)
      })
      .map((item) => {
        if (isFolder(item)) {
          return { ...item, children: sanitizeNavTree(item.children || [], allValidUuids, scheduleUuids, participantUuids) }
        }
        if (item.type === 'page' && !(item as any).itemType) {
          if (scheduleUuids.has(item.id)) return { ...item, itemType: 'schedule' } as any
          if (participantUuids.has(item.id)) return { ...item, itemType: 'participant' } as any
        }
        return item
      })
  }

  setIsLoadingNavigation(true)
  try {
    const [data, available] = await Promise.all([
      fetchEventNavigation(eventUuid),
      fetchAvailableNavigationPages(eventUuid).catch(() => ({ pages: [], schedules: [], participants: [] })),
    ])
    const pageUuids = new Set<string>(available.pages.map((p) => p.uuid))
    const scheduleUuids = new Set<string>(available.schedules.map((s) => s.uuid))
    const participantUuids = new Set<string>(available.participants.map((p) => p.uuid))
    const allValidUuids = new Set<string>([...pageUuids, ...scheduleUuids, ...participantUuids])
    const rawTree = mapItems(data.navigation || [])
    const fixedTree = sanitizeNavTree(rawTree, allValidUuids, scheduleUuids, participantUuids)
    const nextTree = normalizeNavigationTree(fixedTree)
    setNavigationFromApi(nextTree)
    setNavSavedJson(JSON.stringify(nextTree))
    setExpandedFolderIds(new Set())
  } catch (e) {
    console.error('❌ [EventWebsitePage] Error fetching navigation:', e)
    setNavigationFromApi([])
  } finally {
    setIsLoadingNavigation(false)
  }
}, [createdEvent?.uuid])

  // Load available pages for Add Menu Item modal
  useEffect(() => {
    if (!showAddMenuItemModal) return
    const eventUuid = createdEvent?.uuid
    if (!eventUuid) {
      setAvailableNavPages([])
      setAvailableNavSchedules([])
      setAvailableNavParticipants([])
      return
    }
    fetchAvailableNavigationPages(eventUuid)
      .then(({ pages, schedules, participants }) => {
        setAvailableNavPages(pages || [])
        setAvailableNavSchedules(schedules || [])
        setAvailableNavParticipants(participants || [])
      })
      .catch((e) => {
        console.error('❌ [EventWebsitePage] Error fetching available navigation pages:', e)
        setAvailableNavPages([])
        setAvailableNavSchedules([])
        setAvailableNavParticipants([])
      })
  }, [showAddMenuItemModal, createdEvent?.uuid])

  useEffect(() => {
    if (activeSubItem !== 'website-header') return
    loadWebsiteIndexPages()
    loadNavigationFromApi()
  }, [activeSubItem, loadWebsiteIndexPages, loadNavigationFromApi])

  // When switching to Navigation tab, reset preview selection to first visible item from API.
  useEffect(() => {
    if (activeSubItem !== 'website-header') return
    if (navigationFromApi.length === 0) return
    setNavigationPreviewActive((prev) => prev ?? navigationFromApi[0]?.id ?? null)
  }, [activeSubItem, navigationFromApi])

  // Fetch webpages for event website listing — single call returns pages + participant_groups + schedules
  const loadWebpages = useCallback(async () => {
    if (!createdEvent?.uuid) {
      setWebpages([])
      return
    }

    setIsLoadingWebpages(true)
    try {
      console.log('📄 [EventWebsitePage] Fetching webpages for event:', createdEvent.uuid)

      // One API call gives us pages, participant_groups, and schedules together
      const navData = await fetchNavigationContent(createdEvent.uuid)

      // Map NavContentItem pages → WebpageData, preserving any extra fields the API returns
      const mapNavPages = (pages: typeof navData.pages): WebpageData[] =>
        pages.map((p: any) => ({
          uuid: p.uuid ?? '',
          event: p.event ?? '',
          name: p.name ?? p.title ?? '',
          slug: p.slug ?? '',
          content: p.content ?? null,
          created_by: p.created_by ?? 0,
          updated_by: p.updated_by ?? 0,
          created_date: p.created_date ?? '',
          updated_date: p.updated_date ?? '',
        }))

      const serverWebpages = mapNavPages(navData.pages)
      console.log('📄 [EventWebsitePage] Fetched:', serverWebpages.length, 'pages,', navData.participant_groups.length, 'groups,', navData.schedules.length, 'schedules')

      // Set navContent immediately so participant_groups and schedules are rendered
      setNavContent(navData)

      // If the backend has no Welcome page yet, auto-create it so it appears in listing by default.
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

      const hasWelcomeOnServer = serverWebpages.some((w: WebpageData) => {
        const name = String(w?.name ?? '').trim().toLowerCase()
        const slug = String(w?.slug ?? '').trim().toLowerCase()
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

          // Refresh after creating Welcome page
          const refreshedNav = await fetchNavigationContent(createdEvent.uuid)
          const refreshed = mapNavPages(refreshedNav.pages)
          setWebpages(refreshed)
          setIndexWebpages((prev) => (prev.length ? prev : refreshed))
          setNavContent(refreshedNav)
          return
        } catch (e) {
          console.error('❌ [EventWebsitePage] Failed to auto-create Welcome webpage:', e)
          showToast.error('Failed to create default Welcome page')
        }
      }

      setWebpages(serverWebpages)
      setIndexWebpages((prev) => (prev.length ? prev : serverWebpages))
    } catch (error) {
      console.error('❌ [EventWebsitePage] Error fetching website pages:', error)
    } finally {
      setIsLoadingWebpages(false)
    }
  }, [createdEvent?.uuid])

  useEffect(() => {
    loadWebpages()
  }, [loadWebpages])

  useEffect(() => {
    if (activeSubItem === 'website-pages') {
      loadWebpages()
    }
  }, [activeSubItem])

  useEffect(() => {
    if (activeSubItem !== 'website-config') return
    const eventUuid = createdEvent?.uuid
    if (!eventUuid) {
      setPageConfigs([])
      return
    }
    let cancelled = false
    setIsLoadingPageConfigs(true)
    fetchWebsitePageConfigs(eventUuid)
      .then((rows) => {
        if (!cancelled) setPageConfigs(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (!cancelled) setPageConfigs([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPageConfigs(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeSubItem, createdEvent?.uuid])

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

  const [showProfilePage, setShowProfilePage] = useState(false)

  const handleProfileClick = () => {
    setShowProfilePage(true)
  }

  // Create sidebar items - Event Hub has sub-items, Event Website does not
  const sidebarItems = useMemo(() => {
    const eventHubSubItems = defaultCards.map((card: ContentCard) => ({
      id: card.id,
      label: card.title,
      icon: card.icon
    }))

    return [
      
      { id: 'event-website', label: 'Event website', icon: <CodeBrowser className="h-5 w-5" /> },
      {
        id: 'event-hub',
        label: 'Event Hub',
        icon: <Globe01 className="h-5 w-5" />,
        subItems: eventHubSubItems
      }
    ]
  }, [])

  const guardNavigation = (callback: () => void) => {
    if (activeSubItem === 'website-header' && hasUnsavedNavChanges) {
      setPendingNavCallback(() => callback)
      setShowUnsavedNavModal(true)
      return
    }
    callback()
  }

  const handleSidebarItemClick = (itemId: string) => {
    if (hideNavbarAndSidebar) {
      return
    }

    const navigate = () => {
      // Top-level navigation items
      if (itemId === 'summary') {
        window.history.pushState({ section: 'summary' }, '', '/event/hub?section=summary')
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
      }
    }

    guardNavigation(navigate)
  }
  

  const handlePreview = () => {
    // Navigate to preview of the first webpage
    if (orderedWebpagesForNavigation.length > 0) {
      const firstWebpage = orderedWebpagesForNavigation[0]
      window.history.pushState({}, '', `/event/website/preview/${firstWebpage.uuid}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const handlePublishWebsite = async (skipGuard = false) => {
    if (!skipGuard && activeSubItem === 'website-header' && hasUnsavedNavChanges) {
      setPendingNavCallback(() => () => handlePublishWebsite(true))
      setShowUnsavedNavModal(true)
      return
    }

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

  const hasUnsavedNavChanges = JSON.stringify(navigationFromApi) !== navSavedJson

  const handleTabSwitch = (tabId: string) => {
    guardNavigation(() => setActiveSubItem(tabId))
  }

  const handleDiscardNavChanges = () => {
    loadNavigationFromApi()
    setShowUnsavedNavModal(false)
    const cb = pendingNavCallback
    setPendingNavCallback(null)
    cb?.()
  }

  const handlePublishAndSwitch = async () => {
    setShowUnsavedNavModal(false)
    const cb = pendingNavCallback
    setPendingNavCallback(null)
    const eventUuid = createdEvent?.uuid ?? localStorage.getItem('currentEventUuid') ?? ''
    if (eventUuid) {
      try {
        await saveNavigation(eventUuid, navigationFromApi)
        setNavSavedJson(JSON.stringify(navigationFromApi))
        showToast.success('Navigation saved.')
      } catch (e: any) {
        showToast.error(e?.message ?? 'Failed to save navigation.')
      }
    }
    cb?.()
  }

  const createNavigationFolder = useCallback(
    async (name: string) => {
      const eventUuid = createdEvent?.uuid
      if (!eventUuid) return
      try {
        await createNavigationFolderApi(eventUuid, name)
        showToast.success('Folder created')
        setShowCreateNavFolderModal(false)
        await loadNavigationFromApi()
      } catch (e: any) {
        showToast.error(e?.message ? String(e.message) : 'Failed to create folder')
      }
    },
    [createdEvent?.uuid, loadNavigationFromApi]
  )

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

  const removeNavItemLocally = useCallback((id: string) => {
    if (!id) return
    setNavigationFromApi((prev) => removeNavItemById(prev, id).next)
    setHiddenNavIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setNavigationPreviewActive((current) => (current === id ? null : current))
  }, [setHiddenNavIds])

  const renderConfigurationTab = () => (
    <WebsiteConfigurationTab
      pageConfigs={pageConfigs}
      isLoading={isLoadingPageConfigs}
      onConfigure={handleConfigGearClick}
    />
  )

  const renderNavigationTab = () => {
    const eventUuid = eventUuidForNavigation
    const flatten = (
      list: NavigationItem[],
      depth = 0,
      parentId: string | null = null,
      parentIsGroup = false
    ): Array<{ item: NavigationItem; depth: number; parentId: string | null; parentIsGroup: boolean }> => {
      const out: Array<{ item: NavigationItem; depth: number; parentId: string | null; parentIsGroup: boolean }> = []
      for (const it of list) {
        out.push({ item: it, depth, parentId, parentIsGroup })

        if (isFolder(it) && Array.isArray(it.children) && it.children.length && expandedFolderIds.has(it.id)) {
          // Prevent folder appearing as its own child (e.g. group name === item name causing duplicate render).
          // Deduplicate by id so the same node is never shown twice when expand/collapse or API returns duplicates.
          const seenChildIds = new Set<string>()
          const seenChildKeys = new Set<string>()
          const dedupedChildren = (it.children || []).filter((child) => {
            if (child.id === it.id) return false
            if (seenChildIds.has(child.id)) return false
            seenChildIds.add(child.id)
            let key: string | undefined
            if (isFolder(child)) {
              key = `folder:${child.id}`
            } else {
              const pageId = (child as any).pageId as string | undefined
              const slug = (child as any).slug as string | undefined
              const title = child.title
              key = `page:${pageId || slug || title}`
            }
            if (!key || seenChildKeys.has(key)) return false
            seenChildKeys.add(key)
            return true
          })

          const isGroupFolder = String((it as any).originalItemType ?? 'folder').endsWith('_group')
          out.push(...flatten(dedupedChildren, depth + 1, it.id, isGroupFolder))
        }
      }
      return out
    }

    const items = navigationFromApi
    const flat = flatten(items)


    const setNavItemIcon = async (targetId: string, iconKey?: string) => {
      if (!eventUuid) return
      const walk = (list: NavigationItem[]): NavigationItem[] =>
        list.map((it) => {
          if (it.id === targetId) return { ...it, iconKey: iconKey || undefined } as any
          if (isFolder(it)) return { ...it, children: walk(it.children || []) }
          return it
        })
      const prev = items
      const next = walk(prev)
      setNavigationFromApi(next)

      // Detect if the target item is a child of a group folder (speaker_group, etc.)
      const findItemAndParent = (list: NavigationItem[], parent: NavigationItem | null = null): { item: NavigationItem; parent: NavigationItem | null } | null => {
        for (const it of list) {
          if (it.id === targetId) return { item: it, parent }
          if (isFolder(it)) {
            const found = findItemAndParent(it.children || [], it)
            if (found) return found
          }
        }
        return null
      }
      const found = findItemAndParent(items)
      const parentItem = found?.parent
      const isGroupChild = !!(
        parentItem &&
        isFolder(parentItem) &&
        String((parentItem as any).originalItemType ?? 'folder').endsWith('_group')
      )

      try {
        if (isGroupChild && parentItem) {
          // API: URL = parent group's nav UUID, body child_uuid = child's own UUID
          await updateNavigationItemIcon(eventUuid, parentItem.id, iconKey ?? null, targetId)
        }
        await saveNavigation(eventUuid, next)
        setNavSavedJson(JSON.stringify(next))
        await loadNavigationFromApi()
      } catch (e: any) {
        setNavigationFromApi(prev)
        showToast.error(e?.message ?? 'Failed to update icon')
      }
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

    const toggleFolderExpanded = (folderId: string) => {
      setExpandedFolderIds((prev) => {
        const next = new Set(prev)
        if (next.has(folderId)) next.delete(folderId)
        else next.add(folderId)
        return next
      })
    }

    const moveNavPageIntoFolder = (dragId: string, folderId: string) => {
      if (!eventUuid) return
      if (!dragId || !folderId || dragId === folderId) return

      const draggedItem = findNavItemById(items, dragId)
      if (!draggedItem || !isPage(draggedItem)) return

      const { item: removed, next: removedTree } = removeNavItemById(items, dragId)
      if (!removed) return

      const insertedRes = insertNavItemIntoFolder(removedTree, folderId, removed)
      if (!insertedRes.inserted) return

      setNavigationFromApi(insertedRes.next)
      setExpandedFolderIds((prev) => {
        const next = new Set(prev)
        next.add(folderId)
        return next
      })
    }

    const filteredIconKeys = (() => {
      const q = iconPickerQuery.trim().toLowerCase()
      if (!q) return NAV_ICON_KEYS
      return NAV_ICON_KEYS.filter((k) => k.toLowerCase().includes(q))
    })()

    const hasQuery = iconPickerQuery.trim().length > 0
    const limitedIconKeys = hasQuery ? filteredIconKeys : filteredIconKeys.slice(0, 200)

    return (
      <div className="flex flex-col gap-6 min-h-[520px]">
        {/* List of menu items (webpages) that will appear in published navbar */}
        <div className="space-y-2 flex-1">
          <div className="text-sm font-semibold text-slate-900">Menu items</div>
          <div className="text-sm text-slate-600">
            These are the pages that will appear in the published website navbar.
          </div>

          <div className="space-y-0 border border-slate-200 rounded-lg bg-white">
            {isLoadingNavigation || isLoadingIndexWebpages ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <p>Loading navigation...</p>
              </div>
            ) : flat.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <p>No menu items yet. Create pages or folders to see them here.</p>
              </div>
            ) : (
              flat.map(({ item, depth }, flatIndex) => {
                const folder = isFolder(item)
                const page = isPage(item)
                const isGroupFolder = folder && String((item as any).originalItemType ?? 'folder').endsWith('_group')
                const isSystemPage = page && String(item.pageId).startsWith('system:')
                const isWebpage = page && !isSystemPage
                const isWelcome = isWebpage && String(item.title || '').toLowerCase() === 'welcome'
                const isHidden = hiddenNavIds.has(item.id)
                const currentIcon = (item as any).iconKey as string | undefined
                return (
                  <div
                    key={`nav-${flatIndex}-${item.id}`}
                    onClick={() => {
                      if (folder) {
                        toggleFolderExpanded(item.id)
                      }
                    }}
                    onDragOver={(e) => {
                      if (depth !== 0 && !folder) return
                      const isGroupFolder = folder && String((item as any).originalItemType ?? 'folder').endsWith('_group')
                      if (folder && !isGroupFolder && depth !== 0) return
                      e.preventDefault()
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      const half = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom'
                      if (dragOverNavId !== item.id) setDragOverNavId(item.id)
                      if (dragHalf !== half) setDragHalf(half)
                    }}
                    onDragLeave={() => {
                      setDragOverNavId((prev) => (prev === item.id ? null : prev))
                      setDragHalf(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const isGroupFolder = folder && String((item as any).originalItemType ?? 'folder').endsWith('_group')
                      if (depth !== 0 && !folder) { setDraggingNavId(null); setDragOverNavId(null); setDragHalf(null); return }
                      if (folder && !isGroupFolder && depth !== 0) { setDraggingNavId(null); setDragOverNavId(null); setDragHalf(null); return }
                      if (draggingNavId) {
                        const draggedItem = findNavItemById(items, draggingNavId)
                        const isFolder_ = draggedItem && isFolder(draggedItem)
                        const half = dragHalf
                        if (half === 'top' || isGroupFolder || !folder || isFolder_) {
                          // Insert before (top half of any item, or group folder, or dragging a folder)
                          moveNavigationTreeItem(draggingNavId, item.id, false)
                        } else if (folder && !isGroupFolder && half === 'bottom') {
                          // Insert into user-created folder (bottom half)
                          moveNavPageIntoFolder(draggingNavId, item.id)
                        }
                      }
                      setDraggingNavId(null)
                      setDragOverNavId(null)
                      setDragHalf(null)
                    }}
                    className={[
                      'flex items-center justify-between gap-3 py-2 px-4 border-b border-slate-200 last:border-b-0 transition-colors cursor-pointer',
                      dragOverNavId === item.id && dragHalf === 'top'
                        ? 'border-t-2 border-t-violet-500 bg-slate-50'
                        : dragOverNavId === item.id && dragHalf === 'bottom' && folder && !String((item as any).originalItemType ?? 'folder').endsWith('_group')
                          ? 'bg-violet-50'
                          : dragOverNavId === item.id
                            ? 'border-b-2 border-b-violet-500 bg-slate-50'
                            : 'hover:bg-slate-50'
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3 min-w-0" style={{ paddingLeft: depth * 16 }}>
                      <span
                        className="text-slate-400 cursor-grab select-none p-1"
                        aria-hidden="true"
                        draggable
                        onClick={(e) => e.stopPropagation()}
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
                      {folder ? (
                        <span className={`shrink-0 ${isHidden ? 'text-slate-300' : 'text-slate-500'}`} aria-hidden="true">
                          {currentIcon
                            ? renderNavIcon(currentIcon, 'h-4 w-4')
                            : <Folder className="h-4 w-4" />}
                        </span>
                      ) : page ? (
                        <span className={`shrink-0 ${isHidden ? 'text-slate-300' : 'text-slate-500'}`} aria-hidden="true">
                          {renderNavIcon(currentIcon, 'h-4 w-4')}
                        </span>
                      ) : null}
                      <span className={`text-sm font-medium capitalize truncate ${isHidden ? 'text-slate-400' : 'text-slate-900'}`}>
                        {item.title}
                      </span>
                      {folder && !isGroupFolder ? (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">
                          <Folder className="h-3 w-3" />
                          folder
                        </span>
                      ) : null}
                      {folder && (item.children || []).length > 0 ? (
                        <button
                          type="button"
                          className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFolderExpanded(item.id)
                          }}
                          aria-label={expandedFolderIds.has(item.id) ? 'Collapse folder' : 'Expand folder'}
                        >
                          {expandedFolderIds.has(item.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      {(page || folder) ? (
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            const popoverWidth = 380
                            const margin = 12
                            const left = Math.min(
                              Math.max(rect.left, margin),
                              window.innerWidth - popoverWidth - margin
                            )
                            const spaceBelow = window.innerHeight - rect.bottom - margin
                            const spaceAbove = rect.top - margin
                            const useBelow = spaceBelow >= spaceAbove || spaceBelow >= 280
                            const availableHeight = useBelow ? spaceBelow : spaceAbove
                            const maxHeight = Math.min(480, Math.max(availableHeight - 8, 280))
                            const top = useBelow
                              ? rect.bottom + 8
                              : rect.top - 8 - maxHeight
                            setIconPickerAnchor({ top, left, width: popoverWidth, maxHeight })
                            setIconPickerForNavId(item.id)
                            setIconPickerQuery('')
                            setIconPickerVariant(currentIcon ? parseIconKey(currentIcon).variant : 'Linear')
                          }}
                          className="px-2"
                        >
                          {currentIcon ? 'Update icon' : 'Add icon'}
                        </Button>
                      ) : null}

                      {isWebpage ? (
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={() => removeNavItemLocally(item.id)}
                          className={`p-2 hover:text-red-600 ${
                            isWelcome ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-400'
                          }`}
                          aria-label="Delete"
                          disabled={isWelcome}
                          iconLeading={<Trash01 className="h-4 w-4" />}
                        />
                      ) : null}
                      {folder ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteFolderCandidate({ id: item.id, name: item.title || 'Untitled' })
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 rounded transition-colors"
                          aria-label="Delete folder"
                        >
                          <Trash01 className="h-4 w-4" />
                        </button>
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
              className="fixed rounded-xl border border-slate-200 bg-white p-3 shadow-xl flex flex-col"
              style={{
                top: iconPickerAnchor.top,
                left: iconPickerAnchor.left,
                width: iconPickerAnchor.width,
                maxHeight: iconPickerAnchor.maxHeight,
                overflow: 'hidden'
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

              {/* Variant tabs */}
              <div className="mt-2 flex flex-wrap gap-1">
                {ICONSAX_VARIANTS.filter((v) => v === 'Outline' || v === 'Bold').map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setIconPickerVariant(v)}
                    className={[
                      'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                      iconPickerVariant === v
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    ].join(' ')}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {hasQuery
                    ? `${limitedIconKeys.length} results`
                    : `Showing ${limitedIconKeys.length} of ${NAV_ICON_KEYS.length} — search to filter`}
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

              <div className="mt-2 overflow-auto pr-1 flex-1 min-h-0">
                <div className="grid grid-cols-4 gap-2">
                  {limitedIconKeys.map((key) => {
                    const compositeKey = buildIconKey(key, iconPickerVariant)
                    const found = flat.find((x) => x.item.id === iconPickerForNavId)
                    const isSelected = (found?.item as any)?.iconKey === compositeKey
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setNavItemIcon(iconPickerForNavId, compositeKey)
                          closeIconPicker()
                        }}
                        className={[
                          'flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors',
                          isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'
                        ].join(' ')}
                        title={`${key} (${iconPickerVariant})`}
                      >
                        <span className="text-slate-700">{renderNavIcon(compositeKey, 'h-5 w-5')}</span>
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
        {/* <div className="space-y-2 mt-auto">
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
                      <div key={item.uuid} className="inline-flex flex-col gap-1.5">
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
                  const isActive = item.uuid === activeId
                  const iconKey = isPage(item) ? (item as any).iconKey : undefined
                  return (
                    <button
                      key={item.uuid}
                      type="button"
                      onClick={() => setNavigationPreviewActive(item.uuid)}
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
        </div> */}
      </div>
    )
  }

  // Reusable header actions component to avoid duplication
  const renderHeaderButtons = () => (
    <WebsiteHeaderActions isPublishing={isPublishing} onPreview={handlePreview} onPublish={() => handlePublishWebsite()} />
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
      
  
    } catch (error) {
      // Error handled silently
    }
  }

  const handleConfigGearClick = async (
    configUuid: string,
    resourceId: string,
    type: 'webpage' | 'user-group' | 'schedule'
  ) => {
    const eventUuid = createdEvent?.uuid ?? localStorage.getItem('currentEventUuid')
    if (!eventUuid) return

    const detail = await fetchWebsitePageConfigDetail(configUuid, eventUuid)
    if (!detail) {
      showToast.error('Failed to load page configuration')
      return
    }

    const section =
      type === 'user-group'
        ? 'participants'
        : type === 'schedule'
          ? 'schedule-sessions'
          : undefined

    const params = new URLSearchParams({ tab: 'settings' })
    if (section) params.set('section', section)
    params.set('configUuid', configUuid)

    window.history.pushState({}, '', `/event/website/preview/${resourceId}?${params.toString()}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handlePageAction = (pageId: string, action: string) => {
    const webpage = webpages.find(w => w.uuid === pageId)
    const participantGroup = (navContent?.participant_groups ?? []).find(
      (g) => g.uuid === pageId || String((g as any).ref_uuid ?? '') === pageId
    )
    const schedulePage = (navContent?.schedules ?? []).find(
      (s) => s.uuid === pageId || String((s as any).ref_uuid ?? '') === pageId
    )
    const eventUuid = createdEvent?.uuid ?? localStorage.getItem('currentEventUuid')

    // Check if this is the welcome page (cannot be deleted)
    const isFirstPage = (webpage?.name ?? '').toLowerCase() === 'welcome'

    switch (action) {
      case 'view':
        if (webpage) {
          // Webpage preview in admin preview shell
          window.history.pushState({}, '', `/event/website/preview/${pageId}`)
          window.dispatchEvent(new PopStateEvent('popstate'))
          break
        }
        if (participantGroup) {
          // CMS preview for user group page
          const targetId = String((participantGroup as any).ref_uuid ?? participantGroup.uuid)
          window.history.pushState({}, '', `/event/website/preview/${targetId}?section=participants`)
          window.dispatchEvent(new PopStateEvent('popstate'))
          break
        }
        if (schedulePage) {
          // CMS preview for schedule sessions page
          const targetId = String((schedulePage as any).ref_uuid ?? schedulePage.uuid)
          window.history.pushState({}, '', `/event/website/preview/${targetId}?section=schedule-sessions`)
          window.dispatchEvent(new PopStateEvent('popstate'))
          break
        }
        break
      case 'edit':
        if (!webpage) break
        // Navigate to editor page
        window.history.pushState({}, '', `/event/website/editor/${pageId}`)
        window.dispatchEvent(new PopStateEvent('popstate'))
        break
      case 'duplicate':
        if (!webpage) break
        // TODO: Implement backend API call to duplicate webpage
        // duplicatePage(pageId) // This is for local pages, not backend webpages
        break
      case 'copy-link': {
        if (!eventUuid) return
        let publicUrl = ''
        if (webpage) {
          const normalizedSlug =
            (webpage.slug || webpage.name || '')
              .toString()
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          const publicPath = normalizedSlug || pageId
          publicUrl = `${window.location.origin}/events/${eventUuid}/webpages/${publicPath}`
        } else if (participantGroup) {
          const targetId = String((participantGroup as any).ref_uuid ?? participantGroup.uuid)
          publicUrl = `${window.location.origin}/events/${eventUuid}/attendees/tag/${targetId}`
        } else if (schedulePage) {
          const targetId = String((schedulePage as any).ref_uuid ?? schedulePage.uuid)
          publicUrl = `${window.location.origin}/events/${eventUuid}/schedule/${targetId}/sessions`
        } else {
          return
        }
        try {
          void navigator.clipboard.writeText(publicUrl)
          showToast.success('Page link copied')
        } catch {
          showToast.error('Failed to copy link')
        }
        break
      }
      case 'settings': {
        if (webpage) {
          // Navigate to webpage settings
          window.history.pushState({}, '', `/event/website/preview/${pageId}?tab=settings`)
          window.dispatchEvent(new PopStateEvent('popstate'))
          break
        }
        if (participantGroup) {
          const targetId = String((participantGroup as any).ref_uuid ?? participantGroup.uuid)
          window.history.pushState({}, '', `/event/website/preview/${targetId}?section=participants&tab=settings`)
          window.dispatchEvent(new PopStateEvent('popstate'))
          break
        }
        if (schedulePage) {
          const targetId = String((schedulePage as any).ref_uuid ?? schedulePage.uuid)
          window.history.pushState({}, '', `/event/website/preview/${targetId}?section=schedule-sessions&tab=settings`)
          window.dispatchEvent(new PopStateEvent('popstate'))
          break
        }
        break
      }
      case 'hide':
        toggleHiddenNavId(pageId)
        break
      case 'delete':
        if (!webpage) break
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
    if (!showDeleteConfirm) return
    const { id: webpageUuid } = showDeleteConfirm
    const eventUuid = createdEvent?.uuid
    if (!eventUuid) return
    try {
      await deleteWebpage(webpageUuid, eventUuid)
      setWebpages(prev => prev.filter(w => w.uuid !== webpageUuid))
      setShowDeleteConfirm(null)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete page.'
      alert(msg)
    }
  }

  // Render content for embedded mode (without navbar/sidebar)
  if (hideNavbarAndSidebar) {
    return (
      <div className="w-full h-full">
        <div className="flex-1 p-8 bg-white overflow-y-auto overflow-x-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 w-full">
            <h1 className="text-[26px] font-bold text-primary-dark">Event Website</h1>
            {renderHeaderButtons()}
          </div>

          {/* Tabs */}
          <WebsiteTabsBar
            activeTab={activeSubItem as any}
            onTabChange={(tab) => handleTabSwitch(tab)}
            onNewPage={handleNewPage}
            onAddMenuItem={() => setShowAddMenuItemModal(true)}
            onAddGroupMenu={() => setShowCreateNavFolderModal(true)}
          />

          {/* Content based on active tab */}
          {activeSubItem === 'website-pages' && (
            <div className="pb-96 mt-3">
              <div className="space-y-0 border border-slate-200 rounded-lg bg-white overflow-visible">
                <WebsitePagesList
                  webpages={sortedWebpagesForListing}
                  navContent={navContent}
                  isLoading={isLoadingWebpages}
                  onAction={handlePageAction}
                  openDropdownId={openDropdownId}
                  setOpenDropdownId={setOpenDropdownId}
                  enableRowClickEdit
                />
              </div>
            </div>
          )}

          {activeSubItem === 'website-header' && renderNavigationTab()}
          {activeSubItem === 'website-config' && renderConfigurationTab()}
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

        <AddMenuItemModal
          isVisible={showAddMenuItemModal}
          onClose={() => setShowAddMenuItemModal(false)}
          pages={availableNavPages.map((p) => ({
            id: p.uuid,
            name: p.name,
            isAdded: !!p.is_added
          }))}
          schedules={availableNavSchedules.map((s) => ({
            id: s.uuid,
            title: s.title,
            isAdded: !!s.is_added
          }))}
          participants={availableNavParticipants.map((p) => ({
            id: p.uuid,
            name: p.name,
            isAdded: !!p.is_added
          }))}
          onAddPage={handleAddMenuItem}
          onAddSchedule={handleAddSchedule}
          onAddParticipant={handleAddParticipant}
        />

        <ConfirmDeleteModal
          isOpen={!!deleteFolderCandidate}
          title="Delete folder?"
          itemName={deleteFolderCandidate?.name}
          isLoading={isDeletingFolder}
          onCancel={() => {
            if (isDeletingFolder) return
            setDeleteFolderCandidate(null)
          }}
          onConfirm={async () => {
            if (!deleteFolderCandidate || isDeletingFolder) return
            setIsDeletingFolder(true)
            try {
              await deleteNavigationFolderApi(eventUuidForNavigation, deleteFolderCandidate.id)
              setNavigationFromApi((prev) => removeNavItemById(prev, deleteFolderCandidate.id).next)
              setExpandedFolderIds((prev) => {
                const next = new Set(prev)
                next.delete(deleteFolderCandidate.id)
                return next
              })
              setDeleteFolderCandidate(null)
            } catch {
              // API failed — keep folder in list
            } finally {
              setIsDeletingFolder(false)
            }
          }}
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

        <UnsavedNavigationModal
          isOpen={showUnsavedNavModal}
          saveLabel="Save changes"
          onClose={() => setShowUnsavedNavModal(false)}
          onDiscard={handleDiscardNavChanges}
          onSave={handlePublishAndSwitch}
        />
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
        eventStatus={eventStatus}
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
        {showProfilePage ? (
          <Suspense fallback={<div className="flex items-centet justify-center min-h-[400px]"><div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
            <UserProfilePage
              onBackClick={() => setShowProfilePage(false)}
            />
          </Suspense>
        ) : (
        <div className="min-w-0 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6 w-full sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-[26px] font-bold text-primary-dark">Event Website</h1>
            {renderHeaderButtons()}
          </div>

          {/* Tabs */}
          <WebsiteTabsBar
            activeTab={activeSubItem as any}
            onTabChange={(tab) => handleTabSwitch(tab)}
            onNewPage={handleNewPage}
            onAddMenuItem={() => setShowAddMenuItemModal(true)}
            onAddGroupMenu={() => setShowCreateNavFolderModal(true)}
          />

          {/* Content based on active tab */}
          {activeSubItem === 'website-pages' && (
            <div className="pb-96 mt-3">
              <div className="space-y-0 border border-slate-200 rounded-lg bg-white overflow-visible">
                <WebsitePagesList
                  webpages={sortedWebpagesForListing}
                  navContent={navContent}
                  isLoading={isLoadingWebpages}
                  onAction={handlePageAction}
                  openDropdownId={openDropdownId}
                  setOpenDropdownId={setOpenDropdownId}
                  enableRowClickEdit
                />
              </div>
            </div>
          )}

          {activeSubItem === 'website-header' && renderNavigationTab()}
          {activeSubItem === 'website-config' && renderConfigurationTab()}
        </div>
        )}
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

      <UnsavedNavigationModal
        isOpen={showUnsavedNavModal}
        saveLabel="Publish now"
        onClose={() => setShowUnsavedNavModal(false)}
        onDiscard={handleDiscardNavChanges}
        onSave={handlePublishAndSwitch}
      />

      <AddMenuItemModal
        isVisible={showAddMenuItemModal}
        onClose={() => setShowAddMenuItemModal(false)}
        pages={availableNavPages.map((p) => ({
          id: p.uuid,
          name: p.name,
          isAdded: !!p.is_added
        }))}
        schedules={availableNavSchedules.map((s) => ({
          id: s.uuid,
          title: s.title,
          isAdded: !!s.is_added
        }))}
        onAddPage={handleAddMenuItem}
        onAddSchedule={handleAddSchedule}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteFolderCandidate}
        title="Delete folder?"
        itemName={deleteFolderCandidate?.name}
        isLoading={isDeletingFolder}
        onCancel={() => {
          if (isDeletingFolder) return
          setDeleteFolderCandidate(null)
        }}
        onConfirm={async () => {
          if (!deleteFolderCandidate || isDeletingFolder) return
          setIsDeletingFolder(true)
          try {
            await deleteNavigationFolderApi(eventUuidForNavigation, deleteFolderCandidate.id)
            setNavigationFromApi((prev) => removeNavItemById(prev, deleteFolderCandidate.id).next)
            setExpandedFolderIds((prev) => {
              const next = new Set(prev)
              next.delete(deleteFolderCandidate.id)
              return next
            })
            setDeleteFolderCandidate(null)
          } catch {
            // API failed — keep folder in list
          } finally {
            setIsDeletingFolder(false)
          }
        }}
      />
    </div>
  )
}

export default EventWebsitePage
