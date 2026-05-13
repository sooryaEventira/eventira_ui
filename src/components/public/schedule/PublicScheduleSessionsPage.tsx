import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { FilterLines, SearchLg } from '@untitled-ui/icons-react'
import type { SavedSession } from '../../eventhub/schedulesession/sessionTypes'
import {
  fetchPublicScheduleSessions,
  fetchPublicScheduleTags,
  fetchPublicScheduleLocations,
  mapApiSectionsToSavedSections
} from '../../../services/publicScheduleSessionService'
import { addBookmark, removeBookmark } from '../../../services/bookmarkService'
import { showToast } from '../../../utils/toast'
import PublicScheduleGrid from './PublicScheduleGrid'

interface PublicScheduleSessionsPageProps {
  eventUuid: string
  scheduleUuid: string
  onNavigate: (path: string) => void
  showBookmark?: boolean
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

const ATTENDANCE_OPTIONS = ['All', 'Online', 'In-person', 'Hybrid'] as const

function sessionTypeToAttendance(sessionType: string): string {
  const t = String(sessionType || '').toLowerCase()
  if (t === 'virtual' || t === 'online') return 'Online'
  if (t === 'hybrid') return 'Hybrid'
  return 'In-person'
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
    is_bookmarked: Boolean(x.is_bookmarked ?? x.isBookmarked ?? false),
    __dateKey: date ? date.toISOString().slice(0, 10) : undefined,
    __numericId: x.uuid != null && x.id != null ? x.id : undefined,
  } as any
}


