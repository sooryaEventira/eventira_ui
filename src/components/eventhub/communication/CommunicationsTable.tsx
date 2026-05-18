import React, { useMemo, useState, useCallback } from 'react'
import {
  DividerLineTable,
  type DividerLineTableSortDescriptor
} from '../../ui/untitled'
import { Communication, Macro } from './communicationTypes'
import type { TableTab, TableRowData } from './types'
import { TablePagination, useTableHeader } from '../../ui'
import { useListTableColumns } from './ListTableColumns'
import { useMacroTableColumns } from './MacroTableColumns'

interface CommunicationsTableProps {
  communications: Communication[]
  macros?: Macro[]
  onCreateBroadcast: () => void
  onEditCommunication?: (communicationId: string) => void
  onDeleteCommunication?: (communicationId: string) => void
  onCreateMacro?: () => void
  onEditMacro?: (macroId: string) => void
  onDeleteMacro?: (macroId: string) => void
  onRecipientsClick?: (communicationId: string, communicationTitle: string, tab: 'received' | 'not_received') => void
  onResendCommunication?: (communicationId: string, communicationTitle: string) => void
  resendingCommunicationIds?: Set<string>
  isLoading?: boolean
  /** When the Macros tab is active, show loading until GET macros completes */
  isLoadingMacros?: boolean
}

