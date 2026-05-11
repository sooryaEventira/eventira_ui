import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as Ably from 'ably'
import type { DirectMessage } from '../../services/publicDirectMessageService'
import PublicNavbar from './PublicNavbar'
import { fetchPublicEvent, type PublicEventData } from '../../services/publicEventService'
import { fetchPublicWebsiteSettings } from '../../services/websiteSettingsService'
import { fetchPublicWebpages, fetchPublicNavigation, type PublicWebpageData } from '../../services/publicWebpageService'
import { fetchPublicSchedules } from '../../services/publicScheduleService'
import PublicWebpageRenderer from './PublicWebpageRenderer'
import { buildPublicThemeVars, getPrimaryDarkHex } from '../../config/publicTheme'
import type { NavigationItem, PublicNavNode } from '../../types/navigation'
import {
  mapToPublicNav,
  pruneHidden,
} from '../../utils/navigationTree'
import { readEventStoreJSON } from '../../utils/eventLocalStore'
import { API_ENDPOINTS } from '../../config/env'

type PublicSection =
  | 'webpage'
  | 'attendees'
  | 'messages'
  | 'schedule'
  | 'schedule-sessions'
  | 'sessions'
  | 'session'
  | 'organizations'
  | 'organization'
  | 'event-profile'
  | 'event-personal-info'
  | 'event-privacy-settings'
  | 'your-schedule'

interface PublicEventWebsiteShellProps {
  eventUuid: string
}

