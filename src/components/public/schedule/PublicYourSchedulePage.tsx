import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchBookmarkedSchedules, fetchBookmarkedScheduleSessions } from '../../../services/publicEventService'
import PublicScheduleGrid from './PublicScheduleGrid'
import type { SavedSession } from '../../eventhub/schedulesession/sessionTypes'
import { SearchLg, FilterLines, Download01 } from '@untitled-ui/icons-react'

interface PublicYourSchedulePageProps {
  eventUuid: string
  onNavigate?: (path: string) => void
}

interface BookmarkedSchedule {
  id: string
  title: string
  start_date: string
  end_date: string
}

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

const ATTENDANCE_OPTIONS = ['All', 'Online', 'In-Person', 'Hybrid']

function sessionTypeToAttendance(sessionType: string): string {
  const t = String(sessionType || '').toLowerCase()
  if (t === 'virtual' || t === 'online') return 'Online'
  if (t === 'hybrid') return 'Hybrid'
  return 'In-Person'
}

const startOfDayKey = (d: Date) => {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt.getTime()
}

const normalizeDate = (value: any): Date | null => {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const raw = String(value).trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

const parseTime = (raw: any): { time: string; period: 'AM' | 'PM' } => {
  const fallback = { time: '00:00', period: 'AM' as const }
  const from24 = (hh24: number, mm: number) => {
    const h = Number.isFinite(hh24) ? ((hh24 % 24) + 24) % 24 : 0
    const m = Number.isFinite(mm) ? ((mm % 60) + 60) % 60 : 0
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
    return { time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, period }
  }
  if (raw === null || typeof raw === 'undefined') return fallback
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw > 1e10) { const d = new Date(raw); if (!Number.isNaN(d.getTime())) return from24(d.getHours(), d.getMinutes()) }
    if (raw >= 0 && raw < 1) { const t = Math.round(raw * 24 * 60); return from24(Math.floor(t / 60) % 24, t % 60) }
    if (raw >= 0 && raw < 1440) return from24(Math.floor(raw / 60), Math.round(raw % 60))
  }
  const s = String(raw).trim()
  if (!s) return fallback
  if (s.includes('T')) { const d = new Date(s); if (!Number.isNaN(d.getTime())) return from24(d.getHours(), d.getMinutes()) }
  const ampm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(AM|PM)$/i)
  if (ampm) {
    let hh = Number(ampm[1]); const mm = Number(ampm[2]); const p = ampm[3].toUpperCase() as 'AM' | 'PM'
    if (p === 'PM' && hh !== 12) hh += 12
    if (p === 'AM' && hh === 12) hh = 0
    return from24(hh, mm)
  }
  const h24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/)
  if (h24) return from24(Number(h24[1]), Number(h24[2]))
  return fallback
}

function mapToSavedSession(x: any, idx: number): SavedSession {
  const id = String(x.uuid ?? x.id ?? `session-${idx}`)
  const title = String(x.title ?? x.session_title ?? x.name ?? 'Session')
  const startRaw = x.start_at ?? x.start_time ?? x.startTime ?? x.startAt ?? x.start_datetime
  const endRaw = x.end_at ?? x.end_time ?? x.endTime ?? x.endAt ?? x.end_datetime
  const start = parseTime(startRaw)
  const end = parseTime(endRaw)
  const dateRaw = x.date ?? x.session_date ?? x.start_date ?? x.start_at ?? x.startAt
  const date = normalizeDate(dateRaw)
  const parentIdRaw = x.parent_session_uuid ?? x.parent_uuid ?? x.parentUuid ?? x.parent_id ?? x.parentId ?? null

  const rawSpeakers = Array.isArray(x.speakers) ? x.speakers : []
  const speakersArr: any[] = []
  rawSpeakers.forEach((item: any) => {
    if (item?.content?.speakers && Array.isArray(item.content.speakers)) {
      speakersArr.push(...item.content.speakers)
    } else if (item?.name || item?.first_name || item?.last_name || item?.role) {
      speakersArr.push(item)
    }
  })

  return {
    id,
    title,
    startTime: start.time,
    startPeriod: start.period,
    endTime: end.time,
    endPeriod: end.period,
    location: String(x.location ?? x.room ?? x.venue ?? ''),
    sessionType: String(x.session_type ?? x.sessionType ?? ''),
    tags: Array.isArray(x.tags) ? x.tags : [],
    sections: [],
    attachments: [],
    attachment_count: typeof x.attachment_count === 'number' ? x.attachment_count : 0,
    speakers: speakersArr,
    date: date ?? undefined,
    parentId: parentIdRaw ? String(parentIdRaw) : undefined,
  } as any
}

