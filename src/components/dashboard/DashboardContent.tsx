import React from 'react'
import SummaryCards from './SummaryCards'
import SearchAndFilterBar, { type FilterState } from './SearchAndFilterBar'
import EventsTable from './EventsTable'
import type { Event } from './EventsTable'
import type { DateRange } from '../ui/untitled'

interface DashboardContentProps {
  title?: string
  onNewEventClick?: () => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange) => void
  onFilterApply?: (filters: FilterState) => void
  createdByOptions?: Array<{ name: string; id: string; avatar?: string }>
  currentFilters?: FilterState
  onEditEvent?: (eventId: string) => void
  onDeleteEvent?: (eventId: string) => void | Promise<void>
  onEventRowClick?: (event: Event) => void
  onSortEvents?: (column: string) => void
  totalEvents?: number
  liveEvents?: number
  eventDrafts?: number
  events?: Event[]
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  onNewEventClick,
  searchValue,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onFilterApply,
  createdByOptions = [],
  currentFilters = {},
  onEditEvent,
  onDeleteEvent,
  onEventRowClick,
  onSortEvents,
  totalEvents,
  liveEvents,
  eventDrafts,
  events
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-primary-dark">
          Overview
        </h1>
        <button
          type="button"
          onClick={onNewEventClick}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          <span>+</span>
          <span>New event</span>
        </button>
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
        onRowClick={onEventRowClick}
        onSort={onSortEvents}
        searchValue={searchValue}
        dateRange={dateRange}
      />
    </div>
  )
}

export default DashboardContent

