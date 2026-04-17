import React, { useEffect, useMemo, useState } from 'react'
import type { SavedSession } from '../../eventhub/schedulesession/sessionTypes'
import { fetchPublicScheduleSessions, mapApiSectionsToSavedSections } from '../../../services/publicScheduleSessionService'
import PublicScheduleGrid from './PublicScheduleGrid'

interface PublicScheduleSessionsPageProps {
  eventUuid: string
  scheduleUuid: string
  onNavigate: (path: string) => void
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
    if (raw >= 0 && raw < 24 * 60) return from24(Math.floor(raw / 60), Math.round(raw % 60))
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

function mapRawToSavedSession(x: any, idx: number): SavedSession {
  const id = String(x.uuid ?? x.id ?? `session-${idx}`)
  const title = String(x.title ?? x.name ?? 'Session')
  const startRaw = x.start_time ?? x.startTime ?? x.start ?? x.start_at ?? x.startAt ?? x.start_datetime ?? x.starts_at
  const endRaw = x.end_time ?? x.endTime ?? x.end ?? x.end_at ?? x.endAt ?? x.end_datetime ?? x.ends_at
  const start = parseTime(startRaw)
  const end = parseTime(endRaw)
  const dateRaw = x.date ?? x.day ?? x.session_date ?? x.sessionDate ?? x.start_date ?? x.start_datetime ?? x.start_at ?? x.starts_at
  const date = normalizeDate(dateRaw)

  const parentIdRaw = x.parent_session_uuid ?? x.parent_uuid ?? x.parentUuid ?? x.parent_id ?? x.parentId ?? null
  const attachmentsArr = Array.isArray(x.attachments) ? x.attachments : []
  const count = Number(x.attachment_count ?? x.attachments_count ?? x.attachmentsCount ?? attachmentsArr.length ?? 0)
  const attachments = attachmentsArr.length ? attachmentsArr : count > 0 ? new Array(count).fill({}) : []

  const description = x.description ?? x.summary ?? ''
  const apiSections = Array.isArray(x.sections) ? x.sections : Array.isArray(x.session_sections) ? x.session_sections : []
  const apiResources = Array.isArray(x.session_resources) ? x.session_resources : Array.isArray(x.resources) ? x.resources : []
  const sections = mapApiSectionsToSavedSections(apiSections, apiResources, id, description)

  const rawSpeakers = Array.isArray(x.speakers) ? x.speakers : Array.isArray(x.session_speakers) ? x.session_speakers : []
  const speakersArr: any[] = []
  rawSpeakers.forEach((item: any) => {
    if (item?.content?.speakers && Array.isArray(item.content.speakers)) speakersArr.push(...item.content.speakers)
    else if (item?.name || item?.first_name || item?.last_name) speakersArr.push(item)
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
    sections,
    attachments,
    attachment_count: count,
    speakers: speakersArr,
    date: date ?? undefined,
    parentId: parentIdRaw ? String(parentIdRaw) : undefined,
    __dateKey: date ? date.toISOString().slice(0, 10) : undefined,
    __numericId: x.uuid != null && x.id != null ? x.id : undefined,
  } as any
}

const PublicScheduleSessionsPage: React.FC<PublicScheduleSessionsPageProps> = ({
  eventUuid,
  scheduleUuid,
  onNavigate,
}) => {
  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Resolve schedule title from website index in localStorage
  const scheduleTitle = useMemo(() => {
    try {
      const raw = localStorage.getItem(`website-index-${eventUuid}`)
      const data = raw ? JSON.parse(raw) : null
      const findInNav = (items: any[]): string | null => {
        for (const item of Array.isArray(items) ? items : []) {
          const refUuid = String(item?.ref_uuid ?? item?.uuid ?? '').trim()
          if (item?.item_type === 'schedule' && refUuid === scheduleUuid) {
            return String(item?.title ?? item?.name ?? '').trim() || null
          }
          const found = findInNav(Array.isArray(item?.items) ? item.items : [])
          if (found) return found
        }
        return null
      }
      return findInNav(Array.isArray(data?.navigation) ? data.navigation : []) ?? null
    } catch {
      return null
    }
  }, [eventUuid, scheduleUuid])

  useEffect(() => {
    if (!eventUuid || !scheduleUuid) return
    let cancelled = false
    setIsLoading(true)
    fetchPublicScheduleSessions(eventUuid, scheduleUuid)
      .then((raw) => {
        if (cancelled) return
        setSessions((Array.isArray(raw) ? raw : []).map(mapRawToSavedSession))
      })
      .catch(() => { if (!cancelled) setSessions([]) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [eventUuid, scheduleUuid])

  const handleSpeakerClick = (speakerUuid: string) => {
    onNavigate(`/events/${eventUuid}/speakers/${speakerUuid}`)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">{scheduleTitle ?? 'Sessions'}</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 h-20" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="text-base font-semibold text-slate-900">No sessions found</div>
          <div className="mt-1 text-sm text-slate-500">No sessions have been added to this schedule yet.</div>
        </div>
      ) : (
        <PublicScheduleGrid sessions={sessions} onSpeakerClick={handleSpeakerClick} />
      )}
    </div>
  )
}

export default PublicScheduleSessionsPage
