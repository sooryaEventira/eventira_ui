import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { readEventStoreJSON } from '../../../utils/eventLocalStore'
import type { SavedSchedule, SavedSession } from '../../eventhub/schedulesession/sessionTypes'
import ScheduleGrid from '../../eventhub/schedulesession/ScheduleGrid'
import { fetchPublicSchedules } from '../../../services/publicScheduleService'
import { fetchPublicScheduleSessions, mapApiSectionsToSavedSections } from '../../../services/publicScheduleSessionService'
import { addBookmark, removeBookmark } from '../../../services/bookmarkService'
import toast from 'react-hot-toast'
import { SearchLg, FilterLines, Download01 } from '@untitled-ui/icons-react'

const ATTENDANCE_OPTIONS = ['All', 'Online', 'In-Person', 'Hybrid']

function sessionTypeToAttendance(sessionType: string): string {
  const t = String(sessionType || '').toLowerCase()
  if (t === 'virtual' || t === 'online') return 'Online'
  if (t === 'hybrid') return 'Hybrid'
  return 'In-Person'
}

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
  const [bookmarkedSessionIds, setBookmarkedSessionIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`bookmarks_${eventUuid}`)
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set()
    } catch {
      return new Set()
    }
  })

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
            x.startDateTime ??
            x.start_at ??
            x.startAt ??
            x.starts_at ??
            x.startsAt
          const date = normalizeDate(dateRaw)
          const parentIdRaw =
            x.parent_session_uuid ??
            x.parent_uuid ??
            x.parentUuid ??
            x.parent_id ??
            x.parentId ??
            null
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
          const count = Number(x.attachment_count ?? x.attachments_count ?? x.attachmentsCount ?? attachmentsArr.length ?? 0)
          const attachments = attachmentsArr.length
            ? attachmentsArr
            : count > 0
              ? new Array(count).fill({}) // for count display only
              : []

          const description = x.description ?? x.summary ?? ''
          const apiSections = Array.isArray(x.sections)
            ? x.sections
            : Array.isArray(x.session_sections)
              ? x.session_sections
              : []
          const apiResources = Array.isArray(x.session_resources)
            ? x.session_resources
            : Array.isArray(x.resources)
              ? x.resources
              : Array.isArray(x.resource_files)
                ? x.resource_files
                : []
          const sections = mapApiSectionsToSavedSections(apiSections, apiResources, id, description)

          // Extract speakers from mixed structure (some items are sections, some are direct speakers)
          const rawSpeakers = Array.isArray(x.speakers)
            ? x.speakers
            : Array.isArray(x.session_speakers)
              ? x.session_speakers
              : []

          const speakersArr: any[] = []
          rawSpeakers.forEach((item: any) => {
            // If item has content.speakers, it's a section container - extract speakers from it
            if (item?.content?.speakers && Array.isArray(item.content.speakers)) {
              speakersArr.push(...item.content.speakers)
            }
            // If item has name/role directly, it's a direct speaker object
            else if (item?.name || item?.first_name || item?.last_name) {
              speakersArr.push(item)
            }
          })

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
            sections,
            attachments,
            attachment_count: count,
            speakers: speakersArr,
            date: date ?? undefined,
            parentId: parentIdRaw ? String(parentIdRaw) : undefined,
            __parentTitle: parentTitle || undefined,
            __dateKey: dateKey || undefined,
            __numericId: x.uuid != null && x.id != null ? x.id : undefined,
          } as any
        })

        // Resolve parentId when backend sends numeric parent_id but session id is uuid (so grid can nest children).
        const allSessionIds = new Set(mapped.map((s: any) => s.id))
        const numericIdToSessionId = new Map<number, string>()
        mapped.forEach((s: any) => {
          const n = s.__numericId
          if (n != null && n !== '') numericIdToSessionId.set(Number(n), s.id)
        })
        const withResolvedParentId = mapped.map((s: any) => {
          let parentId = s.parentId
          if (parentId && !allSessionIds.has(parentId)) {
            const resolved = numericIdToSessionId.get(Number(parentId))
            if (resolved) parentId = resolved
          }
          return { ...s, parentId }
        })

        // Child sessions can come without `date` in API response.
        // Inherit date from parent so day-filtering keeps them visible in the public grid.
        const idToDate = new Map<string, Date>()
        withResolvedParentId.forEach((s: any) => {
          if (!s.date) return
          const d = new Date(s.date)
          if (Number.isNaN(d.getTime())) return
          idToDate.set(s.id, d)
          const numId = s.__numericId
          if (numId != null && numId !== '') idToDate.set(String(numId), d)
        })
        const withInheritedDates = withResolvedParentId.map((s: any) => {
          if (!s.date && s.parentId) {
            const parentDate = idToDate.get(String(s.parentId))
            if (parentDate) {
              return {
                ...s,
                date: parentDate,
                __dateKey: parentDate.toISOString().slice(0, 10),
              }
            }
          }
          return s
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
        withInheritedDates.forEach((s: any) => {
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

        const normalized: SavedSession[] = withInheritedDates.map((s: any) => {
          let out: any = s
          if (!s.parentId && s.__parentTitle) {
            const resolved = resolveParentByTitle(s)
            if (resolved) out = { ...s, parentId: resolved }
            else out = { ...s, parentId: undefined, __parentTitle: undefined }
          }
          const { __parentTitle, __dateKey, __numericId, ...rest } = out
          return rest as SavedSession
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

  const handleBookmark = async (session: SavedSession) => {
    const isAuthenticated = Boolean(localStorage.getItem('pub_accessToken'))
    if (!isAuthenticated) {
      toast.error('Please login to save session')
      return
    }
    const sessionId = String(session.id)
    const alreadyBookmarked = bookmarkedSessionIds.has(sessionId)
    // Optimistic update
    setBookmarkedSessionIds((prev) => {
      const next = new Set(prev)
      if (alreadyBookmarked) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
    try {
      if (alreadyBookmarked) {
        await removeBookmark(eventUuid, sessionId)
      } else {
        await addBookmark(eventUuid, sessionId)
      }
    } catch {
      // Revert on failure
      setBookmarkedSessionIds((prev) => {
        const next = new Set(prev)
        if (alreadyBookmarked) next.add(sessionId)
        else next.delete(sessionId)
        return next
      })
    }
  }

  useEffect(() => {
    localStorage.setItem(`bookmarks_${eventUuid}`, JSON.stringify(Array.from(bookmarkedSessionIds)))
  }, [bookmarkedSessionIds, eventUuid])

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

  React.useEffect(() => {
    setActiveDayIndex(0)
  }, [activeScheduleId])

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterLocations, setFilterLocations] = useState<Set<string>>(new Set())
  const [filterAttendance, setFilterAttendance] = useState<Set<string>>(new Set())
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set())
  const [filterPanelPosition, setFilterPanelPosition] = useState<{ top: number; left: number } | null>(null)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const filterPanelRef = useRef<HTMLDivElement>(null)

  const locationOptions = useMemo(() => {
    const set = new Set<string>()
    sessions.forEach((s: any) => {
      const loc = s?.location ?? s?.venue
      if (loc && String(loc).trim()) set.add(String(loc).trim())
    })
    return ['All', ...Array.from(set).sort()]
  }, [sessions])

  const tagOptions = useMemo(() => {
    const set = new Set<string>()
    sessions.forEach((s: any) => {
      const tags = Array.isArray(s?.tags) ? s.tags : []
      tags.forEach((tag: any) => {
        const name = String(tag?.name ?? tag ?? '').trim()
        if (name) set.add(name)
      })
    })
    return ['All', ...Array.from(set).sort()]
  }, [sessions])

  const appliedLocations = filterLocations.size === 0 || filterLocations.has('All') ? null : filterLocations
  const appliedAttendance = filterAttendance.size === 0 || filterAttendance.has('All') ? null : filterAttendance
  const appliedTags = filterTags.size === 0 || filterTags.has('All') ? null : filterTags
  const appliedKeyword = searchQuery.trim().toLowerCase()

  const filteredSessionsForDay = useMemo(() => {
    let list = sessionsForDay
    if (appliedKeyword) {
      list = list.filter((s) => {
        const title = String(s.title ?? '').toLowerCase()
        const desc = String((s as any).description ?? '').toLowerCase()
        const loc = String(s.location ?? '').toLowerCase()
        const speakers = (Array.isArray((s as any).speakers) ? (s as any).speakers : [])
          .map((sp: any) => [sp?.firstName, sp?.lastName, sp?.name].filter(Boolean).join(' ').toLowerCase())
          .join(' ')
        return title.includes(appliedKeyword) || desc.includes(appliedKeyword) || loc.includes(appliedKeyword) || speakers.includes(appliedKeyword)
      })
    }
    if (appliedLocations) {
      list = list.filter((s) => {
        const loc = String(s.location ?? '').trim()
        return loc && appliedLocations.has(loc)
      })
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

  const nonConflictSessionsForGrid = useMemo(() => {
    if (!filteredSessionsForDay.length) return filteredSessionsForDay

    const sessionsById = new Map<string, SavedSession>()
    const childrenByParent = new Map<string, SavedSession[]>()
    filteredSessionsForDay.forEach((session) => {
      const id = String(session.id)
      sessionsById.set(id, session)
      if (!session.parentId) return
      const parentId = String(session.parentId)
      const children = childrenByParent.get(parentId) ?? []
      children.push(session)
      childrenByParent.set(parentId, children)
    })

    // Consider only explicit top-level sessions for conflict detection.
    // Child sessions (with parentId) should not create/remove conflicts in public grid.
    const parentSessions = filteredSessionsForDay.filter((session) => !session.parentId)

    const slotGroups = new Map<string, SavedSession[]>()
    parentSessions.forEach((session) => {
      const slotKey = `${session.startTime}|${session.startPeriod || 'AM'}|${session.endTime}|${session.endPeriod || 'PM'}`
      const grouped = slotGroups.get(slotKey) ?? []
      grouped.push(session)
      slotGroups.set(slotKey, grouped)
    })

    const excludedIds = new Set<string>()
    const collectDescendants = (parentId: string) => {
      const children = childrenByParent.get(parentId) ?? []
      children.forEach((child) => {
        const childId = String(child.id)
        if (excludedIds.has(childId)) return
        excludedIds.add(childId)
        collectDescendants(childId)
      })
    }

    slotGroups.forEach((grouped) => {
      if (grouped.length <= 1) return
      grouped.forEach((session) => {
        const sessionId = String(session.id)
        excludedIds.add(sessionId)
        collectDescendants(sessionId)
      })
    })

    if (!excludedIds.size) return filteredSessionsForDay
    return filteredSessionsForDay.filter((session) => !excludedIds.has(String(session.id)))
  }, [filteredSessionsForDay])

  // Position filter panel below trigger
  useEffect(() => {
    if (!filterOpen || !filterTriggerRef.current) return
    const rect = filterTriggerRef.current.getBoundingClientRect()
    setFilterPanelPosition({ top: rect.bottom + 8, left: rect.right - 250 })
  }, [filterOpen])

  // Close filter on outside click
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

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter((prev) => {
      const next = new Set(prev)
      if (value === 'All') { next.clear(); next.add('All'); return next }
      next.delete('All')
      if (next.has(value)) next.delete(value)
      else next.add(value)
      if (next.size === 0) next.add('All')
      return next
    })
  }

  const handleFilterClearAll = () => {
    setFilterLocations(new Set())
    setFilterAttendance(new Set())
    setFilterTags(new Set())
    setFilterOpen(false)
  }

  const handleDownload = () => {
    const lines = ['Title,Start,End,Location,Attendance,Speakers']
    filteredSessionsForDay.forEach((s) => {
      const speakers = (Array.isArray((s as any).speakers) ? (s as any).speakers : [])
        .map((sp: any) => [sp?.firstName, sp?.lastName, sp?.name].filter(Boolean).join(' '))
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
    a.download = 'schedule.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

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

      {/* Search / Filter / Download toolbar */}
      {activeSchedule && sessionsForDay.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          {/* Search bar */}
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schedule"
              className="w-48 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              className="flex h-full items-center bg-primary px-3 py-2 text-white hover:bg-primary/90 transition-colors"
              aria-label="Search"
            >
              <SearchLg className="h-4 w-4" />
            </button>
          </div>

          {/* Filter button */}
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
                <div className="shrink-0 flex gap-2 border-t border-slate-100 px-4 py-3">
                  <button
                    type="button"
                    onClick={handleFilterClearAll}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm text-slate-600 hover:border-primary/40 hover:text-primary transition-colors"
            aria-label="Download schedule"
          >
            <Download01 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sessions grid (read-only) */}
      {activeSchedule ? (
        filteredSessionsForDay.length ? (
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
              sessions={filteredSessionsForDay}
              selectedDate={selectedGridDate}
              showBookmark
              bookmarkedSessionIds={bookmarkedSessionIds}
              onBookmark={handleBookmark}
              onSessionClick={onNavigate ? (session) => onNavigate(`/events/${eventUuid}/sessions/${session.id}`) : undefined}
              eventUuid={eventUuid}
              onNavigate={onNavigate}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="text-base font-semibold text-slate-900">No sessions</div>
            <div className="mt-1 text-sm text-slate-600">
              {isLoadingSchedules || isLoadingSessions ? 'Loading…' : 'This schedule doesn’t have any non-conflicting sessions for the selected day.'}
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

