import React, { useEffect, useRef, useState } from 'react'
import { Modal } from '../ui'
import Button from '../ui/untitled/Button'

interface CreateNavFolderModalProps {
  isVisible: boolean
  onClose: () => void
  onConfirm: (folderName: string) => void
}

const CreateNavFolderModal: React.FC<CreateNavFolderModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
}) => {
  const [folderName, setFolderName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isVisible) return
    setFolderName('')
    const t = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 100)
    return () => clearTimeout(t)
  }, [isVisible])

  const handleSubmit = () => {
    const name = folderName.trim()
    if (!name) return
    onConfirm(name)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      title="New Folder"
      subtitle="Please enter a name for this folder."
      width={420}
      showHeaderBorder={false}
      footer={
        <div className="flex justify-end gap-3 mb-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!folderName.trim()}>
            Confirm
          </Button>
        </div>
      }
    >
      <div className="space-y-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Folder name</label>
          <input
            ref={inputRef}
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="e.g. Website design"
            autoFocus
          />
        </div>
      </div>
    </Modal>
  )
}

export default CreateNavFolderModal

