import React, { useState } from 'react'
import ProfileBackground from '../../assets/images/profile_background.jpg'
import { User01, ChevronDown, ChevronUp } from '@untitled-ui/icons-react'

interface PublicPrivacySettingsPageProps {
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

type Visibility = 'private' | 'public' | 'connections'

const VISIBILITY_OPTIONS: { value: Visibility; label: string; sub: string }[] = [
  { value: 'private', label: 'Private', sub: 'No one' },
  { value: 'public', label: 'Public', sub: 'Everyone' },
  { value: 'connections', label: 'Connections only', sub: 'Connections only' },
]

const QR_FIELDS = ['Photo', 'Last name', 'Email', 'Designation']

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={[
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
      checked ? 'bg-primary' : 'bg-slate-200',
    ].join(' ')}
  >
    <span
      className={[
        'inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0',
      ].join(' ')}
    />
  </button>
)

const PublicPrivacySettingsPage: React.FC<PublicPrivacySettingsPageProps> = ({ onNavigate, eventUuid }) => {
  const token = localStorage.getItem('pub_accessToken') ?? ''
  const payload = token ? decodeJwtPayload(token) : null

  const firstName = payload?.first_name ?? payload?.given_name ?? ''
  const lastName = payload?.last_name ?? payload?.family_name ?? ''
  const post = payload?.post ?? payload?.job_title ?? ''
  const organization = payload?.organization ?? payload?.org ?? ''
  const profilePicture = localStorage.getItem('pub_profilePicture') ?? payload?.picture ?? ''

  const fullName = `${firstName} ${lastName}`.trim() || 'User'
  const title = [post, organization].filter(Boolean).join(' at ') || ''

  // Visibility
  const [visibility, setVisibility] = useState<Visibility>('connections')
  const [visibilityOpen, setVisibilityOpen] = useState(false)

  // QR Information
  const [qrOpen, setQrOpen] = useState(false)
  const [qrFields, setQrFields] = useState<Record<string, boolean>>({
    Photo: true,
    'Last name': true,
    Email: false,
    Designation: true,
  })
  const qrCount = Object.values(qrFields).filter(Boolean).length

  // Profile Photo toggle
  const [profilePhotoPublic, setProfilePhotoPublic] = useState(true)

  // Discoverability
  const [activityStatus, setActivityStatus] = useState(true)
  const [appearInSearch, setAppearInSearch] = useState(true)

  // Notifications
  const [pushNotifications, setPushNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)

  const selectedVisibility = VISIBILITY_OPTIONS.find((o) => o.value === visibility)!

  return (
    <div className="relative bg-white pb-12">
      {/* Back arrow */}
      <button
        type="button"
        onClick={() => onNavigate(`/events/${eventUuid}/profile`)}
        className="relative z-10 mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-[#E0E0E0] text-slate-700 hover:bg-slate-300 sm:absolute sm:left-0 sm:top-0 sm:mb-0 sm:h-10 sm:w-10"
        aria-label="Back"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </button>

      <div className="mx-auto max-w-2xl pl-0 sm:pl-14">
        {/* Banner */}
        <div className="relative h-36 w-full overflow-hidden rounded-t-xl sm:h-40 sm:rounded-t-2xl">
          <img src={ProfileBackground} alt="" className="h-full w-full object-cover" />
          {/* Private badge */}
          <span className="absolute right-3 bottom-3 rounded-full border border-slate-300 bg-white/90 px-3 py-0.5 text-xs font-medium text-slate-600 shadow-sm">
            Private
          </span>
        </div>

        {/* Avatar */}
        <div className="relative -mt-14 flex justify-center px-2 sm:-mt-16 sm:px-4">
          <div className="relative bottom-10">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-lg sm:h-28 sm:w-28">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User01 className="h-12 w-12 text-slate-400 sm:h-14 sm:w-14" />
              )}
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="-mt-2 text-center sm:-mt-4">
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{fullName}</h1>
          {title && <p className="mt-0.5 text-sm text-slate-600">{title}</p>}
        </div>

        {/* Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Visibility card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Visibility</h2>

            {/* Profile Visibility */}
            <div className="border-t border-dashed border-slate-200">
              <button
                type="button"
                onClick={() => { setVisibilityOpen((v) => !v); setQrOpen(false) }}
                className="flex w-full items-center justify-between py-3 text-sm"
              >
                <span className="font-medium text-slate-700">Profile Visibility</span>
                <span className="flex items-center gap-1 text-slate-500">
                  {selectedVisibility.label}
                  {visibilityOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              {visibilityOpen && (
                <div className="mb-2 rounded-lg bg-slate-50 p-1">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setVisibility(opt.value); setVisibilityOpen(false) }}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2.5 hover:bg-white"
                    >
                      <div className="text-left">
                        <div className="text-sm font-medium text-slate-800">{opt.label}</div>
                        <div className="text-xs text-slate-500">{opt.sub}</div>
                      </div>
                      <span className={[
                        'flex h-4 w-4 items-center justify-center rounded-full border-2',
                        visibility === opt.value ? 'border-primary bg-primary' : 'border-slate-300 bg-white',
                      ].join(' ')}>
                        {visibility === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* QR Information */}
            <div className="border-t border-dashed border-slate-200">
              <button
                type="button"
                onClick={() => { setQrOpen((v) => !v); setVisibilityOpen(false) }}
                className="flex w-full items-center justify-between py-3 text-sm"
              >
                <span className="font-medium text-slate-700">QR Information</span>
                <span className="flex items-center gap-1 text-slate-500">
                  {qrCount} fields
                  {qrOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              {qrOpen && (
                <div className="mb-2 rounded-lg bg-slate-50 p-1">
                  {QR_FIELDS.map((field) => (
                    <label key={field} className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2.5 hover:bg-white">
                      <span className="text-sm text-slate-700">{field}</span>
                      <input
                        type="checkbox"
                        checked={qrFields[field] ?? false}
                        onChange={() => setQrFields((prev) => ({ ...prev, [field]: !prev[field] }))}
                        className="h-4 w-4 rounded border-slate-300 text-primary accent-primary"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Photo */}
            <div className="flex items-center justify-between border-t border-dashed border-slate-200 py-3">
              <span className="text-sm font-medium text-slate-700">Profile Photo</span>
              <Toggle checked={profilePhotoPublic} onChange={() => setProfilePhotoPublic((v) => !v)} />
            </div>
          </div>

          {/* Discoverability card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Discoverability</h2>

            <div className="border-t border-dashed border-slate-200">
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-slate-700">Activity Status</div>
                  <div className="text-xs text-slate-500">Show when you're active</div>
                </div>
                <Toggle checked={activityStatus} onChange={() => setActivityStatus((v) => !v)} />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-dashed border-slate-200 py-3">
              <div>
                <div className="text-sm font-medium text-slate-700">Appear in Search</div>
                <div className="text-xs text-slate-500">Let others find your profile</div>
              </div>
              <Toggle checked={appearInSearch} onChange={() => setAppearInSearch((v) => !v)} />
            </div>
          </div>
        </div>

        {/* Notifications card */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Notifications</h2>

          <div className="flex items-center justify-between border-t border-dashed border-slate-200 py-3">
            <span className="text-sm font-medium text-slate-700">Push notifications</span>
            <Toggle checked={pushNotifications} onChange={() => setPushNotifications((v) => !v)} />
          </div>

          <div className="flex items-center justify-between border-t border-dashed border-slate-200 py-3">
            <span className="text-sm font-medium text-slate-700">Email notifications</span>
            <Toggle checked={emailNotifications} onChange={() => setEmailNotifications((v) => !v)} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicPrivacySettingsPage
