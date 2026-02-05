import React, { useMemo, useState, useEffect, useRef } from 'react'
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
}

// Small dropdown for session card 3-dots: Edit and Delete
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
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isOpen, onClose])

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(e)
        }}
        className="p-1 text-slate-400 hover:text-slate-600 rounded"
        aria-label="More options"
        aria-expanded={isOpen}
      >
        <svg className={iconSize} fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 py-1 bg-white rounded-lg shadow-lg border border-slate-200 z-[100] min-w-[120px]">
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
      )}
    </div>
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
  onSessionClick
}) => {
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null)
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

                {/* Child Session Card */}
                <div
                  className="border border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                  style={{ marginLeft: `${24 + (depth - 1) * 20}px` }}
                >
                  <div className="p-3">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
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

                      <div className="flex items-center gap-1">
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
                          isOpen={menuOpenForId === child.id}
                          onToggle={() => setMenuOpenForId((id) => (id === child.id ? null : child.id))}
                          onClose={() => setMenuOpenForId(null)}
                          onEdit={(s) => onEditSession?.(s)}
                          onDelete={(s) => onDeleteSession?.(s)}
                          iconSize="h-3.5 w-3.5"
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

                        {child.sessionType && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {child.sessionType === 'keynote' ? (
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            ) : (
                              <User01 className="h-3 w-3" />
                            )}
                            {getSessionTypeLabel(child.sessionType)}
                          </span>
                        )}
                      </div>

                      {onAddParallelSession && (
                        <button
                          type="button"
                          onClick={() => onAddParallelSession?.(parent.id)}
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
    [getChildren, isSessionExpanded, isTimeValid, onAddParallelSession, onToggleSessionExpand, formatTimeRange, getLocationLabel, getSessionTypeLabel]
  )

  return (
    <div className="flex items-stretch gap-6">
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
        {/* Parent Session Card */}
        <div className="border border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
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
                  <h3 className="font-semibold text-slate-900 text-base">{session.title}</h3>
                </div>
              </div>
              <div className="flex items-center">
                <SessionMenuDropdown
                  session={session}
                  isOpen={menuOpenForId === session.id}
                  onToggle={() => setMenuOpenForId((id) => (id === session.id ? null : session.id))}
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
                
                {/* Session Type Badge */}
                {session.sessionType && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {session.sessionType === 'keynote' ? (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <User01 className="h-3.5 w-3.5" />
                    )}
                    {getSessionTypeLabel(session.sessionType)}
                  </span>
                )}
              </div>

              {/* + Button - Only show if no parallel sessions exist */}
              {showAddButton && (
                <button
                  type="button"
                  onClick={() => onAddParallelSession?.(session.id)}
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

            {/* Footer - Attachment Badge and Expand/Collapse Arrow */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <Attachment01 className="h-3.5 w-3.5" />
                {session.attachments?.length || 0}
              </span>
              {showExpandButton && (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>

            {/* Child sessions inside parent card */}
            {hasParallelSessions && isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-200">
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
  onSessionClick
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
    setExpandedSessions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId)
      } else {
        newSet.add(sessionId)
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
            const isExpanded = expandedSessions.has(session.id)
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
                onToggleExpand={() => toggleExpand(session.id)}
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
                isSessionExpanded={(id) => expandedSessions.has(id)}
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
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default ScheduleGrid
