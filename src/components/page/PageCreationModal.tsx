import React, { useState } from 'react'
import clsx from 'clsx'
import { HelpCircle } from '@untitled-ui/icons-react'
import { Modal } from '../ui'

export type PageType = 
  | 'scratch'
  | 'attendee'
  | 'schedule'
  | 'html-general'
  | 'folder'
  | 'organization'
  | 'hyperlink'
  | 'qr-scanner'
  | 'documents'
  | 'gallery'
  | 'forms'
  | 'meeting-room'

interface PageTypeOption {
  id: PageType
  title: string
  description: string
}

const pageTypes: PageTypeOption[] = [
  { id: 'scratch', title: 'Create from scratch', description: 'Create a custom page from scratch.' },
  // { id: 'attendee', title: 'Attendee page', description: 'List out users' },
  // { id: 'schedule', title: 'Schedule page', description: 'Create sessions' },
  // { id: 'html-general', title: 'HTML/General page', description: 'Create welcome page, venue, etc.' },
  { id: 'folder', title: 'Folder', description: 'Create folders' },
  // { id: 'organization', title: 'Organization page', description: 'List partners, exhibitors' },
  // { id: 'hyperlink', title: 'Hyperlink', description: 'Insert any link' },
  // { id: 'qr-scanner', title: 'App QR Scanner', description: 'Add QR code' },
  // { id: 'documents', title: 'Documents list', description: 'List your documents' },
  // { id: 'gallery', title: 'Gallery page', description: 'List partners, exhibitors' },
  // { id: 'forms', title: 'Forms', description: 'Insert any link' },
  // { id: 'meeting-room', title: 'Meeting room', description: 'Add QR code' }
]

interface PageCreationModalProps {
  isVisible: boolean
  onClose: () => void
  onSelect: (pageType: PageType) => void
}

const PageCreationModal: React.FC<PageCreationModalProps> = ({
  isVisible,
  onClose,
  onSelect
}) => {
  const [selectedPageType, setSelectedPageType] = useState<PageType>('attendee')

  const handleSelect = () => {
    onClose()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onSelect(selectedPageType)
      })
    })
  }

  const footer = (
    <div className="flex w-full items-center justify-between px-6 pb-6 pt-1.5">
      <button
        type="button"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100"
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
        Need help?
      </button>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="min-w-[80px] rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSelect}
          data-modal-select-button="true"
          className="min-w-[80px] rounded-md bg-[#6938EF] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5925DC]"
        >
          Select
        </button>
      </div>
    </div>
  )

  const optionBaseClasses =
    'relative flex w-full cursor-pointer flex-col gap-1 rounded-lg border bg-white p-3 transition hover:border-primary/40 hover:bg-primary/5 focus:outline-none'

  const renderCard = (pageType: PageTypeOption) => {
    const isSelected = selectedPageType === pageType.id
    return (
      <button
        key={pageType.id}
        type="button"
        onClick={() => setSelectedPageType(pageType.id)}
        className={clsx(
          optionBaseClasses,
          isSelected ? 'border-2 border-[#6938EF] bg-[#6938EF]/10' : 'border-slate-200'
        )}
      >
        <div className="flex flex-1 flex-col gap-1 pr-9 text-left">
          <span className={clsx('text-[15px] font-semibold', isSelected ? 'text-[#6938EF]' : 'text-slate-900')}>
            {pageType.title}
          </span>
          <span className="line-clamp-1 text-[13px] text-slate-500">{pageType.description}</span>
        </div>
        <span
          className={clsx(
            'absolute right-3 top-3 h-5 w-5 rounded-full border transition',
            isSelected 
              ? 'border-[6px] border-[#6938EF]' 
              : 'border-2 border-slate-300'
          )}
          aria-hidden="true"
        />
      </button>
    )
  }

  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      title="Pages"
      width={560}
      maxWidth={560}
      maxHeight="90vh"
      borderRadius={16}
      footer={footer}
      zIndex={10000}
      padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
      customHeader={(
        <div className="flex w-full items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-xl font-semibold text-slate-900">Pages</h2>
        </div>
      )}
      contentStyle={{ padding: 0 }}
    >
      <div className="grid grid-cols-2 gap-3 px-6 pb-6 mt-4">
        {pageTypes.map((pageType) => renderCard(pageType))}
      </div>
    </Modal>
  )
}

export default PageCreationModal
