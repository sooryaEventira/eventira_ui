import React, { useEffect, useState } from 'react'
import { fetchBookmarkedSessions } from '../../../services/publicEventService'
import PublicScheduleGrid from './PublicScheduleGrid'
import type { SavedSession } from '../../eventhub/schedulesession/sessionTypes'

interface PublicYourSchedulePageProps {
  eventUuid: string
  onNavigate?: (path: string) => void
}

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

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

const normalizeDate = (value: any): Date | null => {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const raw = String(value).trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) { const d = new Date(`${raw}T00:00:00`); return Number.isNaN(d.getTime()) ? null : d }
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function mapToSavedSession(x: any, idx: number): SavedSession {
  // Bookmark API response shape: { uuid, event_title, session_title, created_date }
  const id = String(x.uuid ?? x.id ?? `session-${idx}`)
  const title = String(x.session_title ?? x.title ?? x.name ?? 'Session')
  const startRaw = x.start_time ?? x.startTime ?? x.start_at ?? x.startAt ?? x.start_datetime
  const endRaw = x.end_time ?? x.endTime ?? x.end_at ?? x.endAt ?? x.end_datetime
  const start = parseTime(startRaw)
  const end = parseTime(endRaw)
  const dateRaw = x.date ?? x.session_date ?? x.start_date ?? x.start_at ?? x.created_date
  const date = normalizeDate(dateRaw)
  return {
    id,
    title,
    startTime: start.time,
    startPeriod: start.period,
    endTime: end.time,
    endPeriod: end.period,
    location: String(x.location ?? x.room ?? x.venue ?? ''),
    sessionType: String(x.session_type ?? x.sessionType ?? ''),
    tags: [],
    sections: [],
    attachments: [],
    attachment_count: 0,
    speakers: [],
    date: date ?? undefined,
  } as any
}

const PublicYourSchedulePage: React.FC<PublicYourSchedulePageProps> = ({ eventUuid, onNavigate }) => {
  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchBookmarkedSessions(eventUuid)
      .then((raw) => {
        if (cancelled) return
        setSessions((Array.isArray(raw) ? raw : []).map(mapToSavedSession))
      })
      .catch(() => { if (!cancelled) setError('Failed to load your schedule.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [eventUuid])

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate?.(`/events/${eventUuid}/profile`)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          aria-label="Back"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Your Schedule</h1>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="font-semibold text-slate-700">No bookmarked sessions yet.</p>
          <p className="mt-1 text-sm text-slate-500">Bookmark sessions from the schedule to see them here.</p>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <PublicScheduleGrid sessions={sessions} />
      )}
    </div>
  )
}

export default PublicYourSchedulePage
