import React, { useState, useEffect } from 'react'
import { ChevronDown } from '@untitled-ui/icons-react'
import {Mail01, Bell01} from '@untitled-ui/icons-react'
export type BroadcastType = 'email' | 'push-notification'

interface BroadcastTypeModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called when user selects a type (legacy). */
  onSelect?: (type: BroadcastType) => void
  /** Called when user clicks "Create schedule" with title and type. */
  onSubmit?: (data: { title: string; type: BroadcastType }) => void
  /** Edit mode: pre-fills fields and locks the type dropdown. */
  mode?: 'create' | 'edit'
  initialTitle?: string
  initialType?: BroadcastType
  /** Shows loading spinner on the submit button (used while fetching draft detail). */
  isSubmitting?: boolean
}

const TYPE_OPTIONS: { value: BroadcastType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'email', label: 'Email', icon: <Mail01 className="h-5 w-5 text-slate-500" />, description: 'Send via email to subscriber inboxes.' },
  { value: 'push-notification', label: 'Push Notification', icon: <Bell01 className="h-5 w-5 text-slate-500" />, description: 'Send push notifications to subscriber devices.' }
]

const BroadcastTypeModal: React.FC<BroadcastTypeModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  onSubmit,
  mode = 'create',
  initialTitle = '',
  initialType,
  isSubmitting = false,
}) => {
  const isEditMode = mode === 'edit'
  const [title, setTitle] = useState(initialTitle)
  const [type, setType] = useState<BroadcastType | null>(initialType ?? null)
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const [isSlidingIn, setIsSlidingIn] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle)
      setType(initialType ?? null)
      const t = requestAnimationFrame(() => setIsSlidingIn(true))
      return () => cancelAnimationFrame(t)
    }
    setIsSlidingIn(false)
  }, [isOpen, initialTitle, initialType])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTypeDropdownOpen(false)
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleCreateBroadcast = () => {
    const selectedType = type ?? 'push-notification'
    if (onSubmit) {
      // In edit mode the parent controls closing (async fetch), so don't call onClose here.
      onSubmit({ title: title.trim(), type: selectedType })
      if (!isEditMode) {
        setTitle('')
        setType(null)
        onClose()
      }
    } else if (onSelect) {
      onSelect(selectedType)
      setTitle('')
      setType(null)
      onClose()
    }
  }

  const handleCancel = () => {
    setTitle('')
    setType(null)
    setTypeDropdownOpen(false)
    onClose()
  }

  const selectedTypeLabel = type ? TYPE_OPTIONS.find((o) => o.value === type)?.label : null

  if (!isOpen) return null

  return (
    <>
      {/* Blurred backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
        aria-hidden
        onClick={handleCancel}
      />

      {/* Slideout panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col transition-transform duration-200 ease-out ${isSlidingIn ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-labelledby="slideout-title"
        aria-modal="true"
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="shrink-0 px-6 pt-6 pb-4">
            <h2 id="slideout-title" className="text-lg font-bold text-slate-900">
              {isEditMode ? 'Edit Broadcast' : 'New Broadcast'}
            </h2>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="space-y-5">
              <div>
                <label htmlFor="broadcast-title" className="block text-sm font-medium text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="broadcast-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter broadcast title"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="broadcast-type" className="block text-sm font-medium text-slate-700 mb-1">
                  Type
                </label>
                <div className="relative">
                  <button
                    id="broadcast-type"
                    type="button"
                    onClick={() => { if (!isEditMode) setTypeDropdownOpen((v) => !v) }}
                    disabled={isEditMode}
                    className={[
                      'w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left focus:outline-none',
                      isEditMode
                        ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary/40 focus:border-primary'
                    ].join(' ')}
                  >
                    <span className={selectedTypeLabel ? (isEditMode ? 'text-slate-500' : 'text-slate-900') : 'text-slate-400'}>
                      {selectedTypeLabel ?? 'Select type'}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${isEditMode ? 'text-slate-300' : 'text-slate-500'} ${typeDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {!isEditMode && typeDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        aria-hidden
                        onClick={() => setTypeDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        {TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setType(opt.value)
                              setTypeDropdownOpen(false)
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm ${type === opt.value ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                          >
                            <span className="shrink-0">{opt.icon}</span>
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {type && (
                  <p className="mt-1.5 text-sm text-slate-500">
                    {TYPE_OPTIONS.find((o) => o.value === type)?.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateBroadcast}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {isEditMode ? (isSubmitting ? 'Loading…' : 'Update broadcast') : 'Create Broadcast'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default BroadcastTypeModal
