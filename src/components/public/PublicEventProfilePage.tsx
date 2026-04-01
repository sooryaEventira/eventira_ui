import React, { useState } from 'react'
import ProfileBackground from '../../assets/images/profile_background.jpg'
import { Edit01, Camera01, User01, ArrowRight, ChevronRight } from '@untitled-ui/icons-react'
import { fetchBookmarkedSessions } from '../../services/publicEventService'

interface PublicEventProfilePageProps {
  onNavigate: (path: string) => void
  eventUuid: string
}

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

const PublicEventProfilePage: React.FC<PublicEventProfilePageProps> = ({ onNavigate, eventUuid }) => {
  const token = localStorage.getItem('pub_accessToken') ?? ''
  const payload = token ? decodeJwtPayload(token) : null

  const firstName = payload?.first_name ?? payload?.given_name ?? ''
  const lastName = payload?.last_name ?? payload?.family_name ?? ''
  const email = payload?.email ?? localStorage.getItem('pub_userEmail') ?? ''
  const post = payload?.post ?? payload?.job_title ?? ''
  const organization = payload?.organization ?? payload?.org ?? ''

  const [profilePicture, setProfilePicture] = useState<string>(
    () => localStorage.getItem('pub_profilePicture') ?? payload?.picture ?? payload?.avatar ?? ''
  )

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      setProfilePicture(url)
      localStorage.setItem('pub_profilePicture', url)
    }
    reader.readAsDataURL(file)
  }

  const fullName = `${firstName} ${lastName}`.trim() || 'User'
  const title = [post, organization].filter(Boolean).join(' at ') || ''

  const handleYourScheduleClick = async () => {
    await fetchBookmarkedSessions(eventUuid)
    onNavigate(`/events/${eventUuid}/your-schedule`)
  }

  const handleLogOut = () => {
    localStorage.removeItem('pub_accessToken')
    localStorage.removeItem('pub_refreshToken')
    localStorage.removeItem('pub_userEmail')
    localStorage.removeItem('pub_profilePicture')
    localStorage.removeItem('pub_rememberMe')
    window.location.href = '/login'
  }

  const sections: { label: string; path?: string | null; onClick?: () => void }[] = [
    { label: 'Personal Information', path: `/events/${eventUuid}/profile/personal-info` },
    { label: 'My Calendar', onClick: handleYourScheduleClick },
    { label: 'Privacy Settings', path: null },
    { label: 'Socials & Links', path: null },
    { label: 'Help & Support', path: null },
  ]

  return (
    <div className="relative bg-white pb-12">
      {/* Back arrow */}
      <button
        type="button"
        onClick={() => onNavigate(`/events/${eventUuid}`)}
        className="relative z-10 mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-[#E0E0E0] text-slate-700 hover:bg-slate-300 sm:absolute sm:left-0 sm:top-0 sm:mb-0 sm:h-10 sm:w-10"
        aria-label="Back"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </button>

      <div className="mx-auto max-w-2xl pl-0 sm:pl-14">
        {/* Banner */}
        <div className="relative h-36 w-full overflow-hidden rounded-t-xl sm:h-40 sm:rounded-t-2xl">
          <img
            src={ProfileBackground}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              const t = e.currentTarget
              t.style.background = 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)'
              t.src = ''
            }}
          />
          <button
            type="button"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-primary shadow-sm hover:bg-white"
            aria-label="Edit banner"
          >
            <Edit01 className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar overlapping banner */}
        <div className="relative -mt-14 flex justify-center px-2 sm:-mt-16 sm:px-4">
          <div className="relative bottom-10">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-lg sm:h-28 sm:w-28 md:h-32 md:w-32">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User01 className="h-12 w-12 text-slate-400 sm:h-14 sm:w-14 md:h-16 md:w-16" />
              )}
            </div>
            <label
              className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow hover:bg-primary/90"
              aria-label="Change profile picture"
            >
              <Camera01 className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleProfilePictureChange}
              />
            </label>
          </div>
        </div>

        {/* Name and title */}
        <div className="-mt-2 text-center sm:-mt-4">
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">{fullName}</h1>
          <p className="mt-1 text-sm text-slate-600">{title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{email}</p>
        </div>

        {/* Section list */}
        <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {sections.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => s.onClick ? s.onClick() : s.path && onNavigate(s.path)}
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              {s.label}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>

        {/* Log Out */}
        <button
          type="button"
          onClick={handleLogOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#E74C3C] px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#d43c2c] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Log Out
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export default PublicEventProfilePage
