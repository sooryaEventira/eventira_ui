import React, { useMemo, useState, useRef, useEffect } from 'react'
import type { PublicNavNode } from '../../types/navigation'
import { renderNavIcon } from '../../utils/navIcons'
import { Home03,ArrowSquareRight, Bell03} from '@untitled-ui/icons-react'

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
  /** Called when profile icon is clicked. If not provided, icon is hidden. */
  onProfileClick?: () => void
  /** Optional profile/avatar image URL for the top bar. */
  profileImageUrl?: string | null
  /** Path for "Your Schedule" link — shown under schedule nav items when user is authenticated and has bookmarks. */
  yourSchedulePath?: string
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
  profileImageUrl,
  yourSchedulePath
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

  const isAuthenticated = Boolean(localStorage.getItem('pub_accessToken'))
  const userEmail = localStorage.getItem('pub_userEmail') ?? ''
  const storedPicture = localStorage.getItem('pub_profilePicture') ?? ''
  const resolvedProfileImage = profileImageUrl || storedPicture || null

  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({})
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

  const renderSidebarNode = (node: PublicNavNode) => {
    if (node.type === 'page') {
      const isActive = isActiveForItem(activePath || '', node.path)
      const isSchedulePage = node.path.includes('/schedule') || node.id.includes('schedule')
      const showYourSchedule = isSchedulePage && yourSchedulePath && isAuthenticated
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
          {showYourSchedule && (
            <button
              type="button"
              onClick={() => onNavigate(yourSchedulePath!)}
              className={[
                'flex w-full items-center gap-2 rounded-lg pl-9 pr-3 py-2 text-left text-sm font-semibold transition-colors',
                isActiveForItem(activePath || '', yourSchedulePath!) ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
              ].join(' ')}
            >
              <span>Your Schedule</span>
            </button>
          )}
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

        {isOpen && (node.children?.length ?? 0) > 0 ? (() => {
          const isScheduleFolder = (node.children || []).some(
            (c) => c.type === 'page' && c.path.includes('/schedule')
          ) || node.id.includes('schedule')
          const showYourSchedule = isScheduleFolder && yourSchedulePath && isAuthenticated
          return (
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
                {showYourSchedule && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => onNavigate(yourSchedulePath!)}
                    className={[
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-base font-semibold transition-colors border-t border-white/10 mt-0.5',
                      isActiveForItem(activePath || '', yourSchedulePath!) ? 'bg-white/20 text-white' : 'text-white/95 hover:bg-white/15'
                    ].join(' ')}
                  >
                    <span>Your Schedule</span>
                  </button>
                )}
              </div>
            </div>
          )
        })() : null}
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
            <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover ring-1 ring-slate-200" />
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
          {onNotificationClick ? (
            <button
              type="button"
              onClick={onNotificationClick}
              className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:flex"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
            </button>
          ) : null}
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
                    <a
                      href="/profile"
                      role="menuitem"
                      className="block w-full px-4 py-2.5 text-left text-base font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Profile
                    </a>
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
                <button
                  key={node.id}
                  type="button"
                  onClick={() => { setMobileOpen(false); onNavigate(node.path) }}
                  className={['flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base font-semibold', isActive ? 'bg-white/20 text-white' : 'text-white'].join(' ')}
                >
                  {renderNavIcon(node.iconKey, 'h-4 w-4')}
                  <span>{node.label}</span>
                </button>
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
