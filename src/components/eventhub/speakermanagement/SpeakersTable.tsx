import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  DividerLineTable,
  type DividerLineTableSortDescriptor,
  Button
} from '../../ui/untitled'
import { Speaker, SpeakerTab, CustomField, Group } from './speakerTypes'
import type { SpeakerTableRowData } from './speakerTypes'
import type { CustomFieldTableRowData } from '../attendeemanagement/attendeeTypes'
import { TablePagination, useTableHeader } from '../../ui'
import { useSpeakerTableColumns } from './SpeakerTableColumns'
import { useCustomFieldTableColumns } from '../attendeemanagement/CustomFieldTableColumns'
import { Download01, Columns03, Upload01, ChevronDown } from '@untitled-ui/icons-react'
import ConfirmDeleteModal from '../../ui/ConfirmDeleteModal'

interface SpeakersTableProps {
  speakers: Speaker[]
  customFields?: CustomField[]
  groups?: Group[]
  activeTab: SpeakerTab
  onTabChange: (tab: SpeakerTab) => void
  onUpload?: () => void
  onCreateProfile?: () => void
  onCreateField?: () => void
  onEditSpeaker?: (speakerId: string) => void
  onDeleteSpeaker?: (speakerId: string) => void
  onAddToGroup?: (speakerIds: string[], groupId: string) => void | Promise<void>
  onEditCustomField?: (customFieldId: string) => void
  onDeleteCustomField?: (customFieldId: string) => void
  onDownload?: () => void
  onGridView?: () => void
  onFilter?: () => void
  isLoading?: boolean
}

