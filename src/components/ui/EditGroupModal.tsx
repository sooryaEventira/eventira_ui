import React, { useEffect, useState } from 'react'
import Modal from './Modal'

interface EditGroupModalProps {
  isOpen: boolean
  groupName: string
  isLoading?: boolean
  onCancel: () => void
  onConfirm: (newName: string) => void
}

const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  groupName,
  isLoading = false,
  onCancel,
  onConfirm,
}) => {
  const [name, setName] = useState(groupName)

  useEffect(() => {
    if (isOpen) setName(groupName)
  }, [isOpen, groupName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <Modal
      isVisible={isOpen}
      onClose={() => { if (!isLoading) onCancel() }}
      title=""
      width={450}
      maxWidth="90vw"
      showCloseButton={false}
      padding={{ top: 20, right: 24, bottom: 24, left: 24 }}
      showHeaderBorder={false}
      customHeader={
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Edit group name</h2>
          <button
            type="button"
            onClick={() => { if (!isLoading) onCancel() }}
            disabled={isLoading}
            className="inline-flex h-9 w-9 -mt-1 -mr-1 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3 py-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !name.trim() || name.trim() === groupName}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Group name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Enter group name"
          />
        </div>
      </form>
    </Modal>
  )
}

export default EditGroupModal
