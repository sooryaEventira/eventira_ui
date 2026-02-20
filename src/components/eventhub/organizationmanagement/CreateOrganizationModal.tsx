import { useEffect, useMemo, useState } from 'react'
import Modal from '../../ui/Modal'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

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
    return !!(
      initialValues?.name ||
      initialValues?.website ||
      initialValues?.linkedin ||
      initialValues?.groups ||
      initialValues?.description ||
      initialValues?.logoLink ||
      initialValues?.stallNumber
    )
  }, [initialValues])

  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'clean'],
    ],
  }

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
      description: description,
      logoLink: logoLink.trim() || undefined,
      stallNumber: stallNumber.trim() || undefined
    })
  }

  return (
    <Modal
      isVisible={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit organization' : 'Create organization'}
      subtitle="Add organization details."
      width={672}
      showHeaderBorder={true}
      footer={
        <div className="flex w-full items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
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
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Other Links</label>
          <input
            type="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://www.linkedin.com/company/..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Group</label>
          <input
            type="text"
            value={groups}
            onChange={(e) => setGroups(e.target.value)}
            placeholder="e.g. exhibitors, sponsors, partners"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <div className="rich-text-editor">
            <ReactQuill
              theme="snow"
              value={description}
              onChange={setDescription}
              modules={modules}
              className="bg-white rounded-md"
              placeholder="Enter organization description..."
            />
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
  .rich-text-editor .ql-container {
    border-bottom-left-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    min-height: 150px;
    font-size: 0.875rem;
  }
  .rich-text-editor .ql-toolbar {
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    background-color: #f8fafc;
  }
` }} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Logo link</label>
          <input
            type="url"
            value={logoLink}
            onChange={(e) => setLogoLink(e.target.value)}
            placeholder="https://.../logo.png"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
          />
        </div>
      </div>
    </Modal>
  )
}

export default CreateOrganizationModal