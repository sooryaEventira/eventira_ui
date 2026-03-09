import React, { useMemo, useState, useCallback } from 'react'
import {
  DividerLineTable,
  type DividerLineTableSortDescriptor
} from '../../ui/untitled'
import type { Group } from './speakerTypes'
import type { GroupTableRowData } from '../attendeemanagement/attendeeTypes'
import { TablePagination, useTableHeader } from '../../ui'
import { useGroupTableColumns } from '../attendeemanagement/GroupTableColumns'

interface SpeakerGroupsTableProps {
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

const SpeakerGroupsTable: React.FC<SpeakerGroupsTableProps> = ({
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

  // Filter groups - ensure we only have valid Group objects
  const filteredGroups = useMemo(() => {
    // Validate that all items are proper Group objects
    // Filter out any items that don't match the Group interface structure
    const validGroups = groups.filter((group) => {
      // Group should have: id, name, and (speaker_count or speakerCount)
      // Should NOT have: email, inviteCode, status, etc. (which are Speaker properties)
      const hasCount = 'speaker_count' in group || 'speakerCount' in group
      return (
        group &&
        typeof group === 'object' &&
        'id' in group &&
        'name' in group &&
        hasCount &&
        !('email' in group) && // Speakers have email, groups don't
        !('phoneNumber' in group) && // Speakers have phoneNumber, groups don't
        !('status' in group) // Speakers have status, groups don't
      )
    })

    const query = searchQuery.trim().toLowerCase()
    if (!query) return validGroups

    return validGroups.filter((group) => {
      return group.name.toLowerCase().includes(query)
    })
  }, [searchQuery, groups])

  // Get visible IDs
  const visibleGroupIds = useMemo(
    () => filteredGroups.map((group) => group.id),
    [filteredGroups]
  )

  // Paginate groups
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredGroups.slice(startIndex, endIndex)
  }, [filteredGroups, currentPage])

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredGroups.length / itemsPerPage)
  }, [filteredGroups.length])

  void visibleGroupIds

  // Table rows - map speaker count to attendee_count/attendeeCount for compatibility with GroupTableColumns
  const groupTableRows = useMemo<GroupTableRowData[]>(() => {
    return paginatedGroups.map((group, index) => {
      const count = group.speaker_count ?? group.speakerCount ?? 0
      return {
        group: {
          id: group.id,
          name: group.name,
          attendee_count: count,
          attendeeCount: count,
        },
        index,
      }
    })
  }, [paginatedGroups])

  const groupColumns = useGroupTableColumns({
    builtGroupIds,
    onToggleBuildPage,
    onEditGroup,
    onDeleteGroup,
    countColumnHeader: 'Speaker count',
  })

  // Empty state
  const groupEmptyState = (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-sm text-slate-500">
      {groups.length === 0
        ? 'No groups have been created yet!'
        : 'No groups match your search.'}
    </div>
  )

  // Table header
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

  const handleSortChange = useCallback(
    (descriptor: DividerLineTableSortDescriptor) => {
      setSortDescriptor(descriptor)
    },
    []
  )

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Loading state - check after all hooks
  if (isLoading) {
    return (
      <div className="space-y-8 px-4 pb-12 pt-8 md:px-10 lg:px-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[26px] font-bold text-primary-dark">Speaker Management</h1>
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
        <h1 className="text-[26px] font-bold text-primary-dark">Speaker Management</h1>
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
        emptyState={groupEmptyState}
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

export default SpeakerGroupsTable
