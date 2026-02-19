import React, { useEffect, useMemo, useRef, useState } from 'react'
import { fetchPublicEventList } from '../../services/authService'
import Logo from '../../assets/images/Logo_text.png'

/** Event item from public event list API ({{url}}{{public_url}}event/) */
export interface PublicEventListItem {
  uuid: string
  eventName?: string
  title?: string
  logo_url?: string | null
  logo?: string | null
  image_url?: string | null
  image?: string | null
  event_type?: string | null
  eventType?: string | null
  start_date?: string | null
  start_at?: string | null
  start_datetime?: string | null
  start_time?: string | null
  [key: string]: unknown
}

function normalizeEventListPayload(data: unknown): PublicEventListItem[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is PublicEventListItem =>
        item && typeof item === 'object' && 'uuid' in item && typeof (item as any).uuid === 'string'
    )
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.results)) return normalizeEventListPayload(obj.results)
    if (Array.isArray(obj.data)) return normalizeEventListPayload(obj.data)
  }
  return []
}

type TabId = 'all' | 'your' | 'past'

function formatEventDate(item: PublicEventListItem): string {
  const raw =
    item.start_date ??
    item.start_at ??
    item.start_datetime ??
    (item as any).date ??
    ''
  if (!raw) return ''
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return ''
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  return `${dateStr} | ${timeStr}`
}

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const BellIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const PublicEventListPage: React.FC = () => {
  const [events, setEvents] = useState<PublicEventListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profileMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileMenuOpen])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPublicEventList()
      .then((data) => {
        if (cancelled) return
        setEvents(normalizeEventListPayload(data))
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load events.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const getEventName = (e: PublicEventListItem) =>
    e.eventName || e.title || (e as any).name || 'Event'

  const getEventType = (e: PublicEventListItem): string => {
    const t = e.event_type ?? e.eventType ?? (e as any).type ?? ''
    return String(t || 'Event').trim()
  }

  const getEventImage = (e: PublicEventListItem): string | null => {
    const url = e.logo_url ?? e.logo ?? e.image_url ?? e.image ?? (e as any).logoUrl ?? null
    return url ? String(url) : null
  }

  const filteredEvents = useMemo(() => {
    let list = events
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((event) => getEventName(event).toLowerCase().includes(q))
    }
    if (activeTab === 'past') {
      list = list.filter((event) => {
        const raw =
          event.start_date ??
          event.start_at ??
          event.start_datetime ??
          (event as any).end_at ??
          ''
        if (!raw) return false
        const d = new Date(String(raw))
        return !Number.isNaN(d.getTime()) && d.getTime() < Date.now()
      })
    }
    if (activeTab === 'your') {
      // "Your events" could filter by stored registrations; for now show all when no auth
      // list = list (keep as-is or filter by user's events when backend supports it)
    }
    return list
  }, [events, searchQuery, activeTab])

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All events' },
    { id: 'your', label: 'Your events' },
    { id: 'past', label: 'Past events' }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar: dark purple, logo + EVENTITA, bell + profile */}
      <header
        className="flex h-16 items-center justify-between border-b border-white/10 px-4 sm:px-6 bg-primary-dark"
        
      >
        <a href="/event-list" className="flex items-center gap-3">
      <img src={Logo} alt="Logo" className="" />
        </a>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
          >
            <BellIcon className="h-5 w-5" />
          </button>
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 text-white hover:bg-white/10"
              aria-label="Profile"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
            >
              <UserIcon className="h-5 w-5" />
            </button>
            {profileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-[1001] mt-1 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                <a
                  href="/login"
                  role="menuitem"
                  className="block w-full px-4 py-2.5 text-left text-base font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  Login
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 px-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex gap-6 border-b border-slate-200" aria-label="Event tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative pb-3 pt-4 text-base font-semibold transition-colors
                  ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}
                `}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    aria-hidden
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2 sm:max-w-xs sm:flex-initial">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all events"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Search all events"
            />
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Search"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <main className="px-4 py-6 sm:px-6">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && filteredEvents.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-600">
            No events match your selection.
          </div>
        )}

        {!loading && !error && filteredEvents.length > 0 && (
          <ul className="space-y-4">
            {filteredEvents.map((event) => {
              const name = getEventName(event)
              const typeLabel = getEventType(event)
              const imageUrl = getEventImage(event)
              const dateTime = formatEventDate(event)
              return (
                <li key={event.uuid}>
                  <a
                    href={`/events/${event.uuid}`}
                    className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-200 text-2xl font-bold text-slate-400">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-slate-900">{name}</h2>
                      {typeLabel && (
                        <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {typeLabel}
                        </span>
                      )}
                      {dateTime && (
                        <p className="mt-1.5 text-sm text-slate-500">{dateTime}</p>
                      )}
                    </div>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

export default PublicEventListPage
