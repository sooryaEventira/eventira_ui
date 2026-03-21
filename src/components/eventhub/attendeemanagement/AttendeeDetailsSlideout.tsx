import React, { useEffect, useState, useRef } from 'react'
import { XClose, Camera01, Eye, CheckCircle, Plus, Trash03 } from '@untitled-ui/icons-react'
import { Attendee, AttendeeGroup } from './attendeeTypes'
import { Badge, Slideout } from '../../ui/untitled'
import profileBackground from '../../../assets/images/profile_background.jpg'

interface AttendeeDetailsSlideoutProps {
  isOpen: boolean
  onClose: () => void
  attendee: Attendee | null
  onSave?: (attendee: Attendee) => void | Promise<void>
  topOffset?: number
}

const AttendeeDetailsSlideout: React.FC<AttendeeDetailsSlideoutProps> = ({
  isOpen,
  onClose,
  attendee,
  onSave,
  topOffset = 64
}) => {
  const [editedAttendee, setEditedAttendee] = useState<Attendee | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [post, setPost] = useState('')
  const [description, setDescription] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<AttendeeGroup[]>([])
  const [groupsText, setGroupsText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [customFields, setCustomFields] = useState<
    Array<{ id: string; label: string; value: string; hideFromProfile?: boolean }>
  >([])

  useEffect(() => {
    if (attendee && isOpen) {
      setEditedAttendee(attendee)
      const nameParts = attendee.name.split(' ')
      setFirstName(attendee.firstName || nameParts[0] || '')
      setLastName(attendee.lastName || nameParts.slice(1).join(' ') || '')
      setEmail(attendee.email || '')
      setOrganization(attendee.organization || '')
      setPost(attendee.post || '')
      setDescription(attendee.description || (attendee as any).bio || '')
      setSelectedGroups([...attendee.groups])
      setGroupsText((attendee.groups || []).map((g) => g.name).filter(Boolean).join(', '))
      setAvatarUrl(attendee.avatarUrl || null)
      const nextCustomFields =
        (attendee.customFields || []).map((field, idx) => ({
          id: `${Date.now()}-${idx}`,
          label: field.label,
          value: field.value,
          hideFromProfile: false
        })) || []
      setCustomFields(nextCustomFields)
    }
  }, [attendee, isOpen])

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setAvatarUrl(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const parseGroupsFromText = (text: string, prev: AttendeeGroup[]): AttendeeGroup[] => {
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
    if (!editedAttendee) return
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

    const updatedAttendee: Attendee = {
      ...editedAttendee,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email,
      organization,
      post,
      description,
      groups: nextGroups,
      customFields: cleanedCustomFields.length
        ? cleanedCustomFields.map((f) => ({ label: f.label, value: f.value }))
        : undefined
    }

    try {
      await onSave?.(updatedAttendee)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  if (!attendee) return null

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

      {/* Profile Section */}
      <div className="relative -mt-20 px-6 pb-4">
        <div className="flex items-center justify-center gap-3">
          <Badge variant="success" className="text-xs whitespace-nowrap">
            Active
          </Badge>
          <div className="relative">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/svg+xml,image/png,image/jpeg,image/jpg,image/gif"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={attendee.name}
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-slate-200 text-lg font-semibold text-slate-600 shadow-lg">
                {attendee.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
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
          <h2 className="text-xl font-semibold text-slate-900">{attendee.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {attendee.post && attendee.organization
              ? `${attendee.post} @ ${attendee.organization}`
              : attendee.post || attendee.organization || 'No title'}
          </p>
        </div>
      </div>

      {/* Feedback Alert */}
      {attendee.feedbackIncomplete && (
        <div className="mx-6 mb-6 flex items-center justify-between rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-medium text-yellow-800">Feedback incomplete!</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            >
              Send reminder
            </button>
            <button
              type="button"
              className="text-yellow-600 hover:text-yellow-800"
              aria-label="Dismiss"
            >
              <XClose className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
          {attendee.emailVerified && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-600">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>
                Verified {attendee.emailVerifiedDate || '2 Jan, 2025'}
              </span>
            </div>
          )}
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

        {/* Designation + Group (same row) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Designation
            </label>
            <input
              type="text"
              value={post}
              onChange={(e) => setPost(e.target.value)}
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
              placeholder="e.g. VIP, Attendee"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                commitGroups()
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write a brief description..."
            rows={4}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
          />
        </div>

        {/* Custom fields (match Create profile modal) */}
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
                <div key={field.id} className="grid grid-cols-12 gap-2">
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

export default AttendeeDetailsSlideout

