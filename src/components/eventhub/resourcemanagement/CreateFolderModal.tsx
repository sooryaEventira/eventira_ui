import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '../../ui'
import { Button } from '../../ui/untitled'
import { createFolder } from '../../../services/resourceService'
import { useEventForm } from '../../../contexts/EventFormContext'

interface CreateFolderModalProps {
  isVisible: boolean
  onClose: () => void
  onCreate: (folderData: { uuid: string; name: string }) => void
  initialName?: string
  parentFolderId?: string | null
  containerStyle?: React.CSSProperties
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isVisible,
  onClose,
  onCreate,
  initialName = '',
  parentFolderId = null,
  containerStyle
}) => {
  const [folderName, setFolderName] = useState(initialName)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { createdEvent } = useEventForm()

  useEffect(() => {
    if (isVisible) {
      setFolderName(initialName)
      setIsLoading(false)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isVisible, initialName])

  const handleSubmit = async () => {
    if (!folderName.trim() || isLoading) {
      return
    }

    if (!createdEvent?.uuid) {
      console.error('Event UUID is required to create folder')
      return
    }

    setIsLoading(true)

    try {
      const folderData: { name: string; event_uuid: string; parent?: string } = {
        name: folderName.trim(),
        event_uuid: createdEvent.uuid,
      }
      
      // Add parent field if parentFolderId is provided
      if (parentFolderId) {
        folderData.parent = parentFolderId
        console.log('Creating nested folder with parent:', parentFolderId)
      } else {
        console.log('Creating root folder (no parent)')
      }
      
      console.log('Folder data being sent:', folderData)
      const response = await createFolder(folderData)
      console.log('Folder created successfully:', response)

      // Call onCreate with the folder data from API response
      onCreate({
        uuid: response.uuid,
        name: response.name,
      })

      setFolderName('')
      onClose()
    } catch (error) {
      // Error is already handled by createFolder function (toast message)
      console.error('Failed to create folder:', error)
      
      // Even if there's an error (like "Folder already exists"), reload folders
      // in case the folder exists but in a different location or the error is misleading
      if (error instanceof Error && error.message.includes('already exists')) {
        // Still call onCreate to trigger folder reload
        // This will refresh the folder list to show the existing folder
        onCreate({ uuid: '', name: '' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      title={initialName ? 'Rename folder' : 'Create folder'}
      subtitle={initialName ? 'Enter a new name for this folder' : 'Enter a name for the new folder'}
      width={400}
      showHeaderBorder={false}
      containerStyle={containerStyle}
      footer={
        <div className="flex justify-end gap-3 mb-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!folderName.trim() || isLoading}>
            {isLoading ? 'Creating...' : (initialName ? 'Rename' : 'Create')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Folder name
          </label>
          <input
            ref={inputRef}
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Enter folder name"
            autoFocus
          />
        </div>
      </div>
    </Modal>
  )
}

export default CreateFolderModal

