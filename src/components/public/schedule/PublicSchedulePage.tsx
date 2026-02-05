import React, { useEffect, useMemo, useState } from 'react'
import { readEventStoreJSON } from '../../../utils/eventLocalStore'
import type { SavedSchedule, SavedSession } from '../../eventhub/schedulesession/sessionTypes'
import ScheduleGrid from '../../eventhub/schedulesession/ScheduleGrid'
import { fetchPublicSchedules } from '../../../services/publicScheduleService'
import { fetchPublicScheduleSessions } from '../../../services/publicScheduleSessionService'

interface PublicSchedulePageProps {
  eventUuid: string
  onNavigate?: (path: string) => void
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
  // Prefer YYYY-MM-DD without timezone shifting
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

const parseTime = (raw: any): { time: string; period: 'AM' | 'PM' } => {
  // Public schedule uses 24-hour format only (HH:mm), but we still keep period
  // for compatibility with existing session types/utilities.
  const fallback = { time: '00:00', period: 'AM' as const }
  if (raw === null || typeof raw === 'undefined') return fallback

  const from24 = (hh24: number, mm: number) => {
    const h = Number.isFinite(hh24) ? ((hh24 % 24) + 24) % 24 : 0
    const m = Number.isFinite(mm) ? ((mm % 60) + 60) % 60 : 0
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
    return { time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, period }
  }

  // Numeric formats:
  // - minutes since midnight (0..1440)
  // - Excel fraction of day (0..1)
  // - epoch ms (very large)
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // epoch ms
    if (raw > 1e10) {
      const d = new Date(raw)
      if (!Number.isNaN(d.getTime())) {
        return from24(d.getHours(), d.getMinutes())
      }
    }
    // excel fraction of day
    if (raw >= 0 && raw < 1) {
      const totalMinutes = Math.round(raw * 24 * 60)
      const hh24 = Math.floor(totalMinutes / 60) % 24
      const mm = totalMinutes % 60
      return from24(hh24, mm)
    }
    // minutes since midnight
    if (raw >= 0 && raw < 24 * 60) {
      const hh24 = Math.floor(raw / 60)
      const mm = Math.round(raw % 60)
      return from24(hh24, mm)
    }
  }

  const s = String(raw).trim()
  if (!s) return fallback

  // ISO datetime (ex: 2026-03-15T09:00:00Z)
  if (s.includes('T')) {
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) {
      return from24(d.getHours(), d.getMinutes())
    }
  }

  // "09:00 AM"
  const ampm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(AM|PM)$/i)
  if (ampm) {
    let hh = Number(ampm[1])
    const mm = Number(ampm[2])
    const period = ampm[3].toUpperCase() as 'AM' | 'PM'
    if (period === 'PM' && hh !== 12) hh += 12
    if (period === 'AM' && hh === 12) hh = 0
    return from24(hh, mm)
  }

  // "13:05" or "13:05:00" or "13:05:00.000000" (24h)
  const h24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/)
  if (h24) {
    const hh = Number(h24[1])
    const mm = Number(h24[2])
    return from24(hh, mm)
  }

  return fallback
}

const normalizeTitleKey = (value: any) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const sortSessionsLikeAdmin = (sessions: SavedSession[]) => {
  const parentsById = new Map<string, SavedSession>()
  sessions.forEach((s) => {
    if (!s.parentId) parentsById.set(s.id, s)
  })
  const startKey = (s: SavedSession) => {
    const toMin = (time: string, period: string) => {
      const [hh, mm] = String(time || '00:00').split(':')
      let h = Number(hh || 0)
      const m = Number(mm || 0)
      const p = String(period || 'AM').toUpperCase()
      // Support both 24-hour (HH can be 13..23) and 12-hour with period.
      if (h >= 13) return h * 60 + m
      if (p === 'PM' && h !== 12) h += 12
      if (p === 'AM' && h === 12) h = 0
      return h * 60 + m
    }
    return toMin(s.startTime, s.startPeriod || 'AM')
  }

  return [...sessions].sort((a, b) => {
    const aIsChild = Boolean(a.parentId)
    const bIsChild = Boolean(b.parentId)
    const aParent = a.parentId ? parentsById.get(a.parentId) : undefined
    const bParent = b.parentId ? parentsById.get(b.parentId) : undefined
    const aGroupTime = aIsChild && aParent ? startKey(aParent) : startKey(a)
    const bGroupTime = bIsChild && bParent ? startKey(bParent) : startKey(b)
    if (aGroupTime !== bGroupTime) return aGroupTime - bGroupTime
    if (aIsChild !== bIsChild) return aIsChild ? 1 : -1
    const aStart = startKey(a)
    const bStart = startKey(b)
    if (aStart !== bStart) return aStart - bStart
    return String(a.title).localeCompare(String(b.title))
  })
}

