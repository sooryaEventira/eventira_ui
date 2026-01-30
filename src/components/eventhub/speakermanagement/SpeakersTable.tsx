import React, { useMemo, useState, useCallback } from 'react'
import {
  DividerLineTable,
  type DividerLineTableSortDescriptor,
  Button
} from '../../ui/untitled'
import { Speaker, SpeakerTab, CustomField } from './speakerTypes'
import type { SpeakerTableRowData } from './speakerTypes'
import type { CustomFieldTableRowData } from '../attendeemanagement/attendeeTypes'
import { TablePagination, useTableHeader } from '../../ui'
import { useSpeakerTableColumns } from './SpeakerTableColumns'
import { useCustomFieldTableColumns } from '../attendeemanagement/CustomFieldTableColumns'
import { Download01, Grid01, Upload01 } from '@untitled-ui/icons-react'

interface SpeakersTableProps {
  speakers: Speaker[]
  customFields?: CustomField[]
  activeTab: SpeakerTab
  onTabChange: (tab: SpeakerTab) => void
  onUpload?: () => void
  onCreateProfile?: () => void
  onCreateField?: () => void
  onEditSpeaker?: (speakerId: string) => void
  onDeleteSpeaker?: (speakerId: string) => void
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
  activeTab,
  onTabChange,
  onUpload,
  onCreateProfile,
  onCreateField,
  onEditSpeaker,
  isLoading = false,
  onDeleteSpeaker,
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

  // Selection logic for speakers
  const allVisibleSpeakersSelected = useMemo(() => {
    return (
      visibleSpeakerIds.length > 0 &&
      visibleSpeakerIds.every((id) => selectedSpeakerIds.has(id))
    )
  }, [visibleSpeakerIds, selectedSpeakerIds])

  const partiallySpeakersSelected = useMemo(() => {
    return (
      !allVisibleSpeakersSelected &&
      visibleSpeakerIds.some((id) => selectedSpeakerIds.has(id))
    )
  }, [allVisibleSpeakersSelected, visibleSpeakerIds, selectedSpeakerIds])


  // Selection logic for custom fields
  const allVisibleCustomFieldsSelected = useMemo(() => {
    return (
      visibleCustomFieldIds.length > 0 &&
      visibleCustomFieldIds.every((id) => selectedCustomFieldIds.has(id))
    )
  }, [visibleCustomFieldIds, selectedCustomFieldIds])

  const partiallyCustomFieldsSelected = useMemo(() => {
    return (
      !allVisibleCustomFieldsSelected &&
      visibleCustomFieldIds.some((id) => selectedCustomFieldIds.has(id))
    )
  }, [allVisibleCustomFieldsSelected, visibleCustomFieldIds, selectedCustomFieldIds])

  // Toggle handlers
  const handleToggleAllSpeakers = useCallback(
    (checked: boolean) => {
      setSelectedSpeakerIds((previous) => {
        const next = new Set(previous)
        visibleSpeakerIds.forEach((id) => {
          if (checked) {
            next.add(id)
          } else {
            next.delete(id)
          }
        })
        return next
      })
    },
    [visibleSpeakerIds]
  )

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


  const handleToggleAllCustomFields = useCallback(
    (checked: boolean) => {
      setSelectedCustomFieldIds((previous) => {
        const next = new Set(previous)
        visibleCustomFieldIds.forEach((id) => {
          if (checked) {
            next.add(id)
          } else {
            next.delete(id)
          }
        })
        return next
      })
    },
    [visibleCustomFieldIds]
  )

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
  const speakerTableRows = useMemo<SpeakerTableRowData[]>(() => {
    return paginatedSpeakers.map((speaker, index) => ({ speaker, index }))
  }, [paginatedSpeakers])


  const customFieldTableRows = useMemo<CustomFieldTableRowData[]>(() => {
    return paginatedCustomFields.map((field, index) => ({ customField: field, index }))
  }, [paginatedCustomFields])

  const speakerColumns = useSpeakerTableColumns({
    allVisibleSelected: allVisibleSpeakersSelected,
    partiallySelected: partiallySpeakersSelected,
    selectedSpeakerIds,
    onToggleAllVisible: handleToggleAllSpeakers,
    onToggleRow: handleToggleSpeaker,
    onEditSpeaker,
    onDeleteSpeaker
  })


  const customFieldColumns = useCustomFieldTableColumns({
    allVisibleSelected: allVisibleCustomFieldsSelected,
    partiallySelected: partiallyCustomFieldsSelected,
    selectedCustomFieldIds,
    onToggleAllVisible: handleToggleAllCustomFields,
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
    showFilter: true,
    onFilterClick: onFilter || (() => {}),
    filterLabel: `Filter ${activeTab === 'custom-schedule' ? 'custom fields' : 'speakers'}`,
    customActions: activeTab === 'user' ? (
      <div className="flex items-center gap-2">
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
          <Grid01 className="h-4 w-4" strokeWidth={2} />
        </button>
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
    </div>
  )
}

export default SpeakersTable
