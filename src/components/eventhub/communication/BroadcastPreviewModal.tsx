import React from 'react'
import { Modal } from '../../ui'

interface BroadcastPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: () => void
  subject: string
  message: string
  isSending?: boolean
  recipients?: string[] // Array of selected group/tag names
  attachments?: Array<{ uuid: string; name: string; sizeLabel: string }>
}

const BroadcastPreviewModal: React.FC<BroadcastPreviewModalProps> = ({
  isOpen,
  onClose,
  onSend,
  subject,
  message,
  isSending = false,
  recipients = [],
  attachments = [],
}) => {
  return (
    <Modal
      isVisible={isOpen}
      onClose={onClose}
      title="Preview "
      
      width={600}
      maxWidth={800}
      borderRadius={16}
      padding={{ top: 24, right: 24, bottom: 24, left: 24 }}
    >
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-slate-200 p-4 space-y-4">
          <div>
            <span className="font-bold text-slate-900">Subject: </span>
            <span className="text-slate-700">{subject}</span>
          </div>
          <div className="border-t border-slate-200 pt-4">
             <div
              className="broadcast-editor-content text-slate-600"
              dangerouslySetInnerHTML={{ __html: message }}
            />
          </div>
          {recipients.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <div className="mb-2">
                <span className="font-bold text-slate-900">Recipients: </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recipients.map((recipient, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {recipient}
                  </span>
                ))}
              </div>
            </div>
          )}
          {attachments.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <div className="mb-2">
                <span className="font-bold text-slate-900">Attachments: </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.uuid}
                    className="flex items-center gap-1.5 rounded bg-slate-100 px-2.5 py-1.5 text-sm max-w-xs"
                  >
                    <span className="truncate font-medium text-blue-600">{attachment.name}</span>
                    <span className="shrink-0 text-slate-400">({attachment.sizeLabel})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={isSending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default BroadcastPreviewModal
