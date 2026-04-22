import React from 'react'
import type { WebpageData, NavigationContentData } from '../../../services/webpageService'
import Button from '../../ui/untitled/Button'
import { Play, ChevronDown } from '@untitled-ui/icons-react'

interface WebsitePagesListProps {
  webpages: WebpageData[]
  navContent?: NavigationContentData
  isLoading: boolean
  onAction: (
    pageId: string,
    action: 'view' | 'edit' | 'duplicate' | 'delete' | 'settings' | 'copy-link' | 'hide'
  ) => void
  openDropdownId: string | null
  setOpenDropdownId: (id: string | null) => void
  enableRowClickEdit?: boolean
}

const AUTO_GENERATED_SLUGS = ['welcome', 'organizations', 'speakers', 'attendees', 'schedule']

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
  </div>
)

const ContentRow: React.FC<{
  uuid: string
  title: string
  enableRowClickEdit: boolean
  openDropdownId: string | null
  setOpenDropdownId: (id: string | null) => void
  onAction: WebsitePagesListProps['onAction']
}> = ({ uuid, title, enableRowClickEdit, openDropdownId, setOpenDropdownId, onAction }) => (
  <div
    className={`flex items-center justify-between py-2 px-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors ${enableRowClickEdit ? 'cursor-pointer' : ''}`}
    onClick={() => { if (enableRowClickEdit) onAction(uuid, 'edit') }}
  >
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-900 capitalize">{title}</span>
    </div>
    <div className="flex items-center gap-2">
      <Button
        variant="tertiary"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onAction(uuid, 'view') }}
        className="p-2 text-slate-400 hover:text-slate-600"
        aria-label="View"
        iconLeading={<Play className="h-4 w-4" />}
      />
      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === uuid ? null : uuid) }}
          className="inline-flex items-center gap-2 whitespace-nowrap"
        >
          <div className="flex">
            Actions
            <ChevronDown className="h-5 w-6 text-slate-500 pt-1" />
          </div>
        </Button>
        {openDropdownId === uuid && (
          <div className="absolute right-0 mt-2 w-48 rounded-md border border-slate-200 bg-white shadow-lg z-[9999] top-full" onClick={(e) => e.stopPropagation()}>
            {/* <button type="button" onClick={() => { onAction(uuid, 'edit'); setOpenDropdownId(null) }} className="w-full text-left px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50 border-b border-slate-200 first:rounded-t-md flex items-center gap-3">Edit</button> */}
            <button type="button" onClick={() => { onAction(uuid, 'duplicate'); setOpenDropdownId(null) }} className="w-full text-left px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50 border-b border-slate-200 flex items-center gap-3">Duplicate</button>
            <button type="button" onClick={() => { onAction(uuid, 'settings'); setOpenDropdownId(null) }} className="w-full text-left px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50 border-b border-slate-200 flex items-center gap-3">Settings</button>
            <button type="button" onClick={() => { onAction(uuid, 'hide'); setOpenDropdownId(null) }} className="w-full text-left px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50 border-b border-slate-200 flex items-center gap-3">Hide page</button>
            <button type="button" onClick={() => { onAction(uuid, 'copy-link'); setOpenDropdownId(null) }} className="w-full text-left px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50 border-b border-slate-200 flex items-center gap-3">Copy link</button>
            <button type="button" onClick={() => { onAction(uuid, 'delete'); setOpenDropdownId(null) }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 last:rounded-b-md flex items-center gap-3">Delete</button>
          </div>
        )}
      </div>
    </div>
  </div>
)

