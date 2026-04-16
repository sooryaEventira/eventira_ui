import React from 'react'
import { Modal } from '../../ui'
import Button from '../../ui/untitled/Button'

interface AddMenuItemModalPage {
  id: string
  name: string
  isAdded: boolean
}

interface AddMenuItemModalSchedule {
  id: string
  title: string
  isAdded: boolean
}

interface AddMenuItemModalParticipant {
  id: string
  name: string
  isAdded: boolean
}

interface AddMenuItemModalProps {
  isVisible: boolean
  onClose: () => void
  pages: AddMenuItemModalPage[]
  schedules?: AddMenuItemModalSchedule[]
  participants?: AddMenuItemModalParticipant[]
  onAddPage?: (id: string) => void
  onAddSchedule?: (id: string) => void
  onAddParticipant?: (id: string) => void
}

const AddMenuItemModal: React.FC<AddMenuItemModalProps> = ({ isVisible, onClose, pages, schedules = [], participants = [], onAddPage, onAddSchedule, onAddParticipant }) => {
  if (!isVisible) return null

  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      title="Add menu item"
      subtitle="Select page or schedule to be added as navigation item."
      width={640}
      showHeaderBorder={false}
      footer={
        <div className="flex justify-end gap-3 mb-4">
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="mb-4 space-y-4">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Pages</div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden">
            {pages.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500 text-center">No pages available.</div>
            ) : (
              pages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between px-4 py-3 text-sm border-b last:border-b-0 border-slate-100 bg-white hover:bg-slate-50"
                >
                  <span className="text-slate-900">{page.name}</span>
                  {page.isAdded ? (
                    <span className="text-xs font-medium text-slate-400">Added</span>
                  ) : (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:text-primary-dark"
                      onClick={() => onAddPage?.(page.id)}
                    >
                      + Add
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {schedules.length > 0 && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Schedules</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between px-4 py-3 text-sm border-b last:border-b-0 border-slate-100 bg-white hover:bg-slate-50"
                >
                  <span className="text-slate-900">{schedule.title}</span>
                  {schedule.isAdded ? (
                    <span className="text-xs font-medium text-slate-400">Added</span>
                  ) : (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:text-primary-dark"
                      onClick={() => onAddSchedule?.(schedule.id)}
                    >
                      + Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {participants.length > 0 && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Participants</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between px-4 py-3 text-sm border-b last:border-b-0 border-slate-100 bg-white hover:bg-slate-50"
                >
                  <span className="text-slate-900">{participant.name}</span>
                  {participant.isAdded ? (
                    <span className="text-xs font-medium text-slate-400">Added</span>
                  ) : (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:text-primary-dark"
                      onClick={() => onAddParticipant?.(participant.id)}
                    >
                      + Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default AddMenuItemModal

