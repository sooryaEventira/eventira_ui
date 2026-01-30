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
  rangeEndDate
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isSessionCreationModalOpen, setIsSessionCreationModalOpen] = useState(false)
  
  // Handle date from props (can be Date or ISO string from Puck)
  const getInitialDate = (): Date => {
    if (propSelectedDate) {
      if (propSelectedDate instanceof Date) {
        const date = new Date(propSelectedDate)
        date.setHours(0, 0, 0, 0)
        return date
      } else if (typeof propSelectedDate === 'string') {
        const date = new Date(propSelectedDate)
        date.setHours(0, 0, 0, 0)
        return date
      }
    }
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }
  
  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate)
  const didNotifyInitialDateRef = useRef(false)

  const normalizedRangeStart = useMemo(() => {
    if (!rangeStartDate) return null
    const d = rangeStartDate instanceof Date ? new Date(rangeStartDate) : new Date(String(rangeStartDate))
    if (Number.isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }, [rangeStartDate])

  const normalizedRangeEnd = useMemo(() => {
    if (!rangeEndDate) return null
    const d = rangeEndDate instanceof Date ? new Date(rangeEndDate) : new Date(String(rangeEndDate))
    if (Number.isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }, [rangeEndDate])

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
          // IMPORTANT: for mapping in UI, use parentId to store parent UUID.
          parentId:
            sessionTypeRaw === 'child'
              ? (parentUuid ? String(parentUuid) : undefined)
              : undefined,
        }

        return normalizedSession
      })
      .filter(Boolean) as SavedSession[]

    // 2) Build parent map using sessionType === 'parent'
    const parents = normalized.filter(
      (s) => String(s.sessionType ?? '').toLowerCase() === 'parent'
    )
    const parentById = new Map<string, SavedSession>()
    parents.forEach((p) => parentById.set(p.id, p))

    // 3) Attach children to parents by matching child's parentUuid (stored in parentId) to parent.id
    const children = normalized.filter(
      (s) => String(s.sessionType ?? '').toLowerCase() === 'child'
    )

    const childrenByParent = new Map<string, SavedSession[]>()
    const orphanChildrenAsParents: SavedSession[] = []

    for (const child of children) {
      const pid = child.parentId
      if (pid && parentById.has(pid)) {
        const arr = childrenByParent.get(pid) ?? []
        arr.push(child)
        childrenByParent.set(pid, arr)
      } else {
        // If no valid parent match, render as standalone (parent) so it's still visible.
        orphanChildrenAsParents.push({ ...child, sessionType: 'parent', parentId: undefined })
      }
    }

    // 4) Output: parents first, then their children (sorted by time)
    const sortByStart = (a: SavedSession, b: SavedSession) =>
      toMinutes(a.startTime, a.startPeriod) - toMinutes(b.startTime, b.startPeriod) ||
      String(a.title ?? '').localeCompare(String(b.title ?? ''))

    const uniqueParents = Array.from(
      new Map<string, SavedSession>(
        [...parents, ...orphanChildrenAsParents].map((p) => [p.id, p])
      ).values()
    ).sort(sortByStart)

    const output: SavedSession[] = []
    for (const p of uniqueParents) {
      output.push(p)
      const kids = (childrenByParent.get(p.id) ?? []).slice().sort(sortByStart)
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
        {/* Date Selector */}
        <WeekDateSelector 
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

