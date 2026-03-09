import React, { useMemo, useState, useEffect } from 'react'
import { Trash03 } from '@untitled-ui/icons-react'
import { DividerLineTable, type DividerLineTableColumn, type DividerLineTableSortDescriptor, type DateRange } from '../ui/untitled'
import { TablePagination } from '../ui/TablePagination'
import { ConfirmDeleteModal } from '../ui'

export interface Event {
  id: string
  name: string
  status: 'Live' | 'Draft'
  attendanceType: 'Virtual' | 'In-person' | 'Hybrid'
  registrations: number
  eventDate: string
  createdBy: string
  createdAt?: string
  // Display-only event code (e.g. "#73527")
  eventCode?: string
  // Visibility label (Public, Private, Mixed)
  visibility?: 'Public' | 'Private' | 'Mixed'
  // Raw start/end dates from API (ISO or YYYY-MM-DD) used for sorting/filtering
  startDate?: string
  endDate?: string
}

interface EventsTableProps {
  events?: Event[]
  onEditClick?: (eventId: string) => void
  onDeleteClick?: (eventId: string) => void | Promise<void>
  onRowClick?: (event: Event) => void
  onSort?: (column: string) => void
  searchValue?: string
  dateRange?: DateRange
  statusFilter?: string
  attendanceTypeFilter?: string
  createdByFilter?: string
}

