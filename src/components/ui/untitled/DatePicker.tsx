import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface DatePickerProps {
  id: string
  value?: string
  onChange: (nextValue: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  minDate?: string // ISO date string (YYYY-MM-DD)
  maxDate?: string // ISO date string (YYYY-MM-DD)
  className?: string // Custom calendar width class
}

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseIsoDate = (value?: string) => {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
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

const DatePicker: React.FC<DatePickerProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Select date',
  label,
  disabled = false,
  minDate,
  maxDate,
  className
}) => {
  const parsedDate = useMemo(() => parseIsoDate(value), [value])
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => parsedDate ?? new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  const formattedValue = useMemo(() => {
    if (!parsedDate) return ''
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(parsedDate)
  }, [parsedDate])

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

  useEffect(() => {
    if (parsedDate) {
      setVisibleMonth(parsedDate)
    }
  }, [parsedDate])

  const handleSelect = (date: Date) => {
    onChange(formatIsoDate(date))
    setIsOpen(false)
  }

  const handleToggle = () => {
    if (disabled) return
    setIsOpen((prev) => !prev)
  }

  const days = useMemo(() => getMonthDays(new Date(visibleMonth)), [visibleMonth])

  const minDateObj = useMemo(() => minDate ? parseIsoDate(minDate) : null, [minDate])
  const maxDateObj = useMemo(() => maxDate ? parseIsoDate(maxDate) : null, [maxDate])

  const isSameDay = (dateA: Date | null, dateB: Date | null) => {
    if (!dateA || !dateB) return false
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    )
  }

  const isDateDisabled = (date: Date): boolean => {
    if (minDateObj) {
      const minDateNormalized = new Date(minDateObj)
      minDateNormalized.setHours(0, 0, 0, 0)
      const dateNormalized = new Date(date)
      dateNormalized.setHours(0, 0, 0, 0)
      if (dateNormalized < minDateNormalized) {
        return true
      }
    }
    if (maxDateObj) {
      const maxDateNormalized = new Date(maxDateObj)
      maxDateNormalized.setHours(0, 0, 0, 0)
      const dateNormalized = new Date(date)
      dateNormalized.setHours(0, 0, 0, 0)
      if (dateNormalized > maxDateNormalized) {
        return true
      }
    }
    return false
  }

  return (
    <div ref={containerRef} className="relative w-full text-left">
      {label && (
        <label htmlFor={id} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        onClick={handleToggle}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
        }`}
      >
        <span className={formattedValue ? 'text-slate-700' : 'text-slate-400'}>
          {formattedValue || placeholder}
        </span>
        <svg
          className="h-4 w-4 text-slate-400"
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
      </button>

      {isOpen && (
        <div className={`absolute right-0 z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl ${className || 'w-[320px]'}`}>
          <div className="flex items-center justify-between pb-3">
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                )
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-700">
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Next month"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase text-slate-400">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-sm">
            {days.map((day, index) => {
              if (!day) {
                return <span key={`empty-${index}`} className="h-9 w-9" />
              }

              const isSelected = isSameDay(day, parsedDate)
              const isToday = isSameDay(day, new Date())
              const isDisabled = isDateDisabled(day)

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => !isDisabled && handleSelect(day)}
                  disabled={isDisabled}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    isDisabled
                      ? 'cursor-not-allowed text-slate-300'
                      : isSelected
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-primary/10'
                  } ${isToday && !isSelected && !isDisabled ? 'border border-primary/40' : ''}`}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
