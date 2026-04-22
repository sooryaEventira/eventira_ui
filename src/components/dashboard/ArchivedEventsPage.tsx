import React, { useState, useEffect, useCallback } from 'react'
import { showToast } from '../../utils/toast'
import { deleteEvent, fetchArchivedEvents, unarchiveEvent, type EventData } from '../../services/eventService'
import EventsTable, { type Event } from './EventsTable'
import SearchAndFilterBar, { type FilterState } from './SearchAndFilterBar'
import type { DateRange } from '../ui/untitled'

const formatDateRange = (start?: string, end?: string): string => {
  const parse = (v?: string) => { const d = new Date(v ?? ''); return isNaN(d.getTime()) ? null : d }
  const s = parse(start); const e = parse(end ?? start)
  if (!s && !e) return 'TBD'
  if (s && !e) return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const sameYear = s!.getFullYear() === e!.getFullYear()
  const sameMonth = sameYear && s!.getMonth() === e!.getMonth()
  const mo = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' })
  if (sameMonth) return `${mo(s!)} ${s!.getDate()} – ${e!.getDate()}, ${s!.getFullYear()}`
  if (sameYear) return `${mo(s!)} ${s!.getDate()} – ${mo(e!)} ${e!.getDate()}, ${s!.getFullYear()}`
  return `${mo(s!)} ${s!.getDate()}, ${s!.getFullYear()}–${mo(e!)} ${e!.getDate()}, ${e!.getFullYear()}`
}

interface ArchivedEventsPageProps {
  onBackClick: () => void
  onUnarchived?: () => void
}

const ArchivedEventsPage: React.FC<ArchivedEventsPageProps> = ({ onBackClick, onUnarchived }) => {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null })
  const [filterState, setFilterState] = useState<FilterState>({})

  const loadArchivedEvents = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await fetchArchivedEvents()
      const attendanceMap: Record<string, Event['attendanceType']> = {
        virtual: 'Virtual',
        online: 'Virtual',
        'in-person': 'In-person',
        offline: 'In-person',
        hybrid: 'Hybrid'
      }
      const mapped: Event[] = list.map((e: EventData) => {
        const raw = e as any
        const startDate = e.startDate ?? raw.start_date ?? raw.event_date
        const endDate = e.endDate ?? raw.end_date ?? startDate
        const rawCode = raw.event_id ?? raw.eventCode ?? ''
        const vis = raw.visibility ? String(raw.visibility).trim() : undefined
        const visLabel = vis ? vis.charAt(0).toUpperCase() + vis.slice(1).toLowerCase() : undefined
        const attendanceRaw = e.eventExperience ?? raw.attendance_type ?? ''
        const attendanceKey = String(attendanceRaw).trim().toLowerCase()
        const createdByRaw = raw.createdBy ?? raw.created_by
        return {
          id: String(raw.uuid ?? raw.id ?? raw.pk ?? ''),
          name: String(e.eventName ?? raw.title ?? raw.eventName ?? '').trim() || 'Untitled Event',
          status: 'Archived' as const,
          attendanceType: attendanceMap[attendanceKey] ?? 'Virtual',
          registrations: 0,
          eventDate: formatDateRange(startDate, endDate),
          createdBy: createdByRaw ? String(createdByRaw).trim() : 'Unknown',
          eventCode: rawCode ? String(rawCode).trim() : undefined,
          visibility: visLabel as Event['visibility'],
          startDate,
          endDate,
        }
      })
      setEvents(mapped)
    } catch {
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadArchivedEvents() }, [loadArchivedEvents])

  const handleUnarchive = async (id: string) => {
    try {
      await unarchiveEvent(id)
      await loadArchivedEvents()
      onUnarchived?.()
    } catch {
      // error toast handled in service
    }
  }

  const handleDelete = async (id: string) => {
    await deleteEvent(id)
    showToast.success('Event deleted')
    await loadArchivedEvents()
  }

  const createdByOptions = React.useMemo(() => {
    const unique = new Map<string, string>()
    events.forEach((event) => {
      if (event.createdBy && !unique.has(event.createdBy)) {
        unique.set(event.createdBy, event.createdBy)
      }
    })
    return Array.from(unique.entries()).map(([name, id]) => ({
      name,
      id,
      avatar: undefined
    }))
  }, [events])

  const statusFilter = filterState.status
    ? filterState.status.charAt(0).toUpperCase() + filterState.status.slice(1).toLowerCase()
    : undefined
  const attendanceTypeMap: Record<string, Event['attendanceType']> = {
    virtual: 'Virtual',
    'in-person': 'In-person',
    hybrid: 'Hybrid'
  }
  const attendanceTypeFilter = filterState.attendanceType
    ? attendanceTypeMap[filterState.attendanceType.toLowerCase()]
    : undefined
  const createdByFilter = filterState.createdBy?.[0]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBackClick}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-2xl font-semibold text-primary-dark">Archived Events</h1>
      </div>

      <div className="mb-4">
        <SearchAndFilterBar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onFilterApply={setFilterState}
          createdByOptions={createdByOptions}
          currentFilters={filterState}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
            <p className="text-sm text-slate-500">Loading archived events...</p>
          </div>
        </div>
      ) : (
        <EventsTable
          events={events}
          searchValue={searchValue}
          dateRange={dateRange}
          statusFilter={statusFilter}
          attendanceTypeFilter={attendanceTypeFilter}
          createdByFilter={createdByFilter}
          hideCreatedByColumn
          onUnarchiveClick={handleUnarchive}
          onDeleteClick={handleDelete}
        />
      )}
    </div>
  )
}

export default ArchivedEventsPage
