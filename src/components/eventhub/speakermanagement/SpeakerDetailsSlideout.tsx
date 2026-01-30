import React, { useEffect, useState } from 'react'
import { XClose, Camera01, Eye } from '@untitled-ui/icons-react'
import { Speaker, SpeakerGroup } from './speakerTypes'
import { Badge, Slideout } from '../../ui/untitled'

interface SpeakerDetailsSlideoutProps {
  isOpen: boolean
  onClose: () => void
  speaker: Speaker | null
  onSave?: (speaker: Speaker) => void
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
    }
  }, [speaker, isOpen])

  const handleRemoveGroup = (groupId: string) => {
    setSelectedGroups((prev) => prev.filter((g) => g.id !== groupId))
  }

  const getGroupVariant = (groupName: string): 'primary' | 'success' | 'warning' | 'info' | 'muted' => {
    if (groupName === 'Keynote Speaker') return 'primary'
    if (groupName === 'Panelist') return 'success'
    if (groupName === 'Workshop Leader') return 'warning'
    return 'primary'
  }

  const handleSave = () => {
    if (!editedSpeaker) return

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
      groups: selectedGroups
    }

    onSave?.(updatedSpeaker)
    onClose()
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
        {speaker.bannerUrl ? (
          <img
            src={speaker.bannerUrl}
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
            {speaker.status === 'active' ? 'Active' : speaker.status === 'pending' ? 'Pending' : 'Inactive'}
          </Badge>
          <div className="relative">
            {speaker.avatarUrl ? (
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
                  const newGroup: SpeakerGroup = {
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

export default SpeakerDetailsSlideout
