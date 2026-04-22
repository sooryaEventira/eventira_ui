import React, { useRef, useState, useEffect } from 'react'
import SummaryCards from './SummaryCards'
import SearchAndFilterBar, { type FilterState } from './SearchAndFilterBar'
import EventsTable from './EventsTable'
import type { Event } from './EventsTable'
import type { DateRange } from '../ui/untitled'
import { DotsVertical } from '@untitled-ui/icons-react'

interface DashboardContentProps {
  title?: string
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
  totalEvents,
  liveEvents,
  eventDrafts,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-primary-dark">
          Overview
        </h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onNewEventClick}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            <span>+</span>
            <span>New event</span>
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-700 ${menuOpen ? 'border-slate-300 bg-slate-50' : 'border-transparent hover:border-slate-200'}`}
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

      {/* Summary Cards */}
      <SummaryCards
        totalEvents={totalEvents}
        liveEvents={liveEvents}
        eventDrafts={eventDrafts}
      />

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

