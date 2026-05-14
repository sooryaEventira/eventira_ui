import React, { useEffect, useState } from 'react'
import { XClose } from '@untitled-ui/icons-react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

interface EditOrganizationSlideoutProps {
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

const modules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'clean'],
  ],
}

const EditOrganizationSlideout: React.FC<EditOrganizationSlideoutProps> = ({
  isOpen,
  onClose,
  isSaving = false,
  initialValues,
  onSave
}) => {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [groups, setGroups] = useState('')
  const [description, setDescription] = useState('')
  const [logoLink, setLogoLink] = useState('')
  const [stallNumber, setStallNumber] = useState('')
  const [isSlidingIn, setIsSlidingIn] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName(initialValues?.name ?? '')
      setWebsite(initialValues?.website ?? '')
      setLinkedin(initialValues?.linkedin ?? '')
      setGroups(initialValues?.groups ?? '')
      setDescription(initialValues?.description ?? '')
      setLogoLink(initialValues?.logoLink ?? '')
      setStallNumber(initialValues?.stallNumber ?? '')
      const t = requestAnimationFrame(() => setIsSlidingIn(true))
      return () => cancelAnimationFrame(t)
    }
    setIsSlidingIn(false)
  }, [isOpen, initialValues])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, isSaving])

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
      description,
      logoLink: logoLink.trim() || undefined,
      stallNumber: stallNumber.trim() || undefined
    })
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed top-[64px] right-0 bottom-0 left-0 z-[1000] bg-black/50"
        aria-hidden
        onClick={() => { if (!isSaving) onClose() }}
      />

      <div
        className={`fixed top-[64px] right-0 bottom-0 z-[1001] w-full max-w-2xl bg-white shadow-xl flex flex-col transition-transform duration-200 ease-out ${isSlidingIn ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-labelledby="edit-org-title"
        aria-modal="true"
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="edit-org-title" className="text-lg font-semibold text-slate-900">Edit organization</h2>
            <p className="mt-0.5 text-sm text-slate-500">Update organization details.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Close"
          >
            <XClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-org-name" className="flex w-full flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Name <span className="text-rose-500">*</span>
                </span>
              <input
                id="edit-org-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Organization name"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              />
              </label>
            </div>

            <div>
              <label htmlFor="edit-org-website" className="flex w-full flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Website</span>
              <input
                id="edit-org-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              />
              </label>
            </div>

            <div>
              <label htmlFor="edit-org-links" className="flex w-full flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Other links</span>
              <input
                id="edit-org-links"
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://www.linkedin.com/company/..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              />
              </label>
            </div>

            <div>
              <label htmlFor="edit-org-group" className="flex w-full flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Group</span>
              <input
                id="edit-org-group"
                type="text"
                value={groups}
                onChange={(e) => setGroups(e.target.value)}
                placeholder="e.g. exhibitors, sponsors, partners"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              />
              </label>
            </div>

            <div>
              <div className="flex w-full flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</span>
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
              </div>
              <style dangerouslySetInnerHTML={{ __html: `
  .rich-text-editor .ql-container {
    border-bottom-left-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    min-height: 120px;
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
              <label htmlFor="edit-org-logo" className="flex w-full flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Logo link</span>
              <input
                id="edit-org-logo"
                type="url"
                value={logoLink}
                onChange={(e) => setLogoLink(e.target.value)}
                placeholder="https://.../logo.png"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              />
              </label>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </>
  )
}

export default EditOrganizationSlideout
