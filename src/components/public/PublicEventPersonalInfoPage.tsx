import React, { useState, useEffect } from 'react'
import ProfileBackground from '../../assets/images/profile_background.jpg'
import { Camera01, User01, ChevronDown, MarkerPin01, X } from '@untitled-ui/icons-react'
import { fetchEventProfile, updateEventProfile } from '../../services/publicEventService'
import { showToast } from '../../utils/toast'
// ChevronDown kept for the Advanced toggle button

interface PublicEventPersonalInfoPageProps {
  onNavigate: (path: string) => void
  eventUuid: string
}

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

const ShieldCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
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

const NETWORKING_GOALS = [
  'Looking to network',
  'Find collaborators',
  'Learn new skills',
  'Share knowledge',
]

const PublicEventPersonalInfoPage: React.FC<PublicEventPersonalInfoPageProps> = ({ onNavigate, eventUuid }) => {
  const token = localStorage.getItem('pub_accessToken') ?? ''
  const payload = token ? decodeJwtPayload(token) : null

  const [firstName, setFirstName] = useState(() => payload?.first_name ?? payload?.given_name ?? '')
  const [lastName, setLastName] = useState(() => payload?.last_name ?? payload?.family_name ?? '')
  const [email] = useState(() => payload?.email ?? localStorage.getItem('pub_userEmail') ?? '')
  const [post, setPost] = useState(() => payload?.post ?? payload?.job_title ?? '')
  const [location, setLocation] = useState(() => payload?.location ?? '')
  const [organization, setOrganization] = useState(() => payload?.organization ?? '')
  const [education, setEducation] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [bio, setBio] = useState('')
  const [groups] = useState<string[]>(['Student', 'Vegetarian', 'Group 3'])
  const [interests, setInterests] = useState<string[]>([])
  const [interestInput, setInterestInput] = useState('')
  const [networkingGoals, setNetworkingGoals] = useState<string[]>([])
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profilePicture, setProfilePicture] = useState<string>(
    () => localStorage.getItem('pub_profilePicture') ?? payload?.picture ?? ''
  )
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)

  useEffect(() => {
    if (!token) return
    fetchEventProfile(eventUuid)
      .then((profile) => {
        const cf = profile.custom_fields ?? {}
        if (profile.first_name) setFirstName(profile.first_name)
        if (profile.last_name) setLastName(profile.last_name)
        const resolvedPost = profile.designation ?? cf.post ?? profile.post ?? profile.job_title ?? ''
        if (resolvedPost) setPost(resolvedPost)
        const resolvedLocation = cf.location ?? profile.location ?? ''
        if (resolvedLocation) setLocation(resolvedLocation)
        const resolvedOrg = profile.organization ?? profile.organisation ?? cf.organization ?? cf.organisation ?? ''
        if (resolvedOrg) setOrganization(resolvedOrg)
        const resolvedEdu = cf.education ?? profile.education ?? ''
        if (resolvedEdu) setEducation(resolvedEdu)
        const resolvedSpec = cf.specialization ?? profile.specialization ?? ''
        if (resolvedSpec) setSpecialization(resolvedSpec)
        const resolvedBio = profile.description ?? cf.bio ?? profile.bio ?? ''
        if (resolvedBio) setBio(resolvedBio)
        const resolvedInterests = cf.interests ?? profile.interests
        if (Array.isArray(resolvedInterests) && resolvedInterests.length) setInterests(resolvedInterests)
        const resolvedGoals = cf.networking_goals ?? profile.networking_goals
        if (Array.isArray(resolvedGoals) && resolvedGoals.length) setNetworkingGoals(resolvedGoals)
        const resolvedPic = profile.image ?? profile.profile_picture ?? profile.picture ?? ''
        if (resolvedPic) {
          setProfilePicture(resolvedPic)
          localStorage.setItem('pub_profilePicture', resolvedPic)
        }
      })
      .catch(() => {
        // silently fall back to JWT payload values
      })
  }, [eventUuid])

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showToast.error('First name and last name are required.')
      return
    }
    // Commit any partially-typed interest before saving
    const finalInterests = [...interests]
    const pendingInterest = interestInput.trim()
    if (pendingInterest && !finalInterests.includes(pendingInterest)) {
      finalInterests.push(pendingInterest)
      setInterests(finalInterests)
      setInterestInput('')
    }
    setIsSaving(true)
    try {
      await updateEventProfile(eventUuid, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        organization: organization.trim() || undefined,
        designation: post.trim() || undefined,
        description: bio.trim() || undefined,
        image: profilePictureFile ?? undefined,
        custom_fields: {
          location: location.trim() || undefined,
          education: education.trim() || undefined,
          specialization: specialization.trim() || undefined,
          interests: finalInterests.length ? finalInterests : undefined,
          networking_goals: networkingGoals.length ? networkingGoals : undefined,
        },
      })
      showToast.success('Profile updated successfully')
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Failed to update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const verifiedDate = payload?.email_verified_at ?? payload?.verified_at ?? null
  const verifiedDisplay = verifiedDate
    ? new Date(verifiedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Verified 3 Jan 2025'

  const fullName = `${firstName} ${lastName}`.trim() || 'User'
  const title = [post, organization].filter(Boolean).join(' at ') || ''

  const toggleGoal = (goal: string) => {
    setNetworkingGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    )
  }

  const removeInterest = (interest: string) => {
    setInterests((prev) => prev.filter((i) => i !== interest))
  }

  const inputBase =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

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
          <img
            src={ProfileBackground}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        {/* Avatar overlapping banner */}
        <div className="relative -mt-14 flex justify-center px-2 sm:-mt-16 sm:px-4">
          <div className="relative bottom-10">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-lg sm:h-28 sm:w-28">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User01 className="h-12 w-12 text-slate-400 sm:h-14 sm:w-14" />
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
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setProfilePictureFile(file)
                  const reader = new FileReader()
                  reader.onload = () => {
                    const dataUrl = reader.result as string
                    setProfilePicture(dataUrl)
                    localStorage.setItem('pub_profilePicture', dataUrl)
                  }
                  reader.readAsDataURL(file)
                }}
              />
            </label>
          </div>
        </div>

        {/* Name and title */}
        <div className="-mt-2 text-center sm:-mt-4">
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{fullName}</h1>
          {title && <p className="mt-0.5 text-sm text-slate-600">{title}</p>}
          {bio && <p className="mt-0.5 text-xs text-slate-500">{bio}</p>}
        </div>

        {/* Form */}
        <div className="mt-6 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Name <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Salma"
                className={inputBase}
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Hayek"
                className={inputBase}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className={`${inputBase} bg-slate-50 text-slate-500 cursor-not-allowed`}
              placeholder="hi@untitledui.com"
            />
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              <span>Verified {verifiedDisplay}</span>
            </div>
          </div>

          {/* Post */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Post</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
              </span>
              <input
                type="text"
                value={post}
                onChange={(e) => setPost(e.target.value)}
                placeholder="Professor"
                className={`${inputBase} pl-9`}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Location</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <MarkerPin01 className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Los Angeles, CA"
                className={`${inputBase} pl-9`}
              />
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-primary"
          >
            Advanced
            <ChevronDown className={['h-4 w-4 transition-transform', advancedOpen ? 'rotate-180' : ''].join(' ')} />
          </button>

          {advancedOpen && (
            <div className="space-y-4">
              {/* Organization */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Organization</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. XYZ University"
                  className={inputBase}
                />
              </div>

              {/* Education */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Education</label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g. Bachelor of Science"
                  className={inputBase}
                />
              </div>

              {/* Specialization */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Specialization</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Cardiology"
                  className={inputBase}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit..."
                  className={`${inputBase} resize-none`}
                />
              </div>

              {/* Groups */}
              {/* <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Groups</label>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div> */}

              {/* Interests */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Interests</label>
                <div className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    placeholder="Add an interest and press Enter"
                    className={inputBase}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      const val = interestInput.trim()
                      if (val && !interests.includes(val)) {
                        setInterests((prev) => [...prev, val])
                        setInterestInput('')
                      }
                    }}
                  />
                </div>
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest) => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => removeInterest(interest)}
                          className="ml-0.5 text-slate-400 hover:text-slate-600"
                          aria-label={`Remove ${interest}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Networking Goals */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Networking Goals</label>
                <div className="space-y-2">
                  {NETWORKING_GOALS.map((goal) => (
                    <label key={goal} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={networkingGoals.includes(goal)}
                        onChange={() => toggleGoal(goal)}
                        className="h-4 w-4 rounded border-slate-300 text-primary accent-primary"
                      />
                      <span className="text-sm text-slate-700">{goal}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="mt-2 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PublicEventPersonalInfoPage