const SpeakersTable: React.FC<SpeakersTableProps> = ({
  speakers,
  customFields = [],
  groups = [],
  activeTab,
  onTabChange,
  onUpload,
  onCreateProfile,
  onCreateField,
  onEditSpeaker,
  isLoading = false,
  onDeleteSpeaker: onDeleteSpeakerProp,
  onAddToGroup,
  onEditCustomField,
  onDeleteCustomField,
  onDownload,
  onGridView,
  onFilter
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<Set<string>>(new Set())
  const [selectedCustomFieldIds, setSelectedCustomFieldIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: string; name: string } | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null)
  const [addToGroupOpen, setAddToGroupOpen] = useState(false)
  const addToGroupRef = useRef<HTMLDivElement>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortDescriptor, setSortDescriptor] = useState<DividerLineTableSortDescriptor | undefined>({
    column: 'name',
    direction: 'ascending'
  })

  // Filter data based on active tab
  const filteredSpeakers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return speakers

    return speakers.filter((speaker) => {
      // Search by speaker name only
      return String(speaker.name ?? '').toLowerCase().includes(query)
    })
  }, [searchQuery, speakers])


  const filteredCustomFields = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return customFields

    return customFields.filter((field) => {
      return field.fieldName.toLowerCase().includes(query)
    })
  }, [searchQuery, customFields])

  // Get visible IDs based on active tab
  const visibleSpeakerIds = useMemo(
    () => filteredSpeakers.map((speaker) => speaker.id),
    [filteredSpeakers]
  )


  const visibleCustomFieldIds = useMemo(
    () => filteredCustomFields.map((field) => field.id),
    [filteredCustomFields]
  )

  // Paginate data based on active tab
  const paginatedSpeakers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredSpeakers.slice(startIndex, endIndex)
  }, [filteredSpeakers, currentPage])


  const paginatedCustomFields = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredCustomFields.slice(startIndex, endIndex)
  }, [filteredCustomFields, currentPage])

  // Calculate total pages based on active tab
  const totalPages = useMemo(() => {
    const totalItems = activeTab === 'user' 
      ? filteredSpeakers.length 
      : filteredCustomFields.length
    return Math.ceil(totalItems / itemsPerPage)
  }, [activeTab, filteredSpeakers.length, filteredCustomFields.length])

  const handleToggleSpeaker = useCallback((id: string, checked: boolean) => {
    setSelectedSpeakerIds((previous) => {
      const next = new Set(previous)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])


  const handleToggleCustomField = useCallback((id: string, checked: boolean) => {
    setSelectedCustomFieldIds((previous) => {
      const next = new Set(previous)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  // Table rows and columns based on active tab
  const speakerTableRows = useMemo<SpeakerTableRowData[]>(() => {
    return paginatedSpeakers.map((speaker, index) => ({ speaker, index }))
  }, [paginatedSpeakers])


  const customFieldTableRows = useMemo<CustomFieldTableRowData[]>(() => {
    return paginatedCustomFields.map((field, index) => ({ customField: field, index }))
  }, [paginatedCustomFields])

  const requestDeleteSpeaker = useCallback(
    (speakerId: string) => {
      const s = speakers.find((x) => x.id === speakerId)
      setDeleteCandidate({ id: speakerId, name: s?.name || 'this speaker' })
    },
    [speakers]
  )

  const confirmDeleteSpeaker = useCallback(async () => {
    if (!deleteCandidate) return
    if (!onDeleteSpeakerProp) {
      setDeleteCandidate(null)
      return
    }
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await Promise.resolve(onDeleteSpeakerProp(deleteCandidate.id) as any)
      setDeleteCandidate(null)
    } finally {
      setIsDeleting(false)
    }
  }, [deleteCandidate, isDeleting, onDeleteSpeakerProp])

  const confirmBulkDelete = useCallback(async () => {
    if (!bulkDeleteIds?.length || !onDeleteSpeakerProp) {
      setBulkDeleteIds(null)
      return
    }
    if (isDeleting) return
    setIsDeleting(true)
    try {
      for (const id of bulkDeleteIds) {
        await Promise.resolve(onDeleteSpeakerProp(id) as any)
      }
      setSelectedSpeakerIds(new Set())
      setBulkDeleteIds(null)
    } finally {
      setIsDeleting(false)
    }
  }, [bulkDeleteIds, isDeleting, onDeleteSpeakerProp])

  useEffect(() => {
    if (!addToGroupOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (addToGroupRef.current && !addToGroupRef.current.contains(e.target as Node)) {
        setAddToGroupOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [addToGroupOpen])

  const visibleSpeakerIdsOnPage = useMemo(
    () => paginatedSpeakers.map((s) => s.id),
    [paginatedSpeakers]
  )
  const headerSelectAllSpeakers = useMemo(() => {
    if (activeTab !== 'user') return undefined
    const allSelected =
      visibleSpeakerIdsOnPage.length > 0 &&
      visibleSpeakerIdsOnPage.every((id) => selectedSpeakerIds.has(id))
    const indeterminate =
      visibleSpeakerIdsOnPage.some((id) => selectedSpeakerIds.has(id)) && !allSelected
    return {
      visibleIds: visibleSpeakerIdsOnPage,
      onToggleAll: (checked: boolean) => {
        setSelectedSpeakerIds((prev) => {
          const next = new Set(prev)
          visibleSpeakerIdsOnPage.forEach((id) => (checked ? next.add(id) : next.delete(id)))
          return next
        })
      },
      allSelected,
      indeterminate
    }
  }, [activeTab, visibleSpeakerIdsOnPage, selectedSpeakerIds])

  const speakerColumns = useSpeakerTableColumns({
    selectedSpeakerIds,
    onToggleRow: handleToggleSpeaker,
    headerSelectAll: headerSelectAllSpeakers,
    onEditSpeaker,
    onDeleteSpeaker: requestDeleteSpeaker
  })


  const customFieldColumns = useCustomFieldTableColumns({
    selectedCustomFieldIds,
    onToggleRow: handleToggleCustomField,
    onEditCustomField,
    onDeleteCustomField
  })

  // Empty states
  const speakerEmptyState = (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-sm text-slate-500">
      {speakers.length === 0
        ? 'No speakers have been added yet!'
        : 'No speakers match your search.'}
    </div>
  )


  const customFieldEmptyState = (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-sm text-slate-500">
      {customFields.length === 0
        ? 'No custom fields have been created yet!'
        : 'No custom fields match your search.'}
    </div>
  )

  // Get search placeholder and button text based on active tab
  const searchPlaceholder = useMemo(() => {
    switch (activeTab) {
      case 'custom-schedule':
        return 'Search personal schedule'
      default:
        return 'Search speakers'
    }
  }, [activeTab])

  const buttonText = useMemo(() => {
    switch (activeTab) {
      case 'custom-schedule':
        return '+ New field'
      default:
        return '+ New profile'
    }
  }, [activeTab])

  const handleCreateButton = useMemo(() => {
    switch (activeTab) {
      case 'custom-schedule':
        return onCreateField
      default:
        return onCreateProfile
    }
  }, [activeTab, onCreateField, onCreateProfile])

  const tableHeader = useTableHeader({
    tabs: [
      { id: 'user', label: 'User' },
      { id: 'groups', label: 'Groups' },
      { id: 'custom-schedule', label: 'Custom schedule' }
    ],
    activeTabId: activeTab,
    searchQuery,
    searchPlaceholder,
    onTabChange: (tabId) => onTabChange(tabId as SpeakerTab),
    onSearchChange: setSearchQuery,
    showFilter: !(activeTab === 'user' && selectedSpeakerIds.size > 0),
    onFilterClick: onFilter || (() => {}),
    filterLabel: `Filter ${activeTab === 'custom-schedule' ? 'custom fields' : 'speakers'}`,
    customActions: activeTab === 'user' ? (
      <div className="flex items-center gap-2">
        {selectedSpeakerIds.size > 0 ? (
          <>
            <div className="relative" ref={addToGroupRef}>
              <button
                type="button"
                onClick={() => setAddToGroupOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Add to group
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
              {addToGroupOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                  {groups.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No groups</div>
                  ) : (
                    groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          onAddToGroup?.(Array.from(selectedSpeakerIds), g.id)
                          setAddToGroupOpen(false)
                          setSelectedSpeakerIds(new Set())
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {g.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="!bg-red-600 hover:!bg-red-700 focus:visible:ring-red-500/40"
              onClick={() => setBulkDeleteIds(Array.from(selectedSpeakerIds))}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Download"
            >
              <Download01 className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onGridView}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Grid view"
            >
              <Columns03 className="h-4 w-4" strokeWidth={2} />
            </button>
          </>
        )}
      </div>
    ) : undefined
  })

  const handleSortChange = useCallback(
    (descriptor: DividerLineTableSortDescriptor) => {
      setSortDescriptor(descriptor)
    },
    []
  )

  // Reset page when switching tabs or search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  // Get table data, columns, and empty state based on active tab
  const getTableData = () => {
    switch (activeTab) {
      case 'custom-schedule':
        return {
          data: customFieldTableRows,
          columns: customFieldColumns,
          emptyState: customFieldEmptyState,
          getRowKey: (row: CustomFieldTableRowData) => row.customField?.id || ''
        }
      default:
        return {
          data: speakerTableRows,
          columns: speakerColumns,
          emptyState: speakerEmptyState,
          getRowKey: (row: SpeakerTableRowData) => row.speaker?.id || ''
        }
    }
  }

  const tableData = getTableData()

  // Loading state - check after all hooks
  if (isLoading) {
    return (
      <div className="space-y-8 px-4 pb-12 pt-8 md:px-10 lg:px-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[26px] font-bold text-primary-dark">Speaker management</h1>
        </div>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6938EF] mb-4"></div>
            <p className="text-slate-600">Loading speakers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 px-4 pb-12 pt-8 md:px-10 lg:px-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[26px] font-bold text-primary-dark">Speaker management</h1>
        <div className="flex items-center gap-3">
          {activeTab === 'user' && (
            <Button
              type="button"
              onClick={onUpload}
              iconLeading={<Upload01 className="h-4 w-4" />}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Upload
            </Button>
          )}
          <button
            type="button"
            onClick={handleCreateButton}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white border border-slate-200 bg-primary shadow-sm transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {buttonText}
          </button>
        </div>
      </div>

      <DividerLineTable
        headerLeading={tableHeader.leading}
        headerActions={tableHeader.actions}
        data={tableData.data}
        columns={tableData.columns}
        getRowKey={tableData.getRowKey}
        emptyState={tableData.emptyState}
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        onRowClick={activeTab === 'user' ? (row) => {
          const speakerRow = row as SpeakerTableRowData
          if (speakerRow.speaker) {
            onEditSpeaker?.(speakerRow.speaker.id)
          }
        } : undefined}
        footer={
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        }
      />

      <ConfirmDeleteModal
        isOpen={!!deleteCandidate}
        title="Delete speaker?"
        itemName={deleteCandidate?.name}
        isLoading={isDeleting}
        onCancel={() => {
          if (isDeleting) return
          setDeleteCandidate(null)
        }}
        onConfirm={confirmDeleteSpeaker}
      />
      <ConfirmDeleteModal
        isOpen={!!bulkDeleteIds?.length}
        title="Delete speakers?"
        itemName={bulkDeleteIds ? `${bulkDeleteIds.length} speakers` : undefined}
        isLoading={isDeleting}
        onCancel={() => {
          if (isDeleting) return
          setBulkDeleteIds(null)
        }}
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}

export default React.memo(SpeakersTable)
