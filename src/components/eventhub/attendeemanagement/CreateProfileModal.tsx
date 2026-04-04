import React, { useState, useRef, useEffect } from 'react'
import { XClose, Upload01, HelpCircle, Plus, Trash03 } from '@untitled-ui/icons-react'
import { createAttendee, fetchTags } from '../../../services/attendeeService'
import CreatableMultiSelect, { type CreatableMultiSelectOption } from '../../ui/untitled/CreatableMultiSelect'
import type { MultiValue, ActionMeta } from 'react-select'

interface CreateProfileModalProps {
  isOpen: boolean
  onClose: () => void
  eventUuid?: string
  onSave: (data: {
    firstName: string
    lastName: string
    email: string
    organization?: string
    role?: string
    groups?: string[]
    description?: string
    avatarUrl?: string
    customFields?: Array<{ id: string; label: string; value: string; hideFromProfile?: boolean }>
  }) => void
}

const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  isOpen,
  onClose,
  eventUuid,
  onSave
}) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [role, setRole] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<CreatableMultiSelectOption[]>([])
  const [tagOptions, setTagOptions] = useState<CreatableMultiSelectOption[]>([])
  const [description, setDescription] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customFields, setCustomFields] = useState<
    Array<{ id: string; label: string; value: string; hideFromProfile?: boolean }>
  >([])

  useEffect(() => {
    if (!isOpen || !eventUuid) return
    fetchTags(eventUuid).then((tags) => {
      setTagOptions(tags.filter((t) => t.is_active !== false).map((t) => ({ value: t.uuid, label: t.name })))
    }).catch(() => {})
  }, [isOpen, eventUuid])

  if (!isOpen) return null

  const handleFileSelect = (file: File) => {
    if (file) {
      const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif']
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid image file (SVG, PNG, JPG, or GIF)')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      alert('Please fill in all required fields')
      return
    }
    if (!eventUuid) {
      alert('Event UUID is required. Please select an event first.')
      return
    }
    if (isSaving) return
    setIsSaving(true)

    const cleanedCustomFields = customFields
      .map((f) => ({
        id: f.id,
        label: (f.label || '').trim(),
        value: (f.value || '').trim(),
        hideFromProfile: !!f.hideFromProfile
      }))
      .filter((f) => f.label || f.value)

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      organization: organization.trim() || undefined,
      role: role.trim() || undefined,
      groups: selectedGroups.map((g) => g.value),
      description: description.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
      customFields: cleanedCustomFields.length ? cleanedCustomFields : undefined
    }

    try {
      // Persist to DB (create attendee)
      await createAttendee(eventUuid, {
        first_name: payload.firstName,
        last_name: payload.lastName,
        email: payload.email,
        organization: payload.organization,
        designation: payload.role,
        description: payload.description,
        groups: payload.groups.length ? payload.groups : undefined,
        custom_fields: payload.customFields?.length
          ? Object.fromEntries(payload.customFields.map((f) => [f.label, f.value]))
          : undefined,
      })

      onSave(payload)

      // Reset form
      setFirstName('')
      setLastName('')
      setEmail('')
      setOrganization('')
      setRole('')
      setSelectedGroups([])
      setDescription('')
      setAvatarUrl(null)
      setCustomFields([])
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create attendee. Please try again.'
      alert(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form
    setFirstName('')
    setLastName('')
    setEmail('')
    setOrganization('')
    setRole('')
    setSelectedGroups([])
    setDescription('')
    setAvatarUrl(null)
    setCustomFields([])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative z-50 w-[450px]  max-w-2xl mx-4 bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Create profile</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a username and write a brief intro.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <XClose className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 max-h-[min(600px,calc(100vh-250px))] overflow-y-auto">
          {/* Profile photo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Profile photo</label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/svg+xml,image/png,image/jpeg,image/jpg,image/gif"
                onChange={handleFileInputChange}
                className="hidden"
              />
              {avatarUrl ? (
                <div className="space-y-1">
                  <img
                    src={avatarUrl}
                    alt="Profile preview"
                    className="mx-auto h-24 w-24 rounded-full object-cover"
                  />
                  <p className="text-xs text-slate-600">Click to change image</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-center">
                    <Upload01 className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-500">
                    SVG, PNG, JPG or GIF (max. 800x400px)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                First name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              required
            />

          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Organization
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Organization"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Designation
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Designation"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Group
            </label>
            <CreatableMultiSelect
              options={tagOptions}
              value={selectedGroups}
              placeholder="Select or create groups..."
              onChange={(newValue: MultiValue<CreatableMultiSelectOption>, _actionMeta: ActionMeta<CreatableMultiSelectOption>) =>
                setSelectedGroups([...newValue])
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a brief introduction to show on your profile..."
              rows={3}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
            />
          </div>

          {/* Custom fields (up to 10) */}
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
                        setCustomFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, label: next } : f)))
                      }}
                      placeholder="Label"
                      className="col-span-5 w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => {
                        const next = e.target.value
                        setCustomFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, value: next } : f)))
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

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200">
          <a
            href="#"
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-primary transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            Need help?
          </a>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateProfileModal
