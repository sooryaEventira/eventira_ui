import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Upload01, Download01, Plus, ArrowNarrowLeft, FilterLines, SearchLg } from '@untitled-ui/icons-react'
import { Button } from '../../ui/untitled'
import WeekDateSelector from './WeekDateSelector'
import UploadModal from '../../ui/UploadModal'
import ScheduleGrid from './ScheduleGrid'
import SessionCreationModal from './SessionCreationModal'
import { SavedSession } from './sessionTypes'
import sessionTemplate from '../../../assets/excel/Session templates.xlsx?url'

const ATTENDANCE_OPTIONS = ['All', 'Online', 'In-person', 'Hybrid'] as const
type AttendanceOption = (typeof ATTENDANCE_OPTIONS)[number]

function sessionTypeToAttendance(sessionType: string): AttendanceOption {
  const t = String(sessionType || '').toLowerCase()
  if (t === 'virtual' || t === 'online') return 'Online'
  if (t === 'hybrid') return 'Hybrid'
  return 'In-person'
}

interface ScheduleContentProps {
  scheduleName?: string
  onUpload?: () => void
  onUploadFiles?: (files: File[]) => Promise<void> | void
  /** Called when Download button is clicked. If not provided, downloads session template. */
  onDownload?: () => void
  onAddSession?: (parentSessionId?: string, creationType?: 'template' | 'scratch') => void
  onBack?: () => void
  sessions?: SavedSession[] | any[] // Allow any[] for Puck compatibility
  onDateChange?: (date: Date) => void
  selectedDate?: Date | string // Allow string for Puck (ISO string)
  rangeStartDate?: Date | string
  rangeEndDate?: Date | string
  onEditSession?: (session: SavedSession) => void
  onDeleteSession?: (session: SavedSession) => void
  /** When true, grid closes any open 3-dot menu so it doesn’t show over the session form. */
  /** When provided, session cards are clickable and open the session summary (e.g. in a slideout). */
  onSessionClick?: (session: SavedSession) => void
  sessionFormOpen?: boolean
  /** Optional list of location names for filter dropdown. Falls back to unique from sessions. */
  availableLocations?: string[]
}

