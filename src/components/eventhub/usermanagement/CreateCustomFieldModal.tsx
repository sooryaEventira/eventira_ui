import React, { useState, useEffect } from 'react'
import Modal from '../../ui/Modal'

interface CreateCustomFieldModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    fieldName: string
    fieldType: 'Text' | 'Dropdown' | 'PDF'
    visibility: 'Visible to users' | 'Invisible'
  }) => void
}

const CreateCustomFieldModal: React.FC<CreateCustomFieldModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState<'Text' | 'Dropdown' | 'PDF' | ''>('')
  const [visibility, setVisibility] = useState<'Visible to users' | 'Invisible' | ''>('')

  useEffect(() => {
    if (!isOpen) {
      setFieldName('')
      setFieldType('')
      setVisibility('')
    }
  }, [isOpen])

  const handleConfirm = () => {
    if (fieldName.trim() && fieldType && visibility) {
      onConfirm({
        fieldName: fieldName.trim(),
        fieldType: fieldType as 'Text' | 'Dropdown' | 'PDF',
        visibility: visibility as 'Visible to users' | 'Invisible'
      })
      setFieldName('')
      setFieldType('')
      setVisibility('')
      onClose()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && fieldName.trim() && fieldType && visibility) {
      handleConfirm()
    }
  }

  return (
    <Modal
      isVisible={isOpen}
      onClose={onClose}
      title=""
      width={380}
      maxWidth="90vw"
      showCloseButton={false}
      padding={{ top: 20, right: 24, bottom: 24, left: 24 }}
      showHeaderBorder={false}
      customHeader={
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Create new field</h2>
            <p className="mt-1 text-sm text-slate-500">Please enter a name for this field.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 -mt-1 -mr-1 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!fieldName.trim() || !fieldType || !visibility}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Field name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Field name<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g. Company name"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
        </div>

        {/* Field type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Field type<span className="text-red-500">*</span>
          </label>
          <select
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as 'Text' | 'Dropdown' | 'PDF' | '')}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
          >
            <option value="">Select type</option>
            <option value="Text">Text</option>
            <option value="Dropdown">Dropdown</option>
            <option value="PDF">PDF</option>
          </select>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Visibility<span className="text-red-500">*</span>
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'Visible to users' | 'Invisible' | '')}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
          >
            <option value="">Select visibility</option>
            <option value="Visible to users">Visible to users</option>
            <option value="Invisible">Invisible</option>
          </select>
        </div>
      </div>
    </Modal>
  )
}

export default CreateCustomFieldModal
