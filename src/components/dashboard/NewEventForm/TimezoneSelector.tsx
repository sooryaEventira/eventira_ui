import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { SearchLg, X, ChevronDown } from '@untitled-ui/icons-react'
import { fetchTimezones } from '../../../services/timezoneService'

export interface TimezoneOption {
  uuid: string // Timezone UUID from backend
  label: string // Display label from backend (e.g., "New York, NY, USA (GMT-5)")
  name: string // IANA timezone identifier (e.g., "America/New_York")
  utc_offset: string // UTC offset (e.g., "+00:00", "-05:00")
}

interface TimezoneSelectorProps {
  value: string // UUID of selected timezone
  onChange: (timezoneUuid: string) => void
  className?: string
}

// Auto-detect user's timezone IANA identifier
const detectTimezone = (): string | null => {
  try {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return userTimezone
  } catch {
    return null
  }
}

// Format UTC offset for display (e.g., "+00:00" -> "GMT+0", "-05:00" -> "GMT-5")
const formatOffset = (utcOffset: string): string => {
  try {
    // Parse offset like "+00:00" or "-05:00"
    const match = utcOffset.match(/^([+-])(\d{2}):(\d{2})$/)
    if (!match) return utcOffset
    
    const sign = match[1] === '+' ? '+' : '-'
    const hours = parseInt(match[2], 10)
    const minutes = parseInt(match[3], 10)
    
    if (minutes === 0) {
      return `GMT${sign}${hours}`
    } else {
      return `GMT${sign}${hours}:${minutes.toString().padStart(2, '0')}`
    }
  } catch {
    return utcOffset
  }
}

const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [timezones, setTimezones] = useState<TimezoneOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detectedTimezoneName, setDetectedTimezoneName] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Always reflects the latest value — avoids stale closure in async loadTimezones
  const valueRef = useRef(value)
  valueRef.current = value

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [isOpen])

  // Fetch timezones from API on mount
  useEffect(() => {
    const loadTimezones = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const timezoneData = await fetchTimezones()
        
        if (!timezoneData || timezoneData.length === 0) {
          const errorMsg = 'No timezones available. Please check your connection and try again.'
          setError(errorMsg)
          setTimezones([])
          return
        }
        
        // Convert TimezoneData[] to TimezoneOption[]
        const options: TimezoneOption[] = timezoneData.map(tz => ({
          uuid: tz.uuid,
          label: tz.label,
          name: tz.name,
          utc_offset: tz.utc_offset,
        }))
        
        setTimezones(options)
        setError(null)
        
        // Auto-select detected timezone only if no value has been set yet
        // Use ref to get the latest value — avoids race condition with parent async data fetch
        if (!valueRef.current && options.length > 0) {
          const detected = detectTimezone()
          if (detected) {
            setDetectedTimezoneName(detected)
            // Find timezone by IANA name
            const detectedTz = options.find(tz => tz.name === detected)
            if (detectedTz) {
              onChange(detectedTz.uuid)
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to load timezones. Please try again.'
        setError(errorMsg)
        setTimezones([])
      } finally {
        setIsLoading(false)
      }
    }
    
    loadTimezones()
  }, []) // Only run on mount

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedButton = buttonRef.current?.contains(target)
      const clickedDropdown = dropdownRef.current?.contains(target)
      if (!clickedButton && !clickedDropdown) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Focus search input when dropdown opens
      setTimeout(() => inputRef.current?.focus(), 0)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filter timezones based on search query
  const filteredTimezones = timezones.filter(timezone => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      timezone.label.toLowerCase().includes(query) ||
      timezone.name.toLowerCase().includes(query) ||
      timezone.utc_offset.toLowerCase().includes(query)
    )
  })

  // Get selected timezone display label
  const selectedTimezone = timezones.find(tz => tz.uuid === value)
  const displayValue = error
    ? 'Error loading timezones'
    : selectedTimezone 
      ? `${selectedTimezone.label} (${formatOffset(selectedTimezone.utc_offset)})`
      : isLoading ? 'Loading timezones...' : 'Select timezone'

  const handleSelect = (timezoneUuid: string) => {
    onChange(timezoneUuid)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selected value display / trigger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex h-10 w-full min-h-10 max-h-10 appearance-none items-center justify-between gap-2 overflow-hidden rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`min-w-0 flex-1 truncate text-left ${value ? 'text-slate-700' : 'text-slate-400'}`}>
          {displayValue}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown — rendered in portal to escape overflow-y-auto containers */}
      {isOpen && !isLoading && dropdownPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {/* Error message */}
          {error && (
            <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border-b border-red-200">
              {error}
            </div>
          )}

          {/* Search input */}
          {!error && (
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <SearchLg className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by city, country, or timezone..."
                  className="w-full pl-10 pr-8 py-2 text-sm border border-slate-300 rounded-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Detected timezone hint */}
          {!error && detectedTimezoneName && selectedTimezone?.name !== detectedTimezoneName && (
            <div className="px-4 py-2 text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
              Your timezone: {timezones.find(tz => tz.name === detectedTimezoneName)?.label || detectedTimezoneName}
            </div>
          )}

          {/* Timezone list */}
          {!error && (
            <div className="overflow-y-auto max-h-64">
              {filteredTimezones.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 text-center">
                  {searchQuery ? 'No timezones found' : 'No timezones available'}
                </div>
              ) : (
                filteredTimezones.map((timezone) => {
                  const isSelected = timezone.uuid === value
                  const isDetected = timezone.name === detectedTimezoneName
                  
                  return (
                    <button
                      key={timezone.uuid}
                      type="button"
                      onClick={() => handleSelect(timezone.uuid)}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700'
                      } ${isDetected && !isSelected ? 'bg-slate-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{timezone.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatOffset(timezone.utc_offset)} {isDetected && <span className="text-primary">• Detected</span>}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="ml-2 text-primary">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

export default TimezoneSelector

