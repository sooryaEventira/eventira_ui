import React from 'react'
import { Modal } from '../../ui'
import Button from '../../ui/untitled/Button'

interface AddMenuItemModalPage {
  id: string
  name: string
  isAdded: boolean
}

interface AddMenuItemModalProps {
  isVisible: boolean
  onClose: () => void
  pages: AddMenuItemModalPage[]
  onAddPage?: (id: string) => void
}

const AddMenuItemModal: React.FC<AddMenuItemModalProps> = ({ isVisible, onClose, pages, onAddPage }) => {
  if (!isVisible) return null

  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      title="Add menu item"
      subtitle="Select page to be added as navigation item."
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
      <div className="mb-4">
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
    </Modal>
  )
}

export default AddMenuItemModal