const ScheduleContent: React.FC<ScheduleContentProps> = ({
  scheduleName = 'Schedule 1',
  onUpload,
  onUploadFiles,
  onDownload,
  onAddSession,
  onBack,
  sessions = [],
  onDateChange,
  selectedDate: propSelectedDate,
  rangeStartDate,
  rangeEndDate,
  onEditSession,
  onDeleteSession,
  onSessionClick,
  sessionFormOpen = false,
  availableLocations: propAvailableLocations
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isSessionCreationModalOpen, setIsSessionCreationModalOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterKeywordApplied, setFilterKeywordApplied] = useState('')
  const [filterLocations, setFilterLocations] = useState<Set<string>>(new Set())
  const [filterAttendance, setFilterAttendance] = useState<Set<string>>(new Set())
  const [filterPanelPosition, setFilterPanelPosition] = useState<{ top: number; left: number } | null>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const filterPanelRef = useRef<HTMLDivElement>(null)
  const didNotifyInitialDateRef = useRef(false)

  // Parse to local calendar date (year, month-1, day) so weekday selector shows correct day; no UTC shift for YYYY-MM-DD
  const parseToLocalDate = useMemo(() => (value: Date | string | undefined | null): Date | null => {
    if (value == null) return null
    if (value instanceof Date) {
      const d = new Date(value.getTime())
      d.setHours(0, 0, 0, 0)
      return Number.isNaN(d.getTime()) ? null : d
    }
    const r = String(value).trim()
    if (!r) return null
    const datePart = r.slice(0, 10)
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const day = parseInt(match[3], 10)
      const d = new Date(year, month, day)
      return Number.isNaN(d.getTime()) ? null : d
    }
    const d = new Date(r)
    if (Number.isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const getInitialDate = (): Date => {
    const d = parseToLocalDate(propSelectedDate)
    if (d) return d
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }

  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate)

  const normalizedRangeStart = useMemo(() => parseToLocalDate(rangeStartDate), [rangeStartDate, parseToLocalDate])
  const normalizedRangeEnd = useMemo(() => parseToLocalDate(rangeEndDate), [rangeEndDate, parseToLocalDate])

  useEffect(() => {
    // Initialize date when component mounts or prop changes
    const initialDate = getInitialDate()
    setSelectedDate((prev) => (prev.getTime() === initialDate.getTime() ? prev : initialDate))

    // Only notify parent once when parent didn't supply a selected date.
    // If parent *did* supply a date, calling onDateChange here can cause a render loop.
    if (!propSelectedDate && !didNotifyInitialDateRef.current) {
      didNotifyInitialDateRef.current = true
      onDateChange?.(initialDate)
    }
  }, [propSelectedDate, onDateChange])
  
  // Normalize sessions - convert date strings to Date objects if needed
  const gridSessions = useMemo(() => {
    const raw = (sessions || []) as any[]

    const toMinutes = (time?: string, period?: string) => {
      if (!time) return 0
      const [hRaw, mRaw] = String(time).split(':')
      let h = Number(hRaw)
      const m = Number(mRaw ?? 0)
      const p = String(period ?? 'AM').toUpperCase()
      if (p === 'PM' && h !== 12) h += 12
      if (p === 'AM' && h === 12) h = 0
      return h * 60 + (Number.isFinite(m) ? m : 0)
    }

    // 1) Normalize shape (date, ids, parent references)
    const normalized: SavedSession[] = raw
      .map((session: any) => {
        // IMPORTANT:
        // Always prioritize stable UUIDs over numeric/internal IDs so that
        // parent/child (parallel) relationships use the same identifier
        // that the backend exposes via `parent_session_uuid`.
        const id = String(
          session?.uuid ??
          session?.session_uuid ??
          session?.id ??
          ''
        )
        if (!id) return null

        const sessionTypeRaw = String(session?.sessionType ?? session?.session_type ?? '').toLowerCase()
        const parentUuid =
          session?.parentUuid ??
          session?.parent_uuid ??
          session?.parent_session_uuid ??
          session?.parentSessionUuid ??
          session?.parent_id ??
          session?.parentId ??
          session?.parentId

        const date =
          session?.date && typeof session.date === 'string'
            ? new Date(session.date)
            : session?.date instanceof Date
              ? session.date
              : undefined

        const normalizedSession: SavedSession = {
          ...session,
          id,
          date,
          sessionType: sessionTypeRaw || session?.sessionType,
          // Set parentId whenever a parent reference exists so the grid nests children under parents (combined view).
          parentId: parentUuid ? String(parentUuid) : undefined,
        }

        return normalizedSession
      })
      .filter(Boolean) as SavedSession[]

    // 2) Group by parentId so parent+child show as combined grid (don't rely on sessionType)
    const idSet = new Set(normalized.map((s) => String(s.id)))
    const sortByStart = (a: SavedSession, b: SavedSession) =>
      toMinutes(a.startTime, a.startPeriod) - toMinutes(b.startTime, b.startPeriod) ||
      String(a.title ?? '').localeCompare(String(b.title ?? ''))

    // Roots = no parentId, or parent not in this list (show as top-level row)
    const roots = normalized
      .filter((s) => !s.parentId || !idSet.has(String(s.parentId)))
      .sort(sortByStart)

    // Children by parent (any session whose parentId is in the list)
    const childrenByParentId = new Map<string, SavedSession[]>()
    for (const s of normalized) {
      const pid = s.parentId ? String(s.parentId) : ''
      if (pid && idSet.has(pid)) {
        const arr = childrenByParentId.get(pid) ?? []
        arr.push(s)
        childrenByParentId.set(pid, arr)
      }
    }

    // 3) Output: each root then its children (combined grid), so grid can nest them
    const output: SavedSession[] = []
    for (const root of roots) {
      output.push(root)
      const kids = (childrenByParentId.get(String(root.id)) ?? []).slice().sort(sortByStart)
      output.push(...kids)
    }

    return output
  }, [sessions])

  const handleDateChange = (date: Date) => {
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0) // Normalize to start of day
    setSelectedDate(normalizedDate)
    onDateChange?.(normalizedDate)
  }

  const handleUploadClick = () => {
    setIsUploadModalOpen(true)
    onUpload?.()
  }

  const handleCloseModal = () => {
    setIsUploadModalOpen(false)
  }

  const handleDownloadTemplate = () => {
    const link = document.createElement('a')
    link.href = sessionTemplate
    link.download = 'Session template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownload = () => {
    if (onDownload) onDownload()
    else handleDownloadTemplate()
  }

  // Location options: from prop or unique from sessions; always include "All"
  const locationOptions = useMemo(() => {
    const base = propAvailableLocations && propAvailableLocations.length > 0
      ? propAvailableLocations
      : (() => {
          const raw = (sessions || []) as any[]
          const set = new Set<string>()
          raw.forEach((s: any) => {
            const loc = s?.location ?? s?.venue
            if (loc && String(loc).trim()) set.add(String(loc).trim())
          })
          return Array.from(set).sort()
        })()
    return ['All', ...base]
  }, [sessions, propAvailableLocations])

  // Position filter panel below trigger (for portal)
  useLayoutEffect(() => {
    if (!filterOpen || !filterTriggerRef.current) return
    const rect = filterTriggerRef.current.getBoundingClientRect()
    const panelWidth = Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 32 : 320)
    setFilterPanelPosition({
      top: rect.bottom + 8,
      left: Math.min(rect.right - panelWidth, rect.left)
    })
  }, [filterOpen])

  // Close filter dropdown on outside click (trigger or panel)
  useEffect(() => {
    if (!filterOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      const inTrigger = filterTriggerRef.current?.contains(target)
      const inPanel = filterPanelRef.current?.contains(target)
      if (!inTrigger && !inPanel) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterOpen])

  const appliedKeyword = filterKeywordApplied.trim().toLowerCase()
  const appliedLocations = filterLocations.size === 0 || filterLocations.has('All') ? null : filterLocations
  const appliedAttendance = filterAttendance.size === 0 || filterAttendance.has('All') ? null : filterAttendance

  const filteredSessions = useMemo(() => {
    let list = gridSessions
    if (appliedKeyword) {
      list = list.filter((s) => {
        const title = String(s.title ?? '').toLowerCase()
        const desc = String((s as any).description ?? '').toLowerCase()
        const sectionText = (s.sections ?? [])
          .map((sec: any) => String(sec?.title ?? '') + ' ' + String(sec?.description ?? ''))
          .join(' ')
          .toLowerCase()
        return title.includes(appliedKeyword) || desc.includes(appliedKeyword) || sectionText.includes(appliedKeyword)
      })
    }
    if (appliedLocations && appliedLocations.size > 0) {
      list = list.filter((s) => {
        const loc = String(s.location ?? '').trim()
        return loc && appliedLocations.has(loc)
      })
    }
    if (appliedAttendance && appliedAttendance.size > 0) {
      list = list.filter((s) => {
        const att = sessionTypeToAttendance(s.sessionType ?? '')
        return appliedAttendance.has(att)
      })
    }
    return list
  }, [gridSessions, appliedKeyword, appliedLocations, appliedAttendance])

  const hasAnySessions = gridSessions.length > 0

  const hasSessionsForSelectedDate = useMemo(() => {
    if (!selectedDate) return false
    const selected = new Date(selectedDate)
    selected.setHours(0, 0, 0, 0)
    return gridSessions.some((s: any) => {
      if (!s?.date) return false
      const d = new Date(s.date as any)
      if (Number.isNaN(d.getTime())) return false
      d.setHours(0, 0, 0, 0)
      return d.getTime() === selected.getTime()
    })
  }, [gridSessions, selectedDate])

  const handleFilterApply = () => {
    setFilterKeywordApplied(filterKeyword.trim())
    setFilterOpen(false)
  }

  const handleFilterClearAll = () => {
    setFilterKeyword('')
    setFilterKeywordApplied('')
    setFilterLocations(new Set())
    setFilterAttendance(new Set())
    setFilterOpen(false)
  }

  const toggleFilterLocation = (loc: string) => {
    setFilterLocations((prev) => {
      const next = new Set(prev)
      if (loc === 'All') {
        next.clear()
        next.add('All')
        return next
      }
      next.delete('All')
      if (next.has(loc)) next.delete(loc)
      else next.add(loc)
      if (next.size === 0) next.add('All')
      return next
    })
  }

  const toggleFilterAttendance = (att: string) => {
    setFilterAttendance((prev) => {
      const next = new Set(prev)
      if (att === 'All') {
        next.clear()
        next.add('All')
        return next
      }
      next.delete('All')
      if (next.has(att)) next.delete(att)
      else next.add(att)
      if (next.size === 0) next.add('All')
      return next
    })
  }

  return (
    <main className="relative w-full bg-white px-4 pb-10 pt-8 md:px-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={onBack}
              className="p-2"
              iconLeading={<ArrowNarrowLeft className="h-5 w-5" />}
              aria-label="Back to schedule list"
            />
          )}
          <h1 className="font-manrope text-[20px] font-semibold leading-10 text-primary-dark md:text-[26px] md:leading-10">
            {scheduleName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleDownload}
            iconLeading={<Download01 className="h-4 w-4" />}
            style={{ fontFamily: 'Inter' }}
          >
            Download
          </Button>
          <Button
            type="button"
            data-schedule-upload="true"
            variant="primary"
            size="md"
            onClick={handleUploadClick}
            iconLeading={<Upload01 className="h-4 w-4" />}
            style={{ fontFamily: 'Inter' }}
          >
            Upload
          </Button>
        </div>
      </div>

      <div className="mt-6 flex min-h-[22rem] flex-col gap-6 overflow-hidden rounded border border-slate-200 bg-white px-4 py-6 shadow-sm md:min-h-[819px] md:px-8">
        {/* Date Selector - key by range so switching events remounts and shows that event's dates */}
        <WeekDateSelector 
          key={normalizedRangeStart && normalizedRangeEnd
            ? `${normalizedRangeStart.getTime()}-${normalizedRangeEnd.getTime()}`
            : 'no-range'}
          initialDate={selectedDate} 
          initialRangeStartDate={normalizedRangeStart}
          initialRangeEndDate={normalizedRangeEnd}
          onDateChange={(date) => {
            handleDateChange(date)
          }} 
        />

        <div ref={filterDropdownRef} className="relative flex w-full items-center justify-between gap-3">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => setIsSessionCreationModalOpen(true)}
            iconLeading={<Plus className="h-4 w-4" />}
            style={{ fontFamily: 'Inter' }}
          >
            Add session
          </Button>
          <div className="relative">
            <button
              ref={filterTriggerRef}
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Filter sessions"
              aria-expanded={filterOpen}
            >
              <FilterLines className="h-4 w-4 text-slate-500" strokeWidth={2} />
              Filter
            </button>
            {filterOpen &&
              filterPanelPosition &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  ref={filterPanelRef}
                  className="flex max-h-[min(400px,70vh)] w-[min(250px,calc(100vw-32px))] flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
                  style={{
                    position: 'fixed',
                    top: filterPanelPosition.top,
                    left: Math.max(8, filterPanelPosition.left),
                    zIndex: 9999
                  }}
                >
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Search by keyword</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={filterKeyword}
                            onChange={(e) => setFilterKeyword(e.target.value)}
                            placeholder="Search"
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleFilterApply}
                            iconLeading={<SearchLg className="h-4 w-4" />}
                            aria-label="Search"
                          />
                        </div>
                      </div>
                      <hr className="border-slate-100" />
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                        <div className="space-y-2">
                          {locationOptions.map((loc) => (
                            <label key={loc} className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={filterLocations.has(loc) || (filterLocations.size === 0 && loc === 'All')}
                                onChange={() => toggleFilterLocation(loc)}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm text-slate-800">{loc}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <hr className="border-slate-100" />
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Attendance type</label>
                        <div className="space-y-2">
                          {ATTENDANCE_OPTIONS.map((att) => (
                            <label key={att} className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={filterAttendance.has(att) || (filterAttendance.size === 0 && att === 'All')}
                                onChange={() => toggleFilterAttendance(att)}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm text-slate-800">{att}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2 border-t border-slate-100 px-4 py-4">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleFilterClearAll}
                      style={{ fontFamily: 'Inter' }}
                    >
                      Clear all
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleFilterApply}
                      style={{ fontFamily: 'Inter' }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>

        {filteredSessions && filteredSessions.length > 0 ? (
          <ScheduleGrid 
            sessions={filteredSessions} 
            selectedDate={selectedDate} 
            onAddParallelSession={(parentId) => onAddSession?.(parentId)}
            onEditSession={onEditSession}
            onDeleteSession={onDeleteSession}
            onSessionClick={onSessionClick}
            sessionFormOpen={sessionFormOpen}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-center text-base text-slate-500">
            {!hasAnySessions
              ? 'No sessions for this schedule yet. Upload your schedule or create custom sessions!'
              : !hasSessionsForSelectedDate
                ? 'No sessions are scheduled for this day. Click "Add session" to create one.'
                : 'No sessions match the current filters.'}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseModal}
        onUpload={onUploadFiles}
        multiple={false}
        onDownloadTemplate={handleDownloadTemplate}
        showTemplate={true}
        templateLabel="Session Template"
      />

      {/* Session Creation Modal */}
      <SessionCreationModal
        isOpen={isSessionCreationModalOpen}
        onClose={() => setIsSessionCreationModalOpen(false)}
        onSelect={(type) => {
          setIsSessionCreationModalOpen(false)
          // Call onAddSession with the selected type
          // If template is selected, it will open the SessionSlideout
          onAddSession?.(undefined, type)
        }}
      />
    </main>
  )
}

export default ScheduleContent

