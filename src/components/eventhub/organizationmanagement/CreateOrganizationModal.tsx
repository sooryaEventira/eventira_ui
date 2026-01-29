import { useEffect, useMemo, useState } from 'react'
import Modal from '../../ui/Modal'

interface CreateOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  isSaving?: boolean
  initialValues?: {
    name?: string
    website?: string
    linkedin?: string
    groups?: string
    description?: string
    logoLink?: string
    stallNumber?: string
  }
  onSave: (data: {
    name: string
    website?: string
    linkedin?: string
    groups?: string
    description?: string
    logoLink?: string
    stallNumber?: string
  }) => void
}

const CreateOrganizationModal = ({
  isOpen,
  onClose,
  isSaving = false,
  initialValues,
  onSave
}: CreateOrganizationModalProps) => {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [groups, setGroups] = useState('')
  const [description, setDescription] = useState('')
  const [logoLink, setLogoLink] = useState('')
  const [stallNumber, setStallNumber] = useState('')

  const isEdit = useMemo(() => {
    const hasInitial =
      !!initialValues?.name ||
      !!initialValues?.website ||
      !!initialValues?.linkedin ||
      !!initialValues?.groups ||
      !!initialValues?.description ||
      !!initialValues?.logoLink ||
      !!initialValues?.stallNumber
    return hasInitial
  }, [initialValues])

  useEffect(() => {
    if (!isOpen) return
    setName(initialValues?.name || '')
    setWebsite(initialValues?.website || '')
    setLinkedin(initialValues?.linkedin || '')
    setGroups(initialValues?.groups || '')
    setDescription(initialValues?.description || '')
    setLogoLink(initialValues?.logoLink || '')
    setStallNumber(initialValues?.stallNumber || '')
  }, [isOpen, initialValues])

  const handleClose = () => {
    onClose()
  }

  const handleSave = () => {
    if (isSaving) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      alert('Please enter organization name')
      return
    }

    onSave({
      name: trimmedName,
      website: website.trim() || undefined,
      linkedin: linkedin.trim() || undefined,
      groups: groups.trim() || undefined,
      description: description.trim() || undefined,
      logoLink: logoLink.trim() || undefined,
      stallNumber: stallNumber.trim() || undefined
    })
  }

  return (
    <Modal
      isVisible={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit organization' : 'Create organization'}
      subtitle="Add organization details."
      maxWidth={560}
      showHeaderBorder={true}
      footer={
        <div className="flex w-full items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="pt-5 pb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Organization name"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Other Links</label>
          <input
            type="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://www.linkedin.com/company/..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Group</label>
          <input
            type="text"
            value={groups}
            onChange={(e) => setGroups(e.target.value)}
            placeholder="e.g. exhibitors, sponsors, partners"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
          
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
          />
        </div>

        {/* <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Stall number</label>
          <input
            type="text"
            value={stallNumber}
            onChange={(e) => setStallNumber(e.target.value)}
            placeholder="Stall number"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div> */}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Logo link</label>
          <input
            type="url"
            value={logoLink}
            onChange={(e) => setLogoLink(e.target.value)}
            placeholder="https://.../logo.png"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
      </div>
    </Modal>
  )
}

export default CreateOrganizationModal

