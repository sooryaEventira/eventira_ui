import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import PublicAuthTopbar from './PublicAuthTopbar'
import { API_ENDPOINTS } from '../../config/env'
import ProfileBackground from '../../assets/images/profile_background.jpg'
import { Edit01,Camera01,User01,Mail01,Briefcase01,Building03,MarkerPin01,ArrowRight,ChevronRight} from '@untitled-ui/icons-react'



const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

const PencilIcon = ({ className }: { className?: string }) => (
<Edit01 className={className} />
)

const CameraIcon = ({ className }: { className?: string }) => (
<Camera01 className={className} />
)

const PersonIcon = ({ className }: { className?: string }) => (
 <User01 className={className} />
)

const EnvelopeIcon = ({ className }: { className?: string }) => (
<Mail01 className={className} />
)

const BriefcaseIcon = ({ className }: { className?: string }) => (
<Briefcase01 className={className} />
)

const BuildingIcon = ({ className }: { className?: string }) => (
<Building03 className={className} />
)

const MapPinIcon = ({ className }: { className?: string }) => (
<MarkerPin01 className={className} />
)

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const ChevronDownIcon = ({ className }: { className?: string }) => (
 <ChevronRight className={className} />
)

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const LogOutArrowIcon = ({ className }: { className?: string }) => (
<ArrowRight className={className} />
)

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

function getEventUuid(payload?: Record<string, any> | null): string {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get('event') ?? ''
  if (fromUrl) {
    localStorage.setItem('pub_currentEventUuid', fromUrl)
    return fromUrl
  }
  const fromStorage = localStorage.getItem('pub_currentEventUuid') ?? ''
  if (fromStorage) return fromStorage
  // Fall back to JWT payload claims
  const fromJwt =
    payload?.event_uuid ??
    payload?.event_id ??
    payload?.event ??
    payload?.aud ??
    ''
  return fromJwt ? String(fromJwt) : ''
}

