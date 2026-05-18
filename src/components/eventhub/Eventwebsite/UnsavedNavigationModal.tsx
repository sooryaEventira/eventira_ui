import React from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, XClose } from '@untitled-ui/icons-react'

interface UnsavedNavigationModalProps {
  isOpen: boolean
  saveLabel?: string
  onClose: () => void
  onDiscard: () => void
  onSave: () => void
}

const UnsavedNavigationModal: React.FC<UnsavedNavigationModalProps> = ({
  isOpen,
  saveLabel = 'Save changes',
  onClose,
  onDiscard,
  onSave,
}) => {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 10000 }}>
      <div className="fixed bottom-0 left-0 right-0 top-[64px] bg-black/50" />
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center" style={{ top: 64 }}>
        <div className="pointer-events-auto relative mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Close"
          >
            <XClose className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">You have unpublished changes</h3>
              <p className="mt-1.5 text-sm text-slate-600">
                You have unpublished navigation changes. Publish now to apply them, or discard to leave without saving.
              </p>
            </div>
            <div className="mt-3 flex w-full flex-row gap-3">
              <button
                type="button"
                onClick={onDiscard}
                className="min-h-[42px] flex-1 rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#344054]"
              >
                Discard changes
              </button>
              <button
                type="button"
                onClick={onSave}
                className="min-h-[42px] flex-1 rounded-lg border border-[#6938EF] bg-[#6938EF] px-3.5 py-2.5 text-sm font-semibold text-white"
              >
                {saveLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default UnsavedNavigationModal