const PublicScheduleSessionsPage: React.FC<PublicScheduleSessionsPageProps> = ({
  eventUuid,
  scheduleUuid,
  onNavigate,
  showBookmark = true,
}) => {
  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [bookmarkedSessionIds, setBookmarkedSessionIds] = useState<Set<string>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')
  const [appliedSearchKeyword, setAppliedSearchKeyword] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterLocations, setFilterLocations] = useState<Set<string>>(new Set(['All']))
  const [filterAttendance, setFilterAttendance] = useState<Set<string>>(new Set(['All']))
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set(['All']))
  const [apiTags, setApiTags] = useState<string[]>([])
  const [apiLocations, setApiLocations] = useState<string[]>([])

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
        const mapped = (Array.isArray(raw) ? raw : []).map(mapRawToSavedSession)

        // Child sessions often lack a date in the API response; inherit from their parent
        // so they pass the day-filter and appear under the correct parent in the grid.
        const idToDate = new Map<string, Date>()
        mapped.forEach((s) => {
          if (!s.date) return
          idToDate.set(s.id, s.date)
          const numId = (s as any).__numericId
          if (numId != null) idToDate.set(String(numId), s.date)
        })
        const withInheritedDates = mapped.map((s) => {
          if (!s.date && s.parentId) {
            const parentDate = idToDate.get(s.parentId)
            if (parentDate) return { ...s, date: parentDate, __dateKey: parentDate.toISOString().slice(0, 10) }
          }
          return s
        })
        setSessions(withInheritedDates)
        const ids = new Set<string>()
        mapped.forEach((s: any) => { if (s.is_bookmarked) ids.add(String(s.id)) })
        setBookmarkedSessionIds(ids)
      })
      .catch(() => { if (!cancelled) setSessions([]) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [eventUuid, scheduleUuid])

  // If user clears search text, immediately reset applied query to show all sessions.
  useEffect(() => {
    if (searchKeyword.trim() === '' && appliedSearchKeyword !== '') {
      setAppliedSearchKeyword('')
    }
  }, [searchKeyword, appliedSearchKeyword])

  useEffect(() => {
    if (!eventUuid || !scheduleUuid) return
    let cancelled = false
    Promise.all([
      fetchPublicScheduleTags(eventUuid, scheduleUuid),
      fetchPublicScheduleLocations(eventUuid, scheduleUuid),
    ])
      .then(([tags, locations]) => {
        if (cancelled) return
        const tagNames = tags
          .map((t) => String(t?.name ?? '').trim())
          .filter(Boolean)
        const locationNames = locations
          .map((loc) => String(loc?.name ?? loc?.location ?? '').trim())
          .filter(Boolean)
        setApiTags(Array.from(new Set(tagNames)))
        setApiLocations(Array.from(new Set(locationNames)))
      })
      .catch(() => {
        if (cancelled) return
        setApiTags([])
        setApiLocations([])
      })
    return () => { cancelled = true }
  }, [eventUuid, scheduleUuid])

  const startOfDayKey = useCallback((d: Date) => {
    const dt = new Date(d); dt.setHours(0, 0, 0, 0); return dt.getTime()
  }, [])

  const dayKeys = useMemo(() => {
    const map = new Map<number, Date>()
    sessions.forEach((s) => {
      const d = s.date ? new Date(s.date) : null
      if (!d || Number.isNaN(d.getTime())) return
      const key = startOfDayKey(d)
      if (!map.has(key)) map.set(key, d)
    })
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([, d]) => d)
  }, [sessions, startOfDayKey])

  const [activeDayIndex, setActiveDayIndex] = useState(0)
  useEffect(() => { setActiveDayIndex(0) }, [scheduleUuid])

  const rangeLabel = useMemo(() => {
    if (dayKeys.length === 0) return ''
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
    const start = dayKeys[0], end = dayKeys[dayKeys.length - 1]
    if (startOfDayKey(start) === startOfDayKey(end)) {
      return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(start)
    }
    if (start.getFullYear() === end.getFullYear()) {
      if (start.getMonth() === end.getMonth())
        return `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(start)} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
      return `${fmt.format(start)} – ${fmt.format(end)}, ${start.getFullYear()}`
    }
    return `${fmt.format(start)}, ${start.getFullYear()} – ${fmt.format(end)}, ${end.getFullYear()}`
  }, [dayKeys, startOfDayKey])

  const sessionsForDay = useMemo(() => {
    if (dayKeys.length === 0) return sessions
    const activeKey = startOfDayKey(dayKeys[activeDayIndex] ?? dayKeys[0])

    // Collect parent session IDs (uuid and numeric) that belong to the active day
    const parentIdsInDay = new Set<string>()
    sessions.forEach((s) => {
      if (s.parentId) return
      if (!s.date) return
      const d = new Date(s.date)
      if (!Number.isNaN(d.getTime()) && startOfDayKey(d) === activeKey) {
        parentIdsInDay.add(s.id)
        const numId = (s as any).__numericId
        if (numId != null) parentIdsInDay.add(String(numId))
      }
    })

    return sessions.filter((s) => {
      // Always include child sessions whose parent is on this day
      if (s.parentId) return parentIdsInDay.has(s.parentId)
      if (!s.date) return false
      const d = new Date(s.date)
      return !Number.isNaN(d.getTime()) && startOfDayKey(d) === activeKey
    })
  }, [sessions, dayKeys, activeDayIndex, startOfDayKey])

  const filterLocationOptions = useMemo(() => {
    const fallback = Array.from(
      new Set(
        sessionsForDay
          .map((s) => String(s.location ?? '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
    const base = apiLocations.length > 0 ? apiLocations : fallback
    return ['All', ...base]
  }, [sessionsForDay, apiLocations])

  const filterTagOptions = useMemo(() => {
    const fallbackSet = new Set<string>()
    sessionsForDay.forEach((s) => {
      const tags = Array.isArray(s.tags) ? s.tags : []
      tags.forEach((tag: any) => {
        const value = String(tag?.name ?? tag ?? '').trim()
        if (value) fallbackSet.add(value)
      })
    })
    const fallback = Array.from(fallbackSet).sort((a, b) => a.localeCompare(b))
    const base = apiTags.length > 0 ? apiTags : fallback
    return ['All', ...base]
  }, [sessionsForDay, apiTags])

  const filteredSessions = useMemo(() => {
    const keyword = appliedSearchKeyword.trim().toLowerCase()
    const useLocationFilter = !filterLocations.has('All') && filterLocations.size > 0
    const useAttendanceFilter = !filterAttendance.has('All') && filterAttendance.size > 0
    const useTagFilter = !filterTags.has('All') && filterTags.size > 0

    return sessionsForDay.filter((s) => {
      if (keyword) {
        const title = String(s.title ?? '').toLowerCase()
        const location = String(s.location ?? '').toLowerCase()
        const tags = (Array.isArray(s.tags) ? s.tags : [])
          .map((t: any) => String(t?.name ?? t ?? '').toLowerCase())
          .join(' ')
        if (!title.includes(keyword) && !location.includes(keyword) && !tags.includes(keyword)) return false
      }

      if (useLocationFilter) {
        const loc = String(s.location ?? '').trim()
        if (!loc || !filterLocations.has(loc)) return false
      }

      if (useAttendanceFilter) {
        const att = sessionTypeToAttendance(String(s.sessionType ?? ''))
        if (!filterAttendance.has(att)) return false
      }

      if (useTagFilter) {
        const tags = Array.isArray(s.tags) ? s.tags : []
        const hasTag = tags.some((tag: any) => {
          const value = String(tag?.name ?? tag ?? '').trim()
          return value && filterTags.has(value)
        })
        if (!hasTag) return false
      }
      return true
    })
  }, [sessionsForDay, appliedSearchKeyword, filterLocations, filterAttendance, filterTags])

  const toggleFilterValue = (
    value: string,
    current: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    setter(() => {
      const next = new Set(current)
      if (value === 'All') return new Set(['All'])
      next.delete('All')
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next.size === 0 ? new Set(['All']) : next
    })
  }

  const handleSpeakerClick = (speakerUuid: string) => {
    onNavigate(`/events/${eventUuid}/attendees/${speakerUuid}`)
  }

  const handleSessionClick = (sessionId: string) => {
    const from = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
    onNavigate(`/events/${eventUuid}/sessions/${sessionId}?from=${from}`)
  }

  const handleBookmarkToggle = async (session: SavedSession) => {
    const sessionId = String(session.id)
    if (!sessionId || !eventUuid) return
    const alreadyBookmarked = bookmarkedSessionIds.has(sessionId)

    // Optimistic update for snappy UI
    setBookmarkedSessionIds((prev) => {
      const next = new Set(prev)
      if (alreadyBookmarked) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })

    try {
      if (alreadyBookmarked) await removeBookmark(eventUuid, sessionId)
      else await addBookmark(eventUuid, sessionId)
      showToast.success(alreadyBookmarked ? 'Bookmark removed' : 'Session bookmarked')
    } catch {
      // Revert optimistic update if API fails
      setBookmarkedSessionIds((prev) => {
        const next = new Set(prev)
        if (alreadyBookmarked) next.add(sessionId)
        else next.delete(sessionId)
        return next
      })
      showToast.error(alreadyBookmarked ? 'Failed to remove bookmark' : 'Failed to bookmark session')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">{scheduleTitle ?? 'Sessions'}</h1>

      {rangeLabel && (
        <div className="text-sm font-semibold text-slate-700">{rangeLabel}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {dayKeys.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            {dayKeys.map((d, idx) => {
              const isActive = idx === activeDayIndex
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
                  Day {idx + 1} <span className="ml-2 text-xs font-medium opacity-90">{dateLabel}</span>
                </button>
              )
            })}
          </div>
        ) : <div />}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-10 items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search schedule"
              className="h-full w-52 bg-transparent px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setAppliedSearchKeyword(searchKeyword.trim())}
              className="flex h-full items-center justify-center bg-primary px-3 text-white transition hover:bg-primary/90"
              aria-label="Search sessions"
            >
              <SearchLg className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary"
              aria-label="Filter sessions"
              aria-expanded={filterOpen}
            >
              <FilterLines className="h-4 w-4" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-30 mt-2 max-h-[420px] w-[260px] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 shrink-0">
                  <h3 className="text-sm font-semibold text-slate-900">Filter</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">Location</p>
                    <div className="space-y-2">
                      {filterLocationOptions.map((loc) => (
                        <label key={loc} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={filterLocations.has(loc)}
                            onChange={() => toggleFilterValue(loc, filterLocations, setFilterLocations)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                          />
                          <span>{loc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">Attendance type</p>
                    <div className="space-y-2">
                      {ATTENDANCE_OPTIONS.map((att) => (
                        <label key={att} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={filterAttendance.has(att)}
                            onChange={() => toggleFilterValue(att, filterAttendance, setFilterAttendance)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                          />
                          <span>{att}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {filterTagOptions.length > 1 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700">Tags</p>
                      <div className="space-y-2">
                        {filterTagOptions.map((tag) => (
                          <label key={tag} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={filterTags.has(tag)}
                              onChange={() => toggleFilterValue(tag, filterTags, setFilterTags)}
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                            />
                            <span>{tag}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterLocations(new Set(['All']))
                      setFilterAttendance(new Set(['All']))
                      setFilterTags(new Set(['All']))
                      setSearchKeyword('')
                      setAppliedSearchKeyword('')
                      setFilterOpen(false)
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedSearchKeyword(searchKeyword.trim())
                      setFilterOpen(false)
                    }}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 h-20" />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="text-base font-semibold text-slate-900">No sessions found</div>
          <div className="mt-1 text-sm text-slate-500">No sessions match the current search or filters.</div>
        </div>
      ) : (
        <PublicScheduleGrid
          sessions={filteredSessions}
          onSpeakerClick={handleSpeakerClick}
          onSessionClick={handleSessionClick}
          showBookmark={showBookmark}
          bookmarkedSessionIds={bookmarkedSessionIds}
          onToggleBookmark={handleBookmarkToggle}
        />
      )}
    </div>
  )
}

export default PublicScheduleSessionsPage
