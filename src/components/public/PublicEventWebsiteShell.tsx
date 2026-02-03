import React, { useEffect, useMemo, useState } from 'react'
import PublicNavbar from './PublicNavbar'
import { fetchPublicEvent, type PublicEventData } from '../../services/publicEventService'
import { fetchPublicWebpages, type PublicWebpageData } from '../../services/publicWebpageService'
import PublicWebpageRenderer from './PublicWebpageRenderer'
import { buildPublicThemeVars } from '../../config/publicTheme'
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
  | 'organizations'
  | 'organization'

interface PublicEventWebsiteShellProps {
  eventUuid: string
}

const getSectionFromPath = (
  eventUuid: string,
  pathname: string
): {
  section: PublicSection
  webpageUuid?: string
  organizationId?: string
  speakerId?: string
  attendeeId?: string
} => {
  const base = `/events/${eventUuid}`
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname

  const webpageMatch = rest.match(/^\/webpages\/([^/]+)\/?$/)
  if (webpageMatch) {
    return { section: 'webpage', webpageUuid: webpageMatch[1] }
  }

  const speakerDetailMatch = rest.match(/^\/speakers\/([^/]+)\/?$/)
  if (speakerDetailMatch) {
    return { section: 'speaker', speakerId: speakerDetailMatch[1] }
  }

  const attendeeDetailMatch = rest.match(/^\/attendees\/([^/]+)\/?$/)
  if (attendeeDetailMatch) {
    return { section: 'attendee', attendeeId: attendeeDetailMatch[1] }
  }

  const orgDetailMatch = rest.match(/^\/organizations\/([^/]+)\/?$/)
  if (orgDetailMatch) {
    return { section: 'organization', organizationId: orgDetailMatch[1] }
  }

  if (rest.startsWith('/organizations')) return { section: 'organizations' }
  if (rest.startsWith('/speakers')) return { section: 'speakers' }
  if (rest.startsWith('/attendees')) return { section: 'attendees' }
  if (rest.startsWith('/schedule')) return { section: 'schedule' }
  if (rest.startsWith('/sessions')) return { section: 'sessions' }

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

const PublicEventWebsiteShell: React.FC<PublicEventWebsiteShellProps> = ({ eventUuid }) => {
  const [event, setEvent] = useState<PublicEventData | null>(null)
  const [webpages, setWebpages] = useState<PublicWebpageData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activePath, setActivePath] = useState<string>(window.location.pathname)

  const refresh = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [evt, pages] = await Promise.all([
        fetchPublicEvent(eventUuid),
        fetchPublicWebpages(eventUuid)
      ])
      setEvent(evt)
      setWebpages(Array.isArray(pages) ? pages : [])
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

  const navbarItems: PublicNavNode[] = useMemo(() => {
    const hiddenKey = `navigation-hidden-${eventUuid}`
    const treeKey = `navigation-tree-${eventUuid}`

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

    const hasNamedItem = (arr: any[], fields: string[]) => {
      return (Array.isArray(arr) ? arr : []).some((x) =>
        fields.some((f) => String((x as any)?.[f] ?? '').trim().length > 0)
      )
    }

    const hasOrganizations = hasNamedItem(organizations, ['name', 'title', 'company', 'organization', 'organisation'])
    const hasSpeakers = hasNamedItem(speakers, ['name', 'email'])
    const hasAttendees = hasNamedItem(attendees, ['name', 'email'])
    const hasSchedule = sessionsCount > 0

    const SYSTEM_PAGES: Array<{ id: string; label: string; path: string }> = []
    if (hasOrganizations) SYSTEM_PAGES.push({ id: 'system:organizations', label: 'Organizations', path: `/events/${eventUuid}/organizations` })
    if (hasSpeakers) SYSTEM_PAGES.push({ id: 'system:speakers', label: 'Speakers', path: `/events/${eventUuid}/speakers` })
    if (hasAttendees) SYSTEM_PAGES.push({ id: 'system:attendees', label: 'Attendees', path: `/events/${eventUuid}/attendees` })
    if (hasSchedule) SYSTEM_PAGES.push({ id: 'system:schedule', label: 'Schedule', path: `/events/${eventUuid}/schedule` })

    const dynamicPages: Array<{ id: string; label: string; path: string }> = webpages.map((p) => ({
      id: String(p.uuid),
      label: p.name,
      path: `/events/${eventUuid}/webpages/${p.uuid}`
    }))

    const pagePathById = new Map<string, { label: string; path: string }>([
      ...SYSTEM_PAGES.map((i) => [i.id, { label: i.label, path: i.path }] as const),
      ...dynamicPages.map((i) => [i.id, { label: i.label, path: i.path }] as const)
    ])

    const defaultFlat: NavigationItem[] = [
      ...SYSTEM_PAGES.map<NavigationPageItem>((p) => ({
        id: p.id,
        type: 'page',
        title: p.label,
        slug: p.id,
        pageId: p.id
      })),
      ...dynamicPages.map<NavigationPageItem>((p) => ({
        id: p.id,
        type: 'page',
        title: p.label,
        slug: String(p.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        pageId: p.id
      }))
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

    // Load tree (folder-capable). If missing, migrate to a flat tree.
    const stored = loadNavigationConfigFromStorage(treeKey)
    const baseItemsRaw = stored?.items && Array.isArray(stored.items) ? stored.items : defaultFlat
    const baseItems = pruneUnavailableSystemPages(baseItemsRaw)

    // Reconcile: ensure newly created pages appear even if the tree is stale.
    const reconciled = upsertMissingPagesToRoot(baseItems, defaultFlat.filter((i) => i.type === 'page'))

    // Persist reconciliation so future loads are stable.
    try {
      saveNavigationConfigToStorage(treeKey, reconciled)
    } catch {
      // ignore (private mode, quota, etc.)
    }

    // Apply hidden filtering (works for both pages and folders).
    const visibleTree = pruneHidden(reconciled, hiddenIds)

    return mapToPublicNav(visibleTree, pagePathById)
  }, [eventUuid, webpages])

  const current = useMemo(() => getSectionFromPath(eventUuid, activePath), [eventUuid, activePath])
  const fallbackWebpageUuid = webpages[0]?.uuid
  const webpageUuid = current.webpageUuid ?? fallbackWebpageUuid

  const handleNavigate = (path: string) => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // Public-site theme: set ONE primary hex and derive other tokens.
  // If backend later provides a brand color, we can wire it here (common keys supported).
  const publicThemeVars = useMemo(() => {
    const fromEvent =
      (event as any)?.primaryColor ||
      (event as any)?.primary_color ||
      (event as any)?.brandColor ||
      (event as any)?.brand_color ||
      ''
    return buildPublicThemeVars(String(fromEvent || '').trim() || undefined)
  }, [event])

  return (
    <div className="min-h-screen bg-white" style={publicThemeVars as any}>
      <PublicNavbar
        eventName={event?.eventName}
        logoUrl={event?.logo ?? null}
        items={navbarItems}
        activePath={activePath}
        onNavigate={handleNavigate}
      />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-20 sm:px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-sm font-medium text-slate-600">Loading website…</div>
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
            <div className="text-lg font-semibold text-rose-900">Unable to load this event</div>
            <div className="mt-1 text-sm text-rose-800">{loadError}</div>
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
            <SpeakersListPage eventUuid={eventUuid} onNavigate={handleNavigate} />
          </React.Suspense>
        ) : current.section === 'speaker' ? (
          <React.Suspense
            fallback={
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <span className="sr-only">Loading speaker</span>
                <div className="animate-pulse">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-32 w-32 rounded-xl bg-slate-100 ring-1 ring-slate-200" />
                    <div className="mt-6 h-7 w-56 rounded bg-slate-100" />
                    <div className="mt-2 h-4 w-72 rounded bg-slate-100" />
                    <div className="mt-6 h-20 w-full max-w-2xl rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            }
          >
            <SpeakerDetailPage
              eventUuid={eventUuid}
              speakerId={current.speakerId || ''}
              onNavigate={handleNavigate}
            />
          </React.Suspense>
        ) : current.section === 'attendees' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <AttendeesListPage eventUuid={eventUuid} onNavigate={handleNavigate} />
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
        ) : current.section === 'schedule' || current.section === 'sessions' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicSchedulePage eventUuid={eventUuid} />
          </React.Suspense>
        ) : current.section === 'webpage' ? (
          webpageUuid ? (
            <PublicWebpageRenderer eventUuid={eventUuid} webpageUuid={webpageUuid} />
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

