import React, { useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, ChevronUp, ChevronDown, Calendar, Attachment01, User01, Clock, MarkerPin01, VideoRecorder } from '@untitled-ui/icons-react'
import { SavedSession } from './sessionTypes'

interface ScheduleGridProps {
  sessions: SavedSession[]
  selectedDate: Date
  onAddParallelSession?: (parentSessionId?: string) => void
  onEditSession?: (session: SavedSession) => void
  onDeleteSession?: (session: SavedSession) => void
  onSessionClick?: (session: SavedSession) => void
  sessionFormOpen?: boolean
  onReorderParallelSessions?: (timeKey: string, orderedSessionIds: string[]) => void
}

interface SessionContainerProps {
  session: SavedSession
  parallelSessions: SavedSession[]
  isExpanded: boolean
  onToggleExpand: () => void
  timeRangeStart?: string
  timeRangeEnd?: string
  getNestedParallelSessions?: (parentId: string) => SavedSession[]
  isSessionExpanded?: (sessionId: string) => boolean
  onToggleSessionExpand?: (sessionId: string) => void
  onAddParallelSession?: (parentSessionId: string) => void
  formatTime: (time: string, period: string) => string
  formatTimeRange: (session: SavedSession) => string
  getLocationLabel: (location: string) => string
  getSessionTypeLabel: (type: string) => string
  isTimeValid: (parallelSession: SavedSession, parentSession: SavedSession) => boolean
  onEditSession?: (session: SavedSession) => void
  onDeleteSession?: (session: SavedSession) => void
  onSessionClick?: (session: SavedSession) => void
  sessionFormOpen?: boolean
  showTimeColumn?: boolean
  showDragHandle?: boolean
  onParallelDragStart?: (e: React.DragEvent) => void
  onParallelDragEnd?: () => void
  isDragOver?: boolean
  isDragging?: boolean
}

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

function formatSessionSpeakersLabel(speakers: SessionSpeaker[]): string {
  if (!speakers.length) return ''
  return speakers
    .map((s) => {
      const role = (s.role && String(s.role).trim()) || 'Speaker'
      const name = s.name || 'Unnamed'
      return `${role}: ${name}`
    })
    .join(', ')
}

const SESSION_MENU_WIDTH = 120

function SessionMenuDropdown({
  session,
  isOpen,
  onToggle,
  onClose,
  onEdit,
  onDelete,
  className = '',
  iconSize = 'h-4 w-4',
}: {
  session: SavedSession
  isOpen: boolean
  onToggle: (e: React.MouseEvent) => void
  onClose: () => void
  onEdit: (s: SavedSession) => void
  onDelete: (s: SavedSession) => void
  className?: string
  iconSize?: string
}) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const onToggleRef = useRef(onToggle)
  onToggleRef.current = onToggle

  useEffect(() => {
    const el = triggerRef.current
    if (!el) return
    const handler = (e: Event) => {
      e.stopPropagation()
      e.preventDefault()
      onToggleRef.current(e as unknown as React.MouseEvent)
    }
    el.addEventListener('click', handler, true)
    return () => el.removeEventListener('click', handler, true)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null)
      return
    }
    const id = requestAnimationFrame(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - SESSION_MENU_WIDTH),
      })
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  const justOpenedRef = useRef(false)
  useEffect(() => {
    if (isOpen) justOpenedRef.current = true
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleMouseDown = (e: MouseEvent) => {
      if (justOpenedRef.current) {
        justOpenedRef.current = false
        return
      }
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      onClose()
    }
    const id = setTimeout(() => document.addEventListener('mousedown', handleMouseDown), 10)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [isOpen, onClose])

  const menuContent =
    isOpen && menuPosition && typeof document !== 'undefined' ? (
      <div
        ref={menuRef}
        className="fixed py-1 bg-white rounded-lg shadow-lg border border-slate-200 z-[9999] min-w-[120px]"
        style={{ top: menuPosition.top, left: menuPosition.left }}
      >
        <button
          type="button"
          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-t-lg"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onClose()
            onEdit(session)
          }}
        >
          Edit
        </button>
        <button
          type="button"
          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 rounded-b-lg"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onClose()
            onDelete(session)
          }}
        >
          Delete
        </button>
      </div>
    ) : null

  return (
    <>
      <div
        className={`relative ${className}`}
        ref={triggerRef}
        data-session-menu-trigger
        data-session-id={session.id}
      >
        <button
          type="button"
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onToggleRef.current(e)
          }}
          className="p-1 text-slate-400 hover:text-slate-600 rounded"
          aria-label="More options"
          aria-expanded={isOpen}
        >
          <svg className={iconSize} fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>
      {menuContent && createPortal(menuContent, document.body)}
    </>
  )
}

