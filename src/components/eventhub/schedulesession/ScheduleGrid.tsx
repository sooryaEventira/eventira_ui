import React, { useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, ChevronUp, ChevronDown, Calendar, Attachment01, User01 } from '@untitled-ui/icons-react'
import { SavedSession } from './sessionTypes'

interface ScheduleGridProps {
  sessions: SavedSession[]
  selectedDate: Date
  onAddParallelSession?: (parentSessionId?: string) => void
  onEditSession?: (session: SavedSession) => void
  onDeleteSession?: (session: SavedSession) => void
  /** When provided, session cards are clickable and open this (e.g. public schedule → session detail page). */
  onSessionClick?: (session: SavedSession) => void
  /** When true, any open 3-dot dropdown is closed (e.g. session details form opened). */
  sessionFormOpen?: boolean
}

// SessionContainer component that manages time column and session cards
interface SessionContainerProps {
  session: SavedSession
  parallelSessions: SavedSession[]
  isExpanded: boolean
  onToggleExpand: () => void
  /** Combined time range for parent + all children (so time column spans the whole block) */
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
  /** When true, close any open 3-dot menu (e.g. session form opened). */
  sessionFormOpen?: boolean
}

// Dropdown menu width for positioning
const SESSION_MENU_WIDTH = 120

