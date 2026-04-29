import React, { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, Attachment01, Calendar, User01, AlertCircle, XClose, Bookmark } from '@untitled-ui/icons-react'
import type { SavedSession } from '../../eventhub/schedulesession/sessionTypes'

interface PublicScheduleGridProps {
  sessions: SavedSession[]
  onSpeakerClick?: (speakerUuid: string) => void
  onSessionClick?: (sessionId: string) => void
  showConflicts?: boolean
  showBookmark?: boolean
  bookmarkedSessionIds?: Set<string>
  onToggleBookmark?: (session: SavedSession) => void
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
  const minutes = timeToMinutes(time, period)
  const hh24 = Math.floor(minutes / 60) % 24
  const mm = minutes % 60
  return `${String(hh24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const getLocationLabel = (location: string) => location

const timeSlotKey = (s: SavedSession) =>
  `${timeToMinutes(s.startTime, s.startPeriod || 'AM')}_${timeToMinutes(s.endTime, s.endPeriod || 'AM')}`

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
      const explicitName = (sp?.name ?? sp?.full_name ?? sp?.fullName ?? sp?.speaker_name ?? sp?.speakerName ?? '') as string
      const name = (explicitName || fullName || 'Speaker').toString().trim()
      const rawRole = (sp?.role ?? sp?.role_name ?? sp?.roleName ?? sp?.designation ?? sp?.title ?? sp?.post ?? sp?.position ?? sp?.type ?? '') as string
      const role = rawRole.toString().trim() || undefined
      if (!id && !name) return
      const key = id || name
      if (seen.has(key)) return
      seen.add(key)
      result.push({ id: id || key, name: name || 'Speaker', role })
    })
  })

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
      const explicitName = (sp?.name ?? sp?.full_name ?? sp?.fullName ?? sp?.speaker_name ?? sp?.speakerName ?? '') as string
      const name = (explicitName || fullName || 'Speaker').toString().trim()
      const rawRole = (sp?.role ?? sp?.role_name ?? sp?.roleName ?? sp?.designation ?? sp?.title ?? sp?.post ?? sp?.position ?? sp?.type ?? '') as string
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

function renderSpeakers(speakers: SessionSpeaker[], onSpeakerClick?: (uuid: string) => void): React.ReactNode {
  if (!speakers.length) return null
  const grouped = speakers.reduce<Record<string, SessionSpeaker[]>>((acc, sp) => {
    const role = (sp.role && String(sp.role).trim()) || 'Speaker'
    ;(acc[role] ??= []).push(sp)
    return acc
  }, {})
  const roleEntries = Object.entries(grouped)
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
      <User01 className="h-3 w-3 shrink-0 text-slate-400" />
      {roleEntries.map(([role, group], idx) => (
        <span key={role} className="flex items-center gap-1">
          {idx > 0 && <span className="text-slate-300">·</span>}
          <span className="text-slate-500">{role}:</span>
          {group.map((sp, i) => {
            const name = sp.name || 'Unnamed'
            const isUuid = sp.id && sp.id.includes('-')
            return (
              <React.Fragment key={sp.id}>
                {i > 0 && <span className="text-slate-400">,</span>}
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
              </React.Fragment>
            )
          })}
        </span>
      ))}
    </div>
  )
}

interface SessionCardProps {
  session: SavedSession
  children?: React.ReactNode
  onSpeakerClick?: (uuid: string) => void
  onSessionClick?: (sessionId: string) => void
  hasChildren: boolean
  childrenCount?: number
  open: boolean
  onToggle: () => void
  showBookmark?: boolean
  bookmarkedSessionIds?: Set<string>
  onToggleBookmark?: (session: SavedSession) => void
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  children,
  onSpeakerClick,
  onSessionClick,
  hasChildren,
  childrenCount = 0,
  open,
  onToggle,
  showBookmark = false,
  bookmarkedSessionIds,
  onToggleBookmark,
}) => {
  const attachmentCount = typeof session.attachment_count === 'number'
    ? session.attachment_count
    : (session.attachments?.length || 0)

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {onSessionClick ? (
              <button
                type="button"
                onClick={() => onSessionClick(session.id)}
                className="font-semibold text-slate-900 text-base truncate text-left hover:text-primary hover:underline transition-colors"
              >
                {session.title}
              </button>
            ) : (
              <div className="font-semibold text-slate-900 text-base truncate">{session.title}</div>
            )}
          </div>
          {showBookmark ? (
            <button
              type="button"
              className={[
                'p-1 transition-colors flex-shrink-0',
                bookmarkedSessionIds?.has(String(session.id))
                  ? 'text-primary'
                  : 'text-slate-400 hover:text-primary'
              ].join(' ')}
              aria-label={bookmarkedSessionIds?.has(String(session.id)) ? 'Remove bookmark' : 'Bookmark session'}
              onClick={(e) => {
                e.stopPropagation()
                onToggleBookmark?.(session)
              }}
            >
              <Bookmark
                className="h-4 w-4"
                fill={bookmarkedSessionIds?.has(String(session.id)) ? 'currentColor' : 'none'}
              />
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

          {Array.isArray(session.tags) && session.tags.map((tag: any) => {
            const label = String(tag?.name ?? tag ?? '').trim()
            return label ? (
              <span key={label} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                {label}
              </span>
            ) : null
          })}

          {attachmentCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              <Attachment01 className="h-3 w-3" />
              {attachmentCount}
            </span>
          ) : null}
        </div>

        {renderSpeakers(getSessionSpeakers(session), onSpeakerClick)}

        {hasChildren ? (
          <button
            type="button"
            onClick={onToggle}
            className="mt-3 inline-flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span>{childrenCount} sub-session{childrenCount !== 1 ? 's' : ''}</span>
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        ) : null}

        {hasChildren && open ? children : null}
      </div>
    </div>
  )
}

const formatTime12h = (time: string, period: string) => {
  const minutes = timeToMinutes(time, period)
  const h24 = Math.floor(minutes / 60) % 24
  const mm = minutes % 60
  const p = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${p}`
}

