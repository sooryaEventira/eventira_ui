import React, { useState, useEffect } from 'react'
import Modal from '../../ui/Modal'
import { createTag } from '../../../services/attendeeService'
import { useEventForm } from '../../../contexts/EventFormContext'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (groupName: string) => void
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const { createdEvent } = useEventForm()
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setGroupName('')
      setDescription('')
      setIsLoading(false)
    }
  }, [isOpen])

  const handleConfirm = async () => {
    if (!groupName.trim()) {
      return
    }

    if (!createdEvent?.uuid) {
      // Error is handled by errorHandler
      return
    }

    setIsLoading(true)

    try {
      await createTag({
        event_uuid: createdEvent.uuid,
        name: groupName.trim(),
        description: description.trim() || '',
        is_active: true
      })

      // Await onConfirm so parent can refresh the group table before we close
      await Promise.resolve(onConfirm(groupName.trim()))
      setGroupName('')
      setDescription('')
      onClose()
    } catch (error) {
      // Error is already handled by createTag function with toast
      // Don't close modal on error so user can retry
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && groupName.trim() && !isLoading) {
      handleConfirm()
    }
  }

  return (
    <Modal
      isVisible={isOpen}
      onClose={onClose}
      title=""
      width={480}
      maxWidth="90vw"
      showCloseButton={false}
      padding={{ top: 20, right: 24, bottom: 24, left: 24 }}
      showHeaderBorder={false}
      customHeader={
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Create new group.</h2>
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
            className="px-4 py-2  text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!groupName.trim() || isLoading}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Confirm'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Group name<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g. Speaker"
            disabled={isLoading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description <span className="text-slate-400 text-xs">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. All event speakers"
            disabled={isLoading}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          />
        </div>
      </div>
    </Modal>
  )
}

export default CreateGroupModal

