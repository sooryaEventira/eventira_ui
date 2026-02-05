import React, { useEffect, useState } from 'react'
import { ArrowNarrowLeft } from '@untitled-ui/icons-react'
import type { SavedSession } from '../../eventhub/schedulesession/sessionTypes'
import SessionSummaryView from '../../eventhub/schedulesession/SessionSummaryView'
import { fetchPublicSchedules } from '../../../services/publicScheduleService'
import { fetchPublicScheduleSessions } from '../../../services/publicScheduleSessionService'

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
  if (raw === null || typeof raw === 'undefined') return fallback
  const from24 = (hh24: number, mm: number) => {
    const h = Number.isFinite(hh24) ? ((hh24 % 24) + 24) % 24 : 0
    const m = Number.isFinite(mm) ? ((mm % 60) + 60) % 60 : 0
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
    return { time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, period }
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw > 1e10) {
      const d = new Date(raw)
      if (!Number.isNaN(d.getTime())) return from24(d.getHours(), d.getMinutes())
    }
    if (raw >= 0 && raw < 1) {
      const totalMinutes = Math.round(raw * 24 * 60)
      return from24(Math.floor(totalMinutes / 60) % 24, totalMinutes % 60)
    }
    if (raw >= 0 && raw < 24 * 60) {
      return from24(Math.floor(raw / 60), Math.round(raw % 60))
    }
  }
  const s = String(raw).trim()
  if (!s) return fallback
  if (s.includes('T')) {
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return from24(d.getHours(), d.getMinutes())
  }
  const ampm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(AM|PM)$/i)
  if (ampm) {
    let hh = Number(ampm[1])
    const mm = Number(ampm[2])
    const period = ampm[3].toUpperCase() as 'AM' | 'PM'
    if (period === 'PM' && hh !== 12) hh += 12
    if (period === 'AM' && hh === 12) hh = 0
    return from24(hh, mm)
  }
  const h24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/)
  if (h24) return from24(Number(h24[1]), Number(h24[2]))
  return fallback
}

const mapApiSessionToSaved = (x: any, idx: number): SavedSession => {
  const id = String(x.uuid ?? x.id ?? `session-${idx}`)
  const title = String(x.title ?? x.name ?? 'Session')
  const startRaw = x.start_time ?? x.startTime ?? x.start ?? x.start_at ?? x.startAt ?? x.start_datetime ?? x.startDateTime ?? x.starts_at ?? x.startsAt
  const endRaw = x.end_time ?? x.endTime ?? x.end ?? x.end_at ?? x.endAt ?? x.end_datetime ?? x.endDateTime ?? x.ends_at ?? x.endsAt
  const start = parseTime(startRaw)
  const end = parseTime(endRaw)
  const dateRaw = x.date ?? x.day ?? x.session_date ?? x.start_datetime ?? x.startDateTime
  const date = normalizeDate(dateRaw)
  const attachmentsArr = Array.isArray(x.attachments) ? x.attachments : []
  const count = Number(x.attachments_count ?? x.attachmentsCount ?? attachmentsArr.length ?? 0)
  const attachments = attachmentsArr.length ? attachmentsArr : count > 0 ? new Array(count).fill({}) : []
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
    sections: Array.isArray(x.sections) ? x.sections : [],
    attachments,
    date: date ?? undefined,
    parentId: x.parent_uuid ?? x.parentId ? String(x.parent_uuid ?? x.parentId) : undefined,
  }
}

interface PublicSessionDetailPageProps {
  eventUuid: string
  sessionId: string
  onNavigate: (path: string) => void
}

const PublicSessionDetailPage: React.FC<PublicSessionDetailPageProps> = ({
  eventUuid,
  sessionId,
  onNavigate
}) => {
  const [session, setSession] = useState<SavedSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!sessionId) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setLoading(true)
      setNotFound(false)
      try {
        const schedules = await fetchPublicSchedules(eventUuid)
        const list = Array.isArray(schedules) ? schedules : []
        for (const schedule of list) {
          const sid = String(schedule?.uuid ?? schedule?.id ?? '')
          if (!sid) continue
          const raw = await fetchPublicScheduleSessions(eventUuid, sid)
          const arr = Array.isArray(raw) ? raw : []
          const found = arr.find((x: any) => String(x.uuid ?? x.id ?? '') === sessionId)
          if (found) {
            if (!cancelled) setSession(mapApiSessionToSaved(found, 0))
            return
          }
        }
        if (!cancelled) setNotFound(true)
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [eventUuid, sessionId])

  const schedulePath = `/events/${eventUuid}/schedule`

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded bg-slate-100" />
          <div className="flex gap-2">
            <div className="h-6 w-24 rounded-full bg-slate-100" />
            <div className="h-6 w-32 rounded-full bg-slate-100" />
          </div>
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-5/6 rounded bg-slate-100" />
        </div>
      </div>
    )
  }

  if (notFound || !session) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <button
          type="button"
          onClick={() => onNavigate(schedulePath)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowNarrowLeft className="h-4 w-4" />
          Back to schedule
        </button>
        <div className="text-lg font-semibold text-slate-900">Session not found</div>
        <p className="mt-1 text-sm text-slate-600">
          This session may have been removed or the link is incorrect.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <button
        type="button"
        onClick={() => onNavigate(schedulePath)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowNarrowLeft className="h-4 w-4" />
        Back to schedule
      </button>
      <SessionSummaryView
        session={session}
        sessionId={session.id}
        eventId={eventUuid}
        cometChatUser={null}
      />
    </div>
  )
}

export default PublicSessionDetailPage
