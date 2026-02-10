import React, { useState, useRef, useEffect } from 'react'
import { SearchLg, Bell01, User01 } from '@untitled-ui/icons-react'

interface DashboardNavbarProps {
  title?: string
  onSearchClick?: () => void
  onNotificationClick?: () => void
  onProfileClick?: () => void
  onLogout?: () => void
  onNewEventClick?: () => void
  onMenuClick?: () => void
  isSidebarOpen?: boolean
  userAvatarUrl?: string
  userEmail?: string
}

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({
  title,
  onSearchClick,
  onNotificationClick,
  onProfileClick,
  onLogout,
  onNewEventClick,
  onMenuClick,
  isSidebarOpen = false,
  userAvatarUrl,
  userEmail
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
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

  const handleProfileClick = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen)
    onProfileClick?.()
  }

  const handleLogout = () => {
    setIsProfileMenuOpen(false)
    onLogout?.()
  }

  return (
    <nav
      className="fixed top-0 left-0 lg:left-[250px] right-0 h-16 bg-white border-b border-[#E9EAEB] flex items-center shadow-md z-50 overflow-visible"
      style={isSidebarOpen ? { zIndex: 45 } : undefined}
    >
      <div className="w-full h-full px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-8 flex items-center justify-between min-w-0">
        {/* Mobile Menu Button */}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 border-2 border-slate-400 hover:bg-slate-200 hover:border-slate-500 active:bg-slate-300 transition-all shadow-md flex-shrink-0"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-1 sm:gap-2 lg:ml-auto flex-shrink-0 min-w-0">
          {/* Icons Container */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Search Icon */}
            {/* <button
              type="button"
              onClick={onSearchClick}
              className="flex items-center svg-ic  justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors flex-shrink-0"
              aria-label="Search"
            >
              <SearchLg 
                className="h-5 w-5 text-slate-700 stroke-[#334155] stroke-[2] fill-none" 
              />
            </button> */}

            {/* Notification Icon */}
            <button
              type="button"
              onClick={onNotificationClick}
              className="flex items-center svg-ic justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors flex-shrink-0"
              aria-label="Notifications"
            >
              <Bell01 
                className="h-5 w-5  stroke-[red] fill-[#334155]" 
              />
            </button>
          </div>

          {/* Profile Avatar with Dropdown */}
          <div className="relative flex flex-col items-start flex-shrink-0" ref={profileMenuRef}>
            <button
              type="button"
              onClick={handleProfileClick}
              className="w-9 h-9 sm:w-10 svg-ic sm:h-10 rounded-full overflow-hidden border border-[rgba(0,0,0,0.08)] hover:border-[rgba(0,0,0,0.12)] transition-colors flex-shrink-0"
              aria-label="Profile"
            >
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover "
                />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                  <User01 className="h-5 w-5 text-slate-500" />
                </div>
              )}
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg py-1 z-50">
                {/* User Info */}
                {userEmail && (
                  <div className="px-4 py-2 border-b border-slate-200">
                    <p className="text-sm font-medium text-slate-900">{userEmail}</p>
                  </div>
                )}

                {/* Menu Items */}
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

                {/* Logout Button */}
                <div className="border-t border-slate-200 py-1">
                  <button
                    type="button"
                    onClick={handleLogout}
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
      </div>
    </nav>
  )
}

export default DashboardNavbar
