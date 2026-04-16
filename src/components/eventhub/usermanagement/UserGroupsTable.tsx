import React, { useMemo, useState, useCallback } from 'react'
import {
  DividerLineTable,
  type DividerLineTableSortDescriptor
} from '../../ui/untitled'
import { Group } from './participantTypes'
import type { GroupTableRowData } from './participantTypes'
import { TablePagination, useTableHeader } from '../../ui'
import { useGroupTableColumns } from './GroupTableColumns'

interface UserGroupsTableProps {
  groups: Group[]
  onCreateGroup?: () => void
  onEditGroup?: (groupId: string) => void
  onDeleteGroup?: (groupId: string) => void
  builtGroupIds?: Set<string>
  onToggleBuildPage?: (group: { id: string; name: string }, checked: boolean) => void
  onFilter?: () => void
  onTabChange?: (tab: 'user' | 'groups' | 'custom-schedule') => void
  isLoading?: boolean
}

const UserGroupsTable: React.FC<UserGroupsTableProps> = ({
  groups,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  builtGroupIds,
  onToggleBuildPage,
  onFilter,
  onTabChange,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [sortDescriptor, setSortDescriptor] = useState<DividerLineTableSortDescriptor | undefined>({
    column: 'groupName',
    direction: 'ascending'
  })

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return groups
    return groups.filter((g) => g.name.toLowerCase().includes(query))
  }, [searchQuery, groups])

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredGroups.slice(start, start + itemsPerPage)
  }, [filteredGroups, currentPage])

  const totalPages = useMemo(
    () => Math.ceil(filteredGroups.length / itemsPerPage),
    [filteredGroups.length]
  )

  const groupTableRows = useMemo<GroupTableRowData[]>(
    () => paginatedGroups.map((group, index) => ({ group, index })),
    [paginatedGroups]
  )

  const groupColumns = useGroupTableColumns({
    builtGroupIds,
    onToggleBuildPage,
    onEditGroup,
    onDeleteGroup,
    countColumnHeader: 'User count',
  })

  const emptyState = (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-sm text-slate-500">
      {groups.length === 0 ? 'No groups have been created yet!' : 'No groups match your search.'}
    </div>
  )

  const tableHeader = useTableHeader({
    tabs: [
      { id: 'user', label: 'User' },
      { id: 'groups', label: 'Groups' },
      { id: 'custom-schedule', label: 'Custom schedule' }
    ],
    activeTabId: 'groups',
    searchQuery,
    searchPlaceholder: 'Search group',
    onTabChange: (tabId) => onTabChange?.(tabId as 'user' | 'groups' | 'custom-schedule'),
    onSearchChange: setSearchQuery,
    showFilter: true,
    onFilterClick: onFilter || (() => {}),
    filterLabel: 'Filter groups',
    customActions: undefined
  })

  const handleSortChange = useCallback((descriptor: DividerLineTableSortDescriptor) => {
    setSortDescriptor(descriptor)
  }, [])

  React.useEffect(() => { setCurrentPage(1) }, [searchQuery])

  if (isLoading) {
    return (
      <div className="space-y-8 px-4 pb-12 pt-8 md:px-10 lg:px-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[26px] font-bold text-primary-dark">User Management</h1>
        </div>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6938EF] mb-4"></div>
            <p className="text-slate-600">Loading groups...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 px-4 pb-12 pt-8 md:px-10 lg:px-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[26px] font-bold text-primary-dark">User Management</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCreateGroup}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white border border-slate-200 bg-primary shadow-sm transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            + New group
          </button>
        </div>
      </div>

      <DividerLineTable
        headerLeading={tableHeader.leading}
        headerActions={tableHeader.actions}
        data={groupTableRows}
        columns={groupColumns}
        getRowKey={(row: GroupTableRowData, index: number) => row.group?.id || `group-${index}`}
        emptyState={emptyState}
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        footer={
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        }
      />
    </div>
  )
}

export default UserGroupsTable
