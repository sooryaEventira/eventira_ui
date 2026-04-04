import React, { useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Attachment01, Calendar, User01 } from '@untitled-ui/icons-react'
import type { SavedSession } from '../../eventhub/schedulesession/sessionTypes'

interface PublicScheduleGridProps {
  sessions: SavedSession[]
  onSpeakerClick?: (speakerUuid: string) => void
}

const timeToMinutes = (time: string, period: string) => {
  const [hRaw, mRaw] = String(time || '00:00').split(':')
  let h = Number(hRaw || 0)
  const m = Number(mRaw || 0)
  const p = String(period || 'AM').toUpperCase()
  if (p === 'PM' && h !== 12) h += 12
  if (p === 'AM' && h === 12) h = 0
  return h * 60 + m
}

const formatTime = (time: string, period: string) => {
  // Display 24h time only (no AM/PM)
  const minutes = timeToMinutes(time, period)
  const hh24 = Math.floor(minutes / 60) % 24
  const mm = minutes % 60
  return `${String(hh24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const getLocationLabel = (location: string) => location

type SessionSpeaker = { id: string; name: string; role?: string }

function getSessionSpeakers(session: SavedSession): SessionSpeaker[] {
  const seen = new Set<string>()
  const result: SessionSpeaker[] = []

  const sections = Array.isArray(session.sections) ? session.sections : []
  sections.forEach((sec: any) => {
    const type = String(sec?.type || '').toLowerCase()
    if (type !== 'speaker' && type !== 'speakers') return
    const list = Array.isArray(sec?.data?.speakers) ? (sec.data.speakers as any[]) : []
    list.forEach((sp) => {
      const id = String(sp?.id ?? sp?.speaker_uuid ?? sp?.uuid ?? '').trim()
      const firstName = (sp?.first_name ?? sp?.firstName ?? '').toString().trim()
      const lastName = (sp?.last_name ?? sp?.lastName ?? '').toString().trim()
      const fullName = [firstName, lastName].filter(Boolean).join(' ')
      const explicitName =
        (sp?.name ??
          sp?.full_name ??
          sp?.fullName ??
          sp?.speaker_name ??
          sp?.speakerName ??
          '') as string
      const name = (explicitName || fullName || 'Speaker').toString().trim()
      const rawRole =
        (sp?.role ??
          sp?.role_name ??
          sp?.roleName ??
          sp?.designation ??
          sp?.title ??
          sp?.post ??
          sp?.position ??
          sp?.type ??
          '') as string
      const role = rawRole.toString().trim() || undefined
      if (!id && !name) return
      const key = id || name
      if (seen.has(key)) return
      seen.add(key)
      result.push({ id: id || key, name: name || 'Speaker', role })
    })
  })

  // If section-derived speakers are effectively empty (only default "Speaker"),
  // fall back to speakers attached directly on the session (used by some APIs).
  const hasRealSectionSpeakers = result.some((s) => {
    const name = (s.name || '').trim().toLowerCase()
    const role = (s.role || '').trim().toLowerCase()
    return (name && name !== 'speaker') || (role && role !== 'speaker')
  })

  if (!hasRealSectionSpeakers && Array.isArray((session as any).speakers)) {
    result.length = 0
    seen.clear()
    ;((session as any).speakers as any[]).forEach((sp, index) => {
      const rawId = sp?.uuid ?? sp?.id ?? index
      const firstName = (sp?.first_name ?? sp?.firstName ?? '').toString().trim()
      const lastName = (sp?.last_name ?? sp?.lastName ?? '').toString().trim()
      const fullName = [firstName, lastName].filter(Boolean).join(' ')
      const explicitName =
        (sp?.name ??
          sp?.full_name ??
          sp?.fullName ??
          sp?.speaker_name ??
          sp?.speakerName ??
          '') as string
      const name = (explicitName || fullName || 'Speaker').toString().trim()
      const rawRole =
        (sp?.role ??
          sp?.role_name ??
          sp?.roleName ??
          sp?.designation ??
          sp?.title ??
          sp?.post ??
          sp?.position ??
          sp?.type ??
          '') as string
      const role = rawRole.toString().trim() || undefined
      const id = String(rawId || name || `speaker-${index}`).trim()
      const key = id || name
      if (!key || seen.has(key)) return
      seen.add(key)
      result.push({ id: id || key, name: name || 'Speaker', role })
    })
  }

  return result
}

function renderSpeakers(
  speakers: SessionSpeaker[],
  onSpeakerClick?: (uuid: string) => void
): React.ReactNode {
  if (!speakers.length) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
      <User01 className="h-3 w-3 shrink-0 text-slate-400" />
      {speakers.map((sp, idx) => {
        const role = (sp.role && String(sp.role).trim()) || 'Speaker'
        const name = sp.name || 'Unnamed'
        const isUuid = sp.id && sp.id.includes('-')
        return (
          <span key={sp.id} className="flex items-center gap-1">
            {idx > 0 && <span className="text-slate-300">·</span>}
            <span className="text-slate-500">{role}:</span>
            {onSpeakerClick && isUuid ? (
              <button
                type="button"
                onClick={() => onSpeakerClick(sp.id)}
                className="font-medium text-primary hover:underline focus:outline-none"
              >
                {name}
              </button>
            ) : (
              <span className="font-medium">{name}</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

const PublicScheduleGrid: React.FC<PublicScheduleGridProps> = ({ sessions, onSpeakerClick }) => {
  const parents = useMemo(() => sessions.filter((s) => !s.parentId), [sessions])
  const childrenByParent = useMemo(() => {
    const map = new Map<string, SavedSession[]>()
    sessions.forEach((s) => {
      if (!s.parentId) return
      const arr = map.get(s.parentId) ?? []
      arr.push(s)
      map.set(s.parentId, arr)
    })
    // keep child ordering consistent with existing session sort if possible
    map.forEach((arr) => {
      arr.sort((a, b) => {
        const aStart = timeToMinutes(a.startTime, a.startPeriod || 'AM')
        const bStart = timeToMinutes(b.startTime, b.startPeriod || 'AM')
        if (aStart !== bStart) return aStart - bStart
        return String(a.title).localeCompare(String(b.title))
      })
    })
    return map
  }, [sessions])

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const isExpanded = useCallback((id: string) => expanded[id] !== false, [expanded])
  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] !== false) }))
  }, [])

  const renderChildren = useCallback(
    (parent: SavedSession, depth: number) => {
      const children = childrenByParent.get(parent.id) ?? []
      if (children.length === 0) return null
      if (!isExpanded(parent.id) && depth > 0) return null

      return (
        <div className="mt-2 space-y-2">
          {children.map((child) => {
            const hasMore = (childrenByParent.get(child.id) ?? []).length > 0
            const childExpanded = isExpanded(child.id)
            return (
              <div key={child.id} className="relative">
                {/* guideline */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-300"
                  style={{ left: `${16 + (depth - 1) * 20}px` }}
                />

                <div
                  className="border border-slate-200 rounded-lg bg-white shadow-sm"
                  style={{ marginLeft: `${24 + (depth - 1) * 20}px` }}
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm truncate">{child.title}</div>
                      </div>

                      {hasMore ? (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(child.id)}
                          className="p-1 text-slate-500 hover:text-slate-700 rounded"
                          aria-label={childExpanded ? 'Collapse' : 'Expand'}
                        >
                          {childExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {!child.parentId ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          <Calendar className="h-3 w-3" />
                          {formatTime(child.startTime, child.startPeriod || 'AM')} – {formatTime(child.endTime, child.endPeriod || 'AM')}
                        </span>
                      ) : null}

                      {child.location ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {getLocationLabel(child.location)}
                        </span>
                      ) : null}

                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        child
                      </span>
                    </div>

                    {(() => {
                      const count = typeof child.attachment_count === 'number'
                        ? child.attachment_count
                        : (child.attachments?.length || 0)
                      return count > 0 ? (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium  text-slate-700">
                            <Attachment01 className="h-3 w-3" />
                            {count}
                          </span>
                        </div>
                      ) : null
                    })()}

                    {renderSpeakers(getSessionSpeakers(child), onSpeakerClick)}
                  </div>
                </div>

                {hasMore && childExpanded ? renderChildren(child, depth + 1) : null}
              </div>
            )
          })}
        </div>
      )
    },
    [childrenByParent, isExpanded, onSpeakerClick, toggleExpanded]
  )

  return (
    <div className="space-y-4">
      {parents.map((session) => {
        const kids = childrenByParent.get(session.id) ?? []
        const hasChildren = kids.length > 0
        const open = isExpanded(session.id)

        return (
          <div key={session.id} className="flex items-stretch gap-6">
            {/* Time column */}
            <div className="flex-shrink-0 w-24 self-stretch">
              <div className="h-full border border-slate-200 rounded-lg bg-white shadow-sm flex flex-col justify-between">
                <div className="text-center pt-3 flex-shrink-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatTime(session.startTime, session.startPeriod || 'AM')}
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center min-h-0">
                  <div className="w-px h-full bg-slate-200" />
                </div>
                <div className="text-center pb-3 flex-shrink-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatTime(session.endTime, session.endPeriod || 'AM')}
                  </div>
                </div>
              </div>
            </div>

            {/* Session card */}
            <div className="flex-1">
              <div className="border border-slate-200 rounded-lg bg-white shadow-sm">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-base truncate">{session.title}</div>
                    </div>

                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(session.id)}
                        className="p-1 text-slate-500 hover:text-slate-700 rounded"
                        aria-label={open ? 'Collapse' : 'Expand'}
                      >
                        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      <Calendar className="h-3 w-3" />
                      {formatTime(session.startTime, session.startPeriod || 'AM')} – {formatTime(session.endTime, session.endPeriod || 'AM')}
                    </span>

                    {session.location ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {getLocationLabel(session.location)}
                      </span>
                    ) : null}

                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      parent
                    </span>
                  </div>

                  {(() => {
                    const count = typeof session.attachment_count === 'number'
                      ? session.attachment_count
                      : (session.attachments?.length || 0)
                    return count > 0 ? (
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          <Attachment01 className="h-3 w-3" />
                          {count}
                        </span>
                      </div>
                    ) : null
                  })()}

                  {renderSpeakers(getSessionSpeakers(session), onSpeakerClick)}

                  {hasChildren && open ? renderChildren(session, 1) : null}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PublicScheduleGrid

