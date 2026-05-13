import React, { useState } from 'react'
import { SearchLg, FilterLines } from '@untitled-ui/icons-react'
import { DateRangePicker, type DateRange } from '../ui/untitled'
import FilterDrawer, { type FilterState } from './FilterDrawer'

interface SearchAndFilterBarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange) => void
  onFilterApply?: (filters: FilterState) => void
  createdByOptions?: Array<{ name: string; id: string; avatar?: string }>
  currentFilters?: FilterState
}

const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchValue = '',
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onFilterApply,
  createdByOptions = [],
  currentFilters = {}
}) => {
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="w-full sm:w-[500px] bg-white overflow-hidden rounded-lg border border-[#D5D7DA] shadow-[0px_1px_2px_rgba(10,12.67,18,0.05)] inline-flex items-center">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search events"
            className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-[#717680] text-[#181D27] leading-6 px-3 py-2 min-w-0"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: '400' }}
          />
          <button
            type="button"
            className="flex items-center justify-center bg-primary hover:bg-primary-dark transition-colors rounded-r-lg px-3 self-stretch"
            aria-label="Search"
          >
            <SearchLg className="w-5 h-5 text-white" strokeWidth={2} />
          </button>
        </div>

        {/* Right Side - Date Range Filter and Filter Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Date Range Filter */}
          <DateRangePicker
            id="date-range-picker"
            value={dateRange}
            onChange={(range) => onDateRangeChange?.(range)}
            placeholder="Select date range"
          />

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="inline-flex items-center justify-center rounded-lg border border-[#D5D7DA] bg-white p-2 hover:bg-slate-50 transition-colors flex-shrink-0"
            aria-label="Filter"
          >
            <FilterLines className="h-5 w-5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        onApply={(filters) => {
          onFilterApply?.(filters)
          setIsFilterDrawerOpen(false)
        }}
        createdByOptions={createdByOptions}
        currentFilters={currentFilters}
      />
    </>
  )
}

export default SearchAndFilterBar
export type { FilterState }

