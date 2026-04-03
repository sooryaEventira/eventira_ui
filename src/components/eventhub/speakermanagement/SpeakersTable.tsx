import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
import { Download01, Columns03, Upload01, ChevronDown, FilterLines } from '@untitled-ui/icons-react'
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
  filterTagId?: string
  onFilterTagChange?: (tagId: string | undefined) => void
  onServerSortChange?: (ordering: string) => void
  isLoading?: boolean
  externalSearchQuery?: string
  onExternalSearchChange?: (query: string) => void
  // Bulk delete handler (multi-select delete)
  onBulkDeleteSpeakers?: (speakerIds: string[]) => void | Promise<void>
  // Server-side pagination for the speaker list
  serverSidePagination?: {
    totalCount: number
    currentPage: number
    onPageChange: (page: number) => void
  }
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
  onGridView: _onGridView,
  onFilter: _onFilter,
  filterTagId,
  onFilterTagChange,
  onServerSortChange,
  onBulkDeleteSpeakers,
  serverSidePagination,
  externalSearchQuery,
  onExternalSearchChange
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<Set<string>>(new Set())
  const [selectedCustomFieldIds, setSelectedCustomFieldIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // When server-side pagination is active, use its page/onChange; otherwise use local state
  const activePage = serverSidePagination ? serverSidePagination.currentPage : currentPage
  const handlePageChange = serverSidePagination ? serverSidePagination.onPageChange : setCurrentPage
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: string; name: string } | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null)
  const [addToGroupOpen, setAddToGroupOpen] = useState(false)
  const addToGroupRef = useRef<HTMLDivElement>(null)
  // Column visibility for speaker table (only when activeTab === 'user')
  const SPEAKER_COLUMN_OPTIONS: { id: string; label: string }[] = [
    // Name column is always visible and cannot be toggled
    // { id: 'inviteCode', label: 'Invite Code' },
    { id: 'email', label: 'Email' },
    { id: 'designation', label: 'Designation' },
    { id: 'organization', label: 'Organization' },
    { id: 'groups', label: 'Groups' }
  ]
  const [visibleSpeakerColumnIds, setVisibleSpeakerColumnIds] = useState<Set<string>>(
    () => new Set(SPEAKER_COLUMN_OPTIONS.map((c) => c.id))
  )
  const [columnDropdownOpen, setColumnDropdownOpen] = useState(false)
  const columnDropdownRef = useRef<HTMLDivElement>(null)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const [filterDropdownPos, setFilterDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortDescriptor, setSortDescriptor] = useState<DividerLineTableSortDescriptor | undefined>({
    column: 'name',
    direction: 'ascending'
  })

  // Filter data based on active tab
  // When external search is active (user tab), speakers are already filtered by the API
  const filteredSpeakers = useMemo(() => {
    if (activeTab === 'user' && externalSearchQuery !== undefined) return speakers

    const query = searchQuery.trim().toLowerCase()
    if (!query) return speakers

    return speakers.filter((speaker) => {
      return String(speaker.name ?? '').toLowerCase().includes(query)
    })
  }, [searchQuery, speakers, activeTab, externalSearchQuery])


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

  // Sort speakers before pagination
  const sortedSpeakers = useMemo(() => {
    if (!sortDescriptor) return filteredSpeakers
    return [...filteredSpeakers].sort((a, b) => {
      const aVal = String(a.name ?? '').toLowerCase()
      const bVal = String(b.name ?? '').toLowerCase()
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDescriptor.direction === 'ascending' ? cmp : -cmp
    })
  }, [filteredSpeakers, sortDescriptor])

  // Paginate data based on active tab
  const paginatedSpeakers = useMemo(() => {
    // When server-side pagination is active, speakers are already the current page
    if (serverSidePagination) return sortedSpeakers
    const startIndex = (activePage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedSpeakers.slice(startIndex, endIndex)
  }, [sortedSpeakers, activePage, serverSidePagination])


  const paginatedCustomFields = useMemo(() => {
    const startIndex = (activePage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredCustomFields.slice(startIndex, endIndex)
  }, [filteredCustomFields, activePage])

  // Calculate total pages based on active tab
  const totalPages = useMemo(() => {
    if (activeTab === 'user' && serverSidePagination) {
      return Math.ceil(serverSidePagination.totalCount / itemsPerPage)
    }
    const totalItems = activeTab === 'user'
      ? filteredSpeakers.length
      : filteredCustomFields.length
    return Math.ceil(totalItems / itemsPerPage)
  }, [activeTab, filteredSpeakers.length, filteredCustomFields.length, serverSidePagination])

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
    if (!bulkDeleteIds?.length) {
      setBulkDeleteIds(null)
      return
    }
    if (isDeleting) return
    setIsDeleting(true)
    try {
      if (onBulkDeleteSpeakers) {
        await Promise.resolve(onBulkDeleteSpeakers(bulkDeleteIds) as any)
      } else if (onDeleteSpeakerProp) {
        for (const id of bulkDeleteIds) {
          await Promise.resolve(onDeleteSpeakerProp(id) as any)
        }
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

  useEffect(() => {
    if (!columnDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) {
        setColumnDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [columnDropdownOpen])

  useEffect(() => {
    if (!filterDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        filterBtnRef.current && !filterBtnRef.current.contains(target) &&
        filterDropdownRef.current && !filterDropdownRef.current.contains(target)
      ) {
        setFilterDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterDropdownOpen])

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
        ? 'Coming soon!'
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

  const activeSearchQuery = activeTab === 'user' && externalSearchQuery !== undefined
    ? externalSearchQuery
    : searchQuery

  const handleSearchChange = (query: string) => {
    if (activeTab === 'user' && onExternalSearchChange) {
      onExternalSearchChange(query)
    } else {
      setSearchQuery(query)
    }
  }

  const tableHeader = useTableHeader({
    tabs: [
      { id: 'user', label: 'User' },
      { id: 'groups', label: 'Groups' },
      { id: 'custom-schedule', label: 'Custom schedule' }
    ],
    activeTabId: activeTab,
    searchQuery: activeSearchQuery,
    searchPlaceholder,
    onTabChange: (tabId) => onTabChange(tabId as SpeakerTab),
    onSearchChange: handleSearchChange,
    searchOnButtonClick: activeTab === 'user' && onExternalSearchChange !== undefined,
    showFilter: false,
    onFilterClick: _onFilter || (() => {}),
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

            {/* Tag filter button + portal dropdown */}
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => {
                if (!filterDropdownOpen) {
                  const rect = filterBtnRef.current?.getBoundingClientRect()
                  if (rect) setFilterDropdownPos({ top: rect.bottom + 4, left: Math.max(0, rect.right - 200) })
                }
                setFilterDropdownOpen((v) => !v)
              }}
              className={[
                'inline-flex h-10 w-10 items-center justify-center rounded-md border bg-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                filterTagId
                  ? 'border-primary text-primary'
                  : 'border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary'
              ].join(' ')}
              aria-label="Filter by tag"
              aria-expanded={filterDropdownOpen}
            >
              <FilterLines className="h-4 w-4" strokeWidth={2} />
            </button>

            {filterDropdownOpen && filterDropdownPos && createPortal(
              <div
                ref={filterDropdownRef}
                className="z-[9999] min-w-[200px] max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                style={{ position: 'fixed', top: filterDropdownPos.top, left: filterDropdownPos.left }}
              >
                <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Filter by tag
                </div>
                <button
                  type="button"
                  onClick={() => { onFilterTagChange?.(undefined); setFilterDropdownOpen(false) }}
                  className={['w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50', !filterTagId ? 'font-semibold text-primary' : 'text-slate-700'].join(' ')}
                >
                  All speakers
                </button>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { onFilterTagChange?.(g.id); setFilterDropdownOpen(false) }}
                    className={['w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50', filterTagId === g.id ? 'font-semibold text-primary' : 'text-slate-700'].join(' ')}
                  >
                    {g.name}
                  </button>
                ))}
              </div>,
              document.body
            )}

            <div className="relative" ref={columnDropdownRef}>
              <button
                type="button"
                onClick={() => setColumnDropdownOpen((v) => !v)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Choose columns"
                aria-expanded={columnDropdownOpen}
              >
                <Columns03 className="h-4 w-4" strokeWidth={2} />
              </button>
              {columnDropdownOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {SPEAKER_COLUMN_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                        checked={visibleSpeakerColumnIds.has(option.id)}
                        onChange={(e) => {
                          setVisibleSpeakerColumnIds((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(option.id)
                            else next.delete(option.id)
                            return next
                          })
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    ) : undefined
  })

  const SORT_FIELD_MAP: Record<string, string> = {
    name: 'first_name',
    designation: 'designation',
  }

  const handleSortChange = useCallback(
    (descriptor: DividerLineTableSortDescriptor) => {
      setSortDescriptor(descriptor)
      setCurrentPage(1)
      if (serverSidePagination && onServerSortChange) {
        const field = SORT_FIELD_MAP[String(descriptor.column)] ?? String(descriptor.column)
        const ordering = descriptor.direction === 'descending' ? `-${field}` : field
        onServerSortChange(ordering)
      }
    },
    [serverSidePagination, onServerSortChange]
  )

  // Reset local page when switching tabs or search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  // Reset server-side page when search changes
  React.useEffect(() => {
    if (serverSidePagination && searchQuery) {
      serverSidePagination.onPageChange(1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

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

  // Filter speaker columns by visibility (name and actions always shown)
  const visibleSpeakerColumns = useMemo(() => {
    return speakerColumns.filter(
      (col) =>
        col.id === 'name' ||
        col.id === 'actions' ||
        visibleSpeakerColumnIds.has(col.id)
    )
  }, [speakerColumns, visibleSpeakerColumnIds])

  const tableData = (() => {
    const base = getTableData()
    if (activeTab === 'user') {
      return {
        ...base,
        columns: visibleSpeakerColumns
      }
    }
    return base
  })()

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
            currentPage={activePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalCount={
              activeTab === 'user'
                ? (serverSidePagination ? serverSidePagination.totalCount : filteredSpeakers.length)
                : undefined
            }
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
