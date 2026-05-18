import React, { useRef, useState, useEffect } from 'react'
import SearchAndFilterBar, { type FilterState } from './SearchAndFilterBar'
import EventsTable from './EventsTable'
import type { Event } from './EventsTable'
import type { DateRange } from '../ui/untitled'
import { DotsVertical } from '@untitled-ui/icons-react'

const DEFAULT_CREATE_DISABLED_REASON =
  'Only Event Admins can create new events in this organization. Ask an Event Admin for access or switch to an organization where you have that role.'

interface DashboardContentProps {
  title?: string
  /** When false, the New event control is inactive (non–Event Admin roles). */
  canCreateEvent?: boolean
  createEventDisabledReason?: string
  onNewEventClick?: () => void
  onArchivedEventsClick?: () => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange) => void
  onFilterApply?: (filters: FilterState) => void
  createdByOptions?: Array<{ name: string; id: string; avatar?: string }>
  currentFilters?: FilterState
  onEditEvent?: (eventId: string) => void
  onDeleteEvent?: (eventId: string) => void | Promise<void>
  onDuplicateEvent?: (eventId: string) => void
  onArchiveEvent?: (eventId: string) => void
  onEventRowClick?: (event: Event) => void
  onSortEvents?: (column: string) => void
  totalEvents?: number
  liveEvents?: number
  eventDrafts?: number
  events?: Event[]
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  canCreateEvent = true,
  createEventDisabledReason = DEFAULT_CREATE_DISABLED_REASON,
  onNewEventClick,
  onArchivedEventsClick,
  searchValue,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onFilterApply,
  createdByOptions = [],
  currentFilters = {},
  onEditEvent,
  onDeleteEvent,
  onDuplicateEvent,
  onArchiveEvent,
  onEventRowClick,
  onSortEvents,
  events
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClickOutside) }
  }, [menuOpen])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-visible">
        <h1 className="text-xl sm:text-2xl font-semibold text-primary-dark">
          Overview
        </h1>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-visible">
          <div className="relative flex-1 sm:flex-none group overflow-visible">
            <button
              type="button"
              onClick={canCreateEvent ? onNewEventClick : undefined}
              disabled={!canCreateEvent}
              aria-disabled={!canCreateEvent}
              aria-label={
                canCreateEvent
                  ? 'Create new event'
                  : createEventDisabledReason
              }
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                canCreateEvent
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'cursor-not-allowed bg-slate-300 text-slate-500 opacity-80'
              }`}
            >
              <span>+</span>
              <span>New event</span>
            </button>
            {!canCreateEvent && (
              <div
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-[70] mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-slate-700 bg-black px-4 py-3 text-left text-sm leading-relaxed text-white shadow-xl opacity-0 ring-1 ring-white/10 transition-opacity duration-200 ease-out before:pointer-events-none before:absolute before:-top-[7px] before:right-8 before:z-0 before:h-3 before:w-3 before:rotate-45 before:border-l before:border-t before:border-slate-700 before:bg-black before:content-[''] group-hover:opacity-100 group-focus-within:opacity-100 sm:left-auto sm:right-0"
              >
                <p className="relative z-[1] m-0 text-white">{createEventDisabledReason}</p>
              </div>
            )}
          </div>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-700 ${menuOpen ? 'border-slate-300 bg-slate-50' : 'border-transparent hover:border-slate-200'}`}
              aria-label="More options"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <DotsVertical className='h-8 w-6' />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onArchivedEventsClick?.() }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Archived Events
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <SearchAndFilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        onFilterApply={onFilterApply}
        createdByOptions={createdByOptions}
        currentFilters={currentFilters}
      />

      {/* Events Table */}
      <EventsTable
        events={events}
        onEditClick={onEditEvent}
        onDeleteClick={onDeleteEvent}
        onDuplicateClick={onDuplicateEvent}
        onArchiveClick={onArchiveEvent}
        onRowClick={onEventRowClick}
        onSort={onSortEvents}
        searchValue={searchValue}
        dateRange={dateRange}
      />
    </div>
  )
}

export default DashboardContent