const CommunicationsTable: React.FC<CommunicationsTableProps> = ({
  communications,
  macros = [],
  onCreateBroadcast,
  onEditCommunication,
  onDeleteCommunication,
  onCreateMacro: _onCreateMacro,
  onEditMacro,
  onDeleteMacro,
  onRecipientsClick,
  onResendCommunication,
  resendingCommunicationIds,
  isLoading = false,
  isLoadingMacros = false
}) => {

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TableTab>('list')
  const [selectedCommunicationIds, setSelectedCommunicationIds] = useState<Set<string>>(new Set())
  const [selectedMacroIds, setSelectedMacroIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [sortDescriptors, setSortDescriptors] = useState<
    Record<TableTab, DividerLineTableSortDescriptor | undefined>
  >({
    list: { column: 'title', direction: 'ascending' },
    macros: { column: 'macro', direction: 'ascending' }
  })

  const filteredCommunications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return communications

    return communications.filter((comm) => {
      const haystack = [
        comm.title,
        ...comm.userGroups.map((g) => g.name),
        comm.status,
        comm.type
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [searchQuery, communications])

  const filteredMacros = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return macros

    return macros.filter((macro) => {
      const haystack = [macro.macro, macro.column].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [searchQuery, macros])

  const visibleCommunicationIds = useMemo(
    () => filteredCommunications.map((comm) => comm.id),
    [filteredCommunications]
  )

  const visibleMacroIds = useMemo(
    () => filteredMacros.map((macro) => macro.id),
    [filteredMacros]
  )

  const paginatedCommunications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredCommunications.slice(startIndex, endIndex)
  }, [filteredCommunications, currentPage])

  const paginatedMacros = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredMacros.slice(startIndex, endIndex)
  }, [filteredMacros, currentPage])

  const totalPages = useMemo(() => {
    const totalItems = activeTab === 'list' ? filteredCommunications.length : filteredMacros.length
    return Math.ceil(totalItems / itemsPerPage)
  }, [activeTab, filteredCommunications.length, filteredMacros.length])

  const allVisibleSelected = useMemo(() => {
    if (activeTab === 'list') {
      return (
        visibleCommunicationIds.length > 0 &&
        visibleCommunicationIds.every((id) => selectedCommunicationIds.has(id))
      )
    } else {
      return (
        visibleMacroIds.length > 0 &&
        visibleMacroIds.every((id) => selectedMacroIds.has(id))
      )
    }
  }, [activeTab, visibleCommunicationIds, visibleMacroIds, selectedCommunicationIds, selectedMacroIds])

  const partiallySelected = useMemo(() => {
    if (activeTab === 'list') {
      return (
        !allVisibleSelected &&
        visibleCommunicationIds.some((id) => selectedCommunicationIds.has(id))
      )
    } else {
      return (
        !allVisibleSelected &&
        visibleMacroIds.some((id) => selectedMacroIds.has(id))
      )
    }
  }, [activeTab, allVisibleSelected, visibleCommunicationIds, visibleMacroIds, selectedCommunicationIds, selectedMacroIds])

  const handleToggleAllVisible = useCallback(
    (checked: boolean) => {
      if (activeTab === 'list') {
        setSelectedCommunicationIds((previous) => {
          const next = new Set(previous)
          visibleCommunicationIds.forEach((id) => {
            if (checked) {
              next.add(id)
            } else {
              next.delete(id)
            }
          })
          return next
        })
      } else {
        setSelectedMacroIds((previous) => {
          const next = new Set(previous)
          visibleMacroIds.forEach((id) => {
            if (checked) {
              next.add(id)
            } else {
              next.delete(id)
            }
          })
          return next
        })
      }
    },
    [activeTab, visibleCommunicationIds, visibleMacroIds]
  )

  const handleToggleRow = useCallback(
    (id: string, checked: boolean) => {
      if (activeTab === 'list') {
        setSelectedCommunicationIds((previous) => {
          const next = new Set(previous)
          if (checked) {
            next.add(id)
          } else {
            next.delete(id)
          }
          return next
        })
      } else {
        setSelectedMacroIds((previous) => {
          const next = new Set(previous)
          if (checked) {
            next.add(id)
          } else {
            next.delete(id)
          }
          return next
        })
      }
    },
    [activeTab]
  )

  const tableRows = useMemo<TableRowData[]>(() => {
    if (activeTab === 'list') {
      return paginatedCommunications.map((comm, index) => ({ communication: comm, index }))
    } else {
      return paginatedMacros.map((macro, index) => ({ macro, index }))
    }
  }, [activeTab, paginatedCommunications, paginatedMacros])

  const listColumns = useListTableColumns({
    allVisibleSelected,
    partiallySelected,
    selectedCommunicationIds,
    onToggleAllVisible: handleToggleAllVisible,
    onToggleRow: handleToggleRow,
    onEditCommunication,
    onDeleteCommunication,
    onRecipientsClick,
    onResendCommunication,
    resendingCommunicationIds,
  })

  const macroColumns = useMacroTableColumns({
    allVisibleSelected,
    partiallySelected,
    selectedMacroIds,
    onToggleAllVisible: handleToggleAllVisible,
    onToggleRow: handleToggleRow,
    onEditMacro,
    onDeleteMacro
  })

  const columns = useMemo(() => {
    return activeTab === 'list' ? listColumns : macroColumns
  }, [activeTab, listColumns, macroColumns])

  const emptyState = (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-sm text-slate-500">
      {activeTab === 'list' ? (
        communications.length === 0
          ? 'No emails/notifications created!'
          : 'No communications match your search.'
      ) : (
        macros.length === 0
          ? 'No macros created!'
          : 'No macros match your search.'
      )}
    </div>
  )

  const tableHeader = useTableHeader({
    tabs: [
      { id: 'list', label: 'List' },
      { id: 'macros', label: 'Macros' }
    ],
    activeTabId: activeTab,
    searchQuery,
    searchPlaceholder: activeTab === 'list' ? 'Search communication' : 'Search macros',
    onTabChange: (tabId) => setActiveTab(tabId as TableTab),
    onSearchChange: setSearchQuery
  })

  const handleSortChange = useCallback(
    (descriptor: DividerLineTableSortDescriptor) => {
      setSortDescriptors((previous) => ({
        ...previous,
        [activeTab]: descriptor
      }))
    },
    [activeTab]
  )

  // Reset page when switching tabs
  React.useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // Loading state - check after all hooks (per-tab so Macros can load independently)
  const showBlockingLoading =
    (activeTab === 'list' && isLoading) || (activeTab === 'macros' && isLoadingMacros)

  if (showBlockingLoading) {
    return (
      <div className="space-y-8 px-8 pb-12 pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[26px] font-bold text-primary-dark">Communications</h1>
        </div>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6938EF] mb-4"></div>
            <p className="text-slate-600">
              {activeTab === 'macros' ? 'Loading macros...' : 'Loading communications...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 px-8 pb-12 pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ">
        <h1 className="text-[26px] font-bold text-primary-dark ">Communications</h1>
        <div className="flex items-center gap-3">
          {activeTab === 'list' && (
            <button
              type="button"
              onClick={onCreateBroadcast}
              className="inline-flex items-center justify-center rounded-md  px-4 py-2 text-sm font-semibold text-white border border-slate-200 bg-primary shadow-sm transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              + New broadcast
            </button>
          )}
        </div>
      </div>

      <DividerLineTable
        headerLeading={tableHeader.leading}
        headerActions={tableHeader.actions}
        data={tableRows}
        columns={columns}
        getRowKey={(row, index) => row.communication?.id || row.macro?.id || `row-${index}`}
        emptyState={emptyState}
        sortDescriptor={sortDescriptors[activeTab]}
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

export default CommunicationsTable
