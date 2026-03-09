import React, { useState } from 'react'
import PublicAuthTopbar from './PublicAuthTopbar'
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

const PublicProfilePage: React.FC = () => {
  const [firstName, setFirstName] = useState('Sienna')
  const [lastName, setLastName] = useState('Hewitt')
  const [email, setEmail] = useState('hi@siennahewitt.com')
  const [post, setPost] = useState('Student')
  const [organization, setOrganization] = useState('XYZ university')
  const [location, setLocation] = useState('Los Angeles, CA')

  const fullName = `${firstName} ${lastName}`.trim() || 'User'
  const title = 'Student at XYZ university'

  const handleBack = () => {
    window.history.back()
  }

  const handleLogOut = () => {
    // Placeholder: wire to auth logout
  }

  const inputBase =
    'block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
  const inputIcon = 'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none'

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar: dark purple, logo + EVENTIRA, bell + avatar */}
      <PublicAuthTopbar
        menuTitle="Verify email"
        menuItems={[{ label: 'Back to events', href: '/event-list' }]}
      />

      <main className="relative bg-white px-4 pb-12 pt-6 sm:px-6">
        {/* Back arrow: above banner on mobile, left of banner on sm+ */}
        <button
          type="button"
          onClick={handleBack}
          className="relative z-10 mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-[#E0E0E0] text-slate-700 hover:bg-slate-300 sm:absolute sm:left-6 sm:top-6 sm:mb-0 sm:h-10 sm:w-10"
          aria-label="Back"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>

        <div className="mx-auto max-w-5xl pl-0 sm:pl-14 sm:pr-0">
          {/* Banner row */}
          <div className="flex items-stretch">
            {/* Banner with edit icon */}
            <div className="relative h-36 w-full overflow-hidden rounded-t-xl sm:h-40 sm:rounded-t-2xl">
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
          <div className="relative -mt-14 flex justify-center px-2 sm:-mt-16 sm:px-4">
            <div className="relative bottom-10">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-lg sm:h-28 sm:w-28 md:h-32 md:w-32">
                <PersonIcon className="h-12 w-12 text-slate-400 sm:h-14 sm:w-14 md:h-16 md:w-16" />
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow hover:bg-primary/90"
                aria-label="Change profile picture"
              >
                <CameraIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Name and title */}
          <div className="-mt-2 text-center sm:-mt-4">
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">{fullName}</h1>
            <p className="mt-1 text-sm text-slate-600">{title}</p>
          </div>

          {/* Form fields */}
          <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
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
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`${inputBase} pl-10`}
                    placeholder="First name"
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
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
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputBase} pl-10`}
                  placeholder="Email"
                />
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-blue-600">
                <CheckIcon className="h-4 w-4 shrink-0" />
                Verified 2 Jan, 2025
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
                  onChange={(e) => setPost(e.target.value)}
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
                  onChange={(e) => setOrganization(e.target.value)}
                  className={`${inputBase} pl-10 pr-10`}
                  placeholder="Organization"
                />
                <ChevronDownIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Location */}
            <div>
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
            </div>

            {/* Log Out */}
            <button
              type="button"
              onClick={handleLogOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E74C3C] px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#d43c2c] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Log Out
              <LogOutArrowIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PublicProfilePage
