import React, { useMemo, useState, useRef, useEffect } from 'react'
import type { PublicNavNode } from '../../types/navigation'
import { renderNavIcon } from '../../utils/navIcons'
import { Home03, ArrowSquareRight, Bell03, CalendarDate } from '@untitled-ui/icons-react'
import { MessageTextCircle01 } from '@untitled-ui/icons-react'
import { showToast } from '../../utils/toast'
import {
  fetchPublicNotifications,
  readAllPublicNotifications,
  registerPublicDeviceToken,
  type PublicNotificationItem,
} from '../../services/publicNotificationService'
import { getPublicFcmToken, isPublicFcmConfigured, onPublicFcmForegroundMessage } from '../../services/publicFcmService'

/** Sidebar width (Tailwind w-64 = 16rem). Use pl-64 on main content when using this navbar. */
export const PUBLIC_NAVBAR_SIDEBAR_WIDTH_CLASS = 'w-64'
/** Top bar height. Use pt-16 on main content when using this navbar. */
export const PUBLIC_NAVBAR_TOP_HEIGHT_CLASS = 'h-16'

interface PublicNavbarProps {
  eventUuid?: string
  eventName?: string
  logoUrl?: string | null
  items: PublicNavNode[]
  activePath?: string
  onNavigate: (path: string) => void
  /** Dark variant for sidebar background (e.g. primary / dark purple). */
  navbarBackgroundColor?: string
  /** Path for "Home" link. If not set, uses first page path. */
  homePath?: string
  /** Path or URL for "Exit event" (e.g. "/" or "/events"). */
  exitEventPath?: string
  /** Called when notification icon is clicked. If not provided, icon is hidden. */
  onNotificationClick?: () => void
  /** Called when chat icon is clicked. Defaults to /messages navigation. */
  onChatClick?: () => void
  /** Called when profile icon is clicked. If not provided, icon is hidden. */
  onProfileClick?: () => void
  /** Optional profile/avatar image URL for the top bar. */
  profileImageUrl?: string | null
}