interface ResolveModalProps {
  groups: SavedSession[][]
  selected: Record<string, string>
  onSelect: (slotKey: string, sessionId: string) => void
  onConfirm: () => void
  onClose: () => void
}

const ResolveModal: React.FC<ResolveModalProps> = ({ groups, selected, onSelect, onConfirm, onClose }) => {
  const isAll = groups.length > 1
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Resolve conflicts</h2>
            <p className="mt-0.5 text-sm text-slate-500">Choose one session to attend for each time slot</p>
          </div>
          <button type="button" onClick={onClose} className="ml-4 shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <XClose className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-6">
          {groups.map((group) => {
            const rep = group[0]
            const slotKey = timeSlotKey(rep)
            const timeLabel = `${formatTime12h(rep.startTime, rep.startPeriod || 'AM')} - ${formatTime12h(rep.endTime, rep.endPeriod || 'AM')}`
            return (
              <div key={slotKey}>
                <p className="mb-3 text-sm font-semibold text-slate-500">{timeLabel}</p>
                <div className="space-y-2">
                  {group.map((session) => {
                    const isSelected = selected[slotKey] === session.id
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => onSelect(slotKey, session.id)}
                        className={[
                          'w-full rounded-xl border-2 px-4 py-3 text-left transition-colors',
                          isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:border-slate-300'
                        ].join(' ')}
                      >
                        <div className="font-semibold text-slate-900 text-sm">{session.title}</div>
                        {session.location ? (
                          <div className="mt-0.5 text-xs text-slate-500">{session.location}</div>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {isAll ? 'Confirm all' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const PublicScheduleGrid: React.FC<PublicScheduleGridProps> = ({
  sessions,
  onSpeakerClick,
  onSessionClick,
  showConflicts = false,
  showBookmark = false,
  bookmarkedSessionIds,
  onToggleBookmark,
}) => {
  // Keep API hierarchy as-is. Do not infer synthetic parent-child links from time ranges.
  const effectiveParentById = useMemo(() => {
    const map = new Map<string, string | undefined>()
    sessions.forEach((s) => map.set(String(s.id), s.parentId ? String(s.parentId) : undefined))
    return map
  }, [sessions])

  const parents = useMemo(
    () => sessions.filter((s) => !effectiveParentById.get(String(s.id))),
    [sessions, effectiveParentById]
  )

  const childrenByParent = useMemo(() => {
    // Build a lookup from any form of ID (uuid string OR numeric string) → canonical session id
    // This handles the case where the API returns parent_id as a numeric DB id but the
    // parent session's id was resolved to its UUID.
    const idToCanonical = new Map<string, string>()
    sessions.forEach((s) => {
      idToCanonical.set(s.id, s.id)
      const numId = (s as any).__numericId
      if (numId != null) idToCanonical.set(String(numId), s.id)
    })

    const map = new Map<string, SavedSession[]>()
    sessions.forEach((s) => {
      const effectiveParentId = effectiveParentById.get(String(s.id))
      if (!effectiveParentId) return
      const canonicalParentId = idToCanonical.get(effectiveParentId) ?? effectiveParentId
      const arr = map.get(canonicalParentId) ?? []
      arr.push(s)
      map.set(canonicalParentId, arr)
    })
    map.forEach((arr) => {
      arr.sort((a, b) => {
        const aStart = timeToMinutes(a.startTime, a.startPeriod || 'AM')
        const bStart = timeToMinutes(b.startTime, b.startPeriod || 'AM')
        if (aStart !== bStart) return aStart - bStart
        return String(a.title).localeCompare(String(b.title))
      })
    })
    return map
  }, [sessions, effectiveParentById])

  // Group parent sessions:
  // - default: exact same slot only
  // - conflict mode: any overlapping window belongs to the same parallel group
  const groups = useMemo(() => {
    const normalizeWindow = (s: SavedSession) => {
      const start = timeToMinutes(s.startTime, s.startPeriod || 'AM')
      let end = timeToMinutes(s.endTime, s.endPeriod || 'AM')
      if (end < start) end += 24 * 60
      return { start, end }
    }

    const orderGroupSessions = (arr: SavedSession[]) =>
      [...arr].sort((a, b) => {
        const wa = normalizeWindow(a)
        const wb = normalizeWindow(b)
        if (wa.start !== wb.start) return wa.start - wb.start
        if (wa.end !== wb.end) return wb.end - wa.end // longer first when same start
        return String(a.title ?? '').localeCompare(String(b.title ?? ''))
      })

    if (!showConflicts) {
      const map = new Map<string, SavedSession[]>()
      parents.forEach((s) => {
        const key = timeSlotKey(s)
        const arr = map.get(key) ?? []
        arr.push(s)
        map.set(key, arr)
      })
      return Array.from(map.entries())
        .sort(([keyA], [keyB]) => Number(keyA.split('_')[0]) - Number(keyB.split('_')[0]))
        .map(([, group]) => orderGroupSessions(group))
    }

    const sorted = orderGroupSessions(parents)
    type Cluster = { start: number; end: number; sessions: SavedSession[] }
    const clusters: Cluster[] = []
    sorted.forEach((s) => {
      const { start, end } = normalizeWindow(s)
      const cluster = clusters.find((c) => start <= c.end && end >= c.start)
      if (!cluster) {
        clusters.push({ start, end, sessions: [s] })
        return
      }
      cluster.sessions.push(s)
      cluster.start = Math.min(cluster.start, start)
      cluster.end = Math.max(cluster.end, end)
    })
    return clusters
      .sort((a, b) => a.start - b.start)
      .map((c) => orderGroupSessions(c.sessions))
  }, [parents, showConflicts])

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const isExpanded = useCallback((id: string) => expanded[id] === true, [expanded])
  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] === true) }))
  }, [])

  // Resolve modal state (only used when showConflicts=true)
  const [modalGroups, setModalGroups] = useState<SavedSession[][] | null>(null)
  const [modalSelected, setModalSelected] = useState<Record<string, string>>({})
  // resolved: slotKey → winning sessionId (non-winners are hidden)
  const [resolved, setResolved] = useState<Record<string, string>>({})

  const openResolveModal = useCallback((groupsToShow: SavedSession[][]) => {
    const initial: Record<string, string> = {}
    groupsToShow.forEach((g) => { initial[timeSlotKey(g[0])] = g[0].id })
    setModalSelected(initial)
    setModalGroups(groupsToShow)
  }, [])

  const handleModalSelect = useCallback((slotKey: string, sessionId: string) => {
    setModalSelected((prev) => ({ ...prev, [slotKey]: sessionId }))
  }, [])

  const handleModalConfirm = useCallback(() => {
    setResolved((prev) => ({ ...prev, ...modalSelected }))
    setModalGroups(null)
  }, [modalSelected])

  // Apply resolved selections — collapse parallel groups to the winning session
  const displayGroups = useMemo(() => {
    if (!showConflicts) return groups
    return groups.map((group) => {
      if (group.length <= 1) return group
      const slotKey = timeSlotKey(group[0])
      const winner = resolved[slotKey]
      if (!winner) return group
      return group.filter((s) => s.id === winner)
    })
  }, [groups, resolved, showConflicts])

  const conflictGroups = useMemo(() => {
    if (!showConflicts) return []
    return displayGroups.filter((g) => g.length > 1)
  }, [displayGroups, showConflicts])

  const renderChildren = useCallback(
    (parent: SavedSession, depth: number) => {
      const children = childrenByParent.get(parent.id) ?? []
      if (children.length === 0) return null
      if (!isExpanded(parent.id) && depth > 0) return null

      const spineLeft = 4 + (depth - 1) * 20
      const childPad = 20 + (depth - 1) * 20

      return (
        <div className="mt-2 relative">
          {/* Vertical spine */}
          <div
            className="absolute top-0 w-0.5 bg-slate-200 rounded-full"
            style={{ left: spineLeft, bottom: 8 }}
            aria-hidden="true"
          />
          <div className="space-y-2">
          {children.map((child) => {
            const hasMore = (childrenByParent.get(child.id) ?? []).length > 0
            const childExpanded = isExpanded(child.id)
            const attachmentCount = typeof child.attachment_count === 'number'
              ? child.attachment_count
              : (child.attachments?.length || 0)

            return (
              <div key={child.id} className="relative" style={{ paddingLeft: childPad }}>
                {/* Elbow branch */}
                <div
                  className="absolute border-l-2 border-b-2 border-slate-200 rounded-bl-lg"
                  style={{ left: spineLeft, top: 0, width: childPad - spineLeft, height: 28 }}
                  aria-hidden="true"
                />
                <div
                  className="border border-slate-200 rounded-lg bg-white shadow-sm"
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {onSessionClick ? (
                          <button
                            type="button"
                            onClick={() => onSessionClick(child.id)}
                            className="font-semibold text-slate-900 text-sm truncate text-left hover:text-primary hover:underline transition-colors"
                          >
                            {child.title}
                          </button>
                        ) : (
                          <div className="font-semibold text-slate-900 text-sm truncate">{child.title}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {showBookmark ? (
                          <button
                            type="button"
                            className={[
                              'p-1 transition-colors',
                              bookmarkedSessionIds?.has(String(child.id))
                                ? 'text-primary'
                                : 'text-slate-400 hover:text-primary'
                            ].join(' ')}
                            aria-label={bookmarkedSessionIds?.has(String(child.id)) ? 'Remove bookmark' : 'Bookmark session'}
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleBookmark?.(child)
                            }}
                          >
                            <Bookmark
                              className="h-4 w-4"
                              fill={bookmarkedSessionIds?.has(String(child.id)) ? 'currentColor' : 'none'}
                            />
                          </button>
                        ) : null}
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
                    </div>

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        <Calendar className="h-3 w-3" />
                        {formatTime(child.startTime, child.startPeriod || 'AM')} – {formatTime(child.endTime, child.endPeriod || 'AM')}
                      </span>
                      {child.location ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {getLocationLabel(child.location)}
                        </span>
                      ) : null}
                    </div>

                    {attachmentCount > 0 ? (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-slate-700">
                          <Attachment01 className="h-3 w-3" />
                          {attachmentCount}
                        </span>
                      </div>
                    ) : null}

                    {renderSpeakers(getSessionSpeakers(child), onSpeakerClick)}
                  </div>
                </div>

                {hasMore && childExpanded ? renderChildren(child, depth + 1) : null}
              </div>
            )
          })}
          </div>
        </div>
      )
    },
    [bookmarkedSessionIds, childrenByParent, isExpanded, onSpeakerClick, onSessionClick, onToggleBookmark, showBookmark, toggleExpanded]
  )

  const renderGroupSessions = useCallback((group: SavedSession[]) => (
    <div className={group.length > 1 ? 'space-y-2' : undefined}>
      {group.map((session) => {
        const kids = childrenByParent.get(session.id) ?? []
        const hasChildren = kids.length > 0
        const open = isExpanded(session.id)
        return (
          <SessionCard
            key={session.id}
            session={session}
            hasChildren={hasChildren}
            childrenCount={kids.length}
            open={open}
            onToggle={() => toggleExpanded(session.id)}
            onSpeakerClick={onSpeakerClick}
            onSessionClick={onSessionClick}
            showBookmark={showBookmark}
            bookmarkedSessionIds={bookmarkedSessionIds}
            onToggleBookmark={onToggleBookmark}
          >
            {renderChildren(session, 1)}
          </SessionCard>
        )
      })}
    </div>
  ), [bookmarkedSessionIds, childrenByParent, isExpanded, onSpeakerClick, onSessionClick, onToggleBookmark, renderChildren, showBookmark, toggleExpanded])

  return (
    <>
      <div className="space-y-4">
        {showConflicts && conflictGroups.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {conflictGroups.length} {conflictGroups.length === 1 ? 'conflict' : 'conflicts'} to resolve
            </div>
            <button
              type="button"
              onClick={() => openResolveModal(conflictGroups)}
              className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Resolve all
            </button>
          </div>
        )}

        <div className="space-y-4">
        {displayGroups.map((group) => {
          const representative = group[0]
          const isParallel = group.length > 1

          return (
            <div key={timeSlotKey(representative)} className="flex items-stretch gap-3 md:gap-6">
              {/* Time column */}
              <div className="w-14 shrink-0 self-stretch md:w-24">
                <div className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white py-2 shadow-sm md:py-0">
                  <div className="pt-1 text-center md:pt-3 md:flex-shrink-0">
                    <div className="text-sm font-semibold text-slate-900 md:text-sm">
                      {formatTime(representative.startTime, representative.startPeriod || 'AM')}
                    </div>
                  </div>
                  <div className="mx-auto h-full w-px flex-1 bg-slate-200" />
                  <div className="pb-1 text-center md:pb-3 md:flex-shrink-0">
                    <div className="text-sm font-semibold text-slate-900 md:text-sm">
                      {formatTime(representative.endTime, representative.endPeriod || 'AM')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Session content */}
              <div className="relative flex-1">
                {isParallel && (
                  <svg
                    className="pointer-events-none hidden md:block"
                    style={{ position: 'absolute', left: -14, top: 0, width: 14, height: '100%' }}
                    preserveAspectRatio="none"
                    viewBox="0 0 14 100"
                    aria-hidden="true"
                  >
                    <line x1="3" y1="6" x2="3" y2="94" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
                    <path d="M3,6 Q3,3 6,3 L14,3" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
                    <path d="M3,94 Q3,97 6,97 L14,97" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
                    <line x1="0" y1="50" x2="3" y2="50" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                )}
                {showConflicts && isParallel ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                        {group.length} sessions at the same time, choose one to attend
                      </div>
                      <button
                        type="button"
                        onClick={() => openResolveModal([group])}
                        className="shrink-0 rounded-md border border-amber-500 bg-white px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                      >
                        Resolve
                      </button>
                    </div>

                    <div className="space-y-2 px-2 pb-2 md:px-3 md:pb-3">
                      {renderGroupSessions(group)}
                    </div>
                  </div>
                ) : (
                  renderGroupSessions(group)
                )}
              </div>
            </div>
          )
        })}
        </div>
      </div>

      {showConflicts && modalGroups && (
        <ResolveModal
          groups={modalGroups}
          selected={modalSelected}
          onSelect={handleModalSelect}
          onConfirm={handleModalConfirm}
          onClose={() => setModalGroups(null)}
        />
      )}
    </>
  )
}

export default PublicScheduleGrid