const formatRange = (start: Date, end: Date) => {
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' })
  const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short' })
  if (startOfDayKey(start) === startOfDayKey(end)) return `${month.format(start)} ${start.getDate()}, ${start.getFullYear()}`
  if (sameMonth) return `${month.format(start)} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
  if (sameYear) return `${monthShort.format(start)} ${start.getDate()} – ${monthShort.format(end)} ${end.getDate()}, ${start.getFullYear()}`
  return `${monthShort.format(start)} ${start.getDate()}, ${start.getFullYear()} – ${monthShort.format(end)} ${end.getDate()}, ${end.getFullYear()}`
}

const PublicYourSchedulePage: React.FC<PublicYourSchedulePageProps> = ({ eventUuid, onNavigate }) => {
  const [schedules, setSchedules] = useState<BookmarkedSchedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)
  const [schedulesError, setSchedulesError] = useState<string | null>(null)

  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  // Load bookmarked schedules
  useEffect(() => {
    let cancelled = false
    setSchedulesLoading(true)
    setSchedulesError(null)
    fetchBookmarkedSchedules(eventUuid)
      .then((raw) => {
        if (cancelled) return
        const mapped: BookmarkedSchedule[] = (Array.isArray(raw) ? raw : []).map((s: any, idx: number) => ({
          id: String(s.uuid ?? s.id ?? `schedule-${idx}`),
          title: String(s.title ?? s.name ?? 'Schedule'),
          start_date: String(s.start_date ?? ''),
          end_date: String(s.end_date ?? ''),
        }))
        setSchedules(mapped)
      })
      .catch(() => { if (!cancelled) setSchedulesError('Failed to load schedules.') })
      .finally(() => { if (!cancelled) setSchedulesLoading(false) })
    return () => { cancelled = true }
  }, [eventUuid])

  // Load bookmarked sessions across all bookmarked schedules (single mixed list)
  useEffect(() => {
    if (schedules.length === 0) {
      setSessions([])
      setSessionsLoading(false)
      setSessionsError(null)
      return
    }
    let cancelled = false
    setSessionsLoading(true)
    setSessionsError(null)
    setSessions([])
    Promise.all(schedules.map((s) => fetchBookmarkedScheduleSessions(eventUuid, s.id).catch(() => [])))
      .then((allRaw) => {
        if (cancelled) return
        const mergedRaw = allRaw.flatMap((raw) => (Array.isArray(raw) ? raw : []))
        const mapped = mergedRaw.map(mapToSavedSession)
        const deduped = Array.from(new Map(mapped.map((s: any) => [String(s.id), s])).values())
        // Resolve parentId: ensure children can find their parent by uuid
        const allIds = new Set(deduped.map((s: any) => s.id))
        const resolved = deduped.map((s: any) => {
          let parentId = s.parentId
          if (parentId && !allIds.has(parentId)) parentId = undefined
          return { ...s, parentId }
        })
        setSessions(resolved)
      })
      .catch(() => { if (!cancelled) setSessionsError('Failed to load sessions.') })
      .finally(() => { if (!cancelled) setSessionsLoading(false) })
    return () => { cancelled = true }
  }, [eventUuid, schedules])

  // Day tabs
  const dayKeys = useMemo(() => {
    const set = new Map<number, Date>()
    sessions.forEach((s) => {
      const d = s.date ? new Date(s.date) : null
      if (!d || Number.isNaN(d.getTime())) return
      const key = startOfDayKey(d)
      if (!set.has(key)) set.set(key, d)
    })
    return Array.from(set.entries()).sort((a, b) => a[0] - b[0]).map(([, d]) => d)
  }, [sessions])

  const [activeDayIndex, setActiveDayIndex] = useState(0)
  useEffect(() => { setActiveDayIndex(0) }, [sessions])

  const activeDayKey = dayKeys[activeDayIndex] ? startOfDayKey(dayKeys[activeDayIndex]) : null

  const rangeLabel = useMemo(() => {
    if (dayKeys.length === 0) return ''
    return formatRange(dayKeys[0], dayKeys[dayKeys.length - 1])
  }, [dayKeys])

  const sessionsForDay = useMemo(() => {
    if (activeDayKey === null) return sessions
    return sessions.filter((s) => {
      if (!s.date) return false
      const d = new Date(s.date)
      if (Number.isNaN(d.getTime())) return false
      return startOfDayKey(d) === activeDayKey
    })
  }, [activeDayKey, sessions])

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterLocations, setFilterLocations] = useState<Set<string>>(new Set())
  const [filterAttendance, setFilterAttendance] = useState<Set<string>>(new Set())
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set())
  const [filterPanelPosition, setFilterPanelPosition] = useState<{ top: number; left: number } | null>(null)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const filterPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearchQuery('')
    setFilterLocations(new Set())
    setFilterAttendance(new Set())
    setFilterTags(new Set())
  }, [sessions])

  const locationOptions = useMemo(() => {
    const set = new Set<string>()
    sessions.forEach((s) => { const loc = s?.location; if (loc && String(loc).trim()) set.add(String(loc).trim()) })
    return ['All', ...Array.from(set).sort()]
  }, [sessions])

  const tagOptions = useMemo(() => {
    const set = new Set<string>()
    sessions.forEach((s) => {
      const tags = Array.isArray(s.tags) ? s.tags : []
      tags.forEach((tag: any) => { const name = String(tag?.name ?? tag ?? '').trim(); if (name) set.add(name) })
    })
    return ['All', ...Array.from(set).sort()]
  }, [sessions])

  const appliedLocations = filterLocations.size === 0 || filterLocations.has('All') ? null : filterLocations
  const appliedAttendance = filterAttendance.size === 0 || filterAttendance.has('All') ? null : filterAttendance
  const appliedTags = filterTags.size === 0 || filterTags.has('All') ? null : filterTags
  const appliedKeyword = searchQuery.trim().toLowerCase()

  const filteredSessions = useMemo(() => {
    let list = sessionsForDay
    if (appliedKeyword) {
      list = list.filter((s) => {
        const title = String(s.title ?? '').toLowerCase()
        const loc = String(s.location ?? '').toLowerCase()
        const speakers = (Array.isArray((s as any).speakers) ? (s as any).speakers : [])
          .map((sp: any) => [sp?.name, sp?.first_name, sp?.last_name].filter(Boolean).join(' ').toLowerCase())
          .join(' ')
        return title.includes(appliedKeyword) || loc.includes(appliedKeyword) || speakers.includes(appliedKeyword)
      })
    }
    if (appliedLocations) {
      list = list.filter((s) => { const loc = String(s.location ?? '').trim(); return loc && appliedLocations.has(loc) })
    }
    if (appliedAttendance) {
      list = list.filter((s) => appliedAttendance.has(sessionTypeToAttendance(s.sessionType ?? '')))
    }
    if (appliedTags) {
      list = list.filter((s) => {
        const sessionTags = Array.isArray(s.tags) ? s.tags : []
        return sessionTags.some((tag: any) => appliedTags.has(String(tag?.name ?? tag ?? '').trim()))
      })
    }
    return list
  }, [sessionsForDay, appliedKeyword, appliedLocations, appliedAttendance, appliedTags])

  useEffect(() => {
    if (!filterOpen || !filterTriggerRef.current) return
    const rect = filterTriggerRef.current.getBoundingClientRect()
    setFilterPanelPosition({ top: rect.bottom + 8, left: rect.right - 250 })
  }, [filterOpen])

  useEffect(() => {
    if (!filterOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (!filterTriggerRef.current?.contains(target) && !filterPanelRef.current?.contains(target)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const toggleSet = useCallback((setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter((prev) => {
      const next = new Set(prev)
      if (value === 'All') { next.clear(); next.add('All'); return next }
      next.delete('All')
      if (next.has(value)) next.delete(value)
      else next.add(value)
      if (next.size === 0) next.add('All')
      return next
    })
  }, [])

  const handleFilterClearAll = () => {
    setFilterLocations(new Set())
    setFilterAttendance(new Set())
    setFilterTags(new Set())
    setFilterOpen(false)
  }

  const handleDownload = () => {
    const lines = ['Title,Start,End,Location,Attendance,Speakers']
    filteredSessions.forEach((s) => {
      const speakers = (Array.isArray((s as any).speakers) ? (s as any).speakers : [])
        .map((sp: any) => [sp?.name, sp?.first_name, sp?.last_name].filter(Boolean).join(' '))
        .join('; ')
      const row = [
        `"${String(s.title ?? '').replace(/"/g, '""')}"`,
        `"${s.startTime ?? ''} ${s.startPeriod ?? ''}"`,
        `"${s.endTime ?? ''} ${s.endPeriod ?? ''}"`,
        `"${String(s.location ?? '').replace(/"/g, '""')}"`,
        `"${sessionTypeToAttendance(s.sessionType ?? '')}"`,
        `"${speakers.replace(/"/g, '""')}"`
      ].join(',')
      lines.push(row)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-calendar.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="button"
          onClick={() => onNavigate?.(`/events/${eventUuid}/profile`)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
          aria-label="Back"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-700">My Calendar</h1>
      </div>

      {/* Schedules loading */}
      {schedulesLoading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {schedulesError && !schedulesLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{schedulesError}</div>
      )}

      {!schedulesLoading && !schedulesError && schedules.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="font-semibold text-slate-700">No bookmarked schedules yet.</p>
          <p className="mt-1 text-sm text-slate-500">Bookmark sessions from the schedule to see them here.</p>
        </div>
      )}

      {!schedulesLoading && !schedulesError && schedules.length > 0 && (
        <>
          {/* Date range */}
          {rangeLabel && (
            <div className="text-sm font-semibold text-slate-700">{rangeLabel}</div>
          )}

          {/* Day tabs */}
          {dayKeys.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              {dayKeys.map((d, idx) => {
                const isActive = idx === activeDayIndex
                const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
                return (
                  <button
                    key={startOfDayKey(d)}
                    type="button"
                    onClick={() => setActiveDayIndex(idx)}
                    className={['rounded-lg px-3 py-2 text-sm font-semibold transition-colors', isActive ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'].join(' ')}
                  >
                    Day {idx + 1} <span className="ml-2 text-xs font-medium opacity-90">{dateLabel}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Search / Filter / Download toolbar */}
          {/* {sessionsForDay.length > 0 && (
            <div className="flex items-center justify-end gap-2">
              <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search schedule"
                  className="w-48 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                <button type="button" className="flex h-full items-center bg-primary px-3 py-2 text-white hover:bg-primary/90 transition-colors" aria-label="Search">
                  <SearchLg className="h-4 w-4" />
                </button>
              </div>

              <div className="relative">
                <button
                  ref={filterTriggerRef}
                  type="button"
                  onClick={() => setFilterOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm text-slate-600 hover:border-primary/40 hover:text-primary transition-colors"
                  aria-label="Filter sessions"
                  aria-expanded={filterOpen}
                >
                  <FilterLines className="h-4 w-4" strokeWidth={2} />
                </button>
                {filterOpen && filterPanelPosition && typeof document !== 'undefined' && createPortal(
                  <div
                    ref={filterPanelRef}
                    className="flex max-h-[min(400px,70vh)] w-[250px] flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
                    style={{ position: 'fixed', top: filterPanelPosition.top, left: Math.max(8, filterPanelPosition.left), zIndex: 9999 }}
                  >
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                        <div className="space-y-2">
                          {locationOptions.map((loc) => (
                            <label key={loc} className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={filterLocations.has(loc) || (filterLocations.size === 0 && loc === 'All')}
                                onChange={() => toggleSet(setFilterLocations, loc)}
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
                                onChange={() => toggleSet(setFilterAttendance, att)}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm text-slate-800">{att}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {tagOptions.length > 1 && (
                        <>
                          <hr className="border-slate-100" />
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Tags</label>
                            <div className="space-y-2">
                              {tagOptions.map((tag) => (
                                <label key={tag} className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={filterTags.has(tag) || (filterTags.size === 0 && tag === 'All')}
                                    onChange={() => toggleSet(setFilterTags, tag)}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                                  />
                                  <span className="text-sm text-slate-800">{tag}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="border-t border-slate-100 px-4 py-3">
                      <button
                        type="button"
                        onClick={handleFilterClearAll}
                        className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>,
                  document.body
                )}
              </div>

              <button
                type="button"
                onClick={handleDownload}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm text-slate-600 hover:border-primary/40 hover:text-primary transition-colors"
                aria-label="Download schedule"
              >
                <Download01 className="h-4 w-4" />
              </button>
            </div>
          )} */}

          {/* Sessions loading */}
          {sessionsLoading && (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {sessionsError && !sessionsLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{sessionsError}</div>
          )}

          {!sessionsLoading && !sessionsError && sessions.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <p className="font-semibold text-slate-700">No bookmarked sessions yet.</p>
              <p className="mt-1 text-sm text-slate-500">Bookmark sessions to see them here.</p>
            </div>
          )}

          {!sessionsLoading && !sessionsError && filteredSessions.length > 0 && (
            <PublicScheduleGrid
              sessions={filteredSessions}
              onSpeakerClick={(uuid) => onNavigate?.(`/events/${eventUuid}/attendees/${uuid}`)}
              onSessionClick={(id) => onNavigate?.(`/events/${eventUuid}/sessions/${id}`)}
              showConflicts
            />
          )}

          {!sessionsLoading && !sessionsError && sessions.length > 0 && filteredSessions.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">No sessions match your search or filters.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default PublicYourSchedulePage
