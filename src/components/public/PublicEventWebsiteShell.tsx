import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import PublicNavbar from './PublicNavbar'
import { fetchPublicEvent, type PublicEventData } from '../../services/publicEventService'
import { fetchPublicWebsiteSettings } from '../../services/websiteSettingsService'
import { fetchPublicWebpages, fetchPublicIndex, type PublicWebpageData } from '../../services/publicWebpageService'
import type { WebsiteIndexData } from '../../services/webpageService'
import { fetchPublicSchedules } from '../../services/publicScheduleService'
import PublicWebpageRenderer from './PublicWebpageRenderer'
import { buildPublicThemeVars, getPrimaryDarkHex } from '../../config/publicTheme'
import type { NavigationItem, NavigationPageItem, PublicNavNode } from '../../types/navigation'
import {
  loadNavigationConfigFromStorage,
  mapToPublicNav,
  pruneHidden,
  saveNavigationConfigToStorage,
  upsertMissingPagesToRoot
} from '../../utils/navigationTree'
import { readEventStoreJSON } from '../../utils/eventLocalStore'

type PublicSection =
  | 'webpage'
  | 'speakers'
  | 'speaker'
  | 'attendees'
  | 'attendee'
  | 'schedule'
  | 'sessions'
  | 'session'
  | 'organizations'
  | 'organization'
  | 'event-profile'
  | 'event-personal-info'
  | 'your-schedule'

interface PublicEventWebsiteShellProps {
  eventUuid: string
}

/** Path result includes optional tagId for grouped speaker/attendee list pages. */
const getSectionFromPath = (
  eventUuid: string,
  pathname: string
): {
  section: PublicSection
  webpageSlug?: string
  organizationId?: string
  speakerId?: string
  attendeeId?: string
  speakerTagId?: string
  attendeeTagId?: string
  sessionId?: string
} => {
  const base = `/events/${eventUuid}`
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname

  const webpageMatch = rest.match(/^\/webpages\/([^/]+)\/?$/)
  if (webpageMatch) {
    return { section: 'webpage', webpageSlug: webpageMatch[1] }
  }

  // Grouped speaker list: /speakers/tag/:tagUuid (must be before /speakers/:id detail)
  const speakerTagMatch = rest.match(/^\/speakers\/tag\/([^/]+)\/?$/)
  if (speakerTagMatch) {
    return { section: 'speakers', speakerTagId: speakerTagMatch[1] }
  }

  const speakerDetailMatch = rest.match(/^\/speakers\/([^/]+)\/?$/)
  if (speakerDetailMatch) {
    return { section: 'speaker', speakerId: speakerDetailMatch[1] }
  }

  // Grouped attendee list: /attendees/tag/:tagUuid
  const attendeeTagMatch = rest.match(/^\/attendees\/tag\/([^/]+)\/?$/)
  if (attendeeTagMatch) {
    return { section: 'attendees', attendeeTagId: attendeeTagMatch[1] }
  }

  const attendeeDetailMatch = rest.match(/^\/attendees\/([^/]+)\/?$/)
  if (attendeeDetailMatch) {
    return { section: 'attendee', attendeeId: attendeeDetailMatch[1] }
  }

  const orgDetailMatch = rest.match(/^\/organizations\/([^/]+)\/?$/)
  if (orgDetailMatch) {
    return { section: 'organization', organizationId: orgDetailMatch[1] }
  }

  // Session detail: /sessions/:sessionUuid (canonical) or /schedule/session/:id (legacy)
  const sessionsUuidMatch = rest.match(/^\/sessions\/([^/]+)\/?$/)
  if (sessionsUuidMatch) {
    return { section: 'session', sessionId: sessionsUuidMatch[1] }
  }
  const sessionDetailMatch = rest.match(/^\/schedule\/session\/([^/]+)\/?$/)
  if (sessionDetailMatch) {
    return { section: 'session', sessionId: sessionDetailMatch[1] }
  }

  if (rest.startsWith('/organizations')) return { section: 'organizations' }
  if (rest.startsWith('/speakers')) return { section: 'speakers' }
  if (rest.startsWith('/attendees')) return { section: 'attendees' }
  if (rest.startsWith('/schedule')) return { section: 'schedule' }
  if (rest === '/sessions' || rest === '/sessions/') return { section: 'sessions' }
  if (rest === '/profile' || rest === '/profile/') return { section: 'event-profile' }
  if (rest === '/profile/personal-info' || rest === '/profile/personal-info/') return { section: 'event-personal-info' }
  if (rest === '/your-schedule' || rest === '/your-schedule/') return { section: 'your-schedule' }

  // Default: if no explicit section, treat it as "webpage" and show first available page
  return { section: 'webpage' }
}