const formatRange = (start: Date, end: Date) => {
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' })
  const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short' })

  if (startOfDayKey(start) === startOfDayKey(end)) {
    return `${month.format(start)} ${start.getDate()}, ${start.getFullYear()}`
  }

  if (sameMonth) {
    return `${month.format(start)} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
  }

  if (sameYear) {
    return `${monthShort.format(start)} ${start.getDate()} – ${monthShort.format(end)} ${end.getDate()}, ${start.getFullYear()}`
  }

  return `${monthShort.format(start)} ${start.getDate()}, ${start.getFullYear()} – ${monthShort.format(end)} ${end.getDate()}, ${end.getFullYear()}`
}

const PublicSchedulePage: React.FC<PublicSchedulePageProps> = ({ eventUuid, onNavigate }) => {
  const [apiSchedules, setApiSchedules] = useState<SavedSchedule[]>([])
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false)

  const [apiSessions, setApiSessions] = useState<SavedSession[]>([])
  const [apiSessionsStatus, setApiSessionsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [activeScheduleId, setActiveScheduleId] = useState<string>('')
  const [dataSource, setDataSource] = useState<'unknown' | 'api' | 'fallback'>('unknown')

  const fallbackSchedules = useMemo(
    () => readEventStoreJSON<SavedSchedule[]>(eventUuid, 'schedule', []),
    [eventUuid]
  )
  const hasFallbackSchedules = fallbackSchedules.length > 0
  const fallbackSessionsMap = useMemo(
    () => readEventStoreJSON<Record<string, SavedSession[]>>(eventUuid, 'sessions', {}),
    [eventUuid]
  )

  // Choose ONE source per page load:
  // - API if it returns data
  // - otherwise localStorage fallback
  // This prevents "correct -> wrong" overrides after refresh.
  const schedules = useMemo(() => {
    if (dataSource === 'api') return apiSchedules
    return fallbackSchedules
  }, [apiSchedules, dataSource, fallbackSchedules])

  // Load schedules from published API
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      // If we already have published schedule data in localStorage, do NOT overwrite it with API.
      // This is the main cause of the "correct -> wrong" flip on refresh.
      if (hasFallbackSchedules) {
        setDataSource('fallback')
        setApiSchedules([])
        setIsLoadingSchedules(false)
        return
      }

      setIsLoadingSchedules(true)
      setDataSource('unknown')
      try {
        const raw = await fetchPublicSchedules(eventUuid)
        const mapped: SavedSchedule[] = (Array.isArray(raw) ? raw : []).map((s: any, idx: number) => {
          const id = String(s.uuid ?? s.id ?? `schedule-${idx}`)
          const name = String(s.name ?? s.title ?? 'Schedule')
          return { id, name, sessions: [] }
        })
        if (!cancelled) {
          setApiSchedules(mapped)
          // If API returns empty, treat as "no public data yet" and keep fallback
          if (mapped.length > 0) {
            setDataSource('api')
          } else {
            setDataSource('fallback')
          }
        }
      } catch {
        if (!cancelled) {
          setApiSchedules([])
          setDataSource('fallback')
        }
      } finally {
        if (!cancelled) setIsLoadingSchedules(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [eventUuid, hasFallbackSchedules])

  // Ensure active schedule is set (and stable across schedule list changes)
  useEffect(() => {
    if (schedules.length === 0) {
      if (activeScheduleId) setActiveScheduleId('')
      return
    }
    if (!activeScheduleId || !schedules.some((s) => s.id === activeScheduleId)) {
      setActiveScheduleId(schedules[0].id)
    }
  }, [activeScheduleId, schedules])

  const activeSchedule = useMemo(() => {
    return schedules.find((s) => s.id === activeScheduleId) || schedules[0] || null
  }, [activeScheduleId, schedules])

  // Local fallback sessions for the currently selected schedule.
  // Used to prevent UI flicker while API sessions are loading.
  const fallbackActiveSchedule = useMemo(() => {
    const byId = fallbackSchedules.find((s) => s.id === activeScheduleId)
    if (byId) return byId
    const byName =
      activeSchedule?.name
        ? fallbackSchedules.find((s) => normalizeTitleKey(s.name) === normalizeTitleKey(activeSchedule.name))
        : undefined
    return byName || fallbackSchedules[0] || null
  }, [activeSchedule?.name, activeScheduleId, fallbackSchedules])

  const fallbackSessionsForActive = useMemo(() => {
    const embedded = (fallbackActiveSchedule?.sessions || []) as SavedSession[]
    const embeddedList = Array.isArray(embedded) ? embedded : []
    if (embeddedList.length) return embeddedList

    // Fallback: Event Hub also persists sessions as a map keyed by schedule id
    const byId =
      (fallbackActiveSchedule?.id && Array.isArray(fallbackSessionsMap[fallbackActiveSchedule.id])
        ? fallbackSessionsMap[fallbackActiveSchedule.id]
        : undefined) ??
      (activeScheduleId && Array.isArray(fallbackSessionsMap[activeScheduleId]) ? fallbackSessionsMap[activeScheduleId] : undefined)

    return Array.isArray(byId) ? byId : []
  }, [activeScheduleId, fallbackActiveSchedule, fallbackSessionsMap])

  // Load sessions for the active schedule from the public API:
  // GET events/{eventUuid}/schedules/{scheduleUuid}/sessions/ (see API_ENDPOINTS.PUBLIC.SESSIONS.LIST)
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (dataSource !== 'api') {
        setApiSessions([])
        setApiSessionsStatus('idle')
        return
      }
      if (!activeSchedule?.id) {
        setApiSessions([])
        setApiSessionsStatus('error')
        return
      }
      setIsLoadingSessions(true)
      setApiSessionsStatus('loading')
      try {
        const raw = await fetchPublicScheduleSessions(eventUuid, activeSchedule.id)
        const mapped: Array<SavedSession & { __parentTitle?: string; __dateKey?: string }> = (Array.isArray(raw) ? raw : []).map((x: any, idx: number) => {
          const id = String(x.uuid ?? x.id ?? `session-${idx}`)
          const title = String(x.title ?? x.name ?? 'Session')
          const startRaw =
            x.start_time ??
            x.startTime ??
            x.start ??
            x.start_at ??
            x.startAt ??
            x.start_datetime ??
            x.startDateTime ??
            x.starts_at ??
            x.startsAt
          const endRaw =
            x.end_time ??
            x.endTime ??
            x.end ??
            x.end_at ??
            x.endAt ??
            x.end_datetime ??
            x.endDateTime ??
            x.ends_at ??
            x.endsAt
          const start = parseTime(startRaw)
          const end = parseTime(endRaw)

          const dateRaw =
            x.date ??
            x.day ??
            x.session_date ??
            x.sessionDate ??
            x.start_date ??
            x.startDate ??
            x.start_datetime ??
            x.startDateTime
          const date = normalizeDate(dateRaw)
          const parentIdRaw = x.parent_uuid ?? x.parentUuid ?? x.parent_id ?? x.parentId ?? null
          const parentTitleRaw =
            x.parent_session ??
            x.parentSession ??
            x.parent_session_title ??
            x.parentSessionTitle ??
            x.parent_title ??
            x.parentTitle ??
            x.parent ??
            null
          const attachmentsArr = Array.isArray(x.attachments) ? x.attachments : []
          const count = Number(x.attachments_count ?? x.attachmentsCount ?? attachmentsArr.length ?? 0)
          const attachments = attachmentsArr.length
            ? attachmentsArr
            : count > 0
              ? new Array(count).fill({}) // for count display only
              : []

          const dateKey = date ? date.toISOString().slice(0, 10) : ''
          const parentTitle =
            typeof parentTitleRaw === 'string'
              ? parentTitleRaw.trim()
              : parentTitleRaw
                ? String(parentTitleRaw).trim()
                : ''

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
            parentId: parentIdRaw ? String(parentIdRaw) : undefined,
            __parentTitle: parentTitle || undefined,
            __dateKey: dateKey || undefined,
          } as any
        })

        // Resolve parentId using "Parent Session" title when backend doesn't provide parentId,
        // to match Event Hub import behavior.
        const toMin = (time: string, period: string) => {
          const [hh, mm] = String(time || '00:00').split(':')
          let h = Number(hh || 0)
          const m = Number(mm || 0)
          const p = String(period || 'AM').toUpperCase()
          // Support both 24-hour (HH can be 13..23) and 12-hour with period.
          if (h >= 13) return h * 60 + m
          if (p === 'PM' && h !== 12) h += 12
          if (p === 'AM' && h === 12) h = 0
          return h * 60 + m
        }

        const isChild = (s: any) => Boolean(s.parentId) || Boolean(s.__parentTitle)

        const parentsByDayTitle = new Map<string, SavedSession[]>()
        mapped.forEach((s: any) => {
          if (isChild(s)) return
          const day = s.__dateKey || ''
          const key = `${day}||${normalizeTitleKey(s.title)}`
          const arr = parentsByDayTitle.get(key) ?? []
          arr.push(s)
          parentsByDayTitle.set(key, arr)
        })
        parentsByDayTitle.forEach((arr) => {
          arr.sort((a, b) => toMin(a.startTime, a.startPeriod || 'AM') - toMin(b.startTime, b.startPeriod || 'AM'))
        })

        const resolveParentByTitle = (child: any): string | undefined => {
          const day = child.__dateKey || ''
          const t = normalizeTitleKey(child.__parentTitle || '')
          if (!day || !t) return undefined
          const candidates = parentsByDayTitle.get(`${day}||${t}`) ?? []
          if (!candidates.length) return undefined
          if (candidates.length === 1) return candidates[0].id

          const cs = toMin(child.startTime, child.startPeriod || 'AM')
          let ce = toMin(child.endTime, child.endPeriod || 'AM')
          if (ce < cs) ce += 24 * 60
          let best: SavedSession | null = null
          let bestStart = -1
          for (const p of candidates) {
            const ps = toMin(p.startTime, p.startPeriod || 'AM')
            let pe = toMin(p.endTime, p.endPeriod || 'AM')
            if (pe < ps) pe += 24 * 60
            if (cs >= ps && ce <= pe && ps > bestStart) {
              best = p
              bestStart = ps
            }
          }
          return best?.id ?? candidates[0].id
        }

        const normalized: SavedSession[] = mapped.map((s: any) => {
          if (!s.parentId && s.__parentTitle) {
            const resolved = resolveParentByTitle(s)
            if (resolved) return { ...(s as any), parentId: resolved }
            // Orphan parent title => treat as parent
            return { ...(s as any), parentId: undefined, __parentTitle: undefined }
          }
          return s
        })

        const sorted = sortSessionsLikeAdmin(normalized)
        if (!cancelled) {
          setApiSessions(sorted)
          setApiSessionsStatus('success')
        }
      } catch {
        if (!cancelled) {
          setApiSessions([])
          setApiSessionsStatus('error')
        }
      } finally {
        if (!cancelled) setIsLoadingSessions(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [activeSchedule?.id, dataSource, eventUuid])

  const sessions = useMemo(() => {
    if (dataSource === 'api') {
      // Keep showing fallback sessions while API is loading (prevents "correct -> wrong" flicker)
      if (apiSessionsStatus === 'success') return apiSessions
      return fallbackSessionsForActive
    }
    // Prefer embedded sessions if present, otherwise use the saved sessions map
    const embedded = (activeSchedule?.sessions || []) as SavedSession[]
    const embeddedList = Array.isArray(embedded) ? embedded : []
    if (embeddedList.length) return embeddedList
    return fallbackSessionsForActive
  }, [activeSchedule, apiSessions, apiSessionsStatus, dataSource, fallbackSessionsForActive])

  const dayKeys = useMemo(() => {
    const set = new Map<number, Date>()
    sessions.forEach((s) => {
      const d = s.date ? new Date(s.date) : null
      if (!d || Number.isNaN(d.getTime())) return
      const key = startOfDayKey(d)
      if (!set.has(key)) set.set(key, d)
    })
    return Array.from(set.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, d]) => d)
  }, [sessions])

  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const activeDayKey = dayKeys[activeDayIndex] ? startOfDayKey(dayKeys[activeDayIndex]) : null

  const selectedGridDate = useMemo(() => {
    const fromTabs = dayKeys[activeDayIndex]
    if (fromTabs) return fromTabs

    // If tabs aren't ready yet (during refresh/load), fall back to the earliest session date
    const dated: Date[] = []
    sessions.forEach((s) => {
      if (!s.date) return
      const d = new Date(s.date)
      if (Number.isNaN(d.getTime())) return
      d.setHours(0, 0, 0, 0)
      dated.push(d)
    })
    dated.sort((a, b) => a.getTime() - b.getTime())
    return dated[0] ?? new Date()
  }, [activeDayIndex, dayKeys, sessions])

  const rangeLabel = useMemo(() => {
    if (dayKeys.length === 0) return ''
    const start = dayKeys[0]
    const end = dayKeys[dayKeys.length - 1]
    return formatRange(start, end)
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

  React.useEffect(() => {
    setActiveDayIndex(0)
  }, [activeScheduleId])

  const toCapital = (input: string) => {
    const raw = String(input || '').trim()
    if (!raw) return ''
    return raw.toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Schedule tabs */}
      <div className="flex flex-wrap items-center gap-6 border-b border-slate-200">
        {schedules.map((s) => {
          const isActive = s.id === (activeSchedule?.id || '')
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveScheduleId(s.id)}
              className={[
                'py-3 text-sm font-semibold transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-slate-600 hover:text-slate-900'
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block border-b-2 -mb-px',
                  isActive ? 'border-primary' : 'border-transparent hover:border-slate-300'
                ].join(' ')}
              >
                {toCapital(s.name || 'Schedule')}
              </span>
            </button>
          )
        })}
      </div>

      {/* Date range header */}
      {rangeLabel ? (
        <div className="text-sm font-semibold text-slate-700">{rangeLabel}</div>
      ) : null}

      {/* Day tabs (optional; shown only if multi-day) */}
      {dayKeys.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          {dayKeys.map((d, idx) => {
            const isActive = idx === activeDayIndex
            const label = `Day ${idx + 1}`
            const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
            return (
              <button
                key={startOfDayKey(d)}
                type="button"
                onClick={() => setActiveDayIndex(idx)}
                className={[
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                ].join(' ')}
              >
                {label} <span className="ml-2 text-xs font-medium opacity-90">{dateLabel}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      {/* Sessions grid (read-only) */}
      {activeSchedule ? (
        sessionsForDay.length ? (
          <div
            className={[
              // Hide admin-only controls inside ScheduleGrid
              "[&_input[type='checkbox']]:hidden",
              '[&_.cursor-move]:hidden',
              "[&_[aria-label='More options']]:hidden",
              "[&_[aria-label='Add parallel session']]:hidden"
            ].join(' ')}
          >
            <ScheduleGrid
              sessions={sessionsForDay}
              selectedDate={selectedGridDate}
              onSessionClick={onNavigate ? (session) => onNavigate(`/events/${eventUuid}/sessions/${session.id}`) : undefined}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="text-base font-semibold text-slate-900">No sessions</div>
            <div className="mt-1 text-sm text-slate-600">
              {isLoadingSchedules || isLoadingSessions ? 'Loading…' : 'This schedule doesn’t have any sessions for the selected day.'}
            </div>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="text-base font-semibold text-slate-900">No schedules yet</div>
          <div className="mt-1 text-sm text-slate-600">
            {isLoadingSchedules ? 'Loading schedules…' : 'Create schedules and sessions in Event Hub to publish them here.'}
          </div>
        </div>
      )}
    </div>
  )
}

export default PublicSchedulePage