const PublicNavbar: React.FC<PublicNavbarProps> = ({
  eventUuid,
  eventName,
  logoUrl,
  items,
  activePath,
  onNavigate,
  navbarBackgroundColor,
  homePath: homePathProp,
  exitEventPath = '/',
  onNotificationClick,
  onChatClick,
  onProfileClick,
  profileImageUrl,
}) => {
  const sidebarStyle = useMemo(
    () => (navbarBackgroundColor ? { backgroundColor: navbarBackgroundColor } : undefined),
    [navbarBackgroundColor]
  )

  const homePath = useMemo(() => {
    if (homePathProp) return homePathProp
    const walk = (list: PublicNavNode[]): string | null => {
      for (const it of list) {
        if (it.type === 'page') return it.path
        const nested = walk(it.children || [])
        if (nested) return nested
      }
      return null
    }
    return walk(items) || (eventUuid ? `/events/${eventUuid}` : '/')
  }, [homePathProp, items, eventUuid])

  const normalizePath = (p?: string) => {
    const s = (p || '').trim()
    if (!s) return ''
    return s.length > 1 && s.endsWith('/') ? s.slice(0, -1) : s
  }

  const isActiveForItem = (currentPath: string, itemPath: string): boolean => {
    const cur = normalizePath(currentPath)
    const base = normalizePath(itemPath)
    return Boolean(cur === base || (base && cur.startsWith(`${base}/`)))
  }

  const isActiveForNode = useMemo(() => {
    const walk = (node: PublicNavNode): boolean => {
      if (node.type === 'page') return isActiveForItem(activePath || '', node.path)
      return (node.children || []).some(walk)
    }
    return walk
  }, [activePath])

  const myCalendarPath = eventUuid ? `/events/${eventUuid}/your-schedule` : '/your-schedule'

  const isAuthenticated = Boolean(localStorage.getItem('pub_accessToken'))
  const userEmail = localStorage.getItem('pub_userEmail') ?? ''
  const [storedPicture, setStoredPicture] = useState(() => localStorage.getItem('pub_profilePicture') ?? '')
  const resolvedProfileImage = profileImageUrl || storedPicture || null

  useEffect(() => {
    const refresh = () => setStoredPicture(localStorage.getItem('pub_profilePicture') ?? '')
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('pub_profilePicture_changed', refresh as EventListener)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('pub_profilePicture_changed', refresh as EventListener)
    }
  }, [activePath])

  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({})
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<PublicNotificationItem[]>([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [isRegisteringPush, setIsRegisteringPush] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const notificationMenuRef = useRef<HTMLDivElement>(null)

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.is_read === false).length,
    [notifications]
  )

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
    if (!notificationOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(e.target as Node)) {
        setNotificationOpen(false)
      }
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notificationOpen])

  const loadNotifications = async () => {
    if (!isAuthenticated) return
    setIsLoadingNotifications(true)
    try {
      const list = await fetchPublicNotifications()
      setNotifications(list)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to load notifications.')
    } finally {
      setIsLoadingNotifications(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    loadNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    let unsubscribe: (() => void) | null = null
    onPublicFcmForegroundMessage(async (payload) => {
      const incoming = payload?.notification || payload?.data || {}
      const nextItem: PublicNotificationItem = {
        id: String(incoming.id ?? incoming.notification_id ?? Date.now()),
        title: incoming.title,
        message: incoming.body ?? incoming.message,
        body: incoming.body,
        is_read: false,
        created_at: new Date().toISOString(),
        ...incoming,
      }
      setNotifications((prev) => [nextItem, ...prev])
    }).then((off) => { unsubscribe = off })
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [isAuthenticated])

  const ChevronDown = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )

  const HomeIcon = ({ className }: { className?: string }) => (
    <Home03 className={className} />
  )

  const ExitIcon = ({ className }: { className?: string }) => (
    <ArrowSquareRight className={className} />
  )

  const BellIcon = ({ className }: { className?: string }) => (
    <Bell03 className={className} />
  )

  const UserIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )

  const Bars = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
    </svg>
  )

  const X = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" /><path d="M6 6l12 12" />
    </svg>
  )

  const myCalendarButton = (indent = false) => {
    const isActive = isActiveForItem(activePath || '', myCalendarPath)
    return (
      <button
        key="my-calendar"
        type="button"
        onClick={() => onNavigate(myCalendarPath)}
        className={[
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
          indent ? 'pl-5' : '',
          isActive ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
        ].join(' ')}
      >
        <CalendarDate className="h-4 w-4 shrink-0" />
        <span>My Schedule</span>
      </button>
    )
  }

  const formatNotificationTime = (value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleNotificationClick = async () => {
    if (!isAuthenticated) {
      showToast.error('Please login to receive notifications.')
      return
    }
    setNotificationOpen((prev) => !prev)
    if (!notificationOpen) {
      await loadNotifications()
    }
    onNotificationClick?.()
  }

  const handleEnablePush = async () => {
    if (isRegisteringPush) return
    if (!isPublicFcmConfigured()) {
      showToast.error('FCM is not configured. Please set Firebase env values.')
      return
    }
    try {
      setIsRegisteringPush(true)
      const token = await getPublicFcmToken()
      if (!token) {
        showToast.error('Notification permission is blocked or unavailable.')
        return
      }
      await registerPublicDeviceToken(token)
      localStorage.setItem('pub_notifications_enabled', 'true')
      showToast.success('Push notifications enabled.')
      await loadNotifications()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to enable push notifications.')
    } finally {
      setIsRegisteringPush(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await readAllPublicNotifications()
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })))
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to mark notifications as read.')
    }
  }

  const renderSidebarNode = (node: PublicNavNode) => {
    if (node.type === 'page') {
      const isActive = isActiveForItem(activePath || '', node.path)
      return (
        <div key={node.id}>
          <button
            type="button"
            onClick={() => onNavigate(node.path)}
            className={[
              'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base font-semibold transition-colors',
              isActive ? 'bg-white/20 text-white' : 'text-white hover:bg-white/10'
            ].join(' ')}
          >
            {renderNavIcon(node.iconKey, 'h-4 w-4 shrink-0')}
            <span>{node.label}</span>
          </button>
        </div>
      )
    }

    const isOpen = openFolderId === node.id
    const isActive = isActiveForNode(node)

    return (
      <div key={node.id} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setOpenFolderId((prev) => (prev === node.id ? null : node.id))}
          className={[
            'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-base font-semibold transition-colors',
            isActive ? 'bg-white/20 text-white' : 'text-white hover:bg-white/10'
          ].join(' ')}
        >
          <span className="flex items-center gap-2">
            {renderNavIcon((node as any).iconKey, 'h-4 w-4 shrink-0')}
            <span>{node.label}</span>
          </span>
          <ChevronDown className={['h-4 w-4 shrink-0 transition-transform', isOpen ? 'rotate-180' : ''].join(' ')} />
        </button>

        {isOpen && (node.children?.length ?? 0) > 0 ? (
          <div className="mt-0.5 overflow-hidden rounded-lg border border-white/20 bg-white/10">
            <div role="menu" className="py-1">
              {(node.children || []).map((child) => {
                if (child.type === 'page') {
                  const childActive = isActiveForItem(activePath || '', child.path)
                  return (
                    <button
                      key={child.id}
                      type="button"
                      role="menuitem"
                      onClick={() => { onNavigate(child.path) }}
                      className={[
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-base font-semibold transition-colors',
                        childActive ? 'bg-white/20 text-white' : 'text-white/95 hover:bg-white/15'
                      ].join(' ')}
                    >
                      {renderNavIcon(child.iconKey, 'h-4 w-4 shrink-0')}
                      <span>{child.label}</span>
                    </button>
                  )
                }
                return (
                  <div key={child.id} className="px-3 py-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                    {child.label}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <>
      {/* Left sidebar: full height, dark purple; hidden on mobile (use drawer instead) */}
      <aside
        className={`fixed left-0 top-0 z-[1000] hidden h-full flex-col md:flex ${PUBLIC_NAVBAR_SIDEBAR_WIDTH_CLASS} border-r border-white/10`}
        style={sidebarStyle}
        aria-label="Event navigation"
      >
        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-8">
          {/* Home - common for all */}
          <div className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-lg font-semibold text-white">
            <HomeIcon className="h-5 w-5 shrink-0" />
            <span>Home</span>
          </div>

          {/* Dynamic created pages */}
          <div className="mt-2 flex flex-col gap-0.5">
            {items.map(renderSidebarNode)}
            {isAuthenticated && myCalendarButton()}
          </div>

          {/* Exit event - common for all, at bottom */}
          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={() => {
                if (exitEventPath.startsWith('http')) {
                  window.location.href = exitEventPath
                } else {
                  onNavigate(exitEventPath)
                }
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base font-semibold text-white hover:bg-white/10"
            >
              <ExitIcon className="h-4 w-4 shrink-0" />
              <span>Exit event</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar: full width across the viewport; content indented on desktop so logo/name sit after sidebar */}
      <header
        className={`fixed left-0 right-0 top-0 z-[999] flex ${PUBLIC_NAVBAR_TOP_HEIGHT_CLASS} items-center justify-between border-b border-slate-200 bg-white px-4 pr-4 sm:px-6 md:pl-72 md:pr-6`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-10 w-12 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="h-9 w-9 shrink-0 rounded-md bg-slate-100 ring-1 ring-slate-200" />
          )}
          <h1 className="truncate text-base font-semibold text-slate-900">
            {eventName || 'Event'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile: hamburger to open sidebar */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Bars className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (onChatClick) onChatClick()
              else if (eventUuid) onNavigate(`/events/${eventUuid}/messages`)
              else window.location.href = '/messages'
            }}
            className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:flex"
            aria-label="Messages"
          >
            <MessageTextCircle01 className="h-5 w-5" />
          </button>
          <div ref={notificationMenuRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={handleNotificationClick}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Notifications"
              aria-expanded={notificationOpen}
              aria-haspopup="menu"
            >
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notificationOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-[1001] mt-1 w-[360px] rounded-lg border border-slate-200 bg-white shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-800">Notifications</span>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-primary hover:text-primary-dark"
                  >
                    Mark all read
                  </button>
                </div>
                {!localStorage.getItem('pub_notifications_enabled') && (
                  <div className="border-b border-slate-100 px-3 py-2">
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={isRegisteringPush}
                      className="w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                    >
                      {isRegisteringPush ? 'Enabling…' : 'Enable push notifications'}
                    </button>
                  </div>
                )}
                <div className="max-h-[320px] overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="px-3 py-4 text-sm text-slate-500">Loading notifications…</div>
                  ) : notifications.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-slate-500">No notifications yet.</div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={[
                          'w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50',
                          item.is_read === false ? 'bg-primary/5' : 'bg-white'
                        ].join(' ')}
                        onClick={() => {
                          const deepLink = String(item.deep_link ?? item.click_action ?? item.url ?? '').trim()
                          if (deepLink) onNavigate(deepLink)
                        }}
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          {item.title || 'Notification'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {item.message || item.body || ''}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatNotificationTime(item.created_at)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div ref={profileMenuRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              aria-label="Profile"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
            >
              {resolvedProfileImage ? (
                <img src={resolvedProfileImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </button>
            {profileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-[1001] mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                {isAuthenticated ? (
                  <>
                    {userEmail && (
                      <span className="block truncate px-4 py-2 text-xs text-slate-400">{userEmail}</span>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-4 py-2.5 text-left text-base font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        if (onProfileClick) {
                          onProfileClick()
                        } else {
                          window.location.href = eventUuid ? `/profile?event=${eventUuid}` : '/profile'
                        }
                      }}
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        localStorage.removeItem('pub_accessToken')
                        localStorage.removeItem('pub_refreshToken')
                        localStorage.removeItem('pub_userEmail')
                        localStorage.removeItem('pub_profilePicture')
                        localStorage.removeItem('pub_rememberMe')
                        setProfileMenuOpen(false)
                        window.location.href = '/login'
                      }}
                      className="w-full px-4 py-2.5 text-left text-base font-semibold text-red-600 hover:bg-slate-50"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <a
                    href="/login"
                    role="menuitem"
                    className="block w-full px-4 py-2.5 text-left text-base font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Login
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Mobile nav: full-screen overlay with sidebar content + Home + Exit */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-[1100] bg-slate-900/50 md:hidden"
          aria-hidden
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      {mobileOpen ? (
        <div className="fixed left-0 top-0 z-[1101] flex h-full w-72 flex-col gap-1 overflow-y-auto bg-primary-dark px-3 py-4 md:hidden" style={sidebarStyle}>
          <button
            type="button"
            onClick={() => { setMobileOpen(false); onNavigate(homePath) }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base font-semibold text-white"
          >
            <HomeIcon className="h-4 w-4" />
            <span>Home</span>
          </button>
          {items.map((node) => {
            if (node.type === 'page') {
              const isActive = isActiveForItem(activePath || '', node.path)
              return (
                <div key={node.id}>
                  <button
                    type="button"
                    onClick={() => { setMobileOpen(false); onNavigate(node.path) }}
                    className={['flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base font-semibold', isActive ? 'bg-white/20 text-white' : 'text-white'].join(' ')}
                  >
                    {renderNavIcon(node.iconKey, 'h-4 w-4')}
                    <span>{node.label}</span>
                  </button>
                </div>
              )
            }
            const expanded = Boolean(mobileExpanded[node.id])
            return (
              <div key={node.id}>
                <button
                  type="button"
                  onClick={() => setMobileExpanded((prev) => ({ ...prev, [node.id]: !prev[node.id] }))}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-base font-semibold text-white"
                >
                  <span className="flex items-center gap-2">
                    {renderNavIcon((node as any).iconKey, 'h-4 w-4 shrink-0')}
                    <span>{node.label}</span>
                  </span>
                  <ChevronDown className={['h-4 w-4', expanded ? 'rotate-180' : ''].join(' ')} />
                </button>
                {expanded && (node.children || []).map((child) => {
                  if (child.type !== 'page') return null
                  const childActive = isActiveForItem(activePath || '', child.path)
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => { setMobileOpen(false); onNavigate(child.path) }}
                      className={['ml-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-base font-semibold', childActive ? 'bg-white/20 text-white' : 'text-white/90'].join(' ')}
                    >
                      {renderNavIcon(child.iconKey, 'h-4 w-4')}
                      <span>{child.label}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => { setMobileOpen(false); onNavigate(myCalendarPath) }}
              className={['flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold', isActiveForItem(activePath || '', myCalendarPath) ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'].join(' ')}
            >
              <CalendarDate className="h-4 w-4 shrink-0" />
              <span>My Schedule</span>
            </button>
          )}
          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                if (exitEventPath.startsWith('http')) window.location.href = exitEventPath
                else onNavigate(exitEventPath)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base font-semibold text-white"
            >
              <ExitIcon className="h-4 w-4" />
              <span>Exit event</span>
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default PublicNavbar
