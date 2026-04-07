import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  DividerLineTable,
  type DividerLineTableSortDescriptor,
  Button
} from '../../ui/untitled'
import { Attendee, AttendeeTab, CustomField, Group } from './attendeeTypes'
import type { AttendeeTableRowData, CustomFieldTableRowData } from './attendeeTypes'
import { TablePagination, useTableHeader } from '../../ui'
import { useAttendeeTableColumns } from './AttendeeTableColumns'
import { useCustomFieldTableColumns } from './CustomFieldTableColumns'
import { Download01, Columns03, Upload01, ChevronDown, FilterLines } from '@untitled-ui/icons-react'
import ConfirmDeleteModal from '../../ui/ConfirmDeleteModal'

interface AttendeesTableProps {
  attendees: Attendee[]
  customFields?: CustomField[]
  groups?: Group[]
  activeTab: AttendeeTab
  onTabChange: (tab: AttendeeTab) => void
  onUpload?: () => void
  onCreateProfile?: () => void
  onCreateField?: () => void
  onEditAttendee?: (attendeeId: string) => void
  onDeleteAttendee?: (attendeeId: string) => void
  onAddToGroup?: (attendeeIds: string[], groupId: string) => void | Promise<void>
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
  // Bulk delete handler (used for multi-select delete button)
  onBulkDeleteAttendees?: (attendeeIds: string[], selectAll?: boolean) => void | Promise<void>
  // Server-side pagination for the attendee list
  serverSidePagination?: {
    totalCount: number
    currentPage: number
    onPageChange: (page: number) => void
  }
}

const AttendeesTable: React.FC<AttendeesTableProps> = ({
  attendees,
  customFields = [],
  groups = [],
  activeTab,
  onTabChange,
  onUpload,
  onCreateProfile,
  onCreateField,
  onEditAttendee,
  onDeleteAttendee: onDeleteAttendeeProp,
  onAddToGroup,
  onEditCustomField,
  onDeleteCustomField,
  onDownload,
  onGridView: _onGridView,
  onFilter: _onFilter,
  filterTagId,
  onFilterTagChange,
  onServerSortChange,
  isLoading = false,
  externalSearchQuery,
  onExternalSearchChange,
  onBulkDeleteAttendees,
  serverSidePagination
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set())
  const [selectedCustomFieldIds, setSelectedCustomFieldIds] = useState<Set<string>>(new Set())
  const [allPagesSelected, setAllPagesSelected] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // When server-side pagination is active, use its page/onChange; otherwise use local state
  const activePage = serverSidePagination ? serverSidePagination.currentPage : currentPage
  const handlePageChange = serverSidePagination ? serverSidePagination.onPageChange : setCurrentPage
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: string; name: string } | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null)
  const [addToGroupOpen, setAddToGroupOpen] = useState(false)
  const addToGroupRef = useRef<HTMLDivElement>(null)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const [filterDropdownPos, setFilterDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortDescriptor, setSortDescriptor] = useState<DividerLineTableSortDescriptor | undefined>({
    column: 'name',
    direction: 'ascending'
  })

  // Column visibility for attendee table (only when activeTab === 'user')
  const ATTENDEE_COLUMN_OPTIONS: { id: string; label: string }[] = [
    // Name column is always visible and cannot be toggled
    { id: 'email', label: 'Email' },
    // { id: 'inviteCode', label: 'Invite Code' },
    { id: 'designation', label: 'Designation' },
    { id: 'organization', label: 'Organization' },
    { id: 'groups', label: 'Groups' }
  ]
  const [visibleAttendeeColumnIds, setVisibleAttendeeColumnIds] = useState<Set<string>>(
    () => new Set(ATTENDEE_COLUMN_OPTIONS.map((c) => c.id))
  )
  const [columnDropdownOpen, setColumnDropdownOpen] = useState(false)
  const columnDropdownRef = useRef<HTMLDivElement>(null)

  // Filter data based on active tab
  // When external search is active (user tab), attendees are already filtered by the API
  const filteredAttendees = useMemo(() => {
    if (activeTab === 'user' && externalSearchQuery !== undefined) return attendees

    const query = searchQuery.trim().toLowerCase()
    if (!query) return attendees

    return attendees.filter((attendee) => {
      return String(attendee.name ?? '').toLowerCase().includes(query)
    })
  }, [searchQuery, attendees, activeTab, externalSearchQuery])


  const filteredCustomFields = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return customFields

    return customFields.filter((field) => {
      return field.fieldName.toLowerCase().includes(query)
    })
  }, [searchQuery, customFields])


  // Sort attendees before pagination
  const sortedAttendees = useMemo(() => {
    if (!sortDescriptor) return filteredAttendees
    return [...filteredAttendees].sort((a, b) => {
      const aVal = String(a.name ?? '').toLowerCase()
      const bVal = String(b.name ?? '').toLowerCase()
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDescriptor.direction === 'ascending' ? cmp : -cmp
    })
  }, [filteredAttendees, sortDescriptor])

  // Paginate data based on active tab
  const paginatedAttendees = useMemo(() => {
    // When server-side pagination is active, attendees are already the current page
    if (serverSidePagination) return sortedAttendees
    const startIndex = (activePage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedAttendees.slice(startIndex, endIndex)
  }, [sortedAttendees, activePage, serverSidePagination])


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
      ? filteredAttendees.length
      : filteredCustomFields.length
    return Math.ceil(totalItems / itemsPerPage)
  }, [activeTab, filteredAttendees.length, filteredCustomFields.length, serverSidePagination])

  const handleToggleAttendee = useCallback((id: string, checked: boolean) => {
    setSelectedAttendeeIds((previous) => {
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
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  // Table rows and columns based on active tab
  const attendeeTableRows = useMemo<AttendeeTableRowData[]>(() => {
    return paginatedAttendees.map((attendee, index) => ({ attendee, index }))
  }, [paginatedAttendees])


  const customFieldTableRows = useMemo<CustomFieldTableRowData[]>(() => {
    return paginatedCustomFields.map((field, index) => ({ customField: field, index }))
  }, [paginatedCustomFields])

  const requestDeleteAttendee = useCallback(
    (attendeeId: string) => {
      const a = attendees.find((x) => x.id === attendeeId)
      setDeleteCandidate({ id: attendeeId, name: a?.name || 'this attendee' })
    },
    [attendees]
  )

  const confirmDeleteAttendee = useCallback(async () => {
    if (!deleteCandidate) return
    if (!onDeleteAttendeeProp) {
      setDeleteCandidate(null)
      return
    }
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await Promise.resolve(onDeleteAttendeeProp(deleteCandidate.id) as any)
      setDeleteCandidate(null)
    } finally {
      setIsDeleting(false)
    }
  }, [deleteCandidate, isDeleting, onDeleteAttendeeProp])

  const confirmBulkDelete = useCallback(async () => {
    if (!bulkDeleteIds?.length) {
      setBulkDeleteIds(null)
      return
    }
    if (isDeleting) return
    setIsDeleting(true)
    try {
      const isSelectAll = bulkDeleteIds[0] === '__all__'
      if (onBulkDeleteAttendees) {
        await Promise.resolve(onBulkDeleteAttendees(isSelectAll ? [] : bulkDeleteIds, isSelectAll) as any)
      } else if (onDeleteAttendeeProp && !isSelectAll) {
        for (const id of bulkDeleteIds) {
          await Promise.resolve(onDeleteAttendeeProp(id) as any)
        }
      }
      setSelectedAttendeeIds(new Set())
      setAllPagesSelected(false)
      setBulkDeleteIds(null)
    } finally {
      setIsDeleting(false)
    }
  }, [bulkDeleteIds, isDeleting, onDeleteAttendeeProp])

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

  const visibleAttendeeIdsOnPage = useMemo(
    () => paginatedAttendees.map((a) => a.id),
    [paginatedAttendees]
  )
  const headerSelectAllAttendees = useMemo(() => {
    if (activeTab !== 'user') return undefined
    const allSelected =
      visibleAttendeeIdsOnPage.length > 0 &&
      visibleAttendeeIdsOnPage.every((id) => selectedAttendeeIds.has(id))
    const indeterminate =
      visibleAttendeeIdsOnPage.some((id) => selectedAttendeeIds.has(id)) && !allSelected
    return {
      visibleIds: visibleAttendeeIdsOnPage,
      onToggleAll: (checked: boolean) => {
        if (!checked) setAllPagesSelected(false)
        setSelectedAttendeeIds((prev) => {
          const next = new Set(prev)
          visibleAttendeeIdsOnPage.forEach((id) => (checked ? next.add(id) : next.delete(id)))
          return next
        })
      },
      allSelected,
      indeterminate
    }
  }, [activeTab, visibleAttendeeIdsOnPage, selectedAttendeeIds])

  const attendeeColumns = useAttendeeTableColumns({
    selectedAttendeeIds,
    onToggleRow: handleToggleAttendee,
    headerSelectAll: headerSelectAllAttendees,
    onEditAttendee,
    onDeleteAttendee: requestDeleteAttendee
  })

  const customFieldColumns = useCustomFieldTableColumns({
    selectedCustomFieldIds,
    onToggleRow: handleToggleCustomField,
    onEditCustomField,
    onDeleteCustomField
  })

  // Empty states
  const attendeeEmptyState = (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-sm text-slate-500">
      {attendees.length === 0
        ? 'Coming soon!'
        : 'No attendees match your search.'}
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
        return 'Search attendees'
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
    onTabChange: (tabId) => onTabChange(tabId as AttendeeTab),
    onSearchChange: handleSearchChange,
    searchOnButtonClick: activeTab === 'user' && onExternalSearchChange !== undefined,
    showFilter: false,
    onFilterClick: _onFilter || (() => {}),
    filterLabel: `Filter ${activeTab === 'custom-schedule' ? 'custom fields' : 'attendees'}`,
    customActions: activeTab === 'user' ? (
      <div className="flex items-center gap-2">
        {selectedAttendeeIds.size > 0 ? (
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
                          onAddToGroup?.(Array.from(selectedAttendeeIds), g.id)
                          setAddToGroupOpen(false)
                          setSelectedAttendeeIds(new Set())
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
              onClick={() => setBulkDeleteIds(allPagesSelected ? ['__all__'] : Array.from(selectedAttendeeIds))}
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

            {/* Tag filter dropdown */}
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => {
                if (!filterDropdownOpen) {
                  const rect = filterBtnRef.current?.getBoundingClientRect()
                  if (rect) {
                    setFilterDropdownPos({ top: rect.bottom + 4, left: Math.max(0, rect.right - 200) })
                  }
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
                  className={[
                    'w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50',
                    !filterTagId ? 'font-semibold text-primary' : 'text-slate-700'
                  ].join(' ')}
                >
                  All attendees
                </button>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { onFilterTagChange?.(g.id); setFilterDropdownOpen(false) }}
                    className={[
                      'w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50',
                      filterTagId === g.id ? 'font-semibold text-primary' : 'text-slate-700'
                    ].join(' ')}
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
                  {ATTENDEE_COLUMN_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                        checked={visibleAttendeeColumnIds.has(option.id)}
                        onChange={(e) => {
                          setVisibleAttendeeColumnIds((prev) => {
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

  // Column id → Django ordering field mapping
  const SORT_FIELD_MAP: Record<string, string> = {
    name: 'name',
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

  // Filter attendee columns by visibility (name and actions always shown)
  const visibleAttendeeColumns = useMemo(() => {
    return attendeeColumns.filter(
      (col) =>
        col.id === 'name' ||
        col.id === 'actions' ||
        visibleAttendeeColumnIds.has(col.id)
    )
  }, [attendeeColumns, visibleAttendeeColumnIds])

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
          data: attendeeTableRows,
          columns: visibleAttendeeColumns,
          emptyState: attendeeEmptyState,
          getRowKey: (row: AttendeeTableRowData) => row.attendee?.id || ''
        }
    }
  }

  const tableData = getTableData()

  // Loading state - check after all hooks
  if (isLoading) {
    return (
      <div className="px-4 pt-8 pb-4 md:px-10 lg:px-16">
        <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[26px] font-bold text-primary-dark">Attendee management</h1>
        </div>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6938EF] mb-4"></div>
            <p className="text-slate-600">Loading attendees...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-4 md:px-10 lg:px-16">
      <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[26px] font-bold text-primary-dark">Attendee management</h1>
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
        subheader={activeTab === 'user' && selectedAttendeeIds.size > 0 ? (
          <div className="flex items-center justify-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2 text-sm text-slate-700">
            <span>
              All{' '}
              <span className="font-semibold text-primary">
                {allPagesSelected ? (serverSidePagination?.totalCount ?? attendees.length) : selectedAttendeeIds.size}
              </span>{' '}
              {allPagesSelected ? 'attendees' : 'rows'} selected
            </span>
            {!allPagesSelected && serverSidePagination && serverSidePagination.totalCount > selectedAttendeeIds.size && (
              <button
                type="button"
                onClick={() => {
                setAllPagesSelected(true)
                setSelectedAttendeeIds(new Set(visibleAttendeeIdsOnPage))
              }}
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Select all {serverSidePagination.totalCount}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setAllPagesSelected(false); setSelectedAttendeeIds(new Set()) }}
              className="font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700"
            >
              Clear selection
            </button>
          </div>
        ) : undefined}
        data={tableData.data}
        columns={tableData.columns}
        getRowKey={tableData.getRowKey}
        emptyState={tableData.emptyState}
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        onRowClick={activeTab === 'user' ? (row) => {
          const attendeeRow = row as AttendeeTableRowData
          if (attendeeRow.attendee) {
            onEditAttendee?.(attendeeRow.attendee.id)
          }
        } : undefined}
        footer={
          <TablePagination
            currentPage={activePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalCount={
              activeTab === 'user'
                ? (serverSidePagination ? serverSidePagination.totalCount : filteredAttendees.length)
                : undefined
            }
          />
        }
      />

      <ConfirmDeleteModal
        isOpen={!!deleteCandidate}
        title="Delete attendee?"
        itemName={deleteCandidate?.name}
        isLoading={isDeleting}
        onCancel={() => {
          if (isDeleting) return
          setDeleteCandidate(null)
        }}
        onConfirm={confirmDeleteAttendee}
      />
      <ConfirmDeleteModal
        isOpen={!!bulkDeleteIds?.length}
        title="Delete attendees?"
        itemName={bulkDeleteIds ? (bulkDeleteIds[0] === '__all__' ? `all ${serverSidePagination?.totalCount ?? attendees.length} attendees` : `${bulkDeleteIds.length} attendees`) : undefined}
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

export default React.memo(AttendeesTable)