// Small dropdown for session card 3-dots: Edit and Delete.
// Renders the menu in a portal so it works inside nested/scrollable cards (e.g. child sessions).
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

  // Native click (capture) on trigger so 3-dot works inside nested cards where React events can be blocked
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

  // Position menu when opening (portal is in document.body). Defer so ref is set after open.
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

  // Outside click: close when click is outside both trigger and menu (menu is in portal).
  // Use mousedown so we don't need a long delay; add listener after open so the opening gesture doesn't close it.
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
  sessionFormOpen = false
}) => {
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null)

  // Close 3-dot menu when session details form opens so it doesn’t show over the form
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

  const timeStart = timeRangeStart ?? formatTime(session.startTime, session.startPeriod || 'AM')
  const timeEnd = timeRangeEnd ?? formatTime(session.endTime, session.endPeriod || 'AM')
  const hasParallelSessions = parallelSessions.length > 0
  const showAddButton = Boolean(onAddParallelSession)
  const showExpandButton = hasParallelSessions

  const getChildren = React.useCallback(
    (parentId: string) => {
      const kids = getNestedParallelSessions?.(parentId) ?? []
      return kids
    },
    [getNestedParallelSessions]
  )

  const renderNestedSessions = React.useCallback(
    (parent: SavedSession, depth: number) => {
      const children = getChildren(parent.id)
      if (children.length === 0) return null

      const expanded =
        (isSessionExpanded ? isSessionExpanded(parent.id) : true) ||
        // Always show first level of children when the top container is expanded
        depth === 1

      if (!expanded) return null

      return (
        <div className={depth === 1 ? 'mt-2 space-y-2' : 'mt-2 space-y-2'}>
          {children.map((child) => {
            const hasMore = getChildren(child.id).length > 0
            const childExpanded = isSessionExpanded ? isSessionExpanded(child.id) : true

            // We allow children to be outside parent's time range (Excel parent link may not be time-contained)
            const _isValid = isTimeValid(child, parent)
            if (!_isValid) {
              // keep silent (do not spam console)
            }

            return (
              <div key={child.id} className="relative">
                {/* Vertical guideline */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-300"
                  style={{ left: `${16 + (depth - 1) * 20}px` }}
                ></div>

                {/* Child Session Card - stop propagation so parent card never captures 3-dot or other controls */}
                <div
                  className="border border-slate-200 rounded-lg bg-slate-50 shadow-sm hover:shadow-md transition-shadow relative child-session-card"
                  style={{ marginLeft: `${24 + (depth - 1) * 20}px` }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="p-3">
                    {/* Header - isolate pointer events so parent card never captures 3-dot */}
                    <div
                      className="flex items-start justify-between mb-2 relative z-10"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
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

                      <div
                        className="flex items-center gap-1 flex-shrink-0"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {hasMore && onToggleSessionExpand && (
                          <button
                            type="button"
                            onClick={() => onToggleSessionExpand(child.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            aria-label={childExpanded ? 'Collapse' : 'Expand'}
                          >
                            {childExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
<SessionMenuDropdown
  session={child}
  // 1. Cast to String to safely compare against dataset string
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

                    {/* Metadata Row */}
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Display session time for both parent and child when time is present */}
                        {child.startTime && child.endTime && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            <Calendar className="h-3 w-3" />
                            {formatTimeRange(child)}
                          </span>
                        )}

                        {child.location && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {getLocationLabel(child.location)}
                          </span>
                        )}

                       
                      </div>

                      {onAddParallelSession && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpenForId(null)
                            onAddParallelSession?.(parent.id)
                          }}
                          className="p-1 text-slate-400 hover:text-primary rounded border border-slate-300 flex-shrink-0 transition-colors"
                          aria-label="Add parallel session"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        <Attachment01 className="h-3 w-3" />
                        {child.attachments?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recursive grandchildren */}
                {hasMore && childExpanded && renderNestedSessions(child, depth + 1)}
              </div>
            )
          })}
        </div>
      )
    },
    [
      getChildren, 
      isSessionExpanded, 
      isTimeValid, 
      onAddParallelSession, 
      onToggleSessionExpand, 
      onSessionClick, 
      formatTimeRange, 
      getLocationLabel, 
      getSessionTypeLabel,
      menuOpenForId,       // <-- Add this
      onEditSession,       // <-- Add this
      onDeleteSession      // <-- Add this
    ]
  )

  return (
    <div className="flex items-stretch gap-6" ref={containerRef}>
      {/* Time Column - spans parent + all children so the block shares one time range column */}
      <div className="flex-shrink-0 w-24 self-stretch">
        <div className="h-full border border-slate-200 rounded-lg bg-white shadow-sm flex flex-col justify-between">
          <div className="text-center pt-3 flex-shrink-0">
            <div className="text-sm font-semibold text-slate-900">
              {timeStart}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0">
            {/* Vertical line indicator */}
            <div className="w-px h-full bg-slate-200"></div>
          </div>
          <div className="text-center pb-3 flex-shrink-0">
            <div className="text-sm font-semibold text-slate-900">
              {timeEnd}
            </div>
          </div>
        </div>
      </div>

      {/* Session Cards Column */}
        <div className="flex-1">
        {/* Parent Session Card — when onSessionClick is set (e.g. public schedule), card and title are clickable */}
        <div
          className={`border border-slate-200 rounded-lg bg-white shadow-sm transition-shadow ${onSessionClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : 'hover:shadow-md'}`}
          role={onSessionClick ? 'button' : undefined}
          onClick={onSessionClick ? (e) => { if (!(e.target as HTMLElement).closest('button')) onSessionClick(session) } : undefined}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                />
                <div className="flex items-center gap-2 flex-1">
                  <div className="cursor-move text-slate-400 hover:text-slate-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
                    </svg>
                  </div>
                  {onSessionClick ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSessionClick(session) }}
                      className="font-semibold text-slate-900 text-base text-left hover:text-primary hover:underline"
                    >
                      {session.title}
                    </button>
                  ) : (
                    <h3 className="font-semibold text-slate-900 text-base">{session.title}</h3>
                  )}
                </div>
              </div>
              <div className="flex items-center">
              <SessionMenuDropdown
  session={session}
  isOpen={menuOpenForId === String(session.id)}
  onToggle={() => setMenuOpenForId((id) => (id === String(session.id) ? null : String(session.id)))}
  onClose={() => setMenuOpenForId(null)}
  onEdit={(s) => onEditSession?.(s)}
  onDelete={(s) => onDeleteSession?.(s)}
/>
              </div>
            </div>

            {/* Metadata Row - Time, Location, Session Type */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Time Badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatTimeRange(session)}
                </span>
                
                {/* Location Badge */}
                {session.location && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {getLocationLabel(session.location)}
                  </span>
                )}
              </div>

              {/* + Button - Only show if no parallel sessions exist */}
              {showAddButton && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpenForId(null)
                    onAddParallelSession?.(session.id)
                  }}
                  className="p-1.5 text-slate-400 hover:text-primary rounded border border-slate-300 flex-shrink-0 transition-colors"
                  aria-label="Add parallel session"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Description */}
            {session.sections && session.sections.length > 0 && session.sections[0].description && (
              <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                {session.sections[0].description}
              </p>
            )}

            {/* Footer - Attachment Badge */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <Attachment01 className="h-3.5 w-3.5" />
                {session.attachments?.length || 0}
              </span>
            </div>

            {/* Sub-session count row (e.g. "1 sub-session") */}
            {hasParallelSessions && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="mt-2 w-full flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <span>
                  {getChildren(session.id).length}{' '}
                  {getChildren(session.id).length === 1 ? 'sub-session' : 'sub-sessions'}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {/* Child sessions inside parent card */}
            {hasParallelSessions && isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-200 overflow-visible relative">
                {renderNestedSessions(session, 1)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  sessions,
  selectedDate,
  onAddParallelSession,
  onEditSession,
  onDeleteSession,
  onSessionClick,
  sessionFormOpen = false
}) => {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  // Filter sessions for selected date (session.date is UTC noon so local day matches API day in any TZ)
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (!session.date) return true
      const sessionDate = new Date(session.date)
      const selected = new Date(selectedDate)
      const sessionDateOnly = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate())
      const selectedDateOnly = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate())
      return sessionDateOnly.getTime() === selectedDateOnly.getTime()
    })
  }, [sessions, selectedDate])

  // Separate root sessions from children (by parentId) so we render one combined row per parent
  const { parentSessions, parallelSessionsMap } = useMemo(() => {
    const parents: SavedSession[] = []
    const parallelMap: Record<string, SavedSession[]> = {}
    const idSet = new Set(filteredSessions.map((s) => String(s.id)))
    
    filteredSessions.forEach(session => {
      const parentId = session.parentId ? String(session.parentId) : ''
      if (parentId && idSet.has(parentId)) {
        if (!parallelMap[parentId]) parallelMap[parentId] = []
        parallelMap[parentId].push(session)
      } else {
        parents.push(session)
      }
    })

    return { parentSessions: parents, parallelSessionsMap: parallelMap }
  }, [filteredSessions])

  // Auto-expand parent sessions that have parallel sessions
  useEffect(() => {
    const parentsWithParallel = Object.keys(parallelSessionsMap)
    if (parentsWithParallel.length > 0) {
      setExpandedSessions(prev => {
        const newSet = new Set(prev)
        parentsWithParallel.forEach(parentId => {
          newSet.add(parentId)
        })
        return newSet
      })
    }
  }, [parallelSessionsMap])

  // Group parent sessions by start time
  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: SavedSession[] } = {}
    
    parentSessions.forEach(session => {
      const timeKey = `${session.startTime} ${session.startPeriod || 'AM'}`
      if (!groups[timeKey]) {
        groups[timeKey] = []
      }
      groups[timeKey].push(session)
    })

    // Sort by time
    return Object.keys(groups)
      .sort((a, b) => {
        const [timeA, periodA] = a.split(' ')
        const [timeB, periodB] = b.split(' ')
        const [hoursA, minsA] = timeA.split(':').map(Number)
        const [hoursB, minsB] = timeB.split(':').map(Number)
        
        let totalA = hoursA * 60 + minsA
        let totalB = hoursB * 60 + minsB
        
        if (periodA === 'PM' && hoursA !== 12) totalA += 12 * 60
        if (periodB === 'PM' && hoursB !== 12) totalB += 12 * 60
        if (periodA === 'AM' && hoursA === 12) totalA = minsA
        if (periodB === 'AM' && hoursB === 12) totalB = minsB
        
        return totalA - totalB
      })
      .map(key => ({ time: key, sessions: groups[key] }))
  }, [parentSessions])

  const toggleExpand = (sessionId: string) => {
    const id = String(sessionId)
    setExpandedSessions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Helper function to convert time to minutes for comparison
  const timeToMinutes = (time: string, period: 'AM' | 'PM'): number => {
    const [hours, mins] = time.split(':').map(Number)
    let total = hours * 60 + mins
    if (period === 'PM' && hours !== 12) total += 12 * 60
    if (period === 'AM' && hours === 12) total = mins
    return total
  }

  const minutesToTime24 = (minutesTotal: number): string => {
    const m = ((minutesTotal % (24 * 60)) + (24 * 60)) % (24 * 60)
    const hh = String(Math.floor(m / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    return `${hh}:${mm}`
  }

  // Validate parallel session time is within parent session time
  const isTimeValid = (parallelSession: SavedSession, parentSession: SavedSession): boolean => {
    // We allow children to be outside parent's time range (Excel parent linkage is title-based).
    // Keeping this always true avoids false warnings/spam.
    void parentSession
    void parallelSession
    return true
  }

  // Backend uses 24-hour time; display in 24-hour format in UI.
  const formatTime = (time: string, period: string) => {
    const p = String(period || 'AM').toUpperCase() as 'AM' | 'PM'
    const mins = timeToMinutes(time, p)
    return minutesToTime24(mins)
  }

  const formatTimeRange = (session: SavedSession) => {
    return `${formatTime(session.startTime, session.startPeriod || 'AM')} - ${formatTime(session.endTime, session.endPeriod || 'AM')}`
  }

  const getLocationLabel = (location: string) => {
    const locationMap: Record<string, string> = {
      'cafeteria': 'Cafeteria',
      'room1': 'Room 1',
      'room2': 'Room 2',
    }
    return locationMap[location] || location
  }

  const getSessionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'keynote': 'Online',
      'workshop': 'In-Person',
    }
    return typeMap[type] || type
  }

  if (groupedSessions.length === 0) {
    return <div className="text-sm text-slate-500 text-center py-4">No sessions for this date</div>
  }

  return (
    <div className="mt-4 space-y-4">
      {groupedSessions.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-4">
          {group.sessions.map((session) => {
            const parallelSessions = parallelSessionsMap[String(session.id)] || []
            const isExpanded = expandedSessions.has(String(session.id))
            const timeRange = (() => {
              let minM = timeToMinutes(session.startTime, session.startPeriod || 'AM')
              let maxM = timeToMinutes(session.endTime, session.endPeriod || 'PM')
              parallelSessions.forEach((s) => {
                minM = Math.min(minM, timeToMinutes(s.startTime, s.startPeriod || 'AM'))
                maxM = Math.max(maxM, timeToMinutes(s.endTime, s.endPeriod || 'PM'))
              })
              return { start: minutesToTime24(minM), end: minutesToTime24(maxM) }
            })()
            return (
              <SessionContainer
                key={session.id}
                session={session}
                parallelSessions={parallelSessions}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleExpand(String(session.id))}
                timeRangeStart={timeRange.start}
                timeRangeEnd={timeRange.end}
                getNestedParallelSessions={(parentId) => {
                  const kids = parallelSessionsMap[String(parentId)] || []
                  // Ensure stable chronological ordering within the parent
                  return [...kids].sort((a, b) => {
                    const am = timeToMinutes(a.startTime, a.startPeriod || 'AM')
                    const bm = timeToMinutes(b.startTime, b.startPeriod || 'AM')
                    if (am !== bm) return am - bm
                    return String(a.title).localeCompare(String(b.title))
                  })
                }}
                isSessionExpanded={(id) => expandedSessions.has(String(id))}
                onToggleSessionExpand={toggleExpand}
                onAddParallelSession={onAddParallelSession}
                formatTime={formatTime}
                formatTimeRange={formatTimeRange}
                getLocationLabel={getLocationLabel}
                getSessionTypeLabel={getSessionTypeLabel}
                isTimeValid={isTimeValid}
                onEditSession={onEditSession}
                onDeleteSession={onDeleteSession}
                onSessionClick={onSessionClick}
                sessionFormOpen={sessionFormOpen}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default ScheduleGrid
