import React, { useEffect, useRef, useState } from 'react'
import Logo from '../../assets/images/Logo_text.png'

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

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-primary-dark px-4 sm:px-6">
      <a href={homeHref} className="flex items-center gap-3">
        <img src={Logo} alt="Eventita" className="h-8 object-contain" />
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
              <span className="block px-4 py-2.5 text-base font-semibold text-slate-500">{menuTitle}</span>
              {menuItems.map((item) => (
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