const StatusBadge: React.FC<{ status: 'Live' | 'Draft' }> = ({ status }) => {
  const styles = {
    Live: 'bg-green-100 text-green-700',
    Draft: 'bg-red-100 text-red-700'
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

const AttendanceTypeBadge: React.FC<{ type: 'Virtual' | 'In-person' | 'Hybrid' }> = ({ type }) => {
  const styles: Record<string, string> = {
    'Virtual': 'bg-purple-100 text-purple-700',
    'In-person': 'bg-pink-100 text-pink-700',
    'Hybrid': 'bg-blue-100 text-blue-700'
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[type]}`}>
      {type}
    </span>
  )
}

const EventsTable: React.FC<EventsTableProps> = ({
  events = [],
  onEditClick,
  onDeleteClick,
  onRowClick,
  onSort,
  searchValue = '',
  dateRange,
  statusFilter,
  attendanceTypeFilter,
  createdByFilter
}) => {
  const [sortDescriptor, setSortDescriptor] = useState<DividerLineTableSortDescriptor | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Log events received
  useEffect(() => {
    console.log('📊 [EventsTable] Received events:', events.length, 'events')
    console.log('📊 [EventsTable] Events data:', JSON.stringify(events, null, 2))
  }, [events])

  const handleSortChange = (descriptor: DividerLineTableSortDescriptor) => {
    setSortDescriptor(descriptor)
    onSort?.(descriptor.column)
  }

  // Filter events based on search value, date range, status, attendance type, and created by
  const filteredEvents = useMemo(() => {
    let result = events

    // Apply search filter
    if (searchValue.trim()) {
      const query = searchValue.trim().toLowerCase()
      result = result.filter((event) => {
        const haystack = [
          event.name,
          event.eventCode,
          event.status,
          event.attendanceType,
          event.visibility,
          event.createdBy,
          event.eventDate
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      })
    }

    // Apply date range filter (use raw startDate so formatted range does not affect filtering)
    if (dateRange?.start || dateRange?.end) {
      result = result.filter((event) => {
        try {
          const raw = event.startDate || event.eventDate
          const parsed = raw ? new Date(raw) : null
          if (!parsed || isNaN(parsed.getTime())) return true // If cannot parse, include the event

          // Normalize dates to compare only the date part (ignore time)
          const eventTime = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime()

          // If only start date is set
          if (dateRange.start && !dateRange.end) {
            const startTime = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()).getTime()
            return eventTime >= startTime
          }

          // If only end date is set
          if (dateRange.end && !dateRange.start) {
            const endTime = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate()).getTime()
            return eventTime <= endTime
          }

          // If both start and end dates are set
          if (dateRange.start && dateRange.end) {
            const startTime = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()).getTime()
            const endTime = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate()).getTime()
            return eventTime >= startTime && eventTime <= endTime
          }

          return true
        } catch {
          return true // If any error, include the event
        }
      })
    }

    // Apply status filter
    if (statusFilter) {
      result = result.filter((event) => event.status === statusFilter)
    }

    // Apply attendance type filter
    if (attendanceTypeFilter) {
      result = result.filter((event) => event.attendanceType === attendanceTypeFilter)
    }

    // Apply created by filter
    if (createdByFilter) {
      result = result.filter((event) => event.createdBy === createdByFilter)
    }

    return result
  }, [events, searchValue, dateRange, statusFilter, attendanceTypeFilter, createdByFilter])

  // Paginate filtered events
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredEvents.slice(startIndex, endIndex)
  }, [filteredEvents, currentPage])

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredEvents.length / itemsPerPage)
  }, [filteredEvents.length])

  // Reset to page 1 when search value, date range, or any filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchValue, dateRange, statusFilter, attendanceTypeFilter, createdByFilter])

  const columns: Array<DividerLineTableColumn<Event>> = useMemo(
    () => [

      {
        id: 'eventCode',
        header: 'Event ID',
        sortable: true,
        sortAccessor: (item) => item.eventCode || '',
        render: (item) => (
          <div className="text-slate-700">{item.eventCode ?? '-'}</div>
        )
      },
      {
        id: 'name',
        header: 'Event name',
        sortable: true,
        sortAccessor: (item) => item.name,
        render: (item) => (
          <div className="font-medium text-slate-900">{item.name}</div>
        )
      },


      {
        id: 'eventDate',
        header: 'Event date',
        sortable: true,
        sortAccessor: (item) => item.startDate || item.eventDate,
        render: (item) => <div>{item.eventDate}</div>
      },
      {
        id: 'status',
        header: 'Status',
        sortable: true,
        sortAccessor: (item) => item.status,
        render: (item) => <StatusBadge status={item.status} />
      },
      {
        id: 'attendanceType',
        header: 'Attendance',
        sortable: true,
        sortAccessor: (item) => item.attendanceType,
        render: (item) => <AttendanceTypeBadge type={item.attendanceType} />
      },
      {
        id: 'visibility',
        header: 'Accessibility',
        sortable: true,
        sortAccessor: (item) => item.visibility || '',
        render: (item) => (
          <div>
            {item.visibility && (
              <span
                className={[
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  item.visibility === 'Public'
                    ? 'bg-emerald-50 text-emerald-700'
                    : item.visibility === 'Private'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-indigo-50 text-indigo-700'
                ].join(' ')}
              >
                {item.visibility}
              </span>
            )}
          </div>
        )
      },
      // {
      //   id: 'registrations',
      //   header: 'Registrations',
      //   sortable: true,
      //   sortAccessor: (item) => item.registrations,
      //   render: (item) => <div>{item.registrations}</div>
      // },

      {
        id: 'createdBy',
        header: 'Created by',
        sortable: true,
        sortAccessor: (item) => item.createdBy,
        render: (item) => <div>{item.createdBy ? item.createdBy.charAt(0).toUpperCase() + item.createdBy.slice(1) : ''}</div>
      },
      {
        id: 'actions',
        header: '',
        sortable: false,
        align: 'right',
        render: (item) => (
          <div className="flex items-center justify-end gap-3">
            {/* <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEditClick?.(item.id)
              }}
              className="text-[#6938EF] hover:text-[#5925DC] transition-colors"
              aria-label={`Edit ${item.name}`}
            >
              <Edit05 className="h-4 w-5 text-[#A4A7AE]" />
            </button> */}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTarget(item)
                setIsDeleteModalOpen(true)
              }}
              className="text-slate-500 hover:text-rose-600 transition-colors"
              aria-label={`Delete ${item.name}`}
            >
              <Trash03 className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        )
      }
    ],
    [onDeleteClick, onEditClick]
  )

  return (
    <>
      <DividerLineTable
        data={paginatedEvents}
        columns={columns}
        getRowKey={(item) => item.id}
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        onRowClick={onRowClick}
        size="md"
        emptyState={
          <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
            {searchValue.trim()
              ? `No events found matching "${searchValue}".`
              : 'No events available.'}
          </div>
        }
        footer={
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        }
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onCancel={() => {
          if (isDeleting) return
          setIsDeleteModalOpen(false)
          setDeleteTarget(null)
        }}
        title="Delete event"
        itemName={deleteTarget?.name}
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!deleteTarget?.id) return
          if (!onDeleteClick) return
          setIsDeleting(true)
          try {
            await onDeleteClick(deleteTarget.id)
            setIsDeleteModalOpen(false)
            setDeleteTarget(null)
          } finally {
            setIsDeleting(false)
          }
        }}
      />
    </>
  )
}

export default EventsTable