const WebsitePagesList: React.FC<WebsitePagesListProps> = ({
  webpages,
  navContent,
  isLoading,
  onAction,
  openDropdownId,
  setOpenDropdownId,
  enableRowClickEdit = true
}) => {
  const participantGroups = navContent?.participant_groups ?? []
  const schedules = navContent?.schedules ?? []
  console.log('[WebsitePagesList] render — webpages:', webpages.length, 'groups:', participantGroups.length, 'schedules:', schedules.length, 'navContent:', navContent)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-500">
        <p>Loading webpages...</p>
      </div>
    )
  }

  if (!webpages.length && !participantGroups.length && !schedules.length) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-500">
        <p>No pages yet. Click "+ New Page" to create one.</p>
      </div>
    )
  }

  return (
    <>
      {webpages.length > 0 && <SectionHeader label="Pages" />}
      {webpages.map((webpage) => {
        const lowerSlug = (webpage.slug || '').toLowerCase()
        const isAutoGenerated = AUTO_GENERATED_SLUGS.includes(lowerSlug)

        const handleRowClick = () => {
          if (!enableRowClickEdit) return
          onAction(webpage.uuid, 'edit')
        }

        return (
          <div
            key={webpage.uuid}
            className={`flex items-center justify-between py-2 px-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors ${
              enableRowClickEdit ? 'cursor-pointer' : ''
            }`}
            onClick={handleRowClick}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 capitalize">{webpage.name}</span>
              {isAutoGenerated && (
                <span className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                  Auto generated
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="tertiary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onAction(webpage.uuid, 'view')
                }}
                className="p-2 text-slate-400 hover:text-slate-600"
                aria-label="View"
                iconLeading={<Play className="h-4 w-4" />}
              />
              <div className="relative">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenDropdownId(openDropdownId === webpage.uuid ? null : webpage.uuid)
                  }}
                  className="inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <div className="flex">
                    Actions
                    <ChevronDown className="h-5 w-6 text-slate-500 pt-1" />
                  </div>
                </Button>

                {openDropdownId === webpage.uuid && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md border border-slate-200 bg-white shadow-lg z-[9999] top-full" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        onAction(webpage.uuid, 'edit')
                        setOpenDropdownId(null)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50 border-b border-slate-200 first:rounded-t-md flex items-center gap-3"
                    >
                      {/* <Edit05 className="h-4 w-4 text-slate-400" /> */}
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAction(webpage.uuid, 'duplicate')
                        setOpenDropdownId(null)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50 border-b border-slate-200 flex items-center gap-3"
                    >
                      {/* <Copy01 className="h-4 w-4 text-slate-400" /> */}
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAction(webpage.uuid, 'settings')
                        setOpenDropdownId(null)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50 border-b border-slate-200 flex items-center gap-3"
                    >
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAction(webpage.uuid, 'hide')
                        setOpenDropdownId(null)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50 border-b border-slate-200 flex items-center gap-3"
                    >
                      Hide page
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAction(webpage.uuid, 'copy-link')
                        setOpenDropdownId(null)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50 border-b border-slate-200 flex items-center gap-3"
                    >
                      Copy link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAction(webpage.uuid, 'delete')
                        setOpenDropdownId(null)
                      }}
                      disabled={isAutoGenerated}
                      className={`w-full text-left px-4 py-2.5 text-sm last:rounded-b-md flex items-center gap-3 ${
                        isAutoGenerated
                          ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {/* <Trash01 className="h-4 w-4 text-slate-400" /> */}
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {participantGroups.length > 0 && (
        <>
          <SectionHeader label="User Groups" />
          {participantGroups.map((group) => (
            <ContentRow key={group.uuid} uuid={group.uuid} title={group.title} enableRowClickEdit={enableRowClickEdit} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} onAction={onAction} />
          ))}
        </>
      )}

      {schedules.length > 0 && (
        <>
          <SectionHeader label="Schedules Pages" />
          {schedules.map((schedule) => (
            <ContentRow key={schedule.uuid} uuid={schedule.uuid} title={schedule.title} enableRowClickEdit={enableRowClickEdit} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} onAction={onAction} />
          ))}
        </>
      )}
    </>
  )
}

export default WebsitePagesList

