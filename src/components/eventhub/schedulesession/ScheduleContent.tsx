import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Upload01, Plus, ArrowNarrowLeft } from '@untitled-ui/icons-react'
import { Button } from '../../ui/untitled'
import WeekDateSelector from './WeekDateSelector'
import UploadModal from '../../ui/UploadModal'
import ScheduleGrid from './ScheduleGrid'
import SessionCreationModal from './SessionCreationModal'
import { SavedSession } from './sessionTypes'
import sessionTemplate from '../../../assets/excel/Session templates.xlsx?url'

interface ScheduleContentProps {
  scheduleName?: string
  onUpload?: () => void
  onUploadFiles?: (files: File[]) => Promise<void> | void
  onAddSession?: (parentSessionId?: string, creationType?: 'template' | 'scratch') => void
  onBack?: () => void
  sessions?: SavedSession[] | any[] // Allow any[] for Puck compatibility
  onDateChange?: (date: Date) => void
  selectedDate?: Date | string // Allow string for Puck (ISO string)
  rangeStartDate?: Date | string
  rangeEndDate?: Date | string
  onEditSession?: (session: SavedSession) => void
  onDeleteSession?: (session: SavedSession) => void
}

const ScheduleContent: React.FC<ScheduleContentProps> = ({
  scheduleName = 'Schedule 1',
  onUpload,
  onUploadFiles,
  onAddSession,
  onBack,
  sessions = [],
  onDateChange,
  selectedDate: propSelectedDate,
  rangeStartDate,
  rangeEndDate,
  onEditSession,
  onDeleteSession
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isSessionCreationModalOpen, setIsSessionCreationModalOpen] = useState(false)
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
        const id = String(session?.id ?? session?.uuid ?? '')
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
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a')
    link.href = sessionTemplate
    link.download = 'Session template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

        <div>
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
        </div>

        {gridSessions && gridSessions.length > 0 ? (
          <ScheduleGrid 
            sessions={gridSessions} 
            selectedDate={selectedDate} 
            onAddParallelSession={(parentId) => onAddSession?.(parentId)}
            onEditSession={onEditSession}
            onDeleteSession={onDeleteSession}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-center text-base text-slate-500">
            Upload your schedule or create custom sessions!
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

