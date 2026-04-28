import React, { useMemo, useState, useCallback } from 'react'
import { Plus, Pencil01, Trash03 } from '@untitled-ui/icons-react'
import {
  DividerLineTable,
  type DividerLineTableColumn,
  type DividerLineTableSortDescriptor,
  Button
} from '../../ui/untitled'
import { SavedSchedule } from './sessionTypes'
import { useTableHeader, TablePagination } from '../../ui'
import NewTagModal from './NewTagModal'

type TableRowData = {
  schedule: SavedSchedule
  index: number
}

interface SavedSchedulesTableProps {
  schedules: SavedSchedule[]
  builtScheduleIds?: Set<string>
  onToggleBuildPage?: (schedule: { id: string; name: string }, checked: boolean) => void
  onCreateSchedule: () => void
  onEditSchedule?: (scheduleId: string) => void
  onDeleteSchedule?: (scheduleId: string) => void
  onManageSession?: (scheduleId: string) => void
}

const SavedSchedulesTable: React.FC<SavedSchedulesTableProps> = ({
  schedules,
  builtScheduleIds,
  onToggleBuildPage,
  onCreateSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onManageSession
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [isNewTagModalOpen, setIsNewTagModalOpen] = useState(false)
  const itemsPerPage = 10
  const [sortDescriptors, setSortDescriptors] = useState<
    DividerLineTableSortDescriptor | undefined
  >({ column: 'name', direction: 'ascending' })
  const searchPlaceholder = 'Search schedules'

  const tableHeader = useTableHeader({
    tabs: [
      { id: 'schedules', label: 'Schedule list' }
    ],
    activeTabId: 'schedules',
    searchQuery,
    searchPlaceholder,
    onTabChange: () => {},
    onSearchChange: setSearchQuery,
    onFilterClick: () => setSearchQuery(''),
    showFilter: true,
    filterLabel: 'Filter schedules'
  })

  const filteredSchedules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return schedules

    return schedules.filter((schedule) => {
      const { session } = schedule
      const haystack = [
        schedule.name,
        session?.location,
        session?.sessionType,
        session?.title,
        ...(session?.tags || [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [searchQuery, schedules])

  const paginatedSchedules = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredSchedules.slice(startIndex, endIndex)
  }, [filteredSchedules, currentPage])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredSchedules.length / itemsPerPage)
  }, [filteredSchedules.length])

  const handleToggleRow = useCallback((scheduleId: string, checked: boolean) => {
    setSelectedScheduleIds((previous) => {
      const next = new Set(previous)
      if (checked) {
        next.add(scheduleId)
      } else {
        next.delete(scheduleId)
      }
      return next
    })
  }, [])

  const tableRows = useMemo<TableRowData[]>(
    () => paginatedSchedules.map((schedule, index) => ({ schedule, index })),
    [paginatedSchedules]
  )

  const formatScheduleName = useCallback(
    (schedule: SavedSchedule, index: number) => schedule.name || `Schedule ${index + 1}`,
    []
  )

  const scheduleColumns = useMemo<DividerLineTableColumn<TableRowData>[]>(() => {
    return [
      {
        id: 'name',
        header: 'Schedule title',
        sortable: true,
        sortAccessor: ({ schedule, index }) => schedule.name ?? `Schedule ${index + 1}`,
        render: ({ schedule, index }) => (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
              aria-label={`Select ${formatScheduleName(schedule, index)}`}
              checked={selectedScheduleIds.has(schedule.id)}
              onChange={(event) => handleToggleRow(schedule.id, event.target.checked)}
            />
            <span>{formatScheduleName(schedule, index)}</span>
          </div>
        )
      },
      {
        id: 'manage',
        header: '',
        align: 'center',
        render: ({ schedule }) => (
          <div className="flex items-center justify-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onManageSession?.(schedule.id)}
            >
              Manage session
            </Button>
          </div>
        )
      },
      {
        id: 'buildPage',
        header: 'Build page',
        align: 'center',
        sortable: false,
        render: ({ schedule }) => {
          const isBuilt = Boolean(builtScheduleIds?.has(schedule.id))
          return (
            <button
              type="button"
              role="checkbox"
              aria-checked={isBuilt}
              aria-label={`Build page for ${schedule.name}`}
              tabIndex={0}
              className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-primary transition focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-0"
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                e.stopPropagation()
                onToggleBuildPage?.({ id: schedule.id, name: schedule.name }, !isBuilt)
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleBuildPage?.({ id: schedule.id, name: schedule.name }, !isBuilt)
              }}
            >
              {isBuilt ? (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                  <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                </svg>
              ) : null}
            </button>
          )
        }
      },
      {
        id: 'actions',
        header: 'Actions',
        align: 'right',
        render: ({ schedule }) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onEditSchedule?.(schedule.id)}
              className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={`Edit ${schedule.name}`}
            >
              <Pencil01 className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => onDeleteSchedule?.(schedule.id)}
              className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:border-rose-400 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
              aria-label={`Delete ${schedule.name}`}
            >
              <Trash03 className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        )
      }
    ]
  }, [
    formatScheduleName,
    handleToggleRow,
    builtScheduleIds,
    onToggleBuildPage,
    onEditSchedule,
    onDeleteSchedule,
    onManageSession,
    selectedScheduleIds
  ])

  const currentColumns = scheduleColumns

  const emptyState = (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <svg
            className="h-8 w-8 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="text-base font-semibold text-slate-900">
            {schedules.length === 0
              ? 'No schedules have been saved yet'
              : 'No schedules match your search'}
          </p>
          <p className="text-sm text-slate-500 max-w-sm">
            {schedules.length === 0
              ? 'Get started by creating your first schedule or uploading an existing one.'
              : 'Try adjusting your search terms or filters to find what you\'re looking for.'}
          </p>
        </div>
      </div>
    </div>
  )


  const handleSortChange = useCallback(
    (descriptor: DividerLineTableSortDescriptor) => {
      setSortDescriptors(descriptor)
    },
    []
  )

  const handleSaveTag = (tagName: string, color: string) => {
    console.log('Saving tag:', { tagName, color })
    // TODO: Implement tag saving logic
    setIsNewTagModalOpen(false)
  }

  return (
    <div className="space-y-8 px-4 pb-12 pt-8 md:px-10 lg:px-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[26px] font-bold text-primary-dark">Schedules/Session</h1>
        <div className="sm:flex sm:items-center">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onCreateSchedule}
            iconLeading={<Plus className="h-4 w-4" />}
          >
            <span className="whitespace-nowrap">Create schedule</span>
          </Button>
        </div>
      </div>

      <DividerLineTable
        headerLeading={tableHeader.leading}
        headerActions={tableHeader.actions}
        data={tableRows}
        columns={currentColumns}
        getRowKey={({ schedule }) => schedule.id}
        emptyState={emptyState}
        sortDescriptor={sortDescriptors}
        onSortChange={handleSortChange}
        footer={
          filteredSchedules.length > 0 ? (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          ) : undefined
        }
      />

      <NewTagModal
        isOpen={isNewTagModalOpen}
        onClose={() => setIsNewTagModalOpen(false)}
        onSave={handleSaveTag}
      />
    </div>
  )
}

export default SavedSchedulesTable