const SessionContainer: React.FC<SessionContainerProps> = ({
  session,
  parallelSessions,
  isExpanded,
  onToggleExpand,
  timeRangeStart,
  timeRangeEnd,
  getNestedParallelSessions,
  isSessionExpanded,
  onToggleSessionExpand,
  onAddParallelSession,
  formatTime,
  formatTimeRange,
  getLocationLabel,
  getSessionTypeLabel,
  isTimeValid,
  onEditSession,
  onDeleteSession,
  onSessionClick,
  sessionFormOpen = false,
  showTimeColumn = true,
  showDragHandle = false,
  onParallelDragStart,
  onParallelDragEnd,
  isDragOver = false,
  isDragging = false
}) => {
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null)

  useEffect(() => {
    if (sessionFormOpen) setMenuOpenForId(null)
  }, [sessionFormOpen])

  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const trigger = target.closest?.('[data-session-menu-trigger]') as HTMLElement | null
      if (!trigger?.dataset?.sessionId || !containerRef.current?.contains(trigger)) return
      e.stopPropagation()
      e.preventDefault()
      const id = trigger.dataset.sessionId
      setMenuOpenForId((prev) => (prev === id ? null : id))
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])

  const hasParallelSessions = parallelSessions.length > 0
  const showAddButton = Boolean(onAddParallelSession)

  const getChildren = React.useCallback(
    (parentId: string) => {
      return getNestedParallelSessions?.(parentId) ?? []
    },
    [getNestedParallelSessions]
  )

  const renderNestedSessions = React.useCallback(
    (parent: SavedSession, depth: number) => {
      const children = getChildren(parent.id)
      if (children.length === 0) return null

      const expanded = (isSessionExpanded ? isSessionExpanded(parent.id) : true) || depth === 1
      if (!expanded) return null

      return (
        <div className="mt-3 relative">
          {/* Vertical Spine for Elbow Connectors */}
          <div 
            className="absolute left-3 top-0 bottom-6 w-0.5 bg-slate-200 rounded-full" 
            aria-hidden="true"
          />

          <div className="space-y-3">
            {children.map((child) => {
              const hasMore = getChildren(child.id).length > 0
              const childExpanded = isSessionExpanded ? isSessionExpanded(child.id) : true

              return (
                <div key={child.id} className="relative pl-8">
                  {/* The Horizontal Elbow Branch */}
                  <div 
                    className="absolute left-3 top-0 w-5 h-8 border-l-2 border-b-2 border-slate-200 rounded-bl-xl" 
                    aria-hidden="true"
                  />

                  <div
                    className="border border-slate-200 rounded-lg bg-slate-50 shadow-sm hover:shadow-md transition-shadow relative child-session-card"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="p-2">
                      <div className="flex items-start justify-between mb-1 relative z-10">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="checkbox"
                            className="h-3 w-3 rounded border-slate-300 text-primary focus:ring-primary/40"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div className="cursor-move text-slate-400 hover:text-slate-600">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M7 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
                              </svg>
                            </div>
                            {onSessionClick ? (
                              <button
                                type="button"
                                onClick={() => onSessionClick(child)}
                                className="font-semibold text-slate-900 text-sm text-left hover:text-primary hover:underline"
                              >
                                {child.title}
                              </button>
                            ) : (
                              <h3 className="font-semibold text-slate-900 text-sm">{child.title}</h3>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {hasMore && onToggleSessionExpand && (
                            <button
                              type="button"
                              onClick={() => onToggleSessionExpand(child.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            >
                              {childExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          <SessionMenuDropdown
                            session={child}
                            isOpen={menuOpenForId === String(child.id)}
                            onToggle={() => setMenuOpenForId((id) => (id === String(child.id) ? null : String(child.id)))}
                            onClose={() => setMenuOpenForId(null)}
                            onEdit={(s) => onEditSession?.(s)}
                            onDelete={(s) => onDeleteSession?.(s)}
                            iconSize="h-3.5 w-3.5"
                            className="z-20"
                          />
                        </div>
                      </div>

                      {/* Metadata row */}
                      <div className="flex items-center justify-between gap-1.5 mb-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {child.startTime && child.endTime && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              <Calendar className="h-3 w-3" />
                              {formatTimeRange(child)}
                            </span>
                          )}
                          {child.location && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {getLocationLabel(child.location)}
                            </span>
                          )}
                          {child.sessionType && child.sessionType.toLowerCase() === 'online' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              <VideoRecorder className="h-3 w-3" />
                              {getSessionTypeLabel(child.sessionType)}
                            </span>
                          )}
                          {Array.isArray(child.tags) && child.tags.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-blue-600">
                              <span className="truncate max-w-[140px]">
                                Tags: {child.tags.map((t: any) => String(t?.name ?? t?.label ?? t ?? '')).filter(Boolean).join(', ')}
                              </span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            <Attachment01 className="h-3 w-3" />
                            {child.attachment_count || 0}
                          </span>
                        </div>
                        {onAddParallelSession && (
                          <button
                            type="button"
                            onClick={() => onAddParallelSession?.(parent.id)}
                            className="p-1 text-slate-400 hover:text-primary rounded border border-slate-300 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Speakers */}
                      {(() => {
                        const speakers = getSessionSpeakers(child)
                        const label = formatSessionSpeakersLabel(speakers)
                        if (!label) return null
                        return (
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                            <User01 className="h-3 w-3 text-slate-400" />
                            <span>{label}</span>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                  {hasMore && childExpanded && renderNestedSessions(child, depth + 1)}
                </div>
              )
            })}
          </div>
        </div>
      )
    },
    [getChildren, isSessionExpanded, onAddParallelSession, onToggleSessionExpand, onSessionClick, formatTimeRange, getLocationLabel, menuOpenForId, onEditSession, onDeleteSession]
  )

  const cardColumn = (
    <div className="flex-1 min-w-0" key="card">
        <div
          className={`border rounded-lg shadow-sm transition-shadow ${
            isDragging ? 'border-violet-500 ring-2 ring-violet-300/50 bg-violet-50/80' : 
            isDragOver ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-slate-200 bg-white'
          } ${onSessionClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : 'hover:shadow-md'}`}
          onClick={onSessionClick ? (e) => { if (!(e.target as HTMLElement).closest('button')) onSessionClick(session) } : undefined}
        >
          <div className="px-3 py-2">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2 flex-1">
                <input type="checkbox" className="h-3 w-3 rounded border-slate-300 text-primary" />
                <div className="flex items-center gap-2 flex-1">
                  {showDragHandle && (
                    <div
                      className={`cursor-move flex-shrink-0 touch-none ${isDragging ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                      draggable={!!onParallelDragStart}
                      onDragStart={onParallelDragStart}
                      onDragEnd={onParallelDragEnd}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
                      </svg>
                    </div>
                  )}
                  {onSessionClick ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); onSessionClick(session) }} className="font-semibold text-slate-900 text-base text-left hover:text-primary hover:underline">
                      {session.title}
                    </button>
                  ) : (
                    <h3 className="font-semibold text-slate-900 text-base">{session.title}</h3>
                  )}
                </div>
              </div>
              <SessionMenuDropdown
                session={session}
                isOpen={menuOpenForId === String(session.id)}
                onToggle={() => setMenuOpenForId((id) => (id === String(session.id) ? null : String(session.id)))}
                onClose={() => setMenuOpenForId(null)}
                onEdit={(s) => onEditSession?.(s)}
                onDelete={(s) => onDeleteSession?.(s)}
              />
            </div>

            <div className="flex items-center justify-between flex-wrap ">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2  rounded-full text-xs font-medium border border-slate-200 text-slate-700">
                  <Clock className="h-3 w-3" />
                  {formatTimeRange(session)}
                </span>                
                {session.location && (
                  <span className="inline-flex items-center gap-1.5 px-2  rounded-full text-xs font-medium border border-slate-200 text-slate-700">
                    <MarkerPin01 className="h-3 w-3" />
                      
                    {getLocationLabel(session.location)}
                  </span>
                )}
                {session.sessionType && session.sessionType.toLowerCase() === 'online' && (
                  <span className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs font-medium border border-slate-200 text-slate-700">
                    <VideoRecorder className="h-3 w-3" />
                    {getSessionTypeLabel(session.sessionType)}
                  </span>
                )}
                {Array.isArray(session.tags) && session.tags.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs font-medium border border-slate-200 text-blue-700 bg-slate-100">
                    <span className="truncate max-w-[160px]">
                      {session.tags.map((t: any) => String(t?.name ?? t?.label ?? t ?? '')).filter(Boolean).join(', ')}
                    </span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2  rounded-full border border-slate-200 text-xs font-medium text-slate-700">
                  <Attachment01 className="h-3 w-3" />
                  {session.attachment_count || 0}
                </span>
              </div>
              {showAddButton && (
                <button
                  type="button"
                  onClick={() => onAddParallelSession?.(session.id)}
                  className="p-1.5 text-slate-400 hover:text-primary rounded border border-slate-300 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {(() => {
              const speakers = getSessionSpeakers(session)
              const label = formatSessionSpeakersLabel(speakers)
              if (!label) return null
              return (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                  <User01 className="h-3.5 w-3.5 text-slate-400" />
                  <span>{label}</span>
                </div>
              )
            })()}

            {hasParallelSessions && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="mt-2 w-full flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1
                 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <span>{getChildren(session.id).length} sub-session{getChildren(session.id).length !== 1 ? 's' : ''}</span>
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}

            {hasParallelSessions && isExpanded && (
              <div className="mt-1.5 pt-1 border-t border-slate-100 overflow-visible relative">
                {renderNestedSessions(session, 1)}
              </div>
            )}
          </div>
        </div>
      </div>
  )

  if (!showTimeColumn) {
    return <div className="flex-1 min-w-0" ref={containerRef}>{cardColumn}</div>
  }

  return (
    <div className="flex items-stretch gap-6" ref={containerRef}>
      <div className="flex-shrink-0 w-24 self-stretch">
        <div className="h-full border border-slate-200 rounded-lg bg-white shadow-sm flex flex-col justify-between py-3">
          <div className="text-center text-sm font-semibold text-slate-900">{formatTime(session.startTime, session.startPeriod || 'AM')}</div>
          <div className="flex-1 flex items-center justify-center"><div className="w-px h-full bg-slate-200"></div></div>
          <div className="text-center text-sm font-semibold text-slate-900">{formatTime(session.endTime, session.endPeriod || 'AM')}</div>
        </div>
      </div>
      {cardColumn}
    </div>
  )
}

function getOrderedSessionsForGroup(sessions: SavedSession[], timeKey: string, parallelOrder: Record<string, string[]>): SavedSession[] {
  const orderIds = parallelOrder[timeKey]
  if (!orderIds || orderIds.length === 0) return sessions
  const byId = new Map(sessions.map((s) => [String(s.id), s]))
  const ordered: SavedSession[] = []
  for (const id of orderIds) {
    const s = byId.get(id)
    if (s) ordered.push(s)
  }
  sessions.forEach((s) => {
    if (!orderIds.includes(String(s.id))) ordered.push(s)
  })
  return ordered
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  sessions, selectedDate, onAddParallelSession, onEditSession, onDeleteSession, onSessionClick, sessionFormOpen = false, onReorderParallelSessions
}) => {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [parallelOrder, setParallelOrder] = useState<Record<string, string[]>>({})
  const [draggingParallelSessionId, setDraggingParallelSessionId] = useState<string | null>(null)
  const [dragOverParallelSessionId, setDragOverParallelSessionId] = useState<string | null>(null)

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (!session.date) return true
      const s = new Date(session.date), sel = new Date(selectedDate)
      return s.getFullYear() === sel.getFullYear() && s.getMonth() === sel.getMonth() && s.getDate() === sel.getDate()
    })
  }, [sessions, selectedDate])

  const { parentSessions, parallelSessionsMap } = useMemo(() => {
    const parents: SavedSession[] = [], map: Record<string, SavedSession[]> = {}
    const idSet = new Set(filteredSessions.map(s => String(s.id)))
    filteredSessions.forEach(s => {
      const pId = s.parentId ? String(s.parentId) : ''
      if (pId && idSet.has(pId)) {
        if (!map[pId]) map[pId] = []
        map[pId].push(s)
      } else parents.push(s)
    })
    return { parentSessions: parents, parallelSessionsMap: map }
  }, [filteredSessions])

  const timeToMinutes = (time: string, period: 'AM' | 'PM'): number => {
    const [h, m] = time.split(':').map(Number)
    let total = h * 60 + m
    if (period === 'PM' && h !== 12) total += 720
    if (period === 'AM' && h === 12) total = m
    return total
  }

  const groupedSessions = useMemo(() => {
    const groups: Record<string, SavedSession[]> = {}
    parentSessions.forEach(s => {
      const key = `${s.startTime}|${s.startPeriod || 'AM'}|${s.endTime}|${s.endPeriod || 'PM'}`
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    })
    return Object.keys(groups).sort((a, b) => {
      const [sA, pA] = a.split('|'), [sB, pB] = b.split('|')
      return timeToMinutes(sA, pA as any) - timeToMinutes(sB, pB as any)
    }).map(k => ({ timeKey: k, sessions: groups[k] }))
  }, [parentSessions])

  const SESSION_TYPE_LABELS: Record<string, string> = {
    online: 'Online',
    inperson: 'In person',
    hybrid: 'Hybrid'
  }

  const formatTime = (time: string, period: string) => {
    const m = timeToMinutes(time, (period || 'AM') as any)
    const hh = String(Math.floor((m % 1440) / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    return `${hh}:${mm}`
  }

  return (
    <div className="mt-4 space-y-8">
      {groupedSessions.map((group, groupIndex) => {
        const first = group.sessions[0], parallelCount = group.sessions.length
        const timeStart = formatTime(first.startTime, first.startPeriod || 'AM')
        const timeEnd = formatTime(first.endTime, first.endPeriod || 'PM')

        return (
          <div key={groupIndex} className="relative flex items-stretch gap-8">
            {/* Time Column Slot */}
            <div className="flex-shrink-0 w-32 self-stretch">
              <div className="h-full border border-slate-200 rounded-lg bg-white shadow-sm flex flex-col justify-between py-4">
                <div className="text-center font-semibold text-slate-900">{timeStart}</div>
                <div className="flex justify-center">
                  {parallelCount > 1 && (
                    <span className="text-[10px]  font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {parallelCount} parallel sessions
                    </span>
                  )}
                </div>
                <div className="text-center font-semibold text-slate-900">{timeEnd}</div>
              </div>
            </div>

            {/* Parallel Bracket Connector */}
            <div className="relative flex-1">
              {parallelCount > 1 && (
                <>
                  <div 
                    className="absolute -left-6 top-6 bottom-6 w-4 border-l-2 border-t-2 border-b-2 border-slate-200 rounded-l-xl" 
                    aria-hidden="true"
                  />
                  <div className="absolute -left-8 top-1/2 w-2 h-0.5 bg-slate-200" aria-hidden="true" />
                </>
              )}

              <div className={`space-y-4 ${parallelCount > 1 ? 'pl-2' : ''}`}>
                {getOrderedSessionsForGroup(group.sessions, group.timeKey, parallelOrder).map(session => (
                  <SessionContainer
                    key={session.id}
                    session={session}
                    parallelSessions={parallelSessionsMap[String(session.id)] || []}
                    isExpanded={expandedSessions.has(String(session.id))}
                    onToggleExpand={() => setExpandedSessions(p => { 
                      const n = new Set(p); 
                      n.has(String(session.id)) ? n.delete(String(session.id)) : n.add(String(session.id)); 
                      return n 
                    })}
                    getNestedParallelSessions={id => (parallelSessionsMap[id] || []).sort((a,b) => timeToMinutes(a.startTime, (a.startPeriod||'AM') as any) - timeToMinutes(b.startTime, (b.startPeriod||'AM') as any))}
                    isSessionExpanded={id => expandedSessions.has(String(id))}
                    onToggleSessionExpand={id => setExpandedSessions(p => { const n = new Set(p); n.has(String(id)) ? n.delete(String(id)) : n.add(String(id)); return n })}
                    onAddParallelSession={onAddParallelSession}
                    formatTime={formatTime}
                    formatTimeRange={s => `${formatTime(s.startTime, s.startPeriod||'AM')} - ${formatTime(s.endTime, s.endPeriod||'AM')}`}
                    getLocationLabel={l => l}
                    getSessionTypeLabel={t => SESSION_TYPE_LABELS[t.toLowerCase()] || t}
                    isTimeValid={() => true}
                    onEditSession={onEditSession}
                    onDeleteSession={onDeleteSession}
                    onSessionClick={onSessionClick}
                    sessionFormOpen={sessionFormOpen}
                    showTimeColumn={false}
                    showDragHandle={parallelCount > 1}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ScheduleGrid