import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Pencil01 } from '@untitled-ui/icons-react'
import Button from '../../ui/untitled/Button'

interface WeekDateSelectorProps {
  initialDate?: Date
  initialRangeStartDate?: Date | null
  initialRangeEndDate?: Date | null
  onDateChange?: (date: Date) => void
  onDateRangeChange?: (startDate: Date, endDate: Date) => void
  className?: string
}

const WeekDateSelector: React.FC<WeekDateSelectorProps> = ({
  initialDate = new Date(),
  initialRangeStartDate = null,
  initialRangeEndDate = null,
  onDateChange,
  onDateRangeChange,
  className = ''
}) => {
  const normalizeDay = useCallback((d: Date) => {
    const nd = new Date(d)
    nd.setHours(0, 0, 0, 0)
    return nd
  }, [])

  const [currentDate, setCurrentDate] = useState(() => normalizeDay(initialDate))
  const [showCalendar, setShowCalendar] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null)
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null)
  const [firstMonth, setFirstMonth] = useState(new Date())
  const calendarRef = useRef<HTMLDivElement>(null)
  const lastInitRangeSignatureRef = useRef<string | null>(null)

  // Generate week dates
  const getWeekDates = (date: Date) => {
    const startOfWeek = normalizeDay(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Monday as start
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      date.setHours(0, 0, 0, 0)
      return date
    })
  }

  // Get day name abbreviation
  const getDayName = (date: Date) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return dayNames[date.getDay()]
  }

  const getMonthName = (date: Date) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return monthNames[date.getMonth()]
  }

  const getCardTopLabel = (date: Date) => {
    // Format: "Jan-Wed" (top line)
    return `${getMonthName(date)}-${getDayName(date)}`
  }

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])

  // Always show 7-day week view, regardless of date range selection
  const displayDates = useMemo(() => {
    // Always return week dates (7 days) to maintain consistent display
    return weekDates
  }, [weekDates])

  // Always show navigation arrows
  const shouldShowArrows = true

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    const normalized = normalizeDay(newDate)
    setCurrentDate(normalized)
    onDateChange?.(normalized)
  }

  const isCurrentDay = (date: Date) => {
    // Highlight ONLY the day the manager is working on (the clicked/active day).
    // Date range (event start/end) should not highlight every day in the range.
    return isSameDay(date, currentDate)
  }

  const selectDate = (date: Date) => {
    const normalized = normalizeDay(date)
    setCurrentDate(normalized)
    onDateChange?.(normalized)
  }

  // Calendar utilities
  const getMonthDays = (referenceMonth: Date) => {
    const startOfMonth = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1)
    const endOfMonth = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0)
    const startDayOfWeek = startOfMonth.getDay()
    const daysInMonth = endOfMonth.getDate()
    const days: Array<Date | null> = []

    // Adjust to start from Monday (0 = Monday, 6 = Sunday)
    const startDayOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

    for (let i = 0; i < startDayOffset; i += 1) {
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
    const dateTime = date.getTime()
    const startTime = start.getTime()
    const endTime = end.getTime()
    return dateTime >= startTime && dateTime <= endTime
  }

  const handleDateClick = (date: Date) => {
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      // Start new selection
      setTempStartDate(date)
      setTempEndDate(null)
    } else if (tempStartDate && !tempEndDate) {
      // Complete selection
      if (date < tempStartDate) {
        setTempEndDate(tempStartDate)
        setTempStartDate(date)
      } else {
        setTempEndDate(date)
      }
    }
  }

  const handleApply = () => {
    if (tempStartDate && tempEndDate) {
      setStartDate(tempStartDate)
      setEndDate(tempEndDate)
      onDateRangeChange?.(tempStartDate, tempEndDate)
      // Update currentDate to the start date
      setCurrentDate(tempStartDate)
      onDateChange?.(tempStartDate)
    }
    setShowCalendar(false)
  }

  const handleCancel = () => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
    setShowCalendar(false)
  }

  const handleEditClick = () => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
    setShowCalendar(true)
  }

  // Close calendar when clicking outside
  const handleDocumentClick = useCallback((event: MouseEvent) => {
    if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
      setShowCalendar(false)
    }
  }, [])

  useEffect(() => {
    if (showCalendar) {
      document.addEventListener('mousedown', handleDocumentClick)
      return () => document.removeEventListener('mousedown', handleDocumentClick)
    }
    return undefined
  }, [showCalendar, handleDocumentClick])

  // Initialize first month based on current date
  useEffect(() => {
    setFirstMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))
  }, [currentDate])

  // Keep internal state in sync if initialDate prop changes (ex: on refresh or schedule switch)
  useEffect(() => {
    setCurrentDate(normalizeDay(initialDate))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDate])

  // Initialize/refresh the selected range (ex: event start/end dates)
  useEffect(() => {
    if (!initialRangeStartDate || !initialRangeEndDate) return
    const start = normalizeDay(initialRangeStartDate)
    const end = normalizeDay(initialRangeEndDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return

    const finalStart = start <= end ? start : end
    const finalEnd = start <= end ? end : start

    // Guard: parents may pass new Date instances on every render.
    // Only update internal state if the *value* actually changed.
    const signature = `${finalStart.toISOString().slice(0, 10)}|${finalEnd.toISOString().slice(0, 10)}`
    if (lastInitRangeSignatureRef.current === signature) return
    lastInitRangeSignatureRef.current = signature

    setStartDate(finalStart)
    setEndDate(finalEnd)
    setTempStartDate(finalStart)
    setTempEndDate(finalEnd)

    // Keep current date anchored to the start of the range
    setCurrentDate(finalStart)
  }, [initialRangeStartDate, initialRangeEndDate, normalizeDay])

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)
    const day = date.getDate().toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${month} ${day}, ${year}`
  }

  const firstMonthDays = useMemo(() => getMonthDays(firstMonth), [firstMonth])
  const secondMonth = useMemo(() => {
    return new Date(firstMonth.getFullYear(), firstMonth.getMonth() + 1, 1)
  }, [firstMonth])
  const secondMonthDays = useMemo(() => getMonthDays(secondMonth), [secondMonth])

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const weekMonthLabel = useMemo(() => {
    if (!displayDates || displayDates.length === 0) return ''
    const first = displayDates[0]
    const last = displayDates[displayDates.length - 1]

    const fmtMonthShort = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d)
    const fmtMonthLong = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'long' }).format(d)

    const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()
    if (sameMonth) {
      return `${fmtMonthLong(first)} ${first.getFullYear()}`
    }

    const firstLabel = `${fmtMonthShort(first)} ${first.getFullYear()}`
    const lastLabel = `${fmtMonthShort(last)} ${last.getFullYear()}`
    return `${firstLabel} / ${lastLabel}`
  }, [displayDates])

  const rangeLabel = useMemo(() => {
    if (!startDate || !endDate) return ''
    return `${formatDate(startDate)} – ${formatDate(endDate)}`
  }, [startDate, endDate])

  return (
    <div className="w-full">
      <div className={`shedulebar relative flex items-center ${!startDate || !endDate ? 'justify-center' : 'justify-between'} gap-2 mt-2 w-full${className}`}>
      {/* Left Arrow */}
      {shouldShowArrows && (
        <button
          type="button"
          onClick={() => navigateWeek('prev')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-none bg-slate-100 text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-200 hover:-translate-y-0.5 sm:h-12 sm:w-12"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}

      {/* Date Cards - Scrollable */}
      <div className={`relative flex justify-center`}>
        <div className={`flex gap-1 overflow-x-auto pb-2 sm:gap-3 sm:pb-0 scrollbar-hide h-[70px] sm:overflow-visible`}>
          {displayDates.map((date, index) => {
            const isSelected = isCurrentDay(date)
            const isInRangeDate = startDate && endDate ? isDateInRange(date, startDate, endDate) : false
            
            // Determine button styling
            let buttonClass = 'bg-[#FAFAFA] text-[#414651] outline outline-1 outline-[#D5D7DA] hover:bg-slate-50 hover:-translate-y-0.5'
            let textClass = 'font-semibold text-[#414651]'
            let numberClass = 'font-medium text-[#414651]'
            
            if (startDate && endDate) {
              // Outside event range: disabled / dimmed
              if (!isInRangeDate) {
                buttonClass =
                  'bg-[#FAFAFA] text-[#414651] outline outline-1 outline-[#E5E7EB] opacity-40 cursor-not-allowed'
                textClass = 'font-semibold text-[#414651]'
                numberClass = 'font-medium text-[#414651]'
              } else {
                // Inside range but NOT the active day: solid purple
                buttonClass =
                  'bg-primary text-white shadow-md shadow-primary/30 outline-none hover:bg-primary/90 hover:-translate-y-0.5'
                textClass = 'font-semibold text-white'
                numberClass = 'font-medium text-white'
              }
            }

            // Active working day (clicked): light purple (overrides others)
            if (isSelected) {
              buttonClass =
                'bg-primary/20 text-primary shadow-md outline outline-1 outline-primary/40 hover:bg-primary/30 hover:-translate-y-0.5'
              textClass = 'font-bold text-primary'
              numberClass = 'font-semibold text-primary'
            }
            
            return (
              <div key={`${date.toISOString()}-${index}`} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    // Always allow clicking any visible day so users can add sessions
                    // even when no sessions exist yet for that date.
                    selectDate(date)
                  }}
                  className={`inline-flex flex-col items-center justify-center rounded-[10px] px-2 py-2 text-[12px] shadow-md shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 sm:px-5 sm:py-2.5 sm:text-sm min-w-[120px] w-[140px] md:w-[140px] md:min-w-[140px] md:max-w-[140px] ${buttonClass}`}
                >
                  <div className={`whitespace-nowrap ${textClass}`} style={{ fontFamily: 'Inter' }}>
                    {getCardTopLabel(date)}
                  </div>
                  <div className={numberClass} style={{ fontFamily: 'Inter' }}>
                    {date.getDate()}                  </div>
                </button>
              </div>
            )
          })}
        </div>
        {/* Edit Icon - always visible, positioned above and to the right */}
        {displayDates.length > 0 && (
          <div className="group absolute right-0 top-0 z-10">
            <button
              type="button"
              onClick={handleEditClick}
              className="flex h-5 w-5 -translate-y-4 translate-x-4 items-center justify-center rounded-full border-none bg-transparent text-slate-400 transition-all duration-200 hover:text-slate-600 sm:h-6 sm:w-6 sm:-translate-y-4 sm:translate-x-3"
              aria-label="Edit date range"
            >
              <Pencil01 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-6 top-5 -translate-y-8 translate-x-4 whitespace-nowrap rounded-md bg-primary/100 px-2 py-0.5 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 sm:-translate-y-10 sm:translate-x-3">
              Edit
            </span>
          </div>
        )}
      </div>

      {/* Right Arrow */}
      {shouldShowArrows && (
        <button
          type="button"
          onClick={() => navigateWeek('next')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-none bg-slate-100 text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-200 hover:-translate-y-0.5 sm:h-12 sm:w-12"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}

      {/* Date Range Calendar Popup - positioned outside scrollable container */}
      {showCalendar && (
        <div
          ref={calendarRef}
          className="absolute left-0 top-full z-[9999] mt-4 w-[calc(100vw-2rem)] max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl"
        >
          {/* Two Month Calendars */}
          <div className="flex flex-col gap-6 md:flex-row" style={{ padding: '20px 24px' }}>
            {/* First Month */}
            <div className="flex-1 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFirstMonth(new Date(firstMonth.getFullYear(), firstMonth.getMonth() - 1, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-md p-1.5"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5 text-[#A4A7AE]" />
                </button>
                <div className="text-center text-sm font-semibold text-[#414651]" style={{ fontFamily: 'Inter', lineHeight: '20px' }}>
                  {monthNames[firstMonth.getMonth()]} {firstMonth.getFullYear()}
                </div>
                <div className="h-8 w-8" /> {/* Spacer for alignment */}
              </div>
              
              {/* Day headers */}
              <div className="grid grid-cols-7">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                  <div key={day} className="h-10 flex items-center justify-center">
                    <span className="text-sm font-medium text-[#414651]" style={{ fontFamily: 'Inter', lineHeight: '20px' }}>
                      {day}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7" style={{ gap: 0 }}>
                {firstMonthDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-1-${index}`} className="h-10 w-10" style={{ margin: 0 }} />
                  }
                  
                  const isCurrentMonth = day.getMonth() === firstMonth.getMonth()
                  const isSelectedStart = tempStartDate && isSameDay(day, tempStartDate)
                  const isSelectedEnd = tempEndDate && isSameDay(day, tempEndDate)
                  const isInRange = tempStartDate && tempEndDate && isDateInRange(day, tempStartDate, tempEndDate) && !isSelectedStart && !isSelectedEnd
                  const isToday = isSameDay(day, new Date())
                  const isDisabled = !isCurrentMonth
                  
                  // Determine connector states
                  const hasLeftConnector = isInRange || (isSelectedEnd && tempStartDate && day > tempStartDate)
                  const hasRightConnector = isInRange || (isSelectedStart && tempEndDate && day < tempEndDate)
                  
                  return (
                    <div key={day.toISOString()} className="relative" style={{ width: '40px', height: '40px', margin: 0 }}>
                      {/* Range connectors */}
                      {hasLeftConnector && (
                        <div className="absolute left-0 top-0 h-10 w-5 bg-[#6938EF]" />
                      )}
                      {hasRightConnector && (
                        <div className="absolute right-0 top-0 h-10 w-5 bg-[#6938EF]" />
                      )}
                      
                      <button
                        type="button"
                        onClick={() => !isDisabled && handleDateClick(day)}
                        disabled={isDisabled}
                        className={`relative rounded-full flex items-center justify-center text-sm transition ${
                          isSelectedStart || isSelectedEnd
                            ? 'bg-[#6938EF] text-white font-medium'
                            : isInRange
                            ? 'bg-[#6938EF] text-white font-medium'
                            : isDisabled
                            ? 'text-[#717680] font-normal cursor-not-allowed'
                            : 'text-[#414651] font-normal hover:bg-[#FAFAFA]'
                        }`}
                        style={{ fontFamily: 'Inter', lineHeight: '20px', width: '40px', height: '40px', margin: 0, padding: 0 }}
                      >
                        {day.getDate()}
                        {/* Dot indicator for today */}
                        {isToday && !isSelectedStart && !isSelectedEnd && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#6938EF] rounded-full" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Second Month */}
            <div className="flex-1 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFirstMonth(new Date(secondMonth.getFullYear(), secondMonth.getMonth() - 1, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-md p-1.5"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5 text-[#A4A7AE]" />
                </button>
                <div className="text-center text-sm font-semibold text-[#414651]" style={{ fontFamily: 'Inter', lineHeight: '20px' }}>
                  {monthNames[secondMonth.getMonth()]} {secondMonth.getFullYear()}
                </div>
                <button
                  type="button"
                  onClick={() => setFirstMonth(new Date(secondMonth.getFullYear(), secondMonth.getMonth() + 1, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-md p-1.5"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5 text-[#A4A7AE]" />
                </button>
              </div>
              
              {/* Day headers */}
              <div className="grid grid-cols-7">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                  <div key={day} className="h-10 flex items-center justify-center">
                    <span className="text-sm font-medium text-[#414651]" style={{ fontFamily: 'Inter', lineHeight: '20px' }}>
                      {day}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7" style={{ gap: 0 }}>
                {secondMonthDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-2-${index}`} className="h-10 w-10" style={{ margin: 0 }} />
                  }
                  
                  const isCurrentMonth = day.getMonth() === secondMonth.getMonth()
                  const isSelectedStart = tempStartDate && isSameDay(day, tempStartDate)
                  const isSelectedEnd = tempEndDate && isSameDay(day, tempEndDate)
                  const isInRange = tempStartDate && tempEndDate && isDateInRange(day, tempStartDate, tempEndDate) && !isSelectedStart && !isSelectedEnd
                  const isToday = isSameDay(day, new Date())
                  const isDisabled = !isCurrentMonth
                  
                  // Determine connector states
                  const hasLeftConnector = isInRange || (isSelectedEnd && tempStartDate && day > tempStartDate)
                  const hasRightConnector = isInRange || (isSelectedStart && tempEndDate && day < tempEndDate)
                  
                  return (
                    <div key={day.toISOString()} className="relative" style={{ width: '40px', height: '40px', margin: 0 }}>
                      {/* Range connectors */}
                      {hasLeftConnector && (
                        <div className="absolute left-0 top-0 h-10 w-5 bg-[#6938EF]" />
                      )}
                      {hasRightConnector && (
                        <div className="absolute right-0 top-0 h-10 w-5 bg-[#6938EF]" />
                      )}
                      
                      <button
                        type="button"
                        onClick={() => !isDisabled && handleDateClick(day)}
                        disabled={isDisabled}
                        className={`relative rounded-full flex items-center justify-center text-sm transition ${
                          isSelectedStart || isSelectedEnd
                            ? 'bg-[#6938EF] text-white font-medium'
                            : isInRange
                            ? 'bg-[#6938EF] text-white font-medium'
                            : isDisabled
                            ? 'text-[#717680] font-normal cursor-not-allowed'
                            : 'text-[#414651] font-normal hover:bg-[#FAFAFA]'
                        }`}
                        style={{ fontFamily: 'Inter', lineHeight: '20px', width: '40px', height: '40px', margin: 0, padding: 0 }}
                      >
                        {day.getDate()}
                        {/* Dot indicator for today */}
                        {isToday && !isSelectedStart && !isSelectedEnd && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#6938EF] rounded-full" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer with Date Range Inputs and Buttons */}
          <div className="border-t border-[#E9EAEB] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="w-[136px]">
                <input
                  type="text"
                  readOnly
                  value={formatDate(tempStartDate)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D7DA] rounded-lg text-base text-[#181D27] shadow-sm focus:outline-none"
                  style={{ fontFamily: 'Inter', lineHeight: '24px', fontWeight: '400' }}
                  placeholder="Start date"
                />
              </div>
              <span className="text-[#A4A7AE] text-base" style={{ fontFamily: 'Inter', lineHeight: '24px' }}>–</span>
              <div className="w-[136px]">
                <input
                  type="text"
                  readOnly
                  value={formatDate(tempEndDate)}
                  className="w-full px-3 py-2 bg-white border border-[#D5D7DA] rounded-lg text-base text-[#181D27] shadow-sm focus:outline-none"
                  style={{ fontFamily: 'Inter', lineHeight: '24px', fontWeight: '400' }}
                  placeholder="End date"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCancel}
                style={{ fontFamily: 'Inter', lineHeight: '20px' }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleApply}
                disabled={!tempStartDate || !tempEndDate}
                style={{ fontFamily: 'Inter', lineHeight: '20px' }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default WeekDateSelector