/** Path result includes optional tagId for grouped attendee/participant list pages. */
const getSectionFromPath = (
  eventUuid: string,
  pathname: string
): {
  section: PublicSection
  webpageSlug?: string
  organizationId?: string
  attendeeTagId?: string
  participantId?: string
  sessionId?: string
  scheduleUuid?: string
} => {
  const base = `/events/${eventUuid}`
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname

  const webpageMatch = rest.match(/^\/webpages\/([^/]+)\/?$/)
  if (webpageMatch) {
    return { section: 'webpage', webpageSlug: webpageMatch[1] }
  }

  // Grouped attendee/participant list: /attendees/tag/:tagUuid
  const attendeeTagMatch = rest.match(/^\/attendees\/tag\/([^/]+)\/?$/)
  if (attendeeTagMatch) {
    return { section: 'attendees', attendeeTagId: attendeeTagMatch[1] }
  }

  // Participant detail: /attendees/:participantUuid
  const attendeeDetailMatch = rest.match(/^\/attendees\/([^/]+)\/?$/)
  if (attendeeDetailMatch) {
    return { section: 'attendees', participantId: attendeeDetailMatch[1] }
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

  // Schedule-specific sessions page: /schedule/:scheduleUuid/sessions
  const scheduleSessionsMatch = rest.match(/^\/schedule\/([^/]+)\/sessions\/?$/)
  if (scheduleSessionsMatch) {
    return { section: 'schedule-sessions', scheduleUuid: scheduleSessionsMatch[1] }
  }

  if (rest.startsWith('/organizations')) return { section: 'organizations' }
  if (rest.startsWith('/attendees')) return { section: 'attendees' }
  if (rest === '/messages' || rest === '/messages/') return { section: 'messages' }
  if (rest.startsWith('/schedule')) return { section: 'schedule' }
  if (rest === '/sessions' || rest === '/sessions/') return { section: 'sessions' }
  if (rest === '/profile' || rest === '/profile/') return { section: 'event-profile' }
  if (rest === '/profile/personal-info' || rest === '/profile/personal-info/') return { section: 'event-personal-info' }
  if (rest === '/profile/privacy-settings' || rest === '/profile/privacy-settings/') return { section: 'event-privacy-settings' }
  if (rest === '/your-schedule' || rest === '/your-schedule/') return { section: 'your-schedule' }

  // Default: if no explicit section, treat it as "webpage" and show first available page
  return { section: 'webpage' }
}

const OrganizationsListPage = React.lazy(() => import('./organizations/OrganizationsListPage'))
const OrganizationDetailPage = React.lazy(() => import('./organizations/OrganizationDetailPage'))
const ParticipantsListPage = React.lazy(() => import('./participants/ParticipantsListPage'))
const PublicSessionDetailPage = React.lazy(() => import('./schedule/PublicSessionDetailPage'))
const PublicEventProfilePage = React.lazy(() => import('./PublicEventProfilePage'))
const PublicEventPersonalInfoPage = React.lazy(() => import('./PublicEventPersonalInfoPage'))
const PublicPrivacySettingsPage = React.lazy(() => import('./PublicPrivacySettingsPage'))
const PublicYourSchedulePage = React.lazy(() => import('./schedule/PublicYourSchedulePage'))
const PublicScheduleSessionsPage = React.lazy(() => import('./schedule/PublicScheduleSessionsPage'))
const PublicMessagesPage = React.lazy(() => import('./PublicMessagesPage'))

const PublicEventWebsiteShell: React.FC<PublicEventWebsiteShellProps> = ({ eventUuid }) => {
  const [event, setEvent] = useState<PublicEventData | null>(null)
  const [webpages, setWebpages] = useState<PublicWebpageData[]>([])
  const [websiteSettings, setWebsiteSettings] = useState<{ brand_primary_color?: string; logo?: string; banner?: string } | null>(null)
  const [primaryColorFromWebpage, setPrimaryColorFromWebpage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activePath, setActivePath] = useState<string>(window.location.pathname)
  const [hasScheduleFromApi, setHasScheduleFromApi] = useState(false)
  const [defaultScheduleUuid, setDefaultScheduleUuid] = useState<string>('')
  const [globalNotifs, setGlobalNotifs] = useState<Array<{ id: string; name: string; text: string }>>([])
  const [publicNavigation, setPublicNavigation] = useState<any[] | null>(null)
  const bgAblyClientsRef = useRef<Ably.Realtime[]>([])

  const refresh = async () => {
    setIsLoading(true)
    setLoadError(null)
    setPrimaryColorFromWebpage(null)
    try {
      const [evt, pages, settings, schedules, navData] = await Promise.all([
        fetchPublicEvent(eventUuid),
        fetchPublicWebpages(eventUuid),
        fetchPublicWebsiteSettings(eventUuid),
        fetchPublicSchedules(eventUuid).catch(() => []),
        fetchPublicNavigation(eventUuid).catch(() => [])
      ])
      setEvent(evt)
      setWebpages(Array.isArray(pages) ? pages : [])
      setWebsiteSettings(settings)
      setPublicNavigation(Array.isArray(navData) ? navData : [])
      setHasScheduleFromApi(Array.isArray(schedules) && schedules.length > 0)
      const firstScheduleUuid = Array.isArray(schedules) && schedules.length > 0
        ? String((schedules[0] as any)?.uuid ?? (schedules[0] as any)?.id ?? '')
        : ''
      setDefaultScheduleUuid(firstScheduleUuid)
      try {
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

  // Fetch the attendee UUID that matches what the attendees list uses, so presence and DM channels align.
  // Strategy: get the current user's email from the profile API, then look up their UUID in the attendees list.
  useEffect(() => {
    const token = localStorage.getItem('pub_accessToken')
    if (!token || !eventUuid) return
    fetch(API_ENDPOINTS.PUBLIC.PROFILE(eventUuid), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then(async (res) => {
        const d = res?.data ?? res
        const email = String(d?.email ?? localStorage.getItem('pub_userEmail') ?? '').toLowerCase()
        // profileUuid is the fallback if the user isn't in the attendees list (e.g. speaker-only users)
        const profileUuid = String(d?.uuid ?? d?.attendee_uuid ?? '').trim()

        let resolvedId = ''

        if (email) {
          // Look up this user in participants first (backend-supported public endpoint).
          // Fallback to attendees for backward compatibility on older deployments.
          try {
            const parseItems = (payload: any): any[] =>
              Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.results)
                  ? payload.results
                  : Array.isArray(payload)
                    ? payload
                    : []

            let items: any[] = []
            const participantsRes = await fetch(API_ENDPOINTS.PUBLIC.PARTICIPANTS.LIST(eventUuid))
            if (participantsRes.ok) {
              items = parseItems(await participantsRes.json())
            } else {
              const attendeesRes = await fetch(API_ENDPOINTS.PUBLIC.ATTENDEES.LIST(eventUuid))
              if (attendeesRes.ok) {
                items = parseItems(await attendeesRes.json())
              }
            }

            const match = items.find((p: any) => String(p?.email ?? '').toLowerCase() === email)
            if (match) resolvedId = String(match.uuid ?? match.id ?? '').trim()
          } catch { /* non-critical */ }
        }

        // Fall back to profile UUID if not found in attendees list (speaker-only users)
        if (!resolvedId) resolvedId = profileUuid

        if (resolvedId) {
          localStorage.setItem('pub_attendeeUuid', resolvedId)
          window.dispatchEvent(new CustomEvent('pub_attendeeUuid_changed', { detail: resolvedId }))
        }
      })
      .catch(() => { /* non-critical */ })
  }, [eventUuid])

  // Auto-dismiss oldest global notification after 4s
  useEffect(() => {
    if (globalNotifs.length === 0) return
    const t = setTimeout(() => setGlobalNotifs((prev) => prev.slice(1)), 4000)
    return () => clearTimeout(t)
  }, [globalNotifs])

  // Background Ably subscriptions — fires notifications from any room while user browses other pages
  useEffect(() => {
    const token = localStorage.getItem('pub_accessToken')
    if (!token) return
    let cancelled = false

    const setup = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.PUBLIC.CHAT_ROOMS, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        const json = await res.json()
        const rooms: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : Array.isArray(json?.results) ? json.results : []

        for (const room of rooms.slice(0, 10)) {
          if (cancelled) break
          try {
            const tokenRes = await fetch(API_ENDPOINTS.PUBLIC.CHAT_ROOM_TOKEN(room.room_uuid), {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (!tokenRes.ok || cancelled) continue
            const td = await tokenRes.json()
            const d = td?.data ?? td
            const ablyToken = d?.ably_token ?? d?.token ?? null
            const channelName = room.channel_name || String(d?.channel_name ?? '')
            if (!ablyToken || !channelName || cancelled) continue

            const client = new Ably.Realtime({ token: ablyToken })
            bgAblyClientsRef.current.push(client)

            const channel = client.channels.get(channelName)
            channel.subscribe((msg: Ably.Message) => {
              if (cancelled) return
              const data = msg.data as DirectMessage
              if (!data?.id) return
              const myId = localStorage.getItem('pub_attendeeUuid') ?? localStorage.getItem('pub_userUuid') ?? ''
              if (data.senderId === myId) return
              // Only show if NOT already on messages page (that page handles its own notifications)
              if (window.location.pathname.includes('/messages')) return
              setGlobalNotifs((prev) => prev.some((n) => n.id === data.id) ? prev : [
                ...prev,
                { id: data.id, name: room.participant?.name ?? data.senderName ?? 'New message', text: data.text ?? '' },
              ])
            })
          } catch { /* non-critical, skip this room */ }
        }
      } catch { /* ignore */ }
    }

    setup()
    return () => {
      cancelled = true
      bgAblyClientsRef.current.forEach((c) => { try { c.close() } catch { /* ignore */ } })
      bgAblyClientsRef.current = []
    }
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
    const hasSchedule = sessionsCount > 0 || hasScheduleFromApi || hasScheduleFromStorage

    const SYSTEM_PAGES: Array<{ id: string; label: string; path: string }> = []
    if (hasOrganizations) SYSTEM_PAGES.push({ id: 'system:organizations', label: 'Organizations', path: `/events/${eventUuid}/organizations` })
    if (hasSchedule) SYSTEM_PAGES.push({ id: 'system:schedule', label: 'Schedule', path: `/events/${eventUuid}/schedule` })

    // Navigation API is the single source of truth for sidebar menu items.
    const navigationRaw = Array.isArray(publicNavigation) ? publicNavigation : []

    const dynamicPages: Array<{ id: string; label: string; path: string }> = webpages.map((p) => ({
      id: String(p.uuid),
      label: p.name,
      path: `/events/${eventUuid}/webpages/${p.slug ?? p.uuid}`
    }))

    const pagePathById = new Map<string, { label: string; path: string }>([
      ...SYSTEM_PAGES.map((i) => [i.id, { label: i.label, path: i.path }] as const),
      ...dynamicPages.map((i) => [i.id, { label: i.label, path: i.path }] as const)
    ])

    const mapNavigationToItems = (list: any[], parentItemType?: string): NavigationItem[] => {
      const out: NavigationItem[] = []
      for (const raw of Array.isArray(list) ? list : []) {
        const itemType = String(raw?.item_type || '').toLowerCase()
        const uuid = String(raw?.uuid ?? '').trim()
        if (!uuid) continue
        const title = String(raw?.title ?? raw?.name ?? '').trim() || 'Untitled'

        if (itemType === 'folder' || itemType.endsWith('_group')) {
          const children = mapNavigationToItems(raw?.items || raw?.children || [], itemType)
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

        let pageId = uuid
        let pathOverride: string | null = null

        if (parentItemType === 'speaker_group') {
          pageId = `speaker-tag:${uuid}`
          pathOverride = `/events/${eventUuid}/speakers/tag/${uuid}`
        } else if (parentItemType === 'attendee_group') {
          pageId = `attendee-tag:${uuid}`
          pathOverride = `/events/${eventUuid}/attendees/tag/${uuid}`
        } else if (parentItemType === 'schedule_group') {
          pageId = `schedule-tag:${uuid}`
          pathOverride = `/events/${eventUuid}/schedule/tag/${uuid}`
        } else if (itemType === 'participant') {
          const tagId = String(raw?.ref_uuid ?? uuid).trim()
          pageId = `attendee-tag:${tagId}`
          pathOverride = `/events/${eventUuid}/attendees/tag/${tagId}`
        } else if (itemType === 'schedule') {
          const scheduleId = String(raw?.ref_uuid ?? uuid).trim()
          pageId = `schedule:${scheduleId}`
          pathOverride = `/events/${eventUuid}/schedule/${scheduleId}/sessions`
        }

        const slug = String(raw?.slug ?? '').trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')

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

    const navItems = mapNavigationToItems(navigationRaw)
    const visibleTree = pruneHidden(navItems, hiddenIds)

    return mapToPublicNav(visibleTree, pagePathById)
  }, [eventUuid, webpages, publicNavigation, hasScheduleFromApi])

  const current = useMemo(() => getSectionFromPath(eventUuid, activePath), [eventUuid, activePath])

  // Returns true if any nav node (including nested children) has a path containing the given segment.
  const isPathInNav = (segment: string): boolean => {
    const check = (nodes: PublicNavNode[]): boolean =>
      nodes.some((n) =>
        n.type === 'page'
          ? n.path.includes(segment)
          : check(n.children)
      )
    // Only gate when the navigation API has responded; before that allow access to avoid flicker.
    return publicNavigation === null || check(navbarItems)
  }

  // Determine the home page: find the item with is_desktop_home=true.
  // Wait for publicNavigation to load before resolving — prevents premature redirect.
  const fallbackWebpageSlug = useMemo(() => {
    // Don't resolve until navigation API has responded
    if (publicNavigation === null) return undefined

    // Scan raw navigation items for is_desktop_home: true
    const findDesktopHomeInNav = (list: any[]): string | undefined => {
      for (const raw of Array.isArray(list) ? list : []) {
        if (raw?.is_desktop_home === true) {
          return String(raw?.slug ?? '').trim() || String(raw?.uuid ?? '').trim() || undefined
        }
        const nested = findDesktopHomeInNav(raw?.items || raw?.children || [])
        if (nested) return nested
      }
      return undefined
    }

    const desktopHomeSlug = findDesktopHomeInNav(publicNavigation)
    if (desktopHomeSlug) return desktopHomeSlug

    // Check webpages list for is_desktop_home flag
    const homePage = webpages.find((p: any) => p.is_desktop_home === true)
    if (homePage) return homePage.slug || homePage.uuid

    // Fallback: first page in the rendered navigation
    const findFirstPageSlug = (nodes: PublicNavNode[]): string | undefined => {
      for (const n of nodes) {
        if (n.type === 'page') {
          const match = n.path.match(/\/webpages\/([^/]+)\/?$/)
          if (match) return match[1]
        } else {
          const found = findFirstPageSlug(n.children)
          if (found) return found
        }
      }
      return undefined
    }
    return (
      findFirstPageSlug(navbarItems) ||
      webpages[0]?.slug ||
      undefined
    )
  }, [navbarItems, webpages, publicNavigation])
  const webpageSlug = current.webpageSlug ?? fallbackWebpageSlug

  // On initial load, redirect to the desktop home page (is_desktop_home: true).
  const hasAppliedHomePage = useRef(false)
  useEffect(() => {
    if (isLoading || !fallbackWebpageSlug || hasAppliedHomePage.current) return

    hasAppliedHomePage.current = true
    const targetPath = `/events/${eventUuid}/webpages/${fallbackWebpageSlug}`

    // Always redirect to home on first load when on the webpage section
    if (current.section === 'webpage') {
      if (window.location.pathname !== targetPath) {
        window.history.replaceState({}, '', targetPath)
        setActivePath(targetPath)
      }
    }
  }, [current.section, fallbackWebpageSlug, eventUuid, isLoading])

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
        logoUrl={websiteSettings?.logo ?? (event?.logo ?? null)}
        items={navbarItems}
        activePath={activePath}
        onNavigate={handleNavigate}
        navbarBackgroundColor={navbarBackgroundColor}
        homePath={fallbackWebpageSlug ? `/events/${eventUuid}/webpages/${fallbackWebpageSlug}` : undefined}
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
          isPathInNav('/organizations') ? (
            <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
              <OrganizationsListPage
                eventUuid={eventUuid}
                onNavigate={handleNavigate}
              />
            </React.Suspense>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="text-lg font-semibold text-slate-900">Page not found</div>
              <div className="mt-1 text-sm text-slate-600">This page is not available for this event.</div>
            </div>
          )
        ) : current.section === 'attendees' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <ParticipantsListPage
              eventUuid={eventUuid}
              onNavigate={handleNavigate}
              tagId={current.attendeeTagId}
              participantId={current.participantId}
            />
          </React.Suspense>
        ) : current.section === 'messages' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicMessagesPage
              showTopbar={false}
              onBack={() => handleNavigate(`/events/${eventUuid}`)}
            />
          </React.Suspense>
        ) : current.section === 'organization' ? (
          isPathInNav('/organizations') ? (
            <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
              <OrganizationDetailPage
                eventUuid={eventUuid}
                organizationId={current.organizationId || ''}
                onNavigate={handleNavigate}
              />
            </React.Suspense>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="text-lg font-semibold text-slate-900">Page not found</div>
              <div className="mt-1 text-sm text-slate-600">This page is not available for this event.</div>
            </div>
          )
        ) : current.section === 'session' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicSessionDetailPage
              eventUuid={eventUuid}
              sessionId={current.sessionId || ''}
              onNavigate={handleNavigate}
            />
          </React.Suspense>
        ) : current.section === 'schedule-sessions' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicScheduleSessionsPage
              eventUuid={eventUuid}
              scheduleUuid={current.scheduleUuid || ''}
              onNavigate={handleNavigate}
            />
          </React.Suspense>
        ) : current.section === 'schedule' || current.section === 'sessions' ? (
          (current.scheduleUuid || defaultScheduleUuid) ? (
            <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
              <PublicScheduleSessionsPage
                eventUuid={eventUuid}
                scheduleUuid={current.scheduleUuid || defaultScheduleUuid}
                onNavigate={handleNavigate}
              />
            </React.Suspense>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="text-base font-semibold text-slate-900">No schedules yet</div>
              <div className="mt-1 text-sm text-slate-600">No published schedule is available for this event.</div>
            </div>
          )
        ) : current.section === 'event-profile' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicEventProfilePage eventUuid={eventUuid} onNavigate={handleNavigate} />
          </React.Suspense>
        ) : current.section === 'event-personal-info' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicEventPersonalInfoPage eventUuid={eventUuid} onNavigate={handleNavigate} />
          </React.Suspense>
        ) : current.section === 'event-privacy-settings' ? (
          <React.Suspense fallback={<div className="py-10 text-sm text-slate-600">Loading…</div>}>
            <PublicPrivacySettingsPage eventUuid={eventUuid} onNavigate={handleNavigate} />
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
              bannerUrl={websiteSettings?.banner ?? (event as any)?.banner ?? null}
              eventName={displayEventName ?? null}
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

      {/* Global incoming-message notifications (fires from any page except /messages) */}
      {globalNotifs.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
          {globalNotifs.map((n) => (
            <div
              key={n.id}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg w-72"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                {n.name.split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('')}
              </div>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  setGlobalNotifs((prev) => prev.filter((x) => x.id !== n.id))
                  handleNavigate(`/events/${eventUuid}/messages`)
                }}
              >
                <p className="text-xs font-semibold text-slate-800 truncate">{n.name}</p>
                <p className="text-xs text-slate-500 truncate">{n.text}</p>
              </div>
              <button
                type="button"
                onClick={() => setGlobalNotifs((prev) => prev.filter((x) => x.id !== n.id))}
                className="shrink-0 text-slate-400 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PublicEventWebsiteShell

