import React, { useMemo, useState, useEffect, useRef } from 'react'
import { DotsVertical } from '@untitled-ui/icons-react'
import { DividerLineTable, type DividerLineTableColumn, type DividerLineTableSortDescriptor, type DateRange } from '../ui/untitled'
import { TablePagination } from '../ui/TablePagination'
import { ConfirmDeleteModal } from '../ui'

export interface Event {
  id: string
  name: string
  status: 'Live' | 'Draft' | 'Archived'
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
  onDuplicateClick?: (eventId: string) => void
  onArchiveClick?: (eventId: string) => void
  onUnarchiveClick?: (eventId: string) => void
  onRowClick?: (event: Event) => void
  onSort?: (column: string) => void
  searchValue?: string
  dateRange?: DateRange
  statusFilter?: string
  attendanceTypeFilter?: string
  createdByFilter?: string
  hideCreatedByColumn?: boolean
}

const StatusBadge: React.FC<{ status: 'Live' | 'Draft' | 'Archived' }> = ({ status }) => {
  const styles: Record<string, string> = {
    Live: 'bg-green-100 text-green-700',
    Draft: 'bg-red-100 text-red-700',
    Archived: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'Live' ? 'bg-green-500' : status === 'Draft' ? 'bg-red-500' : 'bg-slate-400'}`} />
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
  onDuplicateClick,
  onArchiveClick,
  onUnarchiveClick,
  onRowClick,
  onSort,
  searchValue = '',
  dateRange,
  statusFilter,
  attendanceTypeFilter,
  createdByFilter,
  hideCreatedByColumn = false
}) => {
  const [sortDescriptor, setSortDescriptor] = useState<DividerLineTableSortDescriptor | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openMenuId) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
        setMenuPosition(null)
      }
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClickOutside) }
  }, [openMenuId])

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

      ...(!hideCreatedByColumn ? [{
        id: 'createdBy',
        header: 'Created by',
        sortable: true,
        sortAccessor: (item: Event) => item.createdBy,
        render: (item: Event) => <div>{item.createdBy ? item.createdBy.charAt(0).toUpperCase() + item.createdBy.slice(1) : ''}</div>
      }] : []),
      {
        id: 'actions',
        header: '',
        sortable: false,
        align: 'right',
        render: (item) => (
          <div ref={openMenuId === item.id ? menuRef : undefined} className="relative flex items-center justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (openMenuId === item.id) {
                  setOpenMenuId(null)
                  setMenuPosition(null)
                  return
                }
                const buttonRect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                const menuWidth = 160
                const estimatedMenuHeight = 180
                const viewportPadding = 8
                const left = Math.max(viewportPadding, buttonRect.right - menuWidth)
                const canOpenDown = buttonRect.bottom + estimatedMenuHeight <= window.innerHeight - viewportPadding
                const top = canOpenDown
                  ? buttonRect.bottom + 4
                  : Math.max(viewportPadding, buttonRect.top - estimatedMenuHeight - 4)
                setMenuPosition({ top, left })
                setOpenMenuId(item.id)
              }}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                openMenuId === item.id
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-100 hover:border-slate-200'
              }`}
              aria-label="More options"
            >
              <DotsVertical className="h-4 w-4" />
            </button>
            {openMenuId === item.id && menuPosition && (
              <div
                className="fixed z-[100] min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setMenuPosition(null); onEditClick?.(item.id) }}
                  className="flex w-full items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setMenuPosition(null); onDuplicateClick?.(item.id) }}
                  className="flex w-full items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Duplicate
                </button>
                {onUnarchiveClick ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setMenuPosition(null); onUnarchiveClick(item.id) }}
                    className="flex w-full items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Unarchive
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (item.status === 'Archived') return
                      setOpenMenuId(null)
                      setMenuPosition(null)
                      onArchiveClick?.(item.id)
                    }}
                    disabled={item.status === 'Archived'}
                    className={`flex w-full items-center px-4 py-2 text-sm font-medium transition-colors ${
                      item.status === 'Archived'
                        ? 'cursor-not-allowed text-slate-400'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Archive
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setMenuPosition(null); setDeleteTarget(item); setIsDeleteModalOpen(true) }}
                  className="mt-1 flex w-full items-center border-t border-slate-100 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )
      }
    ],
    [openMenuId, onDeleteClick, onEditClick, onDuplicateClick, onArchiveClick, onUnarchiveClick, hideCreatedByColumn]
  )

  return (
    <>
      <DividerLineTable
        data={paginatedEvents}
        columns={columns}
        rootClassName="overflow-visible"
        bodyClassName="overflow-x-auto overflow-y-visible"
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
