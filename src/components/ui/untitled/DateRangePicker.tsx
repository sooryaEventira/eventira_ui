import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface DateRange {
  start: Date | null
  end: Date | null
}

interface DateRangePickerProps {
  id: string
  value?: DateRange
  onChange: (range: DateRange) => void
  placeholder?: string
  disabled?: boolean
}

const getMonthDays = (referenceMonth: Date) => {
  const startOfMonth = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1)
  const endOfMonth = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0)

  const startDayOfWeek = startOfMonth.getDay()
  const daysInMonth = endOfMonth.getDate()

  const days: Array<Date | null> = []

  for (let i = 0; i < startDayOfWeek; i += 1) {
    days.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), day))
  }

  while (days.length % 7 !== 0) {
    days.push(null)
  }

  return days
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Select date range',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date())
  const [tempStartDate, setTempStartDate] = useState<Date | null>(value?.start || null)
  const [tempEndDate, setTempEndDate] = useState<Date | null>(value?.end || null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update temp dates when value changes externally
  useEffect(() => {
    setTempStartDate(value?.start || null)
    setTempEndDate(value?.end || null)
    if (value?.start) {
      setVisibleMonth(value.start)
    }
  }, [value])

  const formattedValue = useMemo(() => {
    if (!value?.start && !value?.end) return ''
    if (value.start && value.end) {
      const startStr = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(value.start)
      const endStr = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(value.end)
      return `${startStr} – ${endStr}`
    }
    if (value.start) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(value.start)
    }
    return ''
  }, [value])
  
  const formattedValueShort = useMemo(() => {
    if (!value?.start && !value?.end) return ''
    if (value.start && value.end) {
      const startStr = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(value.start)
      const endStr = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(value.end)
      return `${startStr} – ${endStr}`
    }
    if (value.start) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(value.start)
    }
    return ''
  }, [value])

  const handleDocumentClick = useCallback((event: MouseEvent) => {
    if (!containerRef.current) return
    if (!containerRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleDocumentClick)
      return () => document.removeEventListener('mousedown', handleDocumentClick)
    }
    return undefined
  }, [isOpen, handleDocumentClick])

  const handleToggle = () => {
    if (disabled) return
    setIsOpen((prev) => !prev)
  }

  const days = useMemo(() => getMonthDays(new Date(visibleMonth)), [visibleMonth])

  const isSameDay = (dateA: Date | null, dateB: Date | null) => {
    if (!dateA || !dateB) return false
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    )
  }

  const isDateInRange = (date: Date | null, start: Date | null, end: Date | null) => {
    if (!date || !start || !end) return false
    const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
    const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    return dateOnly >= startTime && dateOnly <= endTime
  }
  
  const isStartOfRange = (date: Date | null, start: Date | null) => {
    if (!date || !start) return false
    return isSameDay(date, start)
  }
  
  const isEndOfRange = (date: Date | null, end: Date | null) => {
    if (!date || !end) return false
    return isSameDay(date, end)
  }
  
  const getRangePosition = (day: Date, index: number, start: Date | null, end: Date | null) => {
    if (!start || !end) return null
    
    const dayIndex = index % 7
    const isFirstInRow = dayIndex === 0
    const isLastInRow = dayIndex === 6
    
    const isInRange = isDateInRange(day, start, end)
    const isStart = isStartOfRange(day, start)
    const isEnd = isEndOfRange(day, end)
    
    if (!isInRange) return null
    
    // Check if previous/next day is also in range to determine corners
    const prevDay = new Date(day)
    prevDay.setDate(day.getDate() - 1)
    const nextDay = new Date(day)
    nextDay.setDate(day.getDate() + 1)
    
    const prevInRange = isDateInRange(prevDay, start, end)
    const nextInRange = isDateInRange(nextDay, start, end)
    
    if (isStart && isEnd) {
      return 'single'
    }
    if (isStart) {
      return isLastInRow ? 'start-end-row' : 'start'
    }
    if (isEnd) {
      return isFirstInRow ? 'start-end-row' : 'end'
    }
    if (isFirstInRow && !prevInRange) {
      return 'start'
    }
    if (isLastInRow && !nextInRange) {
      return 'end'
    }
    if (!prevInRange && !nextInRange) {
      return 'middle'
    }
    if (!prevInRange) {
      return 'start'
    }
    if (!nextInRange) {
      return 'end'
    }
    return 'middle'
  }

  const handleDateClick = (date: Date) => {
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      // Start new selection
      setTempStartDate(date)
      setTempEndDate(null)
    } else if (tempStartDate && !tempEndDate) {
      // Check if clicking the same date (single date selection)
      if (isSameDay(tempStartDate, date)) {
        // Single date selected
        setTempEndDate(date)
      } else if (date < tempStartDate) {
        // Date is before start date, swap them
        setTempEndDate(tempStartDate)
        setTempStartDate(date)
      } else {
        // Complete the range
        setTempEndDate(date)
      }
    }
  }

  const handleClear = () => {
    setTempStartDate(null)
    setTempEndDate(null)
    onChange({ start: null, end: null })
    setIsOpen(false)
  }

  const handleApply = () => {
    if (tempStartDate) {
      // If only start date is selected, use it as both start and end (single date)
      const endDate = tempEndDate || tempStartDate
      onChange({ start: tempStartDate, end: endDate })
      setIsOpen(false)
    }
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return isSameDay(date, today)
  }

  return (
    <div ref={containerRef} className="relative text-left">
      <button
        type="button"
        id={id}
        onClick={handleToggle}
        disabled={disabled}
        className={`flex items-center justify-center gap-2 rounded-lg border border-[#D5D7DA] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 whitespace-nowrap ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            : 'hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <svg
          className="h-4 w-4 text-slate-500 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 8H21" />
          <path d="M16 2V6" />
          <path d="M8 2V6" />
          <rect x="3" y="6" width="18" height="15" rx="2" />
        </svg>
        <span className={formattedValue ? 'text-slate-700' : 'text-slate-400'}>
          <span className="hidden sm:inline">{formattedValue || placeholder}</span>
          <span className="sm:hidden">{formattedValueShort || 'Date Range'}</span>
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
          {/* Header with Month/Year Navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                )
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Previous month"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-900">
              {new Intl.DateTimeFormat('en-US', {
                month: 'long',
                year: 'numeric'
              }).format(visibleMonth)}
            </span>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                )
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Next month"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="h-6 flex items-center justify-center text-xs font-medium text-slate-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-8" />
              }

              const isStartDate = isSameDay(day, tempStartDate)
              const isEndDate = isSameDay(day, tempEndDate)
              const isInRange = tempStartDate && tempEndDate && isDateInRange(day, tempStartDate, tempEndDate)
              const isSelected = isStartDate || isEndDate
              const isCurrentDay = isToday(day)
              
              const rangePosition = tempStartDate && tempEndDate ? getRangePosition(day, index, tempStartDate, tempEndDate) : null
              
              let rangeClasses = ''
              if (isInRange && !isSelected) {
                if (rangePosition === 'single') {
                  rangeClasses = 'rounded-full'
                } else if (rangePosition === 'start') {
                  rangeClasses = 'rounded-l-full'
                } else if (rangePosition === 'end') {
                  rangeClasses = 'rounded-r-full'
                } else if (rangePosition === 'start-end-row') {
                  rangeClasses = 'rounded-full'
                } else {
                  rangeClasses = ''
                }
              }

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`relative h-8 flex items-center justify-center text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    isSelected
                      ? 'bg-[#6938EF] text-white rounded-full z-10 font-semibold shadow-sm'
                      : isInRange
                      ? `bg-[#6938EF]/10 text-slate-900 ${rangeClasses} hover:bg-[#6938EF]/15`
                      : 'text-slate-700 hover:bg-slate-100 rounded-full'
                  } ${
                    isCurrentDay && !isSelected 
                      ? 'ring-2 ring-[#6938EF]/30' 
                      : ''
                  }`}
                >
                  <span className="relative z-10">{day.getDate()}</span>
                </button>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!tempStartDate}
              className="flex-1 rounded-lg bg-[#6938EF] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#5925DC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6938EF]"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DateRangePicker