const OrganizationsListPage = React.lazy(() => import('./organizations/OrganizationsListPage'))
const OrganizationDetailPage = React.lazy(() => import('./organizations/OrganizationDetailPage'))
const SpeakersListPage = React.lazy(() => import('./speakers/SpeakersListPage'))
const SpeakerDetailPage = React.lazy(() => import('./speakers/SpeakerDetailPage'))
const AttendeesListPage = React.lazy(() => import('./attendees/AttendeesListPage'))
const AttendeeDetailPage = React.lazy(() => import('./attendees/AttendeeDetailPage'))
const PublicSchedulePage = React.lazy(() => import('./schedule/PublicSchedulePage'))
const PublicSessionDetailPage = React.lazy(() => import('./schedule/PublicSessionDetailPage'))
const PublicEventProfilePage = React.lazy(() => import('./PublicEventProfilePage'))
const PublicEventPersonalInfoPage = React.lazy(() => import('./PublicEventPersonalInfoPage'))
const PublicYourSchedulePage = React.lazy(() => import('./schedule/PublicYourSchedulePage'))

const PublicEventWebsiteShell: React.FC<PublicEventWebsiteShellProps> = ({ eventUuid }) => {
  const [event, setEvent] = useState<PublicEventData | null>(null)
  const [webpages, setWebpages] = useState<PublicWebpageData[]>([])
  const [websiteSettings, setWebsiteSettings] = useState<{ brand_primary_color?: string } | null>(null)
  const [websiteIndex, setWebsiteIndex] = useState<WebsiteIndexData | null>(null)
  const [primaryColorFromWebpage, setPrimaryColorFromWebpage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activePath, setActivePath] = useState<string>(window.location.pathname)
  const [hasScheduleFromApi, setHasScheduleFromApi] = useState(false)

  const refresh = async () => {
    setIsLoading(true)
    setLoadError(null)
    setPrimaryColorFromWebpage(null)
    try {
      const [evt, pages, settings, indexData, schedules] = await Promise.all([
        fetchPublicEvent(eventUuid),
        fetchPublicWebpages(eventUuid),
        fetchPublicWebsiteSettings(eventUuid),
        fetchPublicIndex(eventUuid),
        fetchPublicSchedules(eventUuid).catch(() => [])
      ])
      setEvent(evt)
      setWebpages(Array.isArray(pages) ? pages : [])
      setWebsiteSettings(settings)
      setWebsiteIndex(indexData)
      setHasScheduleFromApi(Array.isArray(schedules) && schedules.length > 0)
      try {
        localStorage.setItem(`website-index-${eventUuid}`, JSON.stringify(indexData))
        localStorage.setItem('pub_currentEventUuid', eventUuid)
      } catch {
        // ignore
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load website.'
      setLoadError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // Keep active path in sync with navigation
    const onPop = () => setActivePath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventUuid])

  const displayEventName = useMemo(() => {
    if (!event) return undefined
    const anyEvent = event as any
    const raw =
      anyEvent.eventName ??
      anyEvent.title ??
      anyEvent.name ??
      ''
    const trimmed = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim()
    return trimmed || undefined
  }, [event])

  const navbarItems: PublicNavNode[] = useMemo(() => {
    const hiddenKey = `navigation-hidden-${eventUuid}`
    const treeKey = `navigation-tree-${eventUuid}`

    // Same keys as admin (Event website → Navigation). Preview navbar = published navbar when same browser.
    let hiddenIds = new Set<string>()
    try {
      const raw = localStorage.getItem(hiddenKey)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) hiddenIds = new Set(parsed.map(String))
    } catch {
      hiddenIds = new Set()
    }

    // Only include system pages when there's real data for them.
    // This mirrors the editor/demo navbar behavior.
    const speakers = readEventStoreJSON<any[]>(eventUuid, 'speakers', [])
    const attendees = readEventStoreJSON<any[]>(eventUuid, 'attendees', [])
    const organizations = readEventStoreJSON<any[]>(eventUuid, 'organizations', [])
    const sessionsMap = readEventStoreJSON<Record<string, any[]>>(eventUuid, 'sessions', {})
    const sessionsCount = Object.values(sessionsMap || {}).reduce(
      (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
      0
    )
    const scheduleList = readEventStoreJSON<any[]>(eventUuid, 'schedule', [])
    const hasScheduleFromStorage = Array.isArray(scheduleList) && scheduleList.length > 0

    const hasNamedItem = (arr: any[], fields: string[]) => {
      return (Array.isArray(arr) ? arr : []).some((x) =>
        fields.some((f) => String((x as any)?.[f] ?? '').trim().length > 0)
      )
    }

    const hasOrganizations = hasNamedItem(organizations, ['name', 'title', 'company', 'organization', 'organisation'])
    const hasSpeakers = hasNamedItem(speakers, ['name', 'email'])
    const hasAttendees = hasNamedItem(attendees, ['name', 'email'])
    const hasSchedule = sessionsCount > 0 || hasScheduleFromApi || hasScheduleFromStorage

    const SYSTEM_PAGES: Array<{ id: string; label: string; path: string }> = []
    if (hasOrganizations) SYSTEM_PAGES.push({ id: 'system:organizations', label: 'Organizations', path: `/events/${eventUuid}/organizations` })
    if (hasSpeakers) SYSTEM_PAGES.push({ id: 'system:speakers', label: 'Speakers', path: `/events/${eventUuid}/speakers` })
    if (hasAttendees) SYSTEM_PAGES.push({ id: 'system:attendees', label: 'Attendees', path: `/events/${eventUuid}/attendees` })
    if (hasSchedule) SYSTEM_PAGES.push({ id: 'system:schedule', label: 'Schedule', path: `/events/${eventUuid}/schedule` })

    // Use website index from public API ({{public_url}}events/{{event_uuid}}/index/) or fallback to localStorage.
    let orderedWebpages = webpages
    let hasIndexData = false
    const indexSpeakerTags: Array<{ uuid: string; name: string }> = []
    const indexAttendeeTags: Array<{ uuid: string; name: string }> = []
    const indexData = websiteIndex ?? (() => {
      const indexRaw = typeof window !== 'undefined' ? localStorage.getItem(`website-index-${eventUuid}`) : null
      return indexRaw ? (() => { try { return JSON.parse(indexRaw) } catch { return null } })() : null
    })()
    const indexNavigationRaw = Array.isArray((indexData as any)?.navigation) ? (indexData as any).navigation : []
    if (indexData) {
      const indexWebpages = Array.isArray(indexData.webpages) ? indexData.webpages : []
      if (indexWebpages.length > 0) hasIndexData = true
      const rawSpeakerTags = Array.isArray(indexData.speaker_tags) ? indexData.speaker_tags : []
      const rawAttendeeTags = Array.isArray(indexData.attendee_tags) ? indexData.attendee_tags : []
      rawSpeakerTags.forEach((t: { uuid?: string; name?: string }) => {
        if (t?.uuid) indexSpeakerTags.push({ uuid: String(t.uuid), name: String(t?.name ?? '').trim() || 'Speakers' })
      })
      rawAttendeeTags.forEach((t: { uuid?: string; name?: string }) => {
        if (t?.uuid) indexAttendeeTags.push({ uuid: String(t.uuid), name: String(t?.name ?? '').trim() || 'Attendees' })
      })
      if (indexWebpages.length > 0) {
        const orderByUuid = new Map<string, number>()
        indexWebpages.forEach((p: { uuid?: string; id?: string }, i: number) => {
          const id = p?.uuid != null ? String(p.uuid) : (p?.id != null ? String(p.id) : '')
          if (id) orderByUuid.set(id, i)
        })
        orderedWebpages = [...webpages].sort((a, b) => {
          const aId = String((a as any)?.uuid ?? (a as any)?.id ?? '')
          const bId = String((b as any)?.uuid ?? (b as any)?.id ?? '')
          const ai = orderByUuid.get(aId) ?? 9999
          const bi = orderByUuid.get(bId) ?? 9999
          return ai - bi
        })
      }
    }

    const dynamicPages: Array<{ id: string; label: string; path: string }> = orderedWebpages.map((p) => ({
      id: String(p.uuid),
      label: p.name,
      path: `/events/${eventUuid}/webpages/${p.slug ?? p.uuid}`
    }))

    // Tag pages for grouped speaker/attendee lists (paths used when nav has Speaker / Attendees folders from website index)
    const speakerTagEntries = indexSpeakerTags.map((t) => [
      `speaker-tag:${t.uuid}`,
      { label: t.name, path: `/events/${eventUuid}/speakers/tag/${t.uuid}` }
    ] as const)
    const attendeeTagEntries = indexAttendeeTags.map((t) => [
      `attendee-tag:${t.uuid}`,
      { label: t.name, path: `/events/${eventUuid}/attendees/tag/${t.uuid}` }
    ] as const)

    const pagePathById = new Map<string, { label: string; path: string }>([
      ...SYSTEM_PAGES.map((i) => [i.id, { label: i.label, path: i.path }] as const),
      ...speakerTagEntries,
      ...attendeeTagEntries,
      ...dynamicPages.map((i) => [i.id, { label: i.label, path: i.path }] as const)
    ])

    const systemAndWebpageItems: NavigationItem[] = [
      ...SYSTEM_PAGES.map<NavigationPageItem>((p) => ({
        id: p.id,
        type: 'page' as const,
        title: p.label,
        slug: p.id,
        pageId: p.id
      })),
      ...dynamicPages.map<NavigationPageItem>((p) => ({
        id: p.id,
        type: 'page' as const,
        title: p.label,
        slug: String(p.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        pageId: p.id
      }))
    ]

    const speakerFolder: NavigationItem | null =
      indexSpeakerTags.length > 0
        ? {
            id: 'folder:speaker',
            type: 'folder',
            title: 'Speaker',
            children: indexSpeakerTags.map((t) => ({
              id: `speaker-tag:${t.uuid}`,
              type: 'page' as const,
              title: t.name,
              slug: String(t.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              pageId: `speaker-tag:${t.uuid}`
            }))
          }
        : null

    const attendeeFolder: NavigationItem | null =
      indexAttendeeTags.length > 0
        ? {
            id: 'folder:attendees',
            type: 'folder',
            title: 'Attendees',
            children: indexAttendeeTags.map((t) => ({
              id: `attendee-tag:${t.uuid}`,
              type: 'page' as const,
              title: t.name,
              slug: String(t.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              pageId: `attendee-tag:${t.uuid}`
            }))
          }
        : null

    const defaultFlat: NavigationItem[] = [
      ...systemAndWebpageItems.slice(0, SYSTEM_PAGES.length),
      ...(speakerFolder ? [speakerFolder] : []),
      ...(attendeeFolder ? [attendeeFolder] : []),
      ...systemAndWebpageItems.slice(SYSTEM_PAGES.length)
    ]
    const allowedSystemIds = new Set(SYSTEM_PAGES.map((p) => p.id))

    const pruneUnavailableSystemPages = (items: NavigationItem[]): NavigationItem[] => {
      const out: NavigationItem[] = []
      for (const it of items) {
        // folder shape
        if ((it as any)?.type === 'folder') {
          out.push({ ...(it as any), children: pruneUnavailableSystemPages((it as any).children || []) })
          continue
        }
        const pageId = String((it as any)?.pageId ?? '')
        if (pageId.startsWith('system:') && !allowedSystemIds.has(pageId)) continue
        out.push(it)
      }
      return out
    }

    // If navigation tree is present in website index (saved on Publish), mirror the CMS navbar structure.
    const mapIndexNavigationToItems = (list: any[], parentItemType?: string): NavigationItem[] => {
      const out: NavigationItem[] = []
      for (const raw of Array.isArray(list) ? list : []) {
        const itemType = String(raw?.item_type || '').toLowerCase()
        const uuid = String(raw?.uuid ?? '').trim()
        if (!uuid) continue
        const title = String(raw?.title ?? raw?.name ?? '').trim() || 'Untitled'

        // Folders and *_group map to folder items
        if (itemType === 'folder' || itemType.endsWith('_group')) {
          const children = mapIndexNavigationToItems(raw?.items || [], itemType)
          const folderIconKey = String(raw?.icon ?? '').trim() || undefined
          out.push({
            id: uuid,
            type: 'folder',
            title,
            children,
            iconKey: folderIconKey,
            originalItemType: itemType
          } as NavigationItem)
          continue
        }

        // Page items: resolve path from pagePathById if available; otherwise treat as regular webpage id
        let pageId = uuid
        let pathOverride: string | null = null

        // For speaker/attendee/schedule groups, index navigation uses tag or schedule uuid;
        // our routing uses synthetic ids like "speaker-tag:{uuid}" / "attendee-tag:{uuid}" / "schedule-tag:{uuid}".
        if (parentItemType === 'speaker_group') {
          pageId = `speaker-tag:${uuid}`
          pathOverride = `/events/${eventUuid}/speakers/tag/${uuid}`
        } else if (parentItemType === 'attendee_group') {
          pageId = `attendee-tag:${uuid}`
          pathOverride = `/events/${eventUuid}/attendees/tag/${uuid}`
        } else if (parentItemType === 'schedule_group') {
          pageId = `schedule-tag:${uuid}`
          pathOverride = `/events/${eventUuid}/schedule/tag/${uuid}`
        }

        const slug = String(raw?.slug ?? '').trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')

        // Ensure pagePathById has an entry for this page id so mapToPublicNav
        // can resolve it even if it's not present in webpages/tags arrays.
        // Always prefer slug-based paths from the index over UUID-based fallbacks.
        {
          const existing = pagePathById.get(pageId)
          const path =
            pathOverride ??
            (slug ? `/events/${eventUuid}/webpages/${slug}` : null) ??
            existing?.path ??
            `/events/${eventUuid}/webpages/${pageId}`
          pagePathById.set(pageId, { label: title, path })
        }

        const iconKey = String(raw?.icon ?? '').trim() || undefined

        out.push({
          id: pageId,
          type: 'page',
          title,
          slug,
          pageId,
          iconKey
        } as NavigationItem)
      }
      return out
    }

    // When we have website index (saved on Publish), prefer index.navigation so navbar matches CMS. Otherwise use stored tree or default.
    const stored = loadNavigationConfigFromStorage(treeKey)
    const hasIndexNavigation = indexNavigationRaw.length > 0
    const indexNavItems = hasIndexNavigation ? mapIndexNavigationToItems(indexNavigationRaw) : null

    const baseItemsRaw = hasIndexNavigation
      ? indexNavItems!
      : hasIndexData
        ? defaultFlat
        : (stored?.items && Array.isArray(stored.items) ? stored.items : defaultFlat)
    const baseItems = pruneUnavailableSystemPages(baseItemsRaw)

    const defaultFlatPagesForUpsert = systemAndWebpageItems as NavigationPageItem[]
    // Reconcile: ensure newly created pages appear even if the tree is stale.
    // IMPORTANT: When we have an explicit navigation tree from the public index
    // (hasIndexNavigation), we respect it as the single source of truth and do
    // NOT auto-append missing webpages to the root. Otherwise, keep the old
    // behavior of upserting missing pages so they're visible.
    const reconciled = hasIndexNavigation
      ? baseItems
      : upsertMissingPagesToRoot(baseItems, defaultFlatPagesForUpsert)

    // Persist reconciliation so future loads are stable.
    try {
      saveNavigationConfigToStorage(treeKey, reconciled)
    } catch {
      // ignore (private mode, quota, etc.)
    }

    // Apply hidden filtering (works for both pages and folders).
    const visibleTree = pruneHidden(reconciled, hiddenIds)

    return mapToPublicNav(visibleTree, pagePathById)
  }, [eventUuid, webpages, websiteIndex, hasScheduleFromApi])

  const current = useMemo(() => getSectionFromPath(eventUuid, activePath), [eventUuid, activePath])
  const fallbackWebpageSlug =
    (websiteIndex?.webpages?.[0] as any)?.slug ||
    webpages[0]?.slug ||
    undefined
  const webpageSlug = current.webpageSlug ?? fallbackWebpageSlug

  const handleNavigate = (path: string) => {
    // Exit to event list: full navigation so PublicApp re-renders and shows PublicEventListPage
    if (path === '/event-list' || path === '/events' || path === '/') {
      window.location.href = path === '/' ? '/event-list' : path
      return
    }
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // Theme: read brand_primary_color from API → convert to --color-primary / --color-primary-dark → apply at root.
  // Navbar and all Puck components then use it automatically via Tailwind (bg-primary, text-primary, bg-primary-dark).
  // Sources (in order): website-settings API, event GET, webpage GET, then default.
  const getResolvedPrimary = () => {
    const fromSettings = websiteSettings?.brand_primary_color?.trim() || ''
    const ev = event as any
    const fromEvent =
      ev?.brand_primary_color ||
      ev?.website_settings?.brand_primary_color ||
      ev?.websiteSettings?.brand_primary_color ||
      ev?.settings?.brand_primary_color ||
      ev?.primaryColor ||
      ev?.primary_color ||
      ev?.brandColor ||
      ev?.brand_color ||
      ''
    const fromWebpage = (primaryColorFromWebpage || '').trim()
    return (fromSettings || fromEvent || fromWebpage || '').trim() || undefined
  }

  const publicThemeVars = useMemo(() => {
    const primaryHex = getResolvedPrimary()
    if (import.meta.env.DEV) {
      const source = websiteSettings?.brand_primary_color
        ? 'website-settings'
        : (event as any)?.brand_primary_color || (event as any)?.website_settings?.brand_primary_color || (event as any)?.settings?.brand_primary_color
        ? 'event'
        : primaryColorFromWebpage
        ? 'webpage'
        : 'default'
      console.log('[public theme]', primaryHex ? `${primaryHex} from ${source}` : 'using default (no color from API)')
    }
    return buildPublicThemeVars(primaryHex || undefined)
  }, [event, websiteSettings, primaryColorFromWebpage])

  const primaryHex = useMemo(() => getResolvedPrimary(), [event, websiteSettings, primaryColorFromWebpage])
  const navbarBackgroundColor = useMemo(() => getPrimaryDarkHex(primaryHex), [primaryHex])

  // Apply --color-primary and --color-primary-dark at published site root (html + body).
  useLayoutEffect(() => {
    const vars = publicThemeVars as Record<string, string>
    const apply = (el: HTMLElement) => {
      Object.keys(vars).forEach((key) => el.style.setProperty(key, vars[key]))
    }
    apply(document.documentElement)
    apply(document.body)
    return () => {
      Object.keys(vars).forEach((key) => {
        document.documentElement.style.removeProperty(key)
        document.body.style.removeProperty(key)
      })
    }
  }, [publicThemeVars])

  const isAuthSection = false

  return (
    <div className="flex min-h-screen flex-col bg-white" style={publicThemeVars as any}>
      <PublicNavbar
        eventUuid={eventUuid}
        eventName={displayEventName}
        logoUrl={event?.logo ?? null}
        items={navbarItems}
        activePath={activePath}
        onNavigate={handleNavigate}
        navbarBackgroundColor={navbarBackgroundColor}
        exitEventPath="/event-list"
        onProfileClick={() => handleNavigate(`/events/${eventUuid}/profile`)}
      />

      <main className={`pt-16 md:pl-72 w-full flex-1 px-4 pb-12 sm:px-6 md:max-w-none ${isAuthSection ? 'flex flex-col' : ''}`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-sm font-medium text-slate-600">Loading website…</div>
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="text-lg font-semibold text-amber-900">This event isn’t available yet</div>
            <div className="mt-1 text-sm text-amber-800">
              If you just published, the site may need a moment to go live. If the event stays unavailable, in the admin go to <strong>Website settings → Access control</strong>, set <strong>Visibility</strong> to <strong>Public</strong>, then try again.
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => refresh()}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                Retry
              </button>
            </div>
          </div>
        ) : current.section === 'organizations' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <OrganizationsListPage
              eventUuid={eventUuid}
              onNavigate={handleNavigate}
            />
          </React.Suspense>
        ) : current.section === 'speakers' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <SpeakersListPage
              eventUuid={eventUuid}
              onNavigate={handleNavigate}
              tagId={current.speakerTagId}
            />
          </React.Suspense>
        ) : current.section === 'speaker' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <SpeakersListPage
              eventUuid={eventUuid}
              onNavigate={handleNavigate}
              initialSpeakerId={current.speakerId || undefined}
            />
          </React.Suspense>
        ) : current.section === 'attendees' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <AttendeesListPage
              eventUuid={eventUuid}
              onNavigate={handleNavigate}
              tagId={current.attendeeTagId}
            />
          </React.Suspense>
        ) : current.section === 'attendee' ? (
          <React.Suspense
            fallback={
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <span className="sr-only">Loading attendee</span>
                <div className="animate-pulse">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-32 w-32 rounded-xl bg-slate-100 ring-1 ring-slate-200" />
                    <div className="mt-6 h-7 w-56 rounded bg-slate-100" />
                    <div className="mt-2 h-4 w-72 rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            }
          >
            <AttendeeDetailPage
              eventUuid={eventUuid}
              attendeeId={current.attendeeId || ''}
              onNavigate={handleNavigate}
            />
          </React.Suspense>
        ) : current.section === 'organization' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <OrganizationDetailPage
              eventUuid={eventUuid}
              organizationId={current.organizationId || ''}
              onNavigate={handleNavigate}
            />
          </React.Suspense>
        ) : current.section === 'session' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicSessionDetailPage
              eventUuid={eventUuid}
              sessionId={current.sessionId || ''}
              onNavigate={handleNavigate}
            />
          </React.Suspense>
        ) : current.section === 'schedule' || current.section === 'sessions' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicSchedulePage eventUuid={eventUuid} onNavigate={handleNavigate} />
          </React.Suspense>
        ) : current.section === 'event-profile' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicEventProfilePage eventUuid={eventUuid} onNavigate={handleNavigate} />
          </React.Suspense>
        ) : current.section === 'event-personal-info' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicEventPersonalInfoPage eventUuid={eventUuid} onNavigate={handleNavigate} />
          </React.Suspense>
        ) : current.section === 'your-schedule' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicYourSchedulePage eventUuid={eventUuid} onNavigate={handleNavigate} />
          </React.Suspense>
        ) : current.section === 'webpage' ? (
          webpageSlug ? (
            <PublicWebpageRenderer
              eventUuid={eventUuid}
              webpageSlug={webpageSlug}
              onPrimaryColor={setPrimaryColorFromWebpage}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="text-lg font-semibold text-slate-900">No pages yet</div>
              <div className="mt-1 text-sm text-slate-600">
                This event doesn’t have any published webpages.
              </div>
            </div>
          )
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="text-lg font-semibold text-slate-900">Coming soon</div>
            <div className="mt-1 text-sm text-slate-600">
              This section will be connected once the public endpoints are provided.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default PublicEventWebsiteShell

