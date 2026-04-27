import React, { useEffect, useRef, useState } from 'react'
import Logo from '../../assets/images/Logo_text.png'
import { MessageTextCircle01 } from '@untitled-ui/icons-react'
import { showToast } from '../../utils/toast'
import {
  fetchPublicNotifications,
  readAllPublicNotifications,
  registerPublicDeviceToken,
  type PublicNotificationItem,
} from '../../services/publicNotificationService'

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

export interface PublicAuthTopbarMenuItem {
  label: string
  href: string
}

interface PublicAuthTopbarProps {
  /** Left logo link href. Defaults to /event-list. */
  homeHref?: string
  /** Menu title shown as first (non-clickable) line. */
  menuTitle: string
  /** Menu links shown under the title. */
  menuItems: PublicAuthTopbarMenuItem[]
}

const PublicAuthTopbar: React.FC<PublicAuthTopbarProps> = ({
  homeHref = '/event-list',
  menuTitle,
  menuItems,
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<PublicNotificationItem[]>([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [isRegisteringPush, setIsRegisteringPush] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const notificationMenuRef = useRef<HTMLDivElement>(null)

  const isAuthenticated = Boolean(localStorage.getItem('pub_accessToken'))
  const userEmail = localStorage.getItem('pub_userEmail') ?? ''
  const profilePicture = localStorage.getItem('pub_profilePicture') ?? ''

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

  const unreadCount = notifications.filter((n) => n.is_read === false).length

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
    if (!notificationOpen) await loadNotifications()
  }

  const handleEnablePush = async () => {
    if (isRegisteringPush) return
    try {
      setIsRegisteringPush(true)
      const { isPublicFcmConfigured, getPublicFcmToken, onPublicFcmForegroundMessage } = await import('../../services/publicFcmService')
      if (!isPublicFcmConfigured()) {
        showToast.error('FCM is not configured. Please set Firebase env values.')
        return
      }
      const token = await getPublicFcmToken()
      if (!token) {
        showToast.error('Notification permission is blocked or unavailable.')
        return
      }
      await registerPublicDeviceToken(token)
      localStorage.setItem('pub_notifications_enabled', 'true')
      onPublicFcmForegroundMessage((payload) => {
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
      }).catch(() => {})
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

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-primary-dark px-4 sm:px-6">
      <a href={homeHref} className="flex items-center gap-3">
        <img src={Logo} alt="Eventita" className="h-8 object-contain" />
      </a>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { window.location.href = '/messages' }}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 hover:text-white"
          aria-label="Messages"
        >
          <MessageTextCircle01 className="h-5 w-5" />
        </button>

        <div ref={notificationMenuRef} className="relative">
          <button
            type="button"
            onClick={handleNotificationClick}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 hover:text-white"
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
                        if (deepLink) window.location.href = deepLink
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

        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 text-white hover:bg-white/10"
            aria-label="Profile"
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
          >
            {isAuthenticated && profilePicture ? (
              <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
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
                  <hr className="my-1 border-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-4 py-2.5 text-left text-base font-semibold text-red-600 hover:bg-slate-50"
                    onClick={() => {
                      localStorage.removeItem('pub_accessToken')
                      localStorage.removeItem('pub_refreshToken')
                      localStorage.removeItem('pub_userEmail')
                      localStorage.removeItem('pub_profilePicture')
                      localStorage.removeItem('pub_rememberMe')
                      window.location.href = '/login'
                    }}
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <span className="block px-4 py-2.5 text-base font-semibold text-slate-500">{menuTitle}</span>
              )}
              {!isAuthenticated && menuItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className="block w-full px-4 py-2.5 text-left text-base font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default PublicAuthTopbar

