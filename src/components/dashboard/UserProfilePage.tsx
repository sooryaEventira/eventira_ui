import { useEffect, useState, useRef, type FC } from 'react'
import { ArrowLeft, Camera01, User01, Mail01, LogOut01 } from '@untitled-ui/icons-react'
import { fetchUserProfile, updateUserProfile, type UserProfile } from '../../services/profileService'

interface UserProfilePageProps {
  onBackClick?: () => void
  onLogout?: () => void
}

const EVENT_COLORS = ['#6938EF', '#E31B54', '#F79009', '#12B76A', '#2E90FA', '#7A5AF8']

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => {
    const date = new Date(d)
    if (isNaN(date.getTime())) return d
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return `${fmt(start)} - ${fmt(end)}`
}

const UserProfilePage: FC<UserProfilePageProps> = ({ onBackClick, onLogout }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchUserProfile()
      .then((data) => setProfile(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const handleStartEditing = () => {
    if (!profile) return
    setEditFirstName(profile.first_name)
    setEditLastName(profile.last_name)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditFirstName('')
    setEditLastName('')
    setSelectedPhoto(null)
    // Restore original profile pic if changed locally
    if (profile) {
      fetchUserProfile().then(setProfile).catch(() => {})
    }
  }

  const handleSave = async () => {
    if (!profile) return
    setIsSaving(true)
    try {
      const updated = await updateUserProfile({
        first_name: editFirstName,
        last_name: editLastName,
        profile_pic: selectedPhoto,
      })
      setProfile({
        ...profile,
        first_name: updated.first_name || editFirstName,
        last_name: updated.last_name || editLastName,
        profile_pic: updated.profile_pic ?? profile.profile_pic,
      })
      setIsEditing(false)
      setSelectedPhoto(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoClick = () => {
    if (!isEditing) {
      handleStartEditing()
    }
    fileInputRef.current?.click()
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setSelectedPhoto(file)

    const reader = new FileReader()
    reader.onload = () => {
      setProfile((prev) => prev ? { ...prev, profile_pic: reader.result as string } : prev)
    }
    reader.readAsDataURL(file)

    if (!isEditing) {
      setEditFirstName(profile.first_name)
      setEditLastName(profile.last_name)
      setIsEditing(true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6938EF]" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <p className="text-red-600">{error || 'Failed to load profile'}</p>
        {onBackClick && (
          <button type="button" onClick={onBackClick} className="text-sm text-[#6938EF] hover:underline">
            Go back
          </button>
        )}
      </div>
    )
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email.split('@')[0]

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {onBackClick && (
        <button
          type="button"
          onClick={onBackClick}
          className="inline-flex items-center justify-center w-6 h-6 gap-2 text-sm font-medium border border-slate-200 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          
        </button>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-[860px] mx-auto">
        {/* Profile Picture & Name */}
        <div className="flex flex-col items-center pt-6 pb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100">
              {profile.profile_pic ? (
                <img src={profile.profile_pic} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6938EF] to-[#9B8AFB]">
                  <span className="text-2xl font-bold text-white">
                    {(profile.first_name?.[0] || profile.email[0] || '').toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handlePhotoClick}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#6938EF] text-white flex items-center justify-center shadow hover:bg-[#5925DC] transition-colors"
              title="Change photo"
            >
              <Camera01 className="h-3 w-3" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <h2 className="mt-2 text-sm font-semibold text-slate-900">{fullName}</h2>
        </div>

        {/* Profile Fields */}
        <div className="px-6 pb-5 space-y-3.5">
          {/* First Name / Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">First name</label>
              {isEditing ? (
                <div className="flex items-center gap-2 rounded-lg border border-[#6938EF] bg-white px-3 py-2 ring-1 ring-[#6938EF]/20">
                  <User01 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="flex-1 text-sm text-slate-700 bg-transparent outline-none"
                    placeholder="First name"
                  />
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer hover:border-slate-300 transition-colors"
                  onClick={handleStartEditing}
                >
                  <User01 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{profile.first_name || '—'}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Last name</label>
              {isEditing ? (
                <div className="flex items-center gap-2 rounded-lg border border-[#6938EF] bg-white px-3 py-2 ring-1 ring-[#6938EF]/20">
                  <User01 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="flex-1 text-sm text-slate-700 bg-transparent outline-none"
                    placeholder="Last name"
                  />
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer hover:border-slate-300 transition-colors"
                  onClick={handleStartEditing}
                >
                  <User01 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{profile.last_name || '—'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Mail01 className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-700">{profile.email}</span>
            </div>
          </div>

          {/* Access Level (read-only) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Access level</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-700">{profile.access_level || '—'}</span>
            </div>
          </div>

          {/* Events (read-only) */}
          {profile.events.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Events</label>
              <div className="space-y-1.5">
                {profile.events.map((event, idx) => (
                  <div
                    key={event.uuid}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-xs"
                      style={{ backgroundColor: EVENT_COLORS[idx % EVENT_COLORS.length] }}
                    >
                      {event.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{event.title}</p>
                      <p className="text-xs text-slate-500">{formatDateRange(event.start_date, event.end_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {isEditing ? (
            <div className="flex items-center gap-3 !mt-5">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-[#6938EF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5925DC] transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors !mt-5"
            >
              Log Out
              <LogOut01 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserProfilePage
