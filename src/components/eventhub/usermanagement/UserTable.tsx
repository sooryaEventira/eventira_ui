import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  DividerLineTable,
  type DividerLineTableSortDescriptor,
  Button
} from '../../ui/untitled'
import { Participant, AttendeeTab, CustomField, Group } from './participantTypes'
import type { ParticipantTableRowData, CustomFieldTableRowData } from './participantTypes'
import { TablePagination, useTableHeader } from '../../ui'
import { useParticipantTableColumns } from './ParticipantTableColumns'
import { useCustomFieldTableColumns } from './CustomFieldTableColumns'
import { Download01, Columns03, Upload01, ChevronDown, FilterLines } from '@untitled-ui/icons-react'
import ConfirmDeleteModal from '../../ui/ConfirmDeleteModal'

interface UserTableProps {
  users: Participant[]
  customFields?: CustomField[]
  groups?: Group[]
  activeTab: AttendeeTab
  onTabChange: (tab: AttendeeTab) => void
  onUpload?: () => void
  onCreateUser?: () => void
  onCreateField?: () => void
  onEditUser?: (userId: string) => void
  onDeleteUser?: (userId: string) => void
  onBulkDeleteUsers?: (userIds: string[], selectAll?: boolean) => void | Promise<void>
  onAddToGroup?: (userIds: string[], groupId: string, selectAll?: boolean) => void | Promise<void>
  onEditCustomField?: (customFieldId: string) => void
  onDeleteCustomField?: (customFieldId: string) => void
  onDownload?: () => void
  onGridView?: () => void
  filterTagId?: string
  onFilterTagChange?: (tagId: string | undefined) => void
  onServerSortChange?: (ordering: string) => void
  isLoading?: boolean
  externalSearchQuery?: string
  onExternalSearchChange?: (query: string) => void
  serverSidePagination?: {
    totalCount: number
    currentPage: number
    onPageChange: (page: number) => void
  }
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  customFields = [],
  groups = [],
  activeTab,
  onTabChange,
  onUpload,
  onCreateUser,
  onCreateField,
  onEditUser,
  onDeleteUser: onDeleteUserProp,
  onBulkDeleteUsers,
  onAddToGroup,
  onEditCustomField,
  onDeleteCustomField,
  onDownload,
  filterTagId,
  onFilterTagChange,
  onServerSortChange,
  isLoading = false,
  externalSearchQuery,
  onExternalSearchChange,
  serverSidePagination,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [selectedCustomFieldIds, setSelectedCustomFieldIds] = useState<Set<string>>(new Set())
  const [allPagesSelected, setAllPagesSelected] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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

  const COLUMN_OPTIONS: { id: string; label: string }[] = [
    { id: 'email', label: 'Email' },
    { id: 'designation', label: 'Designation' },
    { id: 'organization', label: 'Organization' },
    { id: 'groups', label: 'Groups' }
  ]
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(
    () => new Set(COLUMN_OPTIONS.map((c) => c.id))
  )
  const [columnDropdownOpen, setColumnDropdownOpen] = useState(false)
  const columnDropdownRef = useRef<HTMLDivElement>(null)

  // ---------- Filtered / sorted / paginated ----------
  const filteredUsers = useMemo(() => {
    if (activeTab === 'user' && externalSearchQuery !== undefined) return users
    const query = searchQuery.trim().toLowerCase()
    if (!query) return users
    return users.filter((u) => String(u.name ?? '').toLowerCase().includes(query))
  }, [searchQuery, users, activeTab, externalSearchQuery])

  const filteredCustomFields = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return customFields
    return customFields.filter((f) => f.fieldName.toLowerCase().includes(query))
  }, [searchQuery, customFields])

  const sortedUsers = useMemo(() => {
    if (!sortDescriptor) return filteredUsers
    return [...filteredUsers].sort((a, b) => {
      const aVal = String(a.name ?? '').toLowerCase()
      const bVal = String(b.name ?? '').toLowerCase()
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDescriptor.direction === 'ascending' ? cmp : -cmp
    })
  }, [filteredUsers, sortDescriptor])

  const paginatedUsers = useMemo(() => {
    if (serverSidePagination) return sortedUsers
    const start = (activePage - 1) * itemsPerPage
    return sortedUsers.slice(start, start + itemsPerPage)
  }, [sortedUsers, activePage, serverSidePagination])

  const paginatedCustomFields = useMemo(() => {
    const start = (activePage - 1) * itemsPerPage
    return filteredCustomFields.slice(start, start + itemsPerPage)
  }, [filteredCustomFields, activePage])

  const totalPages = useMemo(() => {
    if (activeTab === 'user' && serverSidePagination)
      return Math.ceil(serverSidePagination.totalCount / itemsPerPage)
    const total = activeTab === 'user' ? filteredUsers.length : filteredCustomFields.length
    return Math.ceil(total / itemsPerPage)
  }, [activeTab, filteredUsers.length, filteredCustomFields.length, serverSidePagination])

  // ---------- Selection ----------
  const handleToggleUser = useCallback((id: string, checked: boolean) => {
    if (allPagesSelected && !checked) setAllPagesSelected(false)
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }, [allPagesSelected])

  const handleToggleCustomField = useCallback((id: string, checked: boolean) => {
    setSelectedCustomFieldIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }, [])

  // ---------- Table rows ----------
  const userTableRows = useMemo<ParticipantTableRowData[]>(
    () => paginatedUsers.map((participant, index) => ({ participant, index })),
    [paginatedUsers]
  )
  const customFieldTableRows = useMemo<CustomFieldTableRowData[]>(
    () => paginatedCustomFields.map((customField, index) => ({ customField, index })),
    [paginatedCustomFields]
  )

  // ---------- Delete ----------
  const requestDeleteUser = useCallback(
    (userId: string) => {
      const u = users.find((x) => x.id === userId)
      setDeleteCandidate({ id: userId, name: u?.name || 'this user' })
    },
    [users]
  )

  const confirmDeleteUser = useCallback(async () => {
    if (!deleteCandidate || !onDeleteUserProp || isDeleting) return
    setIsDeleting(true)
    try {
      await Promise.resolve(onDeleteUserProp(deleteCandidate.id) as any)
      setDeleteCandidate(null)
    } finally {
      setIsDeleting(false)
    }
  }, [deleteCandidate, isDeleting, onDeleteUserProp])

  const confirmBulkDelete = useCallback(async () => {
    if (!bulkDeleteIds?.length || isDeleting) { setBulkDeleteIds(null); return }
    setIsDeleting(true)
    try {
      const isSelectAll = bulkDeleteIds[0] === '__all__'
      if (onBulkDeleteUsers) {
        await Promise.resolve(onBulkDeleteUsers(isSelectAll ? [] : bulkDeleteIds, isSelectAll) as any)
      } else if (onDeleteUserProp && !isSelectAll) {
        for (const id of bulkDeleteIds) await Promise.resolve(onDeleteUserProp(id) as any)
      }
      setSelectedUserIds(new Set())
      setAllPagesSelected(false)
      setBulkDeleteIds(null)
    } finally {
      setIsDeleting(false)
    }
  }, [bulkDeleteIds, isDeleting, onDeleteUserProp, onBulkDeleteUsers])

  // ---------- Click-outside handlers ----------
  useEffect(() => {
    if (!addToGroupOpen) return
    const fn = (e: MouseEvent) => {
      if (addToGroupRef.current && !addToGroupRef.current.contains(e.target as Node)) setAddToGroupOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [addToGroupOpen])

  useEffect(() => {
    if (!columnDropdownOpen) return
    const fn = (e: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) setColumnDropdownOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [columnDropdownOpen])

  useEffect(() => {
    if (!filterDropdownOpen) return
    const fn = (e: MouseEvent) => {
      const t = e.target as Node
      if (filterBtnRef.current && !filterBtnRef.current.contains(t) &&
          filterDropdownRef.current && !filterDropdownRef.current.contains(t))
        setFilterDropdownOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [filterDropdownOpen])

  // ---------- Columns ----------
  const visibleUserIdsOnPage = useMemo(() => paginatedUsers.map((u) => u.id), [paginatedUsers])

  const headerSelectAll = useMemo(() => {
    if (activeTab !== 'user') return undefined
    if (allPagesSelected) {
      return {
        visibleIds: visibleUserIdsOnPage,
        onToggleAll: (checked: boolean) => {
          if (!checked) {
            setAllPagesSelected(false)
            setSelectedUserIds(new Set())
          }
        },
        allSelected: true,
        indeterminate: false,
      }
    }
    const allSelected = visibleUserIdsOnPage.length > 0 && visibleUserIdsOnPage.every((id) => selectedUserIds.has(id))
    const indeterminate = visibleUserIdsOnPage.some((id) => selectedUserIds.has(id)) && !allSelected
    return {
      visibleIds: visibleUserIdsOnPage,
      onToggleAll: (checked: boolean) => {
        if (checked && serverSidePagination) {
          setAllPagesSelected(true)
        } else {
          setAllPagesSelected(false)
        }
        setSelectedUserIds((prev) => {
          const next = new Set(prev)
          visibleUserIdsOnPage.forEach((id) => (checked ? next.add(id) : next.delete(id)))
          return next
        })
      },
      allSelected,
      indeterminate,
    }
  }, [activeTab, allPagesSelected, visibleUserIdsOnPage, selectedUserIds, serverSidePagination])

  const userColumns = useParticipantTableColumns({
    selectedParticipantIds: selectedUserIds,
    allPagesSelected,
    onToggleRow: handleToggleUser,
    headerSelectAll,
    onEditParticipant: onEditUser,
    onDeleteParticipant: requestDeleteUser,
  })

  const customFieldColumns = useCustomFieldTableColumns({
    selectedCustomFieldIds,
    onToggleRow: handleToggleCustomField,
    onEditCustomField,
    onDeleteCustomField,
  })

  const visibleUserColumns = useMemo(
    () => userColumns.filter((col) => col.id === 'name' || col.id === 'actions' || visibleColumnIds.has(col.id)),
    [userColumns, visibleColumnIds]
  )

  // ---------- Empty states ----------
  const userEmptyState = (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-sm text-slate-500">
      {users.length === 0 ? 'No users found.' : 'No users match your search.'}
    </div>
  )
  const customFieldEmptyState = (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-sm text-slate-500">
      {customFields.length === 0 ? 'No custom fields have been created yet!' : 'No custom fields match your search.'}
    </div>
  )

  // ---------- Search / button ----------
  const searchPlaceholder = activeTab === 'custom-schedule' ? 'Search personal schedule' : 'Search users'
  const buttonText = activeTab === 'custom-schedule' ? '+ New field' : '+ New user'
  const handleCreateButton = activeTab === 'custom-schedule' ? onCreateField : onCreateUser

  const activeSearchQuery = activeTab === 'user' && externalSearchQuery !== undefined ? externalSearchQuery : searchQuery
  const handleSearchChange = (query: string) => {
    if (activeTab === 'user' && onExternalSearchChange) onExternalSearchChange(query)
    else setSearchQuery(query)
  }

  // ---------- Table header ----------
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
    onFilterClick: () => {},
    filterLabel: 'Filter users',
    customActions: activeTab === 'user' ? (
      <div className="flex items-center gap-2">
        {selectedUserIds.size > 0 ? (
          <>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Download"
            >
              <Download01 className="h-4 w-4" strokeWidth={2} />
            </button>
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
                          onAddToGroup?.(allPagesSelected ? [] : Array.from(selectedUserIds), g.id, allPagesSelected)
                          setAddToGroupOpen(false)
                          setSelectedUserIds(new Set())
                          setAllPagesSelected(false)
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
              className="!bg-red-600 hover:!bg-red-700"
              onClick={() => setBulkDeleteIds(allPagesSelected ? ['__all__'] : Array.from(selectedUserIds))}
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

            {/* Tag filter */}
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
                filterTagId ? 'border-primary text-primary' : 'border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary'
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
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900">Filter</h3>
                </div>
                <button
                  type="button"
                  onClick={() => { onFilterTagChange?.(undefined); setFilterDropdownOpen(false) }}
                  className={['w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50', !filterTagId ? 'font-semibold text-primary' : 'text-slate-700'].join(' ')}
                >
                  All users
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

            {/* Column chooser */}
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
                  {COLUMN_OPTIONS.map((option) => (
                    <label key={option.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                        checked={visibleColumnIds.has(option.id)}
                        onChange={(e) => {
                          setVisibleColumnIds((prev) => {
                            const next = new Set(prev)
                            e.target.checked ? next.add(option.id) : next.delete(option.id)
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
    ) : undefined,
  })

  // ---------- Sort ----------
  const SORT_FIELD_MAP: Record<string, string> = { name: 'name', designation: 'designation' }
  const handleSortChange = useCallback(
    (descriptor: DividerLineTableSortDescriptor) => {
      setSortDescriptor(descriptor)
      setCurrentPage(1)
      if (serverSidePagination && onServerSortChange) {
        const field = SORT_FIELD_MAP[String(descriptor.column)]
        if (!field) return
        onServerSortChange(descriptor.direction === 'descending' ? `-${field}` : field)
      }
    },
    [serverSidePagination, onServerSortChange]
  )

  React.useEffect(() => { setCurrentPage(1) }, [activeTab, searchQuery])
  React.useEffect(() => {
    if (serverSidePagination && searchQuery) serverSidePagination.onPageChange(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // ---------- Table data ----------
  const getTableData = () => {
    if (activeTab === 'custom-schedule') {
      return { data: customFieldTableRows, columns: customFieldColumns, emptyState: customFieldEmptyState, getRowKey: (row: CustomFieldTableRowData) => row.customField?.id || '' }
    }
    return { data: userTableRows, columns: visibleUserColumns, emptyState: userEmptyState, getRowKey: (row: ParticipantTableRowData) => row.participant?.id || '' }
  }

  const tableData = getTableData()

  // ---------- Render ----------
  if (isLoading) {
    return (
      <div className="px-8 pt-8 pb-4">
        <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[26px] font-bold text-primary-dark">User Management</h1>
        </div>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6938EF] mb-4"></div>
            <p className="text-slate-600">Loading users...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-8 pt-8 pb-4">
      <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[26px] font-bold text-primary-dark">User Management</h1>
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
        subheader={activeTab === 'user' && selectedUserIds.size > 0 ? (
          <div className="flex items-center justify-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2 text-sm text-slate-700">
            <span>
              {allPagesSelected ? (
                <>All <span className="font-semibold text-primary">{serverSidePagination?.totalCount ?? users.length}</span> users selected</>
              ) : (
                <>All <span className="font-semibold text-primary">{selectedUserIds.size}</span> rows selected from {serverSidePagination?.totalCount ?? users.length}</>
              )}
            </span>
            {!allPagesSelected && serverSidePagination && selectedUserIds.size < serverSidePagination.totalCount && (
              <button
                type="button"
                onClick={() => setAllPagesSelected(true)}
                className="font-medium text-primary underline underline-offset-2 hover:text-primary-dark"
              >
                Select all {serverSidePagination.totalCount} users
              </button>
            )}
            <button
              type="button"
              onClick={() => { setAllPagesSelected(false); setSelectedUserIds(new Set()) }}
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
          const r = row as ParticipantTableRowData
          if (r.participant) onEditUser?.(r.participant.id)
        } : undefined}
        footer={
          <TablePagination
            currentPage={activePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalCount={
              activeTab === 'user'
                ? (serverSidePagination ? serverSidePagination.totalCount : filteredUsers.length)
                : undefined
            }
          />
        }
      />

      <ConfirmDeleteModal
        isOpen={!!deleteCandidate}
        title="Delete user?"
        itemName={deleteCandidate?.name}
        isLoading={isDeleting}
        onCancel={() => { if (!isDeleting) setDeleteCandidate(null) }}
        onConfirm={confirmDeleteUser}
      />
      <ConfirmDeleteModal
        isOpen={!!bulkDeleteIds?.length}
        title="Delete users?"
        itemName={
          bulkDeleteIds
            ? (bulkDeleteIds[0] === '__all__'
                ? `all ${serverSidePagination?.totalCount ?? users.length} users`
                : `${bulkDeleteIds.length} users`)
            : undefined
        }
        isLoading={isDeleting}
        onCancel={() => { if (!isDeleting) setBulkDeleteIds(null) }}
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}

export default React.memo(UserTable)
