import React, { useEffect, useState } from 'react'
import { fetchBookmarkedSchedules, fetchBookmarkedScheduleSessions } from '../../../services/publicEventService'
import PublicScheduleGrid from './PublicScheduleGrid'
import type { SavedSession } from '../../eventhub/schedulesession/sessionTypes'

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

const PublicYourSchedulePage: React.FC<PublicYourSchedulePageProps> = ({ eventUuid, onNavigate }) => {
  const [schedules, setSchedules] = useState<BookmarkedSchedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)
  const [schedulesError, setSchedulesError] = useState<string | null>(null)

  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
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

          {!sessionsLoading && !sessionsError && sessions.length > 0 && (
            <PublicScheduleGrid
              sessions={sessions}
              onSpeakerClick={(uuid) => onNavigate?.(`/events/${eventUuid}/attendees/${uuid}`)}
              onSessionClick={(id) => onNavigate?.(`/events/${eventUuid}/sessions/${id}`)}
              showConflicts
            />
          )}
        </>
      )}
    </div>
  )
}

export default PublicYourSchedulePage
