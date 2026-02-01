import React, { useCallback, useMemo, useState } from 'react'
import { Upload01 } from '@untitled-ui/icons-react'
import { DividerLineTable, type DividerLineTableSortDescriptor, Button } from '../../ui/untitled'
import { TablePagination, useTableHeader } from '../../ui'
import type { Organization, OrganizationTableRowData } from './organizationTypes'
import { useOrganizationTableColumns } from './OrganizationTableColumns'

export type OrganizationManagementTab = 'organizations' | 'groups'

interface OrganizationsTableProps {
  organizations: Organization[]
  isLoading?: boolean
  activeTab: OrganizationManagementTab
  onTabChange: (tab: OrganizationManagementTab) => void
  onUpload?: () => void
  onCreateOrganization?: () => void
  onEditOrganization?: (organizationId: string) => void
  onDeleteOrganization?: (organizationId: string) => void
}

const OrganizationsTable: React.FC<OrganizationsTableProps> = ({
  organizations,
  isLoading = false,
  activeTab,
  onTabChange,
  onUpload,
  onCreateOrganization,
  onEditOrganization,
  onDeleteOrganization
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [sortDescriptor, setSortDescriptor] = useState<DividerLineTableSortDescriptor | undefined>({
    column: 'name',
    direction: 'ascending'
  })

  const filteredOrganizations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return organizations
    return organizations.filter((org) => {
      const haystack = [org.name, org.website, org.description, org.logoLink]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [organizations, searchQuery])

  const visibleOrganizationIds = useMemo(
    () => filteredOrganizations.map((org) => org.id),
    [filteredOrganizations]
  )

  const allVisibleSelected = useMemo(() => {
    return (
      visibleOrganizationIds.length > 0 &&
      visibleOrganizationIds.every((id) => selectedOrganizationIds.has(id))
    )
  }, [selectedOrganizationIds, visibleOrganizationIds])

  const partiallySelected = useMemo(() => {
    return !allVisibleSelected && visibleOrganizationIds.some((id) => selectedOrganizationIds.has(id))
  }, [allVisibleSelected, selectedOrganizationIds, visibleOrganizationIds])

  const handleToggleAllVisible = useCallback(
    (checked: boolean) => {
      setSelectedOrganizationIds((previous) => {
        const next = new Set(previous)
        visibleOrganizationIds.forEach((id) => {
          if (checked) next.add(id)
          else next.delete(id)
        })
        return next
      })
    },
    [visibleOrganizationIds]
  )

  const handleToggleRow = useCallback((id: string, checked: boolean) => {
    setSelectedOrganizationIds((previous) => {
      const next = new Set(previous)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  // Pagination
  const totalPages = useMemo(() => Math.ceil(filteredOrganizations.length / itemsPerPage), [filteredOrganizations.length])
  const paginatedOrganizations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredOrganizations.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredOrganizations, currentPage])

  const rows = useMemo<OrganizationTableRowData[]>(
    () => paginatedOrganizations.map((organization, index) => ({ organization, index })),
    [paginatedOrganizations]
  )

  const columns = useOrganizationTableColumns({
    allVisibleSelected,
    partiallySelected,
    selectedOrganizationIds,
    onToggleAllVisible: handleToggleAllVisible,
    onToggleRow: handleToggleRow,
    onEditOrganization,
    onDeleteOrganization
  })

  const emptyState = (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-sm text-slate-500">
      {organizations.length === 0 ? 'No organizations have been added yet!' : 'No organizations match your search.'}
    </div>
  )

  const handleSortChange = useCallback((descriptor: DividerLineTableSortDescriptor) => {
    setSortDescriptor(descriptor)
  }, [])

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const tableHeader = useTableHeader({
    tabs: [
      { id: 'organizations', label: 'Organizations' },
      { id: 'groups', label: 'Groups' }
    ],
    activeTabId: activeTab,
    searchQuery,
    searchPlaceholder: 'Search organizations',
    onTabChange: (tabId) => onTabChange(tabId as OrganizationManagementTab),
    onSearchChange: setSearchQuery,
    showFilter: true,
    onFilterClick: () => {
      // UI only for now
      console.log('Organization filter clicked')
    },
    filterLabel: 'Filter organizations',
    customActions: undefined
  })

  // Loading state - must be after hooks to keep hook order stable
  if (isLoading) {
    return (
      <div className="space-y-8 px-4 pb-12 pt-8 md:px-10 lg:px-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[26px] font-bold text-primary-dark">Organization management</h1>
        </div>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6938EF] mb-4"></div>
            <p className="text-slate-600">Loading organizations...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 px-4 pb-12 pt-8 md:px-10 lg:px-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between -mb-4">
        <h1 className="text-[26px] font-bold text-primary-dark">Organization management</h1>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={onUpload}
            iconLeading={<Upload01 className="h-4 w-4" />}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Upload
          </Button>
          <button
            type="button"
            onClick={onCreateOrganization}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white border border-slate-200 bg-primary shadow-sm transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            + New profile
          </button>
        </div>
      </div>

      <DividerLineTable
        headerLeading={tableHeader.leading}
        headerActions={tableHeader.actions}
        data={rows}
        columns={columns}
        getRowKey={(row: OrganizationTableRowData) => row.organization?.id || String(row.index)}
        emptyState={emptyState}
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        onRowClick={(row) => {
          const orgRow = row as OrganizationTableRowData
          if (orgRow.organization) {
            onEditOrganization?.(orgRow.organization.id)
          }
        }}
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

export default OrganizationsTable

