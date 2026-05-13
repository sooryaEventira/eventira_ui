import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Home01, SearchLg, Bell01, User01 } from '@untitled-ui/icons-react'
import { fetchUserProfile, type UserProfile } from '../../services/profileService'

export type EventStatusDisplay = 'Live' | 'Draft' | 'Published'

interface EventHubNavbarProps {
  eventName?: string
  eventLogoUrl?: string
  /** @deprecated Prefer eventStatus for actual API status */
  isDraft?: boolean
  /** Actual event status from API (e.g. 'Live' | 'Draft' | 'Published' or lowercase). When set, overrides isDraft for the badge. */
  eventStatus?: string
  onBackClick?: () => void
  onSearchClick?: () => void
  onNotificationClick?: () => void
  onProfileClick?: () => void
  onLogout?: () => void
  userAvatarUrl?: string
  userEmail?: string
  userName?: string
}

function normalizeStatus(raw: string | undefined): EventStatusDisplay {
  if (!raw || !raw.trim()) return 'Draft'
  const s = raw.trim().toLowerCase()
  if (s === 'live' || s === 'published') return s === 'live' ? 'Live' : 'Published'
  return 'Draft'
}

const EventHubNavbar: React.FC<EventHubNavbarProps> = ({
  eventName = 'Highly important conference of 2025',
  eventLogoUrl,
  isDraft = true,
  eventStatus,
  onBackClick,
  onSearchClick,
  onNotificationClick,
  onProfileClick,
  onLogout
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    fetchUserProfile()
      .then((profile) => setUserProfile(profile))
      .catch(() => {})
  }, [])

  const resolvedAvatarUrl = useMemo(() => {
    const pic = userProfile?.profile_pic
    if (!pic) return undefined
    if (pic.startsWith('/')) return `${(import.meta.env.VITE_AUTH_API_URL || '').replace(/\/+$/, '')}${pic}`
    return pic.replace(/^http:\/\//, 'https://')
  }, [userProfile?.profile_pic])

  const resolvedName = useMemo(() => {
    if (!userProfile) return undefined
    return [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || undefined
  }, [userProfile?.first_name, userProfile?.last_name])

  const resolvedEmail = userProfile?.email || undefined

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileMenuOpen])

  const status = eventStatus !== undefined && eventStatus !== ''
    ? normalizeStatus(eventStatus)
    : (isDraft ? 'Draft' : 'Live')
  return (
    <nav
      data-preserve-color="true"
      className="fixed top-0 left-0 z-[10001] flex h-16 w-full items-center justify-between border-b border-slate-800/20 bg-[#1e1b4b] px-4 text-white shadow-md sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onBackClick}
          className="flex shrink-0 items-center rounded-full p-2 text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Go back"
        >
          <Home01 className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="hidden h-7 w-px bg-white/30 sm:block" aria-hidden="true" />

        {eventLogoUrl && (
          <img
            src={eventLogoUrl}
            alt="Event logo"
            className="hidden h-6 w-6 shrink-0 rounded-md object-cover sm:block"
          />
        )}

        <span className="truncate text-sm font-medium text-white sm:text-base">
          {eventName}
        </span>

        <span
          className={[
            'hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide sm:inline-flex sm:text-xs',
            status === 'Live'
              ? 'bg-emerald-100 text-emerald-800'
              : status === 'Published'
                ? 'bg-sky-100 text-sky-800'
                : 'bg-white text-slate-800'
          ].join(' ')}
        >
          {status}
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onSearchClick}
          className="flex items-center rounded-full p-2 text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Search"
        >
          <SearchLg className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="relative group">
          <button
            type="button"
            onClick={onNotificationClick}
            className="flex items-center rounded-full p-2 text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Notifications"
          >
            <Bell01 className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-lg">
            Notifications
          </span>
        </div>

        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Profile"
          >
            {resolvedAvatarUrl ? (
              <img
                src={resolvedAvatarUrl}
                alt="User profile"
                className="h-9 w-9 rounded-full border-2 border-white object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary/70 text-white">
                <User01 className="h-4 w-4" aria-hidden="true" />
              </div>
            )}
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg py-1 z-50">
              {(resolvedName || resolvedEmail) && (
                <div className="px-4 py-2 border-b border-slate-200">
                  <p className="text-sm font-medium text-slate-900">{resolvedName || resolvedEmail}</p>
                </div>
              )}
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    onProfileClick?.()
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <User01 className="h-4 w-4" />
                  <span>Profile</span>
                </button>
              </div>
              <div className="border-t border-slate-200 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    onLogout?.()
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default EventHubNavbar

