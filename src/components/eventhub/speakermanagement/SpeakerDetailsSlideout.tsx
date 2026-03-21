import React, { useEffect, useRef, useState } from 'react'
import { XClose, Camera01, Eye, Plus, Trash03 } from '@untitled-ui/icons-react'
import { Speaker, SpeakerGroup } from './speakerTypes'
import { Badge, Slideout } from '../../ui/untitled'
import profileBackground from '../../../assets/images/profile_background.jpg'

export interface SpeakerSaveOptions {
  profileImageFile?: File
}

interface SpeakerDetailsSlideoutProps {
  isOpen: boolean
  onClose: () => void
  speaker: Speaker | null
  onSave?: (speaker: Speaker, options?: SpeakerSaveOptions) => void | Promise<void>
  topOffset?: number
}

const SpeakerDetailsSlideout: React.FC<SpeakerDetailsSlideoutProps> = ({
  isOpen,
  onClose,
  speaker,
  onSave,
  topOffset = 64
}) => {
  const [editedSpeaker, setEditedSpeaker] = useState<Speaker | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [title, setTitle] = useState('')
  const [bio, setBio] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<SpeakerGroup[]>([])
  const [groupsText, setGroupsText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customFields, setCustomFields] = useState<
    Array<{ id: string; label: string; value: string; hideFromProfile?: boolean }>
  >([])

  useEffect(() => {
    if (speaker && isOpen) {
      setEditedSpeaker(speaker)
      const nameParts = speaker.name.split(' ')
      setFirstName(speaker.firstName || nameParts[0] || '')
      setLastName(speaker.lastName || nameParts.slice(1).join(' ') || '')
      setEmail(speaker.email || '')
      setOrganization(speaker.organization || '')
      // Treat "Designation" as speaker.role (fallback to title for backwards compatibility)
      setTitle(speaker.role || speaker.title || '')
      setBio(speaker.bio || '')
      setSelectedGroups([...speaker.groups])
      setGroupsText((speaker.groups || []).map((g) => g.name).filter(Boolean).join(', '))
      setProfileImageFile(null)
      setProfilePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      const nextCustomFields =
        (speaker.customFields || []).map((field, idx) => ({
          id: `${Date.now()}-${idx}`,
          label: field.label,
          value: field.value,
          hideFromProfile: false
        })) || []
      setCustomFields(nextCustomFields)
    }
  }, [speaker, isOpen])

  const parseGroupsFromText = (text: string, prev: SpeakerGroup[]): SpeakerGroup[] => {
    const parts = String(text || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)

    const seen = new Set<string>()
    const unique = parts.filter((name) => {
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return unique.map((name, idx) => {
      const existing = prev.find((g) => String(g.name || '').toLowerCase() === name.toLowerCase())
      if (existing) return existing
      return {
        id: `${Date.now()}-${idx}`,
        name,
        variant: 'primary' as const
      }
    })
  }

  const commitGroups = (text = groupsText) => {
    const next = parseGroupsFromText(text, selectedGroups)
    setSelectedGroups(next)
    setGroupsText(next.map((g) => g.name).join(', '))
    return next
  }

  const handleSave = async () => {
    if (!editedSpeaker) return
    if (isSaving) return
    setIsSaving(true)
    const nextGroups = commitGroups(groupsText)

    const cleanedCustomFields = customFields
      .map((f) => ({
        id: f.id,
        label: (f.label || '').trim(),
        value: (f.value || '').trim(),
        hideFromProfile: !!f.hideFromProfile
      }))
      .filter((f) => f.label || f.value)

    const updatedSpeaker: Speaker = {
      ...editedSpeaker,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email,
      organization,
      // Keep both fields in sync; table uses `role`
      role: title,
      title,
      bio,
      groups: nextGroups,
      customFields: cleanedCustomFields.length
        ? cleanedCustomFields.map((f) => ({ label: f.label, value: f.value }))
        : undefined
    }

    try {
      await onSave?.(updatedSpeaker, { profileImageFile: profileImageFile ?? undefined })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  if (!speaker) return null

  return (
    <Slideout
      isOpen={isOpen}
      onClose={onClose}
      topOffset={topOffset}
      width="440px"
      maxWidth="460px"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      {/* Banner Image */}
      <div className="relative h-40 w-full overflow-hidden">
      <img
          src={profileBackground}
          alt="Profile background"
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 transition hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Close"
        >
          <XClose className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/svg+xml,image/png,image/jpeg,image/jpg,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            const valid = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif'].includes(file.type)
            if (valid) {
              setProfilePreviewUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev)
                return URL.createObjectURL(file)
              })
              setProfileImageFile(file)
            }
          }
        }}
      />
      {/* Profile Section */}
      <div className="relative -mt-20 px-6 pb-4">
        <div className="flex items-center justify-center gap-3">
          <Badge variant="success" className="text-xs whitespace-nowrap">
            {speaker.status === 'active' ? 'Active' : speaker.status === 'pending' ? 'Pending' : 'Inactive'}
          </Badge>
          <div className="relative">
            {profilePreviewUrl ? (
              <img
                src={profilePreviewUrl}
                alt={speaker.name}
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg"
              />
            ) : speaker.avatarUrl ? (
              <img
                src={speaker.avatarUrl}
                alt={speaker.name}
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-slate-200 text-lg font-semibold text-slate-600 shadow-lg">
                {speaker.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-md transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Change profile picture"
            >
              <Camera01 className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="View"
          >
            <Eye className="h-4 w-4" />
          </button> */}
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-xl font-semibold text-slate-900">{speaker.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {title && organization
              ? `${title} @ ${organization}`
              : title || organization || 'Speaker'}
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="px-6 pb-6 space-y-5">
        {/* Name Fields */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Name
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Organization */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Organization
          </label>
          <input
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Organization"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Designation + Groups (same row) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Designation
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Designation"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Group
            </label>
            <input
              type="text"
              value={groupsText}
              onChange={(e) => setGroupsText(e.target.value)}
              onBlur={() => commitGroups()}
              placeholder="e.g. VIP, Panelist"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                commitGroups()
              }}
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a brief bio..."
            rows={4}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
          />
        </div>

        {/* Custom fields (match Create speaker modal) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (customFields.length >= 10) return
                setCustomFields((prev) => [
                  ...prev,
                  {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    label: '',
                    value: '',
                    hideFromProfile: false
                  }
                ])
              }}
              disabled={customFields.length >= 10}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add field
            </button>
          </div>

          {customFields.length === 0 ? (
            <div className="text-xs text-slate-500"></div>
          ) : (
            <div className="space-y-2">
              {customFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => {
                        const next = e.target.value
                        setCustomFields((prev) =>
                          prev.map((f) => (f.id === field.id ? { ...f, label: next } : f))
                        )
                      }}
                      placeholder="Label"
                      className="col-span-5 w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => {
                        const next = e.target.value
                        setCustomFields((prev) =>
                          prev.map((f) => (f.id === field.id ? { ...f, value: next } : f))
                        )
                      }}
                      placeholder="Value"
                      className="col-span-6 w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomFields((prev) => prev.filter((f) => f.id !== field.id))}
                      className="col-span-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
                      aria-label="Remove custom field"
                      title="Remove"
                    >
                      <Trash03 className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={!!field.hideFromProfile}
                      onChange={(e) => {
                        const next = e.target.checked
                        setCustomFields((prev) =>
                          prev.map((f) => (f.id === field.id ? { ...f, hideFromProfile: next } : f))
                        )
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                    />
                    Hide from Profile
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Slideout>
  )
}

export default SpeakerDetailsSlideout
