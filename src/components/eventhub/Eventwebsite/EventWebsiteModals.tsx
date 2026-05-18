import React from 'react'
import PageCreationModal, { type PageType } from '../../page/PageCreationModal'
import CreateNavFolderModal from './CreateNavFolderModal'
import AddMenuItemModal from './AddMenuItemModal'
import ConfirmDeleteModal from '../../ui/ConfirmDeleteModal'
import Button from '../../ui/untitled/Button'
interface EventWebsiteModalsProps {
  showPageCreationModal: boolean
  onClosePageCreation: () => void
  onPageTypeSelect: (pageType: PageType) => void
  showCreateNavFolderModal: boolean
  onCloseCreateNavFolder: () => void
  onCreateNavFolder: (name: string) => void | Promise<void>
  showAddMenuItemModal: boolean
  onCloseAddMenuItem: () => void
  availableNavPages: Array<{ uuid: string; name: string; is_added: boolean }>
  availableNavSchedules: Array<{ uuid: string; title: string; is_added: boolean }>
  availableNavParticipants: Array<{ uuid: string; name: string; is_added: boolean }>
  onAddMenuPage: (pageUuid: string) => void
  onAddSchedule: (scheduleUuid: string) => void
  onAddParticipant: (participantUuid: string) => void
  showDeleteConfirm: { id: string; name: string } | null
  onCancelDeletePage: () => void
  onConfirmDeletePage: () => void
  deleteFolderCandidate: { id: string; name: string } | null
  isDeletingFolder: boolean
  eventUuidForNavigation: string
  onCancelDeleteFolder: () => void
  onConfirmDeleteFolder: () => void | Promise<void>
}

const EventWebsiteModals: React.FC<EventWebsiteModalsProps> = ({
  showPageCreationModal,
  onClosePageCreation,
  onPageTypeSelect,
  showCreateNavFolderModal,
  onCloseCreateNavFolder,
  onCreateNavFolder,
  showAddMenuItemModal,
  onCloseAddMenuItem,
  availableNavPages,
  availableNavSchedules,
  availableNavParticipants,
  onAddMenuPage,
  onAddSchedule,
  onAddParticipant,
  showDeleteConfirm,
  onCancelDeletePage,
  onConfirmDeletePage,
  deleteFolderCandidate,
  isDeletingFolder,
  onCancelDeleteFolder,
  onConfirmDeleteFolder,
}) => (
  <>
    <PageCreationModal isVisible={showPageCreationModal} onClose={onClosePageCreation} onSelect={onPageTypeSelect} />

    <CreateNavFolderModal
      isVisible={showCreateNavFolderModal}
      onClose={onCloseCreateNavFolder}
      onConfirm={onCreateNavFolder}
    />

    <AddMenuItemModal
      isVisible={showAddMenuItemModal}
      onClose={onCloseAddMenuItem}
      pages={availableNavPages.map((p) => ({ id: p.uuid, name: p.name, isAdded: !!p.is_added }))}
      schedules={availableNavSchedules.map((s) => ({ id: s.uuid, title: s.title, isAdded: !!s.is_added }))}
      participants={availableNavParticipants.map((p) => ({ id: p.uuid, name: p.name, isAdded: !!p.is_added }))}
      onAddPage={onAddMenuPage}
      onAddSchedule={onAddSchedule}
      onAddParticipant={onAddParticipant}
    />

    {showDeleteConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Delete Page</h3>
          <p className="mb-6 text-sm text-slate-600">
            Are you sure you want to delete &quot;{showDeleteConfirm.name}&quot;? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="md" onClick={onCancelDeletePage}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={onConfirmDeletePage} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </div>
        </div>
      </div>
    )}

    <ConfirmDeleteModal
      isOpen={!!deleteFolderCandidate}
      title="Delete folder?"
      itemName={deleteFolderCandidate?.name}
      isLoading={isDeletingFolder}
      onCancel={onCancelDeleteFolder}
      onConfirm={onConfirmDeleteFolder}
    />
  </>
)

export default EventWebsiteModals