const PublicProfilePage: React.FC = () => {
  const token = localStorage.getItem('pub_accessToken') ?? ''
  const payload = token ? decodeJwtPayload(token) : null
  const eventUuid = getEventUuid(payload)

  const [firstName, setFirstName] = useState(() => payload?.first_name ?? payload?.given_name ?? '')
  const [lastName, setLastName] = useState(() => payload?.last_name ?? payload?.family_name ?? '')
  const [email, setEmail] = useState(() => payload?.email ?? localStorage.getItem('pub_userEmail') ?? '')
  const [post, setPost] = useState(() => payload?.post ?? payload?.job_title ?? '')
  const [organization, setOrganization] = useState(() => payload?.organization ?? payload?.org ?? '')
  const [location, setLocation] = useState(() => payload?.location ?? '')
  const [profilePicture, setProfilePicture] = useState<string>(
    () => localStorage.getItem('pub_profilePicture') ?? payload?.picture ?? payload?.avatar ?? ''
  )
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!eventUuid || !token) return
    fetch(API_ENDPOINTS.PUBLIC.PROFILE(eventUuid), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        const d = res?.data ?? res
        if (!d) return
        if (d.uuid != null) localStorage.setItem('pub_attendeeUuid', String(d.uuid))
        if (d.first_name != null) { setFirstName(String(d.first_name)); localStorage.setItem('pub_firstName', String(d.first_name)) }
        if (d.last_name != null) { setLastName(String(d.last_name)); localStorage.setItem('pub_lastName', String(d.last_name)) }
        if (d.email != null) setEmail(String(d.email))
        if (d.designation != null) setPost(String(d.designation))
        if (d.organisation != null) setOrganization(String(d.organisation))
        if (d.image) {
          const pic = String(d.image)
          setProfilePicture(pic)
          localStorage.setItem('pub_profilePicture', pic)
          window.dispatchEvent(new CustomEvent('pub_profilePicture_changed', { detail: pic }))
        }
      })
      .catch(() => {/* keep JWT-derived defaults */})
  }, [])

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      setProfilePicture(url)
      localStorage.setItem('pub_profilePicture', url)
      window.dispatchEvent(new CustomEvent('pub_profilePicture_changed', { detail: url }))
    }
    reader.readAsDataURL(file)
  }

  const markDirty = () => setIsDirty(true)

  const fullName = `${firstName} ${lastName}`.trim() || 'User'
  const title = [post, organization].filter(Boolean).join(' at ') || ''

  const handleBack = () => {
    window.history.back()
  }

  const handleSave = async () => {
    console.log('[ProfilePage] handleSave — eventUuid:', eventUuid, '| jwtPayload:', payload)
    if (!eventUuid) {
      console.error('[ProfilePage] No event UUID found — cannot save profile')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(API_ENDPOINTS.PUBLIC.PROFILE(eventUuid), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          designation: post,
          organisation: organization,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setIsDirty(false)
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogOut = () => {
    localStorage.removeItem('pub_accessToken')
    localStorage.removeItem('pub_refreshToken')
    localStorage.removeItem('pub_userEmail')
    localStorage.removeItem('pub_profilePicture')
    localStorage.removeItem('pub_rememberMe')
    window.location.href = '/login'
  }

  const inputBase =
    'block min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:min-h-0 sm:py-2.5 sm:text-sm'
  const inputIcon = 'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none'

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* Top bar: dark purple, logo + EVENTIRA, bell + avatar */}
      <PublicAuthTopbar
        menuTitle="Verify email"
        menuItems={[{ label: 'Back to events', href: '/event-list' }]}
      />

      <main className="relative bg-white px-3 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-6">
        {/* Back: in flow on narrow screens, fixed top-left from sm */}
        <button
          type="button"
          onClick={handleBack}
          className="relative z-10 mb-3 flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-[#E0E0E0] text-slate-700 hover:bg-slate-300 sm:absolute sm:left-6 sm:top-6 sm:mb-0 sm:h-11 sm:w-11"
          aria-label="Back"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>

        <div className="mx-auto w-full max-w-5xl pl-0 sm:pl-14 sm:pr-0">
          {/* Banner row */}
          <div className="flex items-stretch">
            {/* Banner with edit icon */}
            <div className="relative h-28 w-full overflow-hidden rounded-t-xl xs:h-36 sm:h-40 sm:rounded-t-2xl">
            <img
              src={ProfileBackground}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.currentTarget
                target.style.background = 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)'
                target.src = ''
              }}
            />
            <button
              type="button"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-primary shadow-sm hover:bg-white"
              aria-label="Edit banner"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            </div>
          </div>

          {/* Profile picture overlapping banner */}
          <div className="relative -mt-11 flex justify-center px-2 sm:-mt-16 sm:px-4">
            <div className="relative bottom-8 sm:bottom-10">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-lg xs:h-24 xs:w-24 sm:h-28 sm:w-28 md:h-32 md:w-32">
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <PersonIcon className="h-10 w-10 text-slate-400 xs:h-12 xs:w-12 sm:h-14 sm:w-14 md:h-16 md:w-16" />
                )}
              </div>
              <label
                className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer touch-manipulation items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow hover:bg-primary/90 sm:h-8 sm:w-8"
                aria-label="Change profile picture"
              >
                <CameraIcon className="h-4 w-4" />
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
          <div className="-mt-1 px-1 text-center sm:-mt-4 sm:px-0">
            <h1 className="text-balance text-base font-bold leading-snug text-slate-900 xs:text-lg sm:text-xl md:text-2xl">{fullName}</h1>
            <p className="mt-1 text-pretty text-sm text-slate-600">{title}</p>
          </div>

          {/* Form fields */}
          <div className="mt-5 space-y-4 sm:mt-8 sm:space-y-5">
            {/* Name * - stack on mobile for better alignment */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="relative">
                  <PersonIcon className={`${inputIcon} left-3`} />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); markDirty() }}
                    className={`${inputBase} pl-10`}
                    placeholder="First name"
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); markDirty() }}
                    className={inputBase}
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>

            {/* Email * */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <EnvelopeIcon className={inputIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); markDirty() }}
                  className={`${inputBase} pl-10`}
                  placeholder="Email"
                />
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-blue-600">
                <CheckIcon className="h-4 w-4 shrink-0" />
                <span>Verified 2 Jan, 2025</span>
              </p>
            </div>

            {/* Post */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Post</label>
              <div className="relative">
                <BriefcaseIcon className={inputIcon} />
                <input
                  type="text"
                  value={post}
                  onChange={(e) => { setPost(e.target.value); markDirty() }}
                  className={`${inputBase} pl-10`}
                  placeholder="Post"
                />
              </div>
            </div>

            {/* Organization */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Organization</label>
              <div className="relative">
                <BuildingIcon className={inputIcon} />
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => { setOrganization(e.target.value); markDirty() }}
                  className={`${inputBase} pl-10 pr-10`}
                  placeholder="Organization"
                />
                <ChevronDownIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Location */}
            {/* <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Location</label>
              <div className="relative">
                <MapPinIcon className={inputIcon} />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={`${inputBase} pl-10 pr-10`}
                  placeholder="Location"
                />
                <SearchIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div> */}

            {isDirty ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 sm:min-h-0"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogOut}
                className="flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-[#E74C3C] px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#d43c2c] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:min-h-0"
              >
                Log Out
                <LogOutArrowIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default PublicProfilePage
