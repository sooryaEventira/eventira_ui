import React from 'react'
import { Home01, SearchLg, Bell01, User01 } from '@untitled-ui/icons-react'

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
  userAvatarUrl?: string
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
  userAvatarUrl
}) => {
  const status = eventStatus !== undefined && eventStatus !== ''
    ? normalizeStatus(eventStatus)
    : (isDraft ? 'Draft' : 'Live')
  return (
    <nav
      data-preserve-color="true"
      className="fixed top-0 left-0 z-[1000] flex h-16 w-full items-center justify-between border-b border-slate-800/20 bg-[#1e1b4b] px-4 text-white shadow-md sm:px-6"
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
        {/* <button
          type="button"
          onClick={onSearchClick}
          className="flex items-center rounded-full p-2 text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Search"
        >
          <SearchLg className="h-5 w-5" aria-hidden="true" />
        </button> */}

        <button
          type="button"
          onClick={onNotificationClick}
          className="flex items-center rounded-full p-2 text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Notifications"
        >
          <Bell01 className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onProfileClick}
          className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Profile"
        >
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt="User profile"
              className="h-9 w-9 rounded-full border-2 border-white object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary/70 text-white">
              <User01 className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
        </button>
      </div>
    </nav>
  )
}

export default EventHubNavbar

