import React from 'react'
import Modal from './Modal'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  title?: string
  description?: string
  itemName?: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = 'Delete',
  description,
  itemName,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false,
  onCancel,
  onConfirm
}) => {
  const subtitle =
    description ||
    (itemName
      ? `Are you sure you want to delete “${itemName}”? This action cannot be undone.`
      : 'Are you sure you want to delete this item? This action cannot be undone.')

  return (
    <Modal
      isVisible={isOpen}
      onClose={() => {
        if (isLoading) return
        onCancel()
      }}
      title=""
      width={480}
      maxWidth="90vw"
      showCloseButton={false}
      padding={{ top: 20, right: 24, bottom: 24, left: 24 }}
      showHeaderBorder={false}
      customHeader={
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={() => {
              if (isLoading) return
              onCancel()
            }}
            className="inline-flex h-9 w-9 -mt-1 -mr-1 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
            disabled={isLoading}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300/60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Deleting...' : confirmText}
          </button>
        </div>
      }
    >
      <div className="text-sm text-slate-600">{subtitle}</div>
    </Modal>
  )
}

export default ConfirmDeleteModal

