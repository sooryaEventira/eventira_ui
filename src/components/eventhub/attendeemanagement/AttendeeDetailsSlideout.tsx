import React, { useEffect, useState } from 'react'
import { XClose, Camera01, Eye, CheckCircle } from '@untitled-ui/icons-react'
import { Attendee, AttendeeGroup } from './attendeeTypes'
import { Badge, Slideout } from '../../ui/untitled'

interface AttendeeDetailsSlideoutProps {
  isOpen: boolean
  onClose: () => void
  attendee: Attendee | null
  onSave?: (attendee: Attendee) => void
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
  const [institute, setInstitute] = useState('')
  const [post, setPost] = useState('')
  const [description, setDescription] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<AttendeeGroup[]>([])


  useEffect(() => {
    if (attendee && isOpen) {
      setEditedAttendee(attendee)
      const nameParts = attendee.name.split(' ')
      setFirstName(attendee.firstName || nameParts[0] || '')
      setLastName(attendee.lastName || nameParts.slice(1).join(' ') || '')
      setEmail(attendee.email || '')
      setInstitute(attendee.institute || '')
      setPost(attendee.post || '')
      setDescription((attendee as any).description || '')
      setSelectedGroups([...attendee.groups])
    }
  }, [attendee, isOpen])

  const handleRemoveGroup = (groupId: string) => {
    setSelectedGroups((prev) => prev.filter((g) => g.id !== groupId))
  }

  const getGroupVariant = (groupName: string): 'primary' | 'success' | 'warning' | 'info' | 'muted' => {
    if (groupName === 'Speaker') return 'primary'
    if (groupName === 'VIP') return 'success'
    if (groupName === 'Attendee') return 'warning'
    return 'primary'
  }

  const handleSave = () => {
    if (!editedAttendee) return

    const updatedAttendee: Attendee = {
      ...editedAttendee,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email,
      institute,
      post,
      description,
      groups: selectedGroups
    }

    onSave?.(updatedAttendee)
    onClose()
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
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Save
          </button>
        </>
      }
    >
      {/* Banner Image */}
      <div className="relative h-40 w-full overflow-hidden">
        {attendee.bannerUrl ? (
          <img
            src={attendee.bannerUrl}
            alt="Banner"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-purple-200 via-pink-200 to-blue-200" />
        )}
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
            {attendee.avatarUrl ? (
              <img
                src={attendee.avatarUrl}
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
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-md transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Change profile picture"
            >
              <Camera01 className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="View"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-xl font-semibold text-slate-900">{attendee.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {attendee.post && attendee.institute
              ? `${attendee.post} @ ${attendee.institute}`
              : attendee.post || attendee.institute || 'No title'}
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
            value={institute}
            onChange={(e) => setInstitute(e.target.value)}
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
              placeholder="Type a group name and press Enter"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                const input = e.currentTarget
                const value = (input.value || '').trim()
                if (!value) return

                setSelectedGroups((prev) => {
                  const exists = prev.some((g) => String(g.name || '').toLowerCase() === value.toLowerCase())
                  if (exists) return prev
                  const newGroup: AttendeeGroup = {
                    id: Date.now().toString(),
                    name: value,
                    variant: 'primary'
                  }
                  return [...prev, newGroup]
                })
                input.value = ''
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

        {/* Selected groups */}
        {selectedGroups.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Groups
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedGroups.map((group) => (
                <Badge
                  key={group.id}
                  variant={getGroupVariant(group.name)}
                  className="inline-flex items-center gap-1.5"
                >
                  {group.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(group.id)}
                    className="ml-1 hover:text-slate-700"
                    aria-label={`Remove ${group.name}`}
                  >
                    <XClose className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Slideout>
  )
}

export default AttendeeDetailsSlideout

