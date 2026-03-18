import React, { useMemo, useEffect, useCallback, startTransition } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import ScheduleContent from './ScheduleContent'
import SessionSlideout from './SessionSlideout'
import TemplateSessionSlideout, { type TemplateSessionData } from './TemplateSessionSlideout'
import ScheduleDetailsSlideout from './ScheduleDetailsSlideout'
import SavedSchedulesTable from './SavedSchedulesTable'
import ConfirmDeleteModal from '../../ui/ConfirmDeleteModal'
import { SavedSchedule, SavedSession, SessionDraft } from './sessionTypes'
import { defaultSessionDraft } from './sessionConfig'
import { defaultCards, ContentCard } from '../EventHubContent'
import { InfoCircle, CodeBrowser, Globe01 } from '@untitled-ui/icons-react'
import { API_ENDPOINTS } from '../../../config/env'
import { showToast } from '../../../utils/toast'
import { fetchTimezones } from '../../../services/timezoneService'
import {
  listSessions,
  getSession,
  createSession,
  updateSession,
  createSessionSections,
  updateSessionSection,
  deleteSessionSection,
  createSessionResources,
  updateSessionResource,
  deleteSessionResource,
  getSessionUuidFromResponse,
  findSessionUuidFromList,
  deleteSession as deleteSessionApi,
  fetchSessionTags,
  fetchSessionLocations,
  type SessionTagOption,
  type CreateSessionBody,
  type UpdateSessionBody,
  type CreateSessionSectionsBody
} from '../../../services/sessionService'
// XLSX is dynamically imported when needed (see storeExcelParentMap)
import { writeEventStoreJSON } from '../../../utils/eventLocalStore'
import { fetchEvent } from '../../../services/eventService'
import type { EventData } from '../../../services/eventService'
// Import extracted utilities
import {
  buildSessionSignature,
  toUTCISO,
  toUTCISOFrom24h
} from './utils/sessionUtils'
import { mapRetrieveSessionToDraft } from './utils/sessionMappers'
import {
  collectFilesFromSections,
  extractUrlsFromResourcesResponse,
  extractResourceIdsFromResponse,
  getOrderedResourceIdsOrIndices,
  getVideoFileIndicesInFlattenedFiles,
  toApiSectionType,
  buildOneSectionPayload,
  buildSectionsPayload
} from './utils/sessionPayloadBuilders'
import { UUID_REGEX, DEFAULT_EVENT_TIMEZONE } from './utils/sessionConstants'
import { storeExcelParentMap as storeExcelParentMapUtil } from './utils/excelSessionImport'

interface SchedulePageProps {
  eventName?: string
  isDraft?: boolean
  onBackClick?: () => void
  userAvatarUrl?: string
  scheduleName?: string
  onCardClick?: (cardId: string) => void
  hideNavbarAndSidebar?: boolean
}

const SchedulePage: React.FC<SchedulePageProps> = ({
  eventName: propEventName,
  isDraft: propIsDraft,
  onBackClick,
  userAvatarUrl,
  scheduleName,
  onCardClick,
  hideNavbarAndSidebar = false
}) => {
  // Get eventData and createdEvent from context to maintain consistency with EventHubPage navbar
  const { eventData, createdEvent } = useEventForm()

  const [eventTimeZone, setEventTimeZone] = React.useState<string | null>(null)
  // Fetched event details for date range so weekday selector always shows the correct event's dates when switching
  const [eventDetailsForRange, setEventDetailsForRange] = React.useState<EventData | null>(null)


  const storeExcelParentMap = useCallback(
    (file: File, eventUuid: string, scheduleUuid: string) =>
      storeExcelParentMapUtil(file, eventUuid, scheduleUuid),
    []
  )

  // Resolve event timezone (IANA name) from timezone UUID
  useEffect(() => {
    const timezoneUuid =
      (createdEvent as any)?.timezoneId ??
      (createdEvent as any)?.timezone_id ??
      (createdEvent as any)?.timezone ??
      eventData?.timezone ??
      null

    if (!timezoneUuid) {
      setEventTimeZone(DEFAULT_EVENT_TIMEZONE)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const timezones = await fetchTimezones()
        const match = timezones.find((tz) => tz.uuid === String(timezoneUuid))
        const name = match?.name ?? null
        if (!cancelled) {
          setEventTimeZone(name ?? DEFAULT_EVENT_TIMEZONE)
          console.log('🕒 [Schedules] Resolved event timezone:', { timezoneUuid, name: name ?? DEFAULT_EVENT_TIMEZONE })
        }
      } catch (e) {
        if (!cancelled) {
          setEventTimeZone(DEFAULT_EVENT_TIMEZONE)
          console.log('⚠️ [Schedules] Failed to resolve timezone, using default Asia/Kolkata:', {
            timezoneUuid,
            error: e
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [createdEvent, eventData?.timezone])
  
  // Prefer selected event from API (`createdEvent`) over draft form state (`eventData`)
  const eventName = createdEvent?.eventName || eventData?.eventName || propEventName || 'Highly important conference of 2025'
  const isDraft = propIsDraft !== undefined ? propIsDraft : true
  const eventStatus = (createdEvent as { status?: string } | null)?.status ?? (eventData as { status?: string } | null)?.status
  const handleSearchClick = () => {
    console.log('Search clicked')
  }

  const handleNotificationClick = () => {
    console.log('Notification clicked')
  }

  const handleProfileClick = () => {
    console.log('Profile clicked')
  }

  // Convert cards to sidebar sub-items
  const sidebarItems = useMemo(() => {
    const eventHubSubItems = defaultCards.map((card: ContentCard) => ({
      id: card.id,
      label: card.title,
      icon: card.icon
    }))

    return [
      { id: 'summary', label: 'Summary', icon: <InfoCircle className="h-5 w-5" /> },
      { id: 'event-website', label: 'Event website', icon: <CodeBrowser className="h-5 w-5" /> },
      {
        id: 'event-hub',
        label: 'Event Hub',
        icon: <Globe01 className="h-5 w-5" />,
        subItems: eventHubSubItems
      }
    ]
  }, [])

  const handleSidebarItemClick = (itemId: string) => {
    console.log('Sidebar item clicked:', itemId)
    
    // If clicking on event-hub, navigate back to event hub page
    if (itemId === 'event-hub' && onBackClick) {
      onBackClick()
      return
    }
    
    // If clicking on a different card, navigate to it
    if (itemId !== 'schedule-session') {
      const isCardId = defaultCards.some((card) => card.id === itemId)
      if (isCardId && onCardClick) {
        onCardClick(itemId)
      }
    }
  }

  const handleUpload = () => {
    console.log('Upload clicked')
    // TODO: Implement upload functionality
  }

  const [savedSchedules, setSavedSchedules] = React.useState<SavedSchedule[]>([])
  const [currentScheduleName, setCurrentScheduleName] = React.useState(scheduleName || 'Schedule 1')
  const [isSessionSlideoutOpen, setIsSessionSlideoutOpen] = React.useState(false)
  const [isTemplateSessionSlideoutOpen, setIsTemplateSessionSlideoutOpen] = React.useState(false)
  const [isScheduleDetailsSlideoutOpen, setIsScheduleDetailsSlideoutOpen] = React.useState(false)
  const [editingScheduleId, setEditingScheduleId] = React.useState<string | null>(null)
  const [scheduleDetailsInitialDetails, setScheduleDetailsInitialDetails] = React.useState<{
    title: string
    tags: string[]
    location: string[]
    description: string
  } | null>(null)
  const [activeScheduleId, setActiveScheduleId] = React.useState<string | null>(null)
  const [activeDraft, setActiveDraft] = React.useState<SessionDraft | null>(null)
  const [startInEditMode, setStartInEditMode] = React.useState(true)
  const [currentView, setCurrentView] = React.useState<'table' | 'content'>('table')
  const [availableTags, setAvailableTags] = React.useState<string[]>([])
  const [availableSessionTags, setAvailableSessionTags] = React.useState<SessionTagOption[]>([])
  const [availableLocations, setAvailableLocations] = React.useState<string[]>([])
  const [sessionToDelete, setSessionToDelete] = React.useState<SavedSession | null>(null)
  const [scheduleToDelete, setScheduleToDelete] = React.useState<SavedSchedule | null>(null)
  const [isDeletingSession, setIsDeletingSession] = React.useState(false)
  const [isDeletingSchedule, setIsDeletingSchedule] = React.useState(false)
  const [sessionDraftLoading, setSessionDraftLoading] = React.useState(false)

  // Parse event date as local calendar date (no UTC shift). Handles YYYY-MM-DD and ISO strings like 2026-02-02T00:00:00Z.
  // Note: This is a specialized version for event dates, different from the generic parseEventDate utility
  const parseEventDateLocal = React.useCallback((raw: unknown): Date | null => {
    const r = raw != null ? String(raw).trim() : ''
    if (!r) return null
    const datePart = r.slice(0, 10)
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const day = parseInt(match[3], 10)
      const d = new Date(year, month, day)
      if (Number.isNaN(d.getTime())) return null
      return d
    }
    const d = new Date(r as string)
    if (Number.isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  
  // Alias for consistency - parseEventDateLocal is the specialized version for event dates
  const parseEventDate = parseEventDateLocal

  // Fetch event details when event changes so date range is always correct (avoids stale context/localStorage)
  const currentEventUuid = (createdEvent as any)?.uuid
  React.useEffect(() => {
    if (!currentEventUuid) {
      setEventDetailsForRange(null)
      return
    }
    let cancelled = false
    fetchEvent(currentEventUuid)
      .then((data) => {
        if (!cancelled && data?.uuid === currentEventUuid) setEventDetailsForRange(data)
      })
      .catch(() => {
        if (!cancelled) setEventDetailsForRange(null)
      })
    return () => { cancelled = true }
  }, [currentEventUuid])

  // Load session tags and locations from API when a schedule is selected (for add/edit session slideout).
  React.useEffect(() => {
    const eventUuid = createdEvent?.uuid
    const scheduleUuid = activeScheduleId
    if (!eventUuid || !scheduleUuid) return

    let cancelled = false
    Promise.all([
      fetchSessionTags(eventUuid),
      fetchSessionLocations(eventUuid, scheduleUuid)
    ]).then(([apiTagOptions, apiLocations]) => {
      if (cancelled) return
      const schedule = savedSchedules.find((s) => String(s.id) === String(scheduleUuid))
      const fromSchedule = {
        locations: Array.isArray(schedule?.availableLocations) ? schedule.availableLocations : []
      }
      const mergeLoc = (a: string[], b: string[]) => {
        const set = new Set<string>()
        ;[...a, ...b].forEach((s) => s && set.add(String(s).trim()))
        return Array.from(set).filter(Boolean)
      }
      setAvailableSessionTags(Array.isArray(apiTagOptions) ? apiTagOptions : [])
      setAvailableLocations(mergeLoc(apiLocations, fromSchedule.locations))
    }).catch(() => {
      if (!cancelled) {
        const schedule = savedSchedules.find((s) => String(s.id) === String(scheduleUuid))
        setAvailableSessionTags([])
        setAvailableLocations(schedule?.availableLocations ?? [])
      }
    })
    return () => { cancelled = true }
  }, [createdEvent?.uuid, activeScheduleId, savedSchedules])

  // When session or template slideout opens, refresh tags/locations so add-child, create-from-scratch, and template always have the list.
  React.useEffect(() => {
    const eventUuid = createdEvent?.uuid
    const scheduleUuid = activeScheduleId
    if (!eventUuid || !scheduleUuid) return
    if (!isSessionSlideoutOpen && !isTemplateSessionSlideoutOpen) return

    let cancelled = false
    Promise.all([
      fetchSessionTags(eventUuid),
      fetchSessionLocations(eventUuid, scheduleUuid)
    ]).then(([apiTagOptions, apiLocations]) => {
      if (cancelled) return
      const schedule = savedSchedules.find((s) => String(s.id) === String(scheduleUuid))
      const fromSchedule = {
        locations: Array.isArray(schedule?.availableLocations) ? schedule.availableLocations : []
      }
      const mergeLoc = (a: string[], b: string[]) => {
        const set = new Set<string>()
        ;[...a, ...b].forEach((s) => s && set.add(String(s).trim()))
        return Array.from(set).filter(Boolean)
      }
      setAvailableSessionTags(Array.isArray(apiTagOptions) ? apiTagOptions : [])
      setAvailableLocations(mergeLoc(apiLocations, fromSchedule.locations))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [isSessionSlideoutOpen, isTemplateSessionSlideoutOpen, createdEvent?.uuid, activeScheduleId, savedSchedules])

  // Use fetched event first so weekday selector shows the correct event's dates when switching.
  // Support API fields: event_date, startDate, start_date, startDateTimeISO (use date part).
  const parseEventStartDate = React.useCallback((): Date | null => {
    const source = eventDetailsForRange?.uuid === currentEventUuid ? eventDetailsForRange : createdEvent
    const raw =
      (source as any)?.event_date ??
      (source as any)?.startDate ??
      (source as any)?.start_date ??
      (source as any)?.startDateTimeISO ??
      (eventData as any)?.event_date ??
      (eventData as any)?.startDate ??
      (eventData as any)?.start_date
    return parseEventDate(raw)
  }, [createdEvent, eventData, eventDetailsForRange, currentEventUuid, parseEventDate])

  const parseEventEndDate = React.useCallback((): Date | null => {
    const source = eventDetailsForRange?.uuid === currentEventUuid ? eventDetailsForRange : createdEvent
    const raw =
      (source as any)?.end_date ??
      (source as any)?.endDate ??
      (source as any)?.endDateTimeISO ??
      (eventData as any)?.end_date ??
      (eventData as any)?.endDate
    return parseEventDate(raw)
  }, [createdEvent, eventData, eventDetailsForRange, currentEventUuid, parseEventDate])

  // Memoize range dates so we don't create new Date instances every render.
  // If API only returns event_date (no end_date), use event start as end so weekday selector still gets a range.
  // Include createdEvent?.uuid in deps so range updates when switching events
  const rangeStartDate = useMemo(() => parseEventStartDate() || undefined, [parseEventStartDate, (createdEvent as any)?.uuid])
  const rangeEndDate = useMemo(() => {
    const end = parseEventEndDate()
    if (end) return end
    const start = parseEventStartDate()
    return start ?? undefined
  }, [parseEventStartDate, parseEventEndDate, (createdEvent as any)?.uuid])

  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    const eventStart = parseEventStartDate()
    if (eventStart) return eventStart
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  })
  const [parentSessionId, setParentSessionId] = React.useState<string | undefined>(undefined)
  const hasAutoSyncedSelectedDateRef = React.useRef(false)

  // When the user switches event, sync selected date to that event's start so the weekday selector shows the correct event dates.
  React.useEffect(() => {
    const eventStart = parseEventStartDate()
    if (!eventStart) return
    setSelectedDate(eventStart)
  }, [(createdEvent as any)?.uuid, parseEventStartDate])

  // After refresh, selectedDate becomes "today". If today's date has no sessions, the grid looks empty.
  // Auto-pick a day that has sessions, but only within the event date range (never use schedule-created or out-of-range dates).
  React.useEffect(() => {
    const schedule =
      (activeScheduleId ? savedSchedules.find((s) => String(s.id) === String(activeScheduleId)) : undefined) ??
      savedSchedules[0]
    if (!schedule) return
    const list = Array.isArray(schedule.sessions) ? schedule.sessions : []
    if (list.length === 0) return

    const eventStart = parseEventStartDate()
    const eventEnd = parseEventEndDate()

    const dates: Date[] = []
    for (const s of list) {
      if (!s?.date) continue
      const d = new Date(s.date as any)
      if (Number.isNaN(d.getTime())) continue
      d.setHours(0, 0, 0, 0)
      // Only include session dates that fall within the event range (ignore schedule-created or wrong dates)
      if (eventStart && eventEnd) {
        const t = d.getTime()
        if (t < eventStart.getTime() || t > eventEnd.getTime()) continue
      }
      dates.push(d)
    }
    if (dates.length === 0) return
    dates.sort((a, b) => a.getTime() - b.getTime())

    const normalizedSelected = new Date(selectedDate)
    normalizedSelected.setHours(0, 0, 0, 0)
    const hasSelected = dates.some((d) => d.getTime() === normalizedSelected.getTime())

    // Only auto-sync once after data loads; after that, let the user freely pick empty days.
    if (!hasSelected && !hasAutoSyncedSelectedDateRef.current) {
      // Prefer first session day within event range; if we have event range and selected is outside, use event start
      if (eventStart && (normalizedSelected.getTime() < eventStart.getTime() || (eventEnd && normalizedSelected.getTime() > eventEnd.getTime()))) {
        setSelectedDate(eventStart)
      } else {
        setSelectedDate(dates[0])
      }
      hasAutoSyncedSelectedDateRef.current = true
    }
  }, [activeScheduleId, savedSchedules, selectedDate, parseEventStartDate, parseEventEndDate])

  // Reset the "auto-sync once" flag when event or schedule changes so a new schedule can pick a sensible initial day.
  React.useEffect(() => {
    hasAutoSyncedSelectedDateRef.current = false
  }, [activeScheduleId, (createdEvent as any)?.uuid])

  const loadSchedules = useCallback(async () => {
    const eventUuid = createdEvent?.uuid
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')

    if (!eventUuid || !accessToken || !organizationUuid) {
      console.log('⚠️ [Schedules] LIST skipped (missing context):', {
        eventUuid,
        hasAccessToken: Boolean(accessToken),
        hasOrganizationUuid: Boolean(organizationUuid)
      })
      return
    }

    try {
      const url = API_ENDPOINTS.SCHEDULES.LIST(eventUuid)
      console.log('📥 [Schedules] LIST request:', { url, eventUuid })

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Organization': organizationUuid
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.log('❌ [Schedules] LIST failed:', {
          status: response.status,
          statusText: response.statusText,
          rawText: errorText
        })
        return
      }

      const rawText = await response.text().catch(() => '')
      let data: any = null
      try {
        data = rawText ? JSON.parse(rawText) : null
      } catch {
        data = null
      }

      console.log('✅ [Schedules] LIST response:', {
        status: response.status,
        statusText: response.statusText,
        rawText,
        parsed: data
      })

      const extractArray = (payload: any): any[] => {
        if (!payload) return []
        if (Array.isArray(payload)) return payload
        if (payload.status === 'success' && Array.isArray(payload.data)) return payload.data
        if (payload.status === 'success' && Array.isArray(payload.data?.results)) return payload.data.results
        if (payload.status === 'success' && Array.isArray(payload.data?.data)) return payload.data.data
        if (payload.status === 'success' && Array.isArray(payload.data?.data?.results)) return payload.data.data.results
        if (Array.isArray(payload.results)) return payload.results
        if (Array.isArray(payload.data?.results)) return payload.data.results
        if (Array.isArray(payload.data)) return payload.data
        if (Array.isArray(payload.data?.data)) return payload.data.data
        if (Array.isArray(payload.data?.data?.results)) return payload.data.data.results
        return []
      }

      const items = extractArray(data)
      console.log('📦 [Schedules] LIST extracted items:', {
        count: items.length,
        sample: items[0]
      })
      const mapped: SavedSchedule[] = items.map((s: any) => {
        const id = String(s?.uuid ?? s?.id ?? `schedule-${Math.random().toString(36).slice(2)}`)
        const name = s?.name ?? s?.title ?? 'Schedule'
        const tags: string[] = Array.isArray(s?.tags) ? s.tags : Array.isArray(s?.availableTags) ? s.availableTags : []
        const locations: string[] = Array.isArray(s?.locations) ? s.locations : Array.isArray(s?.availableLocations) ? s.availableLocations : []
        const description = s?.description ?? ''

        return {
          id,
          name,
          // Keep backward compatible session shape for existing UI filtering/search
          session: {
            ...defaultSessionDraft,
            title: name,
            tags,
            location: locations[0] ?? '',
            sections: description
              ? [
                  {
                    id: `section-${id}`,
                    type: 'text',
                    title: 'Description',
                    description
                  }
                ]
              : []
          },
          availableTags: tags,
          availableLocations: locations,
          // sessions list is managed locally in this UI for now
          sessions: []
        }
      })

      setSavedSchedules(mapped)
    } catch {
      // keep current UI state on failure
    }
  }, [createdEvent?.uuid])

  // Load schedules when event changes
  useEffect(() => {
    if (createdEvent?.uuid) {
      loadSchedules()
    }
  }, [createdEvent?.uuid, loadSchedules])

  // Delete schedule (DELETE schedules/{{schedule_uuid}}/?event_id={{event_uuid}})
  const handleConfirmDeleteSchedule = useCallback(async () => {
    const schedule = scheduleToDelete
    const eventUuid = createdEvent?.uuid
    if (!schedule || !eventUuid || isDeletingSchedule) return
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!accessToken || !organizationUuid) {
      showToast.error('Authentication required.')
      setScheduleToDelete(null)
      return
    }
    setIsDeletingSchedule(true)
    try {
      const url = API_ENDPOINTS.SCHEDULES.DELETE(schedule.id, eventUuid)
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Organization': organizationUuid
        },
        credentials: 'include'
      })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        showToast.error(text || 'Failed to delete schedule.')
        return
      }
      setSavedSchedules((prev) => prev.filter((s) => s.id !== schedule.id))
      if (activeScheduleId === schedule.id) {
        setActiveScheduleId(null)
      }
      setScheduleToDelete(null)
      showToast.success('Schedule deleted successfully')
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to delete schedule.')
    } finally {
      setIsDeletingSchedule(false)
    }
  }, [scheduleToDelete, createdEvent?.uuid, activeScheduleId, isDeletingSchedule])

  // Persist schedules + sessions for published website (no admin UI there)
  useEffect(() => {
    const eventUuidForStore = createdEvent?.uuid || localStorage.getItem('createdEventUuid') || 'unknown-event'
    // store full schedules including sessions (already sorted in loadSessions)
    writeEventStoreJSON(eventUuidForStore, 'schedule', savedSchedules)
    // also store a flattened sessions map for convenience
    const sessionsBySchedule: Record<string, SavedSession[]> = {}
    for (const s of savedSchedules) {
      sessionsBySchedule[s.id] = Array.isArray(s.sessions) ? s.sessions : []
    }
    writeEventStoreJSON(eventUuidForStore, 'sessions', sessionsBySchedule)
  }, [createdEvent?.uuid, savedSchedules])

  const loadSessions = useCallback(async (fallbackScheduleUuid?: string | null) => {
    const eventUuid = createdEvent?.uuid
    const scheduleUuid = fallbackScheduleUuid ?? activeScheduleId
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')

    if (!eventUuid || !accessToken || !organizationUuid) {
      return
    }
    if (!scheduleUuid) {
      return
    }

    try {
      console.log('📥 [Sessions] LIST request (env SESSIONS.LIST):', { eventUuid, scheduleUuid })
      const result = await listSessions(eventUuid, scheduleUuid)

      if (!result.ok) {
        console.log('❌ [Sessions] LIST failed:', {
          status: result.status,
          rawText: result.errorText
        })
        return
      }

      const data = result.data as any
      console.log('✅ [Sessions] LIST response:', { parsed: data })

      const extractArray = (payload: any): any[] => {
        if (!payload) return []
        if (Array.isArray(payload)) return payload
        if (payload.status === 'success' && Array.isArray(payload.data)) return payload.data
        if (payload.status === 'success' && Array.isArray(payload.data?.results)) return payload.data.results
        if (payload.status === 'success' && Array.isArray(payload.data?.sessions)) return payload.data.sessions
        if (Array.isArray(payload.results)) return payload.results
        if (Array.isArray(payload.data?.results)) return payload.data.results
        if (Array.isArray(payload.data)) return payload.data
        if (Array.isArray(payload.sessions)) return payload.sessions
        return []
      }

      const parseTime = (
        value: any,
        options?: { timeZone?: string }
      ): { time: string; period: 'AM' | 'PM'; source: string } => {
        const fallback = { time: '00:00', period: 'AM' as const, source: 'fallback' }
        if (value === null || value === undefined) return fallback

        const formatInZone = (date: Date, timeZone?: string) => {
          try {
            const formatted = new Intl.DateTimeFormat('en-US', {
              timeZone,
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).format(date)
            // ex: "09:00 AM"
            const m = formatted.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
            if (!m) return null
            const hh = String(m[1]).padStart(2, '0')
            const mm = m[2]
            const period = m[3].toUpperCase() as 'AM' | 'PM'
            return { time: `${hh}:${mm}`, period }
          } catch {
            return null
          }
        }

        // Date instance
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
          const zoned = formatInZone(value, options?.timeZone)
          if (zoned) return { ...zoned, source: options?.timeZone ? 'date_tz' : 'date' }
          const hours24 = value.getHours()
          const minutes = String(value.getMinutes()).padStart(2, '0')
          const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
          let hours12 = hours24 % 12
          if (hours12 === 0) hours12 = 12
          const hh = String(hours12).padStart(2, '0')
          return { time: `${hh}:${minutes}`, period, source: 'date' }
        }

        // Excel time as number (fraction of day)
        if (typeof value === 'number' && Number.isFinite(value)) {
          if (value >= 0 && value < 1) {
            const totalMinutes = Math.round(value * 24 * 60)
            const hours24 = Math.floor(totalMinutes / 60) % 24
            const minutes = String(totalMinutes % 60).padStart(2, '0')
            const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
            let hours12 = hours24 % 12
            if (hours12 === 0) hours12 = 12
            const hh = String(hours12).padStart(2, '0')
            return { time: `${hh}:${minutes}`, period, source: 'excel_number' }
          }
          // If backend sends minutes since midnight
          if (value >= 0 && value < 24 * 60) {
            const hours24 = Math.floor(value / 60)
            const minutes = String(Math.round(value % 60)).padStart(2, '0')
            const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
            let hours12 = hours24 % 12
            if (hours12 === 0) hours12 = 12
            const hh = String(hours12).padStart(2, '0')
            return { time: `${hh}:${minutes}`, period, source: 'minutes_number' }
          }
        }

        const raw = String(value).trim()
        if (!raw) return fallback

        // ISO datetime / RFC date strings
        if (raw.includes('T') || raw.includes('Z') || raw.includes('+')) {
          const asDate = new Date(raw)
          if (!Number.isNaN(asDate.getTime())) {
            const zoned = formatInZone(asDate, options?.timeZone)
            if (zoned) return { ...zoned, source: options?.timeZone ? 'datetime_tz' : 'datetime_string' }
            const hours24 = asDate.getHours()
            const minutes = String(asDate.getMinutes()).padStart(2, '0')
            const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
            let hours12 = hours24 % 12
            if (hours12 === 0) hours12 = 12
            const hh = String(hours12).padStart(2, '0')
            return { time: `${hh}:${minutes}`, period, source: 'datetime_string' }
          }
        }

        // Examples: "2:30 PM", "02:30PM", "02:30:00 PM"
        const ampmMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i)
        if (ampmMatch) {
          const hh = String(ampmMatch[1]).padStart(2, '0')
          const mm = ampmMatch[2]
          const period = ampmMatch[4].toUpperCase() as 'AM' | 'PM'
          return { time: `${hh}:${mm}`, period, source: 'ampm_string' }
        }

        // Examples: "14:30", "14:30:00"
        const h24Match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
        if (h24Match) {
          let hours24 = Number(h24Match[1])
          const minutes = h24Match[2]
          const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
          hours24 = hours24 % 24
          let hours12 = hours24 % 12
          if (hours12 === 0) hours12 = 12
          const hh = String(hours12).padStart(2, '0')
          return { time: `${hh}:${minutes}`, period, source: '24h_string' }
        }

        return fallback
      }

      const addMinutesToTime = (
        time: { time: string; period: 'AM' | 'PM' },
        minutesToAdd: number
      ): { time: string; period: 'AM' | 'PM' } => {
        const [h, m] = time.time.split(':').map(Number)
        let hours24 = h % 12
        if (time.period === 'PM') hours24 += 12
        if (time.period === 'AM' && h === 12) hours24 = 0

        let total = hours24 * 60 + m + minutesToAdd
        total = ((total % (24 * 60)) + (24 * 60)) % (24 * 60)

        const nextHours24 = Math.floor(total / 60)
        const nextMinutes = String(total % 60).padStart(2, '0')
        const period: 'AM' | 'PM' = nextHours24 >= 12 ? 'PM' : 'AM'
        let hours12 = nextHours24 % 12
        if (hours12 === 0) hours12 = 12
        const hh = String(hours12).padStart(2, '0')
        return { time: `${hh}:${nextMinutes}`, period }
      }

      const normalizeTags = (tags: any): string[] => {
        if (!tags) return []
        if (Array.isArray(tags)) {
          return tags
            .map((t) => {
              if (typeof t === 'string') return t
              return t?.name ?? t?.title ?? t?.label ?? null
            })
            .filter(Boolean)
        }
        return []
      }

      const items = extractArray(data)
      console.log('📦 [Sessions] LIST extracted items:', {
        count: items.length,
        sample: items[0]
      })
      const hasBackendParentLinks = items.some((s: any) =>
        Boolean(
          s?.parent_session_uuid ??
            s?.parentSessionUuid ??
            s?.parent_id ??
            s?.parentId ??
            s?.parent_session_id ??
            s?.parentSessionId
        )
      )

      const mappedSessions = items
        .map((s: any) => {
          const id = String(s?.uuid ?? s?.id ?? `session-${Math.random().toString(36).slice(2)}`)
          const title = s?.title ?? s?.name ?? 'Session'
          const scheduleUuid =
            s?.schedule_uuid ??
            s?.scheduleUuid ??
            s?.schedule?.uuid ??
            s?.schedule?.id ??
            s?.schedule_id ??
            s?.scheduleId ??
            null

          const parentTitleRaw =
            s?.parent_session ??
            s?.parentSession ??
            s?.parent_session_title ??
            s?.parentSessionTitle ??
            s?.parent_session_name ??
            s?.parentSessionName ??
            s?.parent_title ??
            s?.parentTitle ??
            null
          const parentTitle =
            typeof parentTitleRaw === 'string' && parentTitleRaw.trim() ? parentTitleRaw.trim() : null

          const startCandidate =
            s?.start_time ??
            s?.startTime ??
            s?.start ??
            s?.start_at ??
            s?.starts_at ??
            s?.startAt ??
            s?.start_datetime ??
            s?.startDateTime ??
            s?.start_datetime_utc ??
            s?.startDatetime ??
            null

          const endCandidate =
            s?.end_time ??
            s?.endTime ??
            s?.end ??
            s?.end_at ??
            s?.ends_at ??
            s?.endAt ??
            s?.end_datetime ??
            s?.endDateTime ??
            s?.end_datetime_utc ??
            s?.endDatetime ??
            null

          // Use user's local time for time column (no event timezone)
          const start = parseTime(startCandidate)
          let end = parseTime(endCandidate)

          // If backend provides duration but not end_time, compute end_time.
          const durationMinutes =
            s?.duration_minutes ??
            s?.durationMinutes ??
            s?.duration_mins ??
            s?.durationMins ??
            s?.duration ??
            null
          if ((!endCandidate || end.source === 'fallback') && typeof durationMinutes === 'number' && Number.isFinite(durationMinutes)) {
            end = { ...addMinutesToTime(start, durationMinutes), source: 'duration_minutes' }
          }

          const rawDate =
            s?.date ??
            s?.session_date ??
            s?.day ??
            s?.start_date ??
            s?.startDate ??
            s?.start_datetime ??
            s?.startDateTime ??
            s?.start_at ??
            s?.starts_at ??
            null
          const rawStr = typeof rawDate === 'string' ? rawDate.trim() : ''
          const isYmdOnly = Boolean(rawStr && /^\d{4}-\d{2}-\d{2}$/.test(rawStr))
          const isIsoDateTime = Boolean(rawStr && /^\d{4}-\d{2}-\d{2}T/.test(rawStr))

          // Session day for grid: use UTC noon on that day so local getDate() equals API day in any timezone.
          let date: Date | undefined
          const parseYmdToUtcNoon = (ymd: string) => {
            const y = parseInt(ymd.slice(0, 4), 10)
            const m = parseInt(ymd.slice(5, 7), 10) - 1
            const day = parseInt(ymd.slice(8, 10), 10)
            if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(day)) return undefined
            const d = new Date(Date.UTC(y, m, day, 12, 0, 0))
            return Number.isNaN(d.getTime()) ? undefined : d
          }
          if (isYmdOnly) {
            date = parseYmdToUtcNoon(rawStr)
          } else if (isIsoDateTime) {
            const instant = new Date(rawStr)
            if (!Number.isNaN(instant.getTime()) && eventTimeZone) {
              try {
                const ymd = new Intl.DateTimeFormat('en-CA', {
                  timeZone: eventTimeZone,
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                }).format(instant)
                const [y, m, d] = ymd.split('-').map(Number)
                if (![y, m, d].some(Number.isNaN)) {
                  const localNoon = new Date(y, m - 1, d, 12, 0, 0)
                  if (!Number.isNaN(localNoon.getTime())) date = localNoon
                }
              } catch {
                // fallback to UTC date
              }
            }
            if (!date) {
              const ymd = rawStr.slice(0, 10)
              date = parseYmdToUtcNoon(ymd)
            }
          }
          if (!date && rawDate) {
            const rawDateObj = new Date(rawDate as any)
            if (!Number.isNaN(rawDateObj.getTime())) {
              if (eventTimeZone) {
                try {
                  const ymd = new Intl.DateTimeFormat('en-CA', {
                    timeZone: eventTimeZone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  }).format(rawDateObj)
                  const d = new Date(`${ymd}T00:00:00`)
                  if (!Number.isNaN(d.getTime())) {
                    d.setHours(0, 0, 0, 0)
                    date = d
                  }
                } catch {
                  rawDateObj.setHours(0, 0, 0, 0)
                  date = rawDateObj
                }
              } else {
                rawDateObj.setHours(0, 0, 0, 0)
                date = rawDateObj
              }
            }
          }

          const description = s?.description ?? s?.summary ?? ''
          const tags = normalizeTags(s?.tags)

          let sections: SavedSession['sections'] = Array.isArray(s?.sections)
            ? s.sections
            : description
              ? [
                  {
                    id: `section-${id}`,
                    type: 'text',
                    title: 'Description',
                    description
                  }
                ]
              : []

          // Ensure Speakers sections from list API are available on sessions (for grid display)
          const apiSectionsFromList: any[] = []

          const rawSections = (s as any)

          if (Array.isArray(rawSections?.sections)) {
            apiSectionsFromList.push(...rawSections.sections)
          }
          if (Array.isArray(rawSections?.session_sections)) {
            apiSectionsFromList.push(...rawSections.session_sections)
          }
          if (Array.isArray(rawSections?.session_sections?.results)) {
            apiSectionsFromList.push(...rawSections.session_sections.results)
          }
          if (Array.isArray(rawSections?.sections?.results)) {
            apiSectionsFromList.push(...rawSections.sections.results)
          }
          // Some list responses (e.g. templates) put speaker sections under a top-level `speakers` array
          if (Array.isArray(rawSections?.speakers)) {
            apiSectionsFromList.push(
              ...rawSections.speakers.map((sec: any) => ({
                section_type: sec?.section_type ?? 'speakers',
                ...sec
              }))
            )
          }

          if (Array.isArray(apiSectionsFromList) && apiSectionsFromList.length > 0) {
            apiSectionsFromList.forEach((sec: any, idx: number) => {
              const content = sec?.content && typeof sec.content === 'object' ? sec.content : {}
              const sectionType = (sec?.section_type ?? sec?.type ?? 'text').toString()
              const uiType =
                sectionType === 'poster'
                  ? 'slides'
                  : sectionType === 'image'
                    ? 'photo-gallery'
                    : sectionType === 'speakers'
                      ? 'speaker'
                      : sectionType === 'resource'
                        ? 'resources'
                        : sectionType

              // For now we only care about Speakers sections for the grid
              if (uiType !== 'speaker' && sectionType !== 'speakers') return

              const speakerUuids = content?.speaker_uuids ?? []
              const contentSpeakers = Array.isArray(content?.speakers) ? content.speakers : []
              const speakersWithRole =
                contentSpeakers.length > 0
                  ? contentSpeakers.map((sp: any) => ({
                      id: sp?.id ?? sp?.speaker_uuid ?? '',
                      name: sp?.name ?? '',
                      role: sp?.role ?? ''
                    }))
                  : (Array.isArray(speakerUuids) ? speakerUuids : []).map((sid: string) => ({
                      id: sid,
                      name: '',
                      role: ''
                    }))

              const sectionData: Record<string, unknown> = {
                ...content,
                speaker_uuids: Array.isArray(speakerUuids) ? speakerUuids : [],
                speakers: speakersWithRole
              }

              sections = [
                ...sections,
                {
                  id: `section-${id}-speakers-${idx}`,
                  type: uiType,
                  title: (content?.title ?? sec?.title ?? 'Speakers').toString(),
                  description: (content?.body ?? sec?.description ?? '').toString(),
                  data: sectionData
                }
              ]
            })
          }

          // Merge session_resources: video files → Video section, others → Resources section
          const apiResources = Array.isArray(s?.session_resources) ? s.session_resources : Array.isArray(s?.resources) ? s.resources : Array.isArray(s?.resource_files) ? s.resource_files : []
          const videoExtRe = /\.(mp4|webm|mov|ogg|m4v|ogv)(\?|$)/i
          if (apiResources.length > 0) {
            const resourceFiles = apiResources.map((r: any) =>
              typeof r === 'string' ? { url: r, name: r?.split?.('/')?.pop?.() ?? 'File' } : { url: r?.file_url ?? r?.url ?? r?.file, name: r?.file_name ?? r?.name ?? (r?.url ?? r?.file_url ?? r?.file)?.split?.('/')?.pop?.() ?? 'File' }
            )
            const videoFiles = resourceFiles.filter((item: { url?: string; name?: string }) => videoExtRe.test(String(item?.url ?? '')) || videoExtRe.test(String(item?.name ?? '')))
            const nonVideoFiles = resourceFiles.filter((item: { url?: string; name?: string }) => !videoExtRe.test(String(item?.url ?? '')) && !videoExtRe.test(String(item?.name ?? '')))
            if (videoFiles.length > 0) {
              const videoUrl = videoFiles[0]?.url ?? ''
              const videoSection = sections.find((sec: any) => sec.type === 'video')
              if (videoSection) {
                sections = sections.map((sec: any) =>
                  sec.type === 'video' ? { ...sec, data: { ...(sec.data || {}), videoUrl, video_url: videoUrl } } : sec
                )
              } else {
                sections = [...sections, { id: `section-${id}-video`, type: 'video', title: 'Video', description: '', data: { videoUrl, video_url: videoUrl } }]
              }
            }
            if (nonVideoFiles.length > 0) {
              const existingResources = sections.find((sec: any) => sec.type === 'resources')
              if (existingResources) {
                const current = (existingResources.data?.files as any[]) ?? []
                sections = sections.map((sec: any) =>
                  sec.type === 'resources' ? { ...sec, data: { ...(sec.data || {}), files: [...current, ...nonVideoFiles] } } : sec
                )
              } else {
                sections = [...sections, { id: `section-${id}-resources`, type: 'resources', title: 'Resources', description: '', data: { files: nonVideoFiles } }]
              }
            }
          }

          const session: SavedSession = {
            id,
            title,
            startTime: start.time,
            startPeriod: start.period,
            endTime: end.time,
            endPeriod: end.period,
            location: s?.location ?? s?.venue ?? '',
            sessionType: s?.session_type ?? s?.sessionType ?? s?.type ?? '',
            tags,
            sections,
            attachment_count:
              typeof s?.attachment_count === 'number'
                ? s.attachment_count
                : Array.isArray(s?.attachments)
                  ? s.attachments.length
                  : 0,
            attachments: Array.isArray(s?.attachments) ? s.attachments : [],
            date: date && !Number.isNaN(date.getTime()) ? date : undefined,
            parentId: (() => {
              const raw =
                s?.parent_session_uuid ??
                s?.parentSessionUuid ??
                s?.parent_id ??
                s?.parentId ??
                s?.parent_session_id ??
                s?.parentSessionId ??
                s?.parent_session ??
                s?.parentSession ??
                undefined
              if (raw == null) return undefined
              if (typeof raw === 'string') return raw.trim() || undefined
              if (typeof raw === 'number') return String(raw)
              if (typeof raw === 'object' && raw !== null) {
                const u = (raw as any)?.uuid ?? (raw as any)?.id
                return u != null ? String(u) : undefined
              }
              return undefined
            })()
          }

          return { scheduleUuid, session, parentTitle }
        })
        .filter((x: any) => x?.session)

      // Dedupe exact duplicates from repeated imports (same title/time/location/type/day)
      const deduped: typeof mappedSessions = []
      const seen = new Set<string>()
      const dedupedParentUuidMap = new Map<string, string>() // duplicateParentUuid -> keptParentUuid
      for (const item of mappedSessions) {
        const dateKey = item.session?.date ? (item.session.date as Date).toISOString().slice(0, 10) : 'unknown-day'
        const sig = buildSessionSignature({
          dateKey,
          title: item.session.title,
          location: item.session.location ?? '',
          startTime: item.session.startTime,
          startPeriod: item.session.startPeriod || 'AM',
          endTime: item.session.endTime,
          endPeriod: item.session.endPeriod || 'AM'
        })
        const t = String(item.session.sessionType ?? '').toLowerCase()
        const unique = `${item.scheduleUuid ?? ''}::${sig}::${t}`
        if (seen.has(unique)) {
          // If we are deduping duplicate parents, remember which UUID we kept so children can be remapped.
          if (t === 'parent') {
            const kept = deduped.find((d) => {
              const dDateKey = d.session?.date ? (d.session.date as Date).toISOString().slice(0, 10) : 'unknown-day'
              const dSig = buildSessionSignature({
                dateKey: dDateKey,
                title: d.session.title,
                location: d.session.location ?? '',
                startTime: d.session.startTime,
                startPeriod: d.session.startPeriod || 'AM',
                endTime: d.session.endTime,
                endPeriod: d.session.endPeriod || 'AM'
              })
              const dt = String(d.session.sessionType ?? '').toLowerCase()
              return dt === 'parent' && dSig === sig && (d.scheduleUuid ?? '') === (item.scheduleUuid ?? '')
            })
            if (kept) {
              dedupedParentUuidMap.set(String(item.session.id), String(kept.session.id))
            }
          }
          continue
        }
        seen.add(unique)
        deduped.push(item)
      }

      if (deduped.length !== mappedSessions.length) {
        console.log('🧹 [Sessions] Deduped sessions:', {
          before: mappedSessions.length,
          after: deduped.length
        })
      }

      // If backend returns parent_session_uuid but the parent row was deduped away, remap child.parentId
      if (dedupedParentUuidMap.size > 0) {
        let remapped = 0
        for (const item of deduped) {
          if (!item.session.parentId) continue
          const mapped = dedupedParentUuidMap.get(String(item.session.parentId))
          if (mapped) {
            item.session.parentId = mapped
            remapped += 1
          }
        }
        if (remapped > 0) {
          console.log('🔁 [Sessions] Remapped children to deduped parents:', { remapped })
        }
      }

      // Apply Excel parent mapping if available (backend list response doesn't include parent reference).
      // This is the only way to match the Excel "Parent Session" column rule.
      const excelKey = fallbackScheduleUuid && createdEvent?.uuid
        ? `session-import-map:${createdEvent.uuid}:${fallbackScheduleUuid}`
        : null
      let excelMapEntries: Array<any> = []
      if (excelKey) {
        try {
          const raw = localStorage.getItem(excelKey)
          const parsed = raw ? JSON.parse(raw) : null
          excelMapEntries = Array.isArray(parsed?.entries) ? parsed.entries : []
          console.log('🧾 [Sessions] Loaded Excel parent map:', { excelKey, count: excelMapEntries.length })
        } catch {
          excelMapEntries = []
        }
      }

      // Index Excel rows in a few ways so minor differences (location text, etc) don't break matching.
      // Prefer exact signature first, then relax.
      const excelBySig = new Map<string, any>()
      const excelByRelaxed1 = new Map<string, any>() // dateKey||title||start||end
      const excelByRelaxed2 = new Map<string, any>() // dateKey||title||start
      for (const e of excelMapEntries) {
        const sig = e?.signature ? String(e.signature) : null
        const dateKey = e?.dateKey ? String(e.dateKey) : null
        const title = e?.title ? String(e.title).trim() : null
        if (sig) excelBySig.set(sig, e)
        if (dateKey && title && e?.startTime && e?.startPeriod && e?.endTime && e?.endPeriod) {
          const startKey = `${e.startTime} ${e.startPeriod}`
          const endKey = `${e.endTime} ${e.endPeriod}`
          excelByRelaxed1.set(`${dateKey}||${title}||${startKey}||${endKey}`, e)
          excelByRelaxed2.set(`${dateKey}||${title}||${startKey}`, e)
        }
      }

      // Build parent lookup by (day,title) from deduped sessions
      const parentsByDayTitle = new Map<string, SavedSession[]>()
      for (const item of deduped) {
        const dateKey = item.session?.date ? (item.session.date as Date).toISOString().slice(0, 10) : 'unknown-day'
        const key = `${dateKey}::${String(item.session.title).trim()}`
        const type = String(item.session.sessionType ?? '').toLowerCase()
        if (type !== 'parent') continue
        const arr = parentsByDayTitle.get(key) ?? []
        arr.push(item.session)
        parentsByDayTitle.set(key, arr)
      }
      // sort parents list by start time
      parentsByDayTitle.forEach((arr) => {
        arr.sort((a, b) => {
          const am = (a.startPeriod === 'PM' && a.startTime !== '12:00' ? 12 * 60 : 0)
          const bm = (b.startPeriod === 'PM' && b.startTime !== '12:00' ? 12 * 60 : 0)
          const [ah, amin] = a.startTime.split(':').map(Number)
          const [bh, bmin] = b.startTime.split(':').map(Number)
          return (am + ah * 60 + amin) - (bm + bh * 60 + bmin)
        })
      })

      const timeToMinutes = (time: string, period: 'AM' | 'PM'): number => {
        const [hoursRaw, minsRaw] = time.split(':')
        const hours = Number(hoursRaw)
        const mins = Number(minsRaw)
        let total = hours * 60 + mins
        if (period === 'PM' && hours !== 12) total += 12 * 60
        if (period === 'AM' && hours === 12) total = mins
        return total
      }

      // Attach children using Excel mapping (fallback only when backend doesn't provide parent references)
      let excelMatchedExact = 0
      let excelMatchedRelaxed1 = 0
      let excelMatchedRelaxed2 = 0
      let excelLinked = 0
      if (!hasBackendParentLinks && excelMapEntries.length > 0) {
        for (const item of deduped as any[]) {
          const dateKey = item.session?.date ? (item.session.date as Date).toISOString().slice(0, 10) : 'unknown-day'
          const startKey = `${item.session.startTime} ${item.session.startPeriod || 'AM'}`
          const endKey = `${item.session.endTime} ${item.session.endPeriod || 'AM'}`
          const sig = buildSessionSignature({
            dateKey,
            title: item.session.title,
            location: item.session.location ?? '',
            startTime: item.session.startTime,
            startPeriod: item.session.startPeriod || 'AM',
            endTime: item.session.endTime,
            endPeriod: item.session.endPeriod || 'AM'
          })
          let excel = excelBySig.get(sig)
          if (excel) {
            excelMatchedExact += 1
          } else {
            const relax1 = `${dateKey}||${String(item.session.title).trim()}||${startKey}||${endKey}`
            excel = excelByRelaxed1.get(relax1)
            if (excel) {
              excelMatchedRelaxed1 += 1
            } else {
              const relax2 = `${dateKey}||${String(item.session.title).trim()}||${startKey}`
              excel = excelByRelaxed2.get(relax2)
              if (excel) excelMatchedRelaxed2 += 1
            }
          }
          if (!excel) continue

          // Enforce correct model from Excel (source of truth):
          // - Parent row: must not have parentId
          // - Child row: must have parentId when parent exists
          item.session.sessionType = excel.sessionType
          if (excel.sessionType === 'parent') {
            item.session.parentId = undefined
          }

          if (excel.sessionType === 'child' && excel.parentTitle) {
            const parentKey = `${dateKey}::${String(excel.parentTitle).trim()}`
            const candidates = parentsByDayTitle.get(parentKey) ?? []
            // Excel is the source of truth for parent linkage.
            // If multiple parents have the same title on the same day (duplicate imports),
            // pick the closest parent whose start is <= child start; otherwise fallback to first.
            const childStart = timeToMinutes(item.session.startTime, item.session.startPeriod || 'AM')
            let chosen: SavedSession | undefined
            let bestStart = -1
            for (const p of candidates) {
              const ps = timeToMinutes(p.startTime, p.startPeriod || 'AM')
              if (ps <= childStart && ps > bestStart) {
                bestStart = ps
                chosen = p
              }
            }
            const parent = chosen ?? candidates[0]

            if (parent) {
              item.session.parentId = parent.id
              excelLinked += 1
            } else {
              // If parent not found, render as standalone parent
              item.session.sessionType = 'parent'
              item.session.parentId = undefined
            }
          }
        }

        console.log('🧷 [Sessions] Excel match stats:', {
          excelMatchedExact,
          excelMatchedRelaxed1,
          excelMatchedRelaxed2,
          excelLinked
        })
      }

      const hasExcelMap = !hasBackendParentLinks && excelMapEntries.length > 0

      // If we have an Excel map, do NOT run any heuristic inference that can override the true mapping.
      // (The backend list response doesn't carry parent references, so Excel is the only truth.)
      // However, when there is NO Excel map, we still want to infer parent/child
      // relationships *per orphan child* even if some sessions already have
      // explicit backend parent links. This allows UI-created "parallel"
      // sessions (session_type === "child" but missing parent_session_uuid)
      // to attach to the previous root session, while preserving any existing
      // backend-provided parentId values.
      if (!hasExcelMap) {
        // 1) Prefer exact parent-title mapping (matches Excel rule) when API provides parent titles
        // 2) If no parent title is present, fall back to "last parent" inference using session_type ordering.
        const groupKeyFor = (scheduleUuid: string | null, date?: Date) => {
          const scheduleKey = scheduleUuid ?? (fallbackScheduleUuid ?? 'unknown-schedule')
          const dayKey = date ? date.toISOString().slice(0, 10) : 'unknown-day'
          return `${scheduleKey}::${dayKey}`
        }

        const grouped: Record<string, Array<{ scheduleUuid: string | null; session: SavedSession }>> = {}
        for (const item of deduped) {
          const key = groupKeyFor(item.scheduleUuid, item.session?.date as any)
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(item)
        }

        let titleLinkedCount = 0
        let orphanParentTitleCount = 0
        let inferredCount = 0
        Object.values(grouped).forEach((group) => {
          // keep stable-ish ordering for same start times by id
          group.sort((a, b) => {
            const am = timeToMinutes(a.session.startTime, a.session.startPeriod || 'AM')
            const bm = timeToMinutes(b.session.startTime, b.session.startPeriod || 'AM')
            if (am !== bm) return am - bm
            return String(a.session.id).localeCompare(String(b.session.id))
          })

          // Build lookup of possible parents by title (same group/day/schedule).
          const parentsByTitle = new Map<string, string>() // title -> id
          for (const item of group) {
            const t = String(item.session.title ?? '').trim()
            if (!t) continue
            const type = String(item.session.sessionType ?? '').toLowerCase()
            if (type === 'parent' || !item.session.parentId) {
              if (!parentsByTitle.has(t)) {
                parentsByTitle.set(t, item.session.id)
              }
            }
          }

          // First pass: link by parentTitle when available
          for (const item of group as any[]) {
            const pTitle = item.parentTitle as string | null
            if (!pTitle) continue
            if (item.session.parentId) continue
            const parentId = parentsByTitle.get(pTitle)
            if (parentId) {
              item.session.parentId = parentId
              titleLinkedCount += 1
            } else {
              const type = String(item.session.sessionType ?? '').toLowerCase()
              if (type === 'child') {
                item.session.sessionType = 'parent'
              }
              orphanParentTitleCount += 1
            }
          }

          // When API sends session_type "child" but parent_session_uuid is null, infer parent = last preceding root (same day/schedule).
          let lastRootId: string | null = null
          for (const item of group) {
            const type = String(item.session.sessionType ?? '').toLowerCase()
            const isChild = type === 'child'
            const hasExplicitParentTitle = Boolean((item as any).parentTitle)

            if (isChild && !hasExplicitParentTitle && !item.session.parentId && lastRootId) {
              item.session.parentId = lastRootId
              inferredCount += 1
            }
            if (!item.session.parentId) {
              lastRootId = item.session.id
            }
          }
        })

        if (titleLinkedCount > 0 || orphanParentTitleCount > 0) {
          console.log('🧷 [Sessions] parent-title linking:', {
            titleLinkedCount,
            orphanParentTitleCount
          })
        }
        if (inferredCount > 0) {
          console.log('🧬 [Sessions] inferred parentId for children:', { inferredCount })
        }
      }

      // Final safety pass:
      // - If a child has no valid parent, do NOT guess by time when backend provides explicit links
      //   (time-guessing can attach children to wrong parents). Render it as standalone parent instead.
      const allSessionIds = new Set(deduped.map((item) => String(item.session.id)))
      const parentsByIdGlobal = new Map<string, SavedSession>()
      const parentsByDay: Record<string, SavedSession[]> = {}
      for (const item of deduped) {
        const type = String(item.session.sessionType ?? '').toLowerCase()
        if (type !== 'parent') continue
        parentsByIdGlobal.set(String(item.session.id), item.session)
        const dayKey = item.session?.date ? (item.session.date as Date).toISOString().slice(0, 10) : 'unknown-day'
        parentsByDay[dayKey] = parentsByDay[dayKey] ?? []
        parentsByDay[dayKey].push(item.session)
      }
      Object.keys(parentsByDay).forEach((dayKey) => {
        parentsByDay[dayKey].sort((a, b) => {
          const as = timeToMinutes(a.startTime, a.startPeriod || 'AM')
          const bs = timeToMinutes(b.startTime, b.startPeriod || 'AM')
          return as - bs
        })
      })

      const allowTimeParenting = !hasBackendParentLinks && !hasExcelMap
      let timeAttachedCount = 0
      let orphanToParentCount = 0
      for (const item of deduped) {
        const type = String(item.session.sessionType ?? '').toLowerCase()
        if (type !== 'child') continue

        const dayKey = item.session?.date ? (item.session.date as Date).toISOString().slice(0, 10) : 'unknown-day'
        const candidates = parentsByDay[dayKey] ?? []

        // Normalize parentId to string and only clear if parent is truly not in the list (use all session ids, not just type parent)
        const parentIdStr = item.session.parentId != null ? String(item.session.parentId) : ''
        if (parentIdStr && !allSessionIds.has(parentIdStr)) {
          item.session.parentId = undefined
        } else if (parentIdStr) {
          item.session.parentId = parentIdStr
        }

        if (!item.session.parentId) {
          if (!allowTimeParenting) {
            // orphan child -> standalone parent
            item.session.sessionType = 'parent'
            item.session.parentId = undefined
            orphanToParentCount += 1
            continue
          }

          const cs = timeToMinutes(item.session.startTime, item.session.startPeriod || 'AM')
          let ce = timeToMinutes(item.session.endTime, item.session.endPeriod || 'AM')
          if (ce < cs) ce += 24 * 60

          // choose the containing parent with latest start (closest)
          let best: SavedSession | null = null
          let bestStart = -1
          for (const p of candidates) {
            const ps = timeToMinutes(p.startTime, p.startPeriod || 'AM')
            let pe = timeToMinutes(p.endTime, p.endPeriod || 'AM')
            if (pe < ps) pe += 24 * 60
            if (cs >= ps && ce <= pe && ps > bestStart) {
              best = p
              bestStart = ps
            }
          }

          if (best) {
            item.session.parentId = best.id
            timeAttachedCount += 1
          } else {
            // orphan child -> standalone parent
            item.session.sessionType = 'parent'
            item.session.parentId = undefined
            orphanToParentCount += 1
          }
        }
      }
      if (timeAttachedCount > 0 || orphanToParentCount > 0) {
        console.log('🧭 [Sessions] time-based parenting:', { timeAttachedCount, orphanToParentCount })
      }

      // Quick health summary for debugging "missing" sessions
      const summary = (() => {
        let parents = 0
        let children = 0
        let childrenWithParent = 0
        let childrenWithoutParent = 0
        for (const item of deduped) {
          const t = String(item.session.sessionType ?? '').toLowerCase()
          if (t === 'parent') parents += 1
          if (t === 'child') {
            children += 1
            if (item.session.parentId) childrenWithParent += 1
            else childrenWithoutParent += 1
          }
        }
        return { parents, children, childrenWithParent, childrenWithoutParent }
      })()
      console.log('📊 [Sessions] final type summary:', summary)

      console.log('🧩 [Sessions] LIST mapped sessions:', {
        count: mappedSessions.length,
        sample: mappedSessions[0]
      })

      const sessionsBySchedule: Record<string, SavedSession[]> = {}
      for (const item of deduped) {
        // Prefer the schedule we requested so sessions attach to the correct schedule (schedule.id)
        const scheduleUuid =
          (fallbackScheduleUuid ?? null) ?? item.scheduleUuid ?? null
        if (!scheduleUuid) continue
        const key = String(scheduleUuid)
        if (!sessionsBySchedule[key]) sessionsBySchedule[key] = []
        sessionsBySchedule[key].push(item.session)
      }

      // Sort parents by start time, then children by start time within each parent
      Object.keys(sessionsBySchedule).forEach((scheduleId) => {
        const arr = sessionsBySchedule[scheduleId]
        const parentsById = new Map<string, SavedSession>()
        arr.forEach((s) => {
          if (!s.parentId) parentsById.set(s.id, s)
        })
        const startKey = (s: SavedSession) => timeToMinutes(s.startTime, s.startPeriod || 'AM')
        arr.sort((a, b) => {
          const aIsChild = Boolean(a.parentId)
          const bIsChild = Boolean(b.parentId)
          const aParent = a.parentId ? parentsById.get(a.parentId) : undefined
          const bParent = b.parentId ? parentsById.get(b.parentId) : undefined
          const aGroupTime = aIsChild && aParent ? startKey(aParent) : startKey(a)
          const bGroupTime = bIsChild && bParent ? startKey(bParent) : startKey(b)
          if (aGroupTime !== bGroupTime) return aGroupTime - bGroupTime
          // parents first
          if (aIsChild !== bIsChild) return aIsChild ? 1 : -1
          // then by own start time
          const aStart = startKey(a)
          const bStart = startKey(b)
          if (aStart !== bStart) return aStart - bStart
          return String(a.title).localeCompare(String(b.title))
        })
      })

      console.log('🗂️ [Sessions] LIST sessionsBySchedule keys:', Object.keys(sessionsBySchedule))

      setSavedSchedules((previous) => {
        const fallbackKey = fallbackScheduleUuid ? String(fallbackScheduleUuid) : null
        const updated = previous.map((schedule) => {
          const scheduleKey = String(schedule.id)
          const nextSessions =
            sessionsBySchedule[scheduleKey] ??
            (fallbackKey && scheduleKey === fallbackKey ? sessionsBySchedule[fallbackKey] : undefined)
          return nextSessions !== undefined
            ? { ...schedule, sessions: nextSessions }
            : schedule
        })
        // If we have sessions for a schedule that isn't in the list (e.g. list empty or id mismatch), add it so the grid can show them
        const appliedKeys = new Set(updated.map((s) => String(s.id)))
        const missingKeys = Object.keys(sessionsBySchedule).filter((k) => !appliedKeys.has(k))
        if (missingKeys.length > 0) {
          const added = missingKeys.map((scheduleId) => ({
            id: scheduleId,
            name: 'Schedule',
            sessions: sessionsBySchedule[scheduleId] ?? [],
            availableTags: [] as string[],
            availableLocations: [] as string[]
          }))
          return [...updated, ...added]
        }
        return updated
      })
    } catch {
      // keep current UI state on failure
    }
  }, [createdEvent?.uuid, activeScheduleId, eventTimeZone, buildSessionSignature])

  // When timezone resolves (or changes), reload sessions for active schedule
  useEffect(() => {
    if (createdEvent?.uuid && activeScheduleId) {
      loadSessions(activeScheduleId)
    }
  }, [createdEvent?.uuid, eventTimeZone, activeScheduleId, loadSessions])

  const handleUploadSessions = useCallback(
    async (files: File[]) => {
      const scheduleUuid = activeScheduleId
      const eventUuid = createdEvent?.uuid
      const accessToken = localStorage.getItem('accessToken')
      const organizationUuid = localStorage.getItem('organizationUuid')

      if (!scheduleUuid) {
        showToast.error('Please select a schedule first.')
        return
      }

      if (!eventUuid || !accessToken || !organizationUuid) {
        showToast.error('Missing event or authentication context.')
        return
      }

      const file = files?.[0]
      if (!file) return

      try {
        if (eventUuid && scheduleUuid) {
          await storeExcelParentMap(file, eventUuid, scheduleUuid)
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('event_id', eventUuid)

        const response = await fetch(API_ENDPOINTS.SESSIONS.BULK_IMPORT(scheduleUuid), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Organization': organizationUuid
          },
          credentials: 'include',
          body: formData
        })

        if (!response.ok) {
          showToast.error('Failed to upload sessions. Please try again.')
          return
        }

        showToast.success('Sessions uploaded successfully')
        await loadSessions(scheduleUuid)
      } catch {
        showToast.error('Failed to upload sessions. Please try again.')
      }
    },
    [activeScheduleId, createdEvent?.uuid, loadSessions]
  )

  const handleUploadSessionsForSchedule = useCallback(
    async (files: File[], scheduleId: string) => {
      // Temporarily use provided schedule id (for table upload)
      const eventUuid = createdEvent?.uuid
      const accessToken = localStorage.getItem('accessToken')
      const organizationUuid = localStorage.getItem('organizationUuid')

      if (!scheduleId) {
        showToast.error('Please select a schedule first.')
        return
      }

      if (!eventUuid || !accessToken || !organizationUuid) {
        showToast.error('Missing event or authentication context.')
        return
      }

      const file = files?.[0]
      if (!file) return

      try {
        if (eventUuid && scheduleId) {
          await storeExcelParentMap(file, eventUuid, scheduleId)
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('event_id', eventUuid)

        const response = await fetch(API_ENDPOINTS.SESSIONS.BULK_IMPORT(scheduleId), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Organization': organizationUuid
          },
          credentials: 'include',
          body: formData
        })

        if (!response.ok) {
          showToast.error('Failed to upload sessions. Please try again.')
          return
        }

        showToast.success('Sessions uploaded successfully')
        await loadSessions(scheduleId)
      } catch {
        showToast.error('Failed to upload sessions. Please try again.')
      }
    },
    [createdEvent?.uuid, loadSessions, storeExcelParentMap]
  )

  const handleAddSessionClick = (parentId?: string, creationType?: 'template' | 'scratch') => {
    // Collect all tags and locations from all schedules (same as ScheduleDetailsSlideout)
    const allTags = new Set<string>()
    const allLocations = new Set<string>()
    
    savedSchedules.forEach(schedule => {
      if (schedule.availableTags) {
        schedule.availableTags.forEach(tag => allTags.add(tag))
      }
      if (schedule.availableLocations) {
        schedule.availableLocations.forEach(location => allLocations.add(location))
      }
    })
    
    // Set available tags and locations from all schedules
    setAvailableTags(Array.from(allTags))
    setAvailableLocations(Array.from(allLocations))
    
    // Store parent session ID for parallel sessions (e.g. when + button on a session is clicked)
    setParentSessionId(parentId)
    
    if (creationType === 'template') {
      // Open TemplateSessionSlideout for "Template"
      setIsTemplateSessionSlideoutOpen(true)
    } else {
      // Open SessionSlideout: "Create from scratch" or + button (add child session)
      setActiveDraft({
        ...defaultSessionDraft,
        tags: [...defaultSessionDraft.tags],
        sections: [...defaultSessionDraft.sections]
      })
      setStartInEditMode(true)
      setIsSessionSlideoutOpen(true)
    }
  }

  const handleCloseSlideout = () => {
    setIsSessionSlideoutOpen(false)
    setActiveDraft(null)
    setStartInEditMode(true)
    setParentSessionId(undefined)
    setSessionDraftLoading(false)
  }

  const handleConfirmDeleteSession = useCallback(async () => {
    const session = sessionToDelete
    const eventUuid = createdEvent?.uuid
    const scheduleUuid = activeScheduleId
    if (!session || !eventUuid || !scheduleUuid) return
    setIsDeletingSession(true)
    const sessionId = String(session.id)
    setSavedSchedules((prev) =>
      prev.map((schedule) =>
        String(schedule.id) === String(scheduleUuid)
          ? {
              ...schedule,
              sessions: (schedule.sessions ?? []).filter((s) => String(s.id) !== sessionId)
            }
          : schedule
      )
    )
    setSessionToDelete(null)
    try {
      await deleteSessionApi(eventUuid, sessionId, String(scheduleUuid))
      showToast.success('Session deleted.')
      await loadSessions(scheduleUuid)
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Failed to delete session.')
      await loadSessions(scheduleUuid)
    } finally {
      setIsDeletingSession(false)
    }
  }, [sessionToDelete, createdEvent?.uuid, activeScheduleId, loadSessions])

  // Use the imported mapper function with event timezone
  const mapRetrieveSessionToDraftWithTimezone = useCallback(
    (raw: any): SavedSession => {
      return mapRetrieveSessionToDraft(raw, eventTimeZone)
    },
    [eventTimeZone]
  )

  const handleSaveSession = async (session: SessionDraft) => {
    console.log('[Session save] handleSaveSession called')
    const normalizedSession: SessionDraft = {
      ...defaultSessionDraft,
      ...session,
      title: session.title?.trim() || currentScheduleName,
      tags: session.tags ? [...session.tags] : [],
      sections: session.sections ? session.sections.map((section) => ({ ...section })) : []
    }

    const eventUuid = createdEvent?.uuid
    const startAt = toUTCISO(
      selectedDate,
      normalizedSession.startTime || '00:00',
      normalizedSession.startPeriod || 'AM'
    )
    const endAt = toUTCISO(
      selectedDate,
      normalizedSession.endTime || '00:00',
      normalizedSession.endPeriod || 'PM'
    )
    const tagUuids = (normalizedSession.tags ?? [])
      .map((t) => {
        if (typeof t !== 'string') return null
        if (UUID_REGEX.test(t.trim())) return t.trim()
        const fromOptions = availableSessionTags.find((opt) => opt.name === t)
        return fromOptions?.uuid ?? null
      })
      .filter((t): t is string => !!t)
    const tagNames = (normalizedSession.tags ?? [])
      .map((t) => {
        if (typeof t !== 'string') return null
        const fromOptions = availableSessionTags.find((opt) => opt.uuid === t || opt.name === t)
        const name = (fromOptions?.name ?? t)?.toString().trim()
        return name || null
      })
      .filter((name): name is string => !!name)
    const draftId = (normalizedSession as SavedSession).id
    const isEdit = Boolean(
      draftId &&
        typeof draftId === 'string' &&
        UUID_REGEX.test(String(draftId).trim())
    )
    const sessionUuidForUpdate = isEdit ? String(draftId).trim() : null

    const sectionsCount = normalizedSession.sections?.length ?? 0
    const filesFromSectionsPre = collectFilesFromSections(normalizedSession.sections)
    const allFilesCount = (normalizedSession.attachments?.length ?? 0) + filesFromSectionsPre.length
    console.log('[Session save] payload summary:', {
      isEdit,
      sessionUuid: sessionUuidForUpdate ?? '(create)',
      sectionsCount,
      section_type: normalizedSession.sections?.map((s) => s.type) ?? [],
      filesCount: allFilesCount,
      rawTags: normalizedSession.tags,
      tagUuids,
      tagNames
    })
    normalizedSession.sections?.forEach((s, i) => {
      console.log(`[Session save] section ${i + 1}:`, {
        type: s.type,
        title: s.title,
        dataKeys: s.data ? Object.keys(s.data) : [],
        speaker_uuids: s.data?.speaker_uuids,
        speakers: s.data?.speakers?.map((sp: { id?: string }) => sp?.id),
        url: s.data?.url,
        hasFile: !!(s.data?.file instanceof File),
        imagesCount: Array.isArray(s.data?.images) ? s.data.images.length : 0,
        filesCount: Array.isArray(s.data?.files) ? s.data.files.length : 0
      })
    })

    if (!eventUuid || !activeScheduleId) {
      showToast.error('Please select an event and schedule before saving.')
      return
    }

    try {
        if (isEdit && sessionUuidForUpdate) {
          const updateBody: UpdateSessionBody = {
            event_uuid: eventUuid,
            schedule_uuid: String(activeScheduleId),
            title: normalizedSession.title || currentScheduleName,
            description: normalizedSession.sections?.[0]?.description ?? '',
            start_at: startAt,
            end_at: endAt,
            location: normalizedSession.location ?? '',
            session_type: parentSessionId ? 'child' : (normalizedSession.sessionType?.trim() || 'keynote'),
            tag_uuids: tagUuids,
            tags: tagUuids,
            ...(parentSessionId ? { parent: parentSessionId } : { parent: null })
          }
          console.log('[Session save] PATCH body:', JSON.stringify({ tag_uuids: tagUuids, tags: tagUuids }))
          const updateResponse = await updateSession(eventUuid, sessionUuidForUpdate, String(activeScheduleId), updateBody)
          console.log('[Session save] PATCH session response:', updateResponse)

          // Determine video sections that already have a backend resource and a newly uploaded file.
          const videoSectionsNeedingFilePatch = (normalizedSession.sections ?? []).filter(
            (s) =>
              s.type === 'video' &&
              s.data?.videoFile instanceof File &&
              s.data?.videoResourceId &&
              String(s.data.videoResourceId).trim()
          )

          // For these sections, PATCH the existing session-resource with the new file instead of creating a new resource.
          for (const s of videoSectionsNeedingFilePatch) {
            const resourceId = String(s.data!.videoResourceId).trim()
            const file = s.data!.videoFile as File
            try {
              await updateSessionResource(eventUuid, resourceId, {
                session_uuid: sessionUuidForUpdate,
                order: undefined,
                file
              } as any)
            } catch (e) {
              console.warn('[Session save] updateSessionResource (file PATCH) failed for', resourceId, e)
            }
          }

          // For createSessionResources, exclude videoFiles that we already PATCHed above.
          const sectionsForUpload = (normalizedSession.sections ?? []).map((s) => {
            if (videoSectionsNeedingFilePatch.includes(s) && s.data?.videoFile instanceof File) {
              return {
                ...s,
                data: { ...(s.data || {}), videoFile: undefined }
              }
            }
            return s
          })

          const filesFromSections = collectFilesFromSections(sectionsForUpload)
          const allFiles = [...(normalizedSession.attachments ?? []), ...filesFromSections]
          const attachmentCount = normalizedSession.attachments?.length ?? 0
          let newResourceIdsFromCreate: string[] = []

          // Upload files first so we can use returned URLs for video sections
          if (allFiles.length > 0) {
            console.log('[Session save] session-resources request:', {
              fileCount: allFiles.length,
              fileNames: allFiles.map((f) => f.name),
              session_uuid: sessionUuidForUpdate
            })
            const resourcesResponse = await createSessionResources(eventUuid, allFiles, { session_uuid: sessionUuidForUpdate })
            console.log('[Session save] session-resources response:', resourcesResponse)
            newResourceIdsFromCreate = extractResourceIdsFromResponse(resourcesResponse)
            const urls = extractUrlsFromResourcesResponse(resourcesResponse)
            const videoIndices = getVideoFileIndicesInFlattenedFiles(sectionsForUpload)
            videoIndices.forEach(({ sectionIndex, fileIndex }) => {
              const urlIndex = attachmentCount + fileIndex
              const url = urls[urlIndex]
              if (url) {
                const s = normalizedSession.sections?.[sectionIndex]
                if (s?.type === 'video' && s.data?.videoFile) {
                  normalizedSession.sections![sectionIndex] = {
                    ...s,
                    data: { ...(s.data || {}), videoUrl: url, video_url: url, videoFile: undefined, videoPreviewUrl: undefined }
                  }
                }
              }
            })
          }

          // 1) Call session resource PATCH for every resource (existing + newly uploaded) so backend order matches UI
          const orderedResourceIdsOrIndices = getOrderedResourceIdsOrIndices(normalizedSession.sections, attachmentCount)
          console.log('[Session save] session-resource PATCH count:', orderedResourceIdsOrIndices.length, 'ordered:', orderedResourceIdsOrIndices)
          for (let i = 0; i < orderedResourceIdsOrIndices.length; i++) {
            const entry = orderedResourceIdsOrIndices[i]
            const resourceId = entry.id ?? (entry.allFilesIndex != null ? newResourceIdsFromCreate[entry.allFilesIndex] : undefined)
            if (!resourceId?.trim()) continue
            const updateBody = {
              session_uuid: sessionUuidForUpdate,
              order: i + 1
            }
            console.log('[Session save] updateSessionResource — PATCH on Save:', {
              event_id: eventUuid,
              session_resource_id: resourceId,
              body: updateBody
            })
            try {
              await updateSessionResource(eventUuid, resourceId.trim(), updateBody)
            } catch (e) {
              console.warn('[Session save] updateSessionResource failed for', resourceId, e)
              showToast.error(`Failed to update resource order: ${e instanceof Error ? e.message : 'Unknown error'}`)
            }
          }
          // Fallback: when only new files exist (e.g. editing video/resources, no previous resources),
          // still PATCH the created resources so backend has session_uuid + order.
          if (orderedResourceIdsOrIndices.length === 0 && newResourceIdsFromCreate.length > 0) {
            for (let i = 0; i < newResourceIdsFromCreate.length; i++) {
              const rid = newResourceIdsFromCreate[i]
              if (!rid?.trim()) continue
              const updateBody = {
                session_uuid: sessionUuidForUpdate,
                order: i + 1
              }
              console.log('[Session save] updateSessionResource — fallback PATCH on Save:', {
                event_id: eventUuid,
                session_resource_id: rid,
                body: updateBody
              })
              try {
                await updateSessionResource(eventUuid, rid.trim(), updateBody)
              } catch (e) {
                console.warn('[Session save] fallback updateSessionResource failed for', rid, e)
              }
            }
          }

          // 2) Call session section PATCH for existing sections, POST for new sections
          const sectionsToSend = normalizedSession.sections ?? []
          const nonResourceSections = sectionsToSend.filter(
            (s) => toApiSectionType((s.type === 'speaker' ? 'speakers' : s.type) || 'text') !== 'resource'
          )
          const toCreate: CreateSessionSectionsBody['sections'] = []
          for (let i = 0; i < nonResourceSections.length; i++) {
            const s = nonResourceSections[i]
            const payload = buildOneSectionPayload(s, i + 1)
            console.log('[Session save] session-sections payload to backend:', s.sectionId ? 'PATCH' : 'POST (create)', payload)
            if (s.sectionId) {
              await updateSessionSection(eventUuid, s.sectionId, { ...payload, session_uuid: sessionUuidForUpdate })
            } else {
              toCreate.push(payload)
            }
          }
          if (toCreate.length) {
            const sectionsResponseUpdate = await createSessionSections(eventUuid, {
              session_uuid: sessionUuidForUpdate,
              sections: toCreate
            })
            console.log('[Session save] session-sections response (create new):', sectionsResponseUpdate)
          }

          await loadSessions(activeScheduleId)
          showToast.success('Session updated.')
        } else {
          const sessionBody: CreateSessionBody = {
            event_uuid: eventUuid,
            schedule_uuid: activeScheduleId,
            title: normalizedSession.title || currentScheduleName,
            description: normalizedSession.sections?.[0]?.description ?? '',
            start_at: startAt,
            end_at: endAt,
            location: normalizedSession.location ?? '',
            session_type: parentSessionId ? 'child' : (normalizedSession.sessionType?.trim() || 'keynote'),
            tag_uuids: tagUuids,
            tag_names: tagNames,
            ...(parentSessionId ? { parent: parentSessionId } : {})
          }
          const created = await createSession(eventUuid, sessionBody)
          console.log('[Session save] POST session response:', created, 'keys:', created && typeof created === 'object' ? Object.keys(created) : [])
          let sessionUuid = getSessionUuidFromResponse(created)
          if (!sessionUuid && activeScheduleId) {
            sessionUuid = await findSessionUuidFromList(eventUuid, activeScheduleId, {
              title: sessionBody.title,
              start_at: startAt
            })
            if (sessionUuid) console.log('[Session save] Found session UUID from list:', sessionUuid)
          }
          if (!sessionUuid) {
            console.warn('[Session save] No session UUID from create response or list; sections and resources will not be sent.')
          } else {
            const filesFromSections = collectFilesFromSections(normalizedSession.sections)
            const allFiles = [...(normalizedSession.attachments ?? []), ...filesFromSections]

            // Upload files first so we can use returned URLs for video sections
            if (allFiles.length > 0) {
              console.log('[Session save] Calling session-resources with', allFiles.length, 'files')
              const resourcesResponse = await createSessionResources(eventUuid, allFiles, { session_uuid: sessionUuid })
              console.log('[Session save] session-resources response:', resourcesResponse)
              const urls = extractUrlsFromResourcesResponse(resourcesResponse)
              const videoIndices = getVideoFileIndicesInFlattenedFiles(normalizedSession.sections)
              const attachmentCount = normalizedSession.attachments?.length ?? 0
              videoIndices.forEach(({ sectionIndex, fileIndex }) => {
                const urlIndex = attachmentCount + fileIndex
                const url = urls[urlIndex]
                if (url) {
                  const s = normalizedSession.sections?.[sectionIndex]
                  if (s?.type === 'video' && s.data?.videoFile) {
                    normalizedSession.sections![sectionIndex] = {
                      ...s,
                      data: { ...(s.data || {}), videoUrl: url, video_url: url, videoFile: undefined, videoPreviewUrl: undefined }
                    }
                  }
                }
              })
            }

            // Build sections payload (now video sections have videoUrl) and send
            const sectionsToSend = normalizedSession.sections ?? []
            const sectionsBody = buildSectionsPayload(sectionsToSend, sessionUuid)
            const sectionsResponse = await createSessionSections(eventUuid, sectionsBody)
            console.log('[Session save] session-sections response (create):', sectionsResponse)
          }
          if (activeScheduleId) {
            await loadSessions(activeScheduleId)
          }
          showToast.success('Session saved.')
        }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save session.'
      showToast.error(msg)
      throw e
    }

    const refreshedFromApi = eventUuid && activeScheduleId
    if (!refreshedFromApi) {
      setSavedSchedules((previous) => {
        if (activeScheduleId) {
          const existingSchedule = previous.find((item) => item.id === activeScheduleId)
          if (existingSchedule) {
            const sessionDate = new Date(selectedDate)
            sessionDate.setHours(0, 0, 0, 0)
            const newSession: SavedSession = {
              ...normalizedSession,
              id: `session-${Date.now()}`,
              date: sessionDate,
              parentId: parentSessionId
            }
            const existingSessions = existingSchedule.sessions || []
            return previous.map((item) =>
              item.id === activeScheduleId
                ? {
                    ...item,
                    sessions: [...existingSessions, newSession],
                    availableTags: existingSchedule?.availableTags,
                    availableLocations: existingSchedule?.availableLocations
                  }
                : item
            )
          }
        }

        const sessionDate = new Date(selectedDate)
        sessionDate.setHours(0, 0, 0, 0)
        const newSchedule: SavedSchedule = {
          id: `schedule-${Date.now()}`,
          name: currentScheduleName,
          sessions: [{
            ...normalizedSession,
            id: `session-${Date.now()}`,
            date: sessionDate
          }],
          availableTags: availableTags,
          availableLocations: availableLocations
        }
        return [...previous, newSchedule]
      })
    }

    setActiveDraft(null)
    setStartInEditMode(false)
    setParentSessionId(undefined)
  }

  const handleSaveTemplateSession = async (data: TemplateSessionData, sessionId?: string) => {
    const eventUuid = createdEvent?.uuid
    if (!eventUuid || !activeScheduleId) {
      showToast.error('Select a schedule first (Manage a schedule) to save the session.')
      return
    }
    const startAt = toUTCISOFrom24h(selectedDate, data.startTime || '00:00')
    const endAt = toUTCISOFrom24h(selectedDate, data.endTime || '00:00')
    const tagUuids = (data.tags ?? [])
      .map((t: string) => {
        if (typeof t !== 'string') return null
        if (UUID_REGEX.test(String(t).trim())) return String(t).trim()
        const fromOptions = availableSessionTags.find((opt) => opt.name === t)
        return fromOptions?.uuid ?? null
      })
      .filter((t): t is string => !!t)
    const tagNames = (data.tags ?? [])
      .map((t: string) => {
        if (typeof t !== 'string') return null
        const fromOptions = availableSessionTags.find((opt) => opt.uuid === t || opt.name === t)
        const name = (fromOptions?.name ?? t)?.toString().trim()
        return name || null
      })
      .filter((name): name is string => !!name)
    const firstTextSection = (data.sections ?? []).find((s: { type?: string }) => s.type === 'text') as { description?: string; data?: { body?: string } } | undefined
    const derivedDescription =
      (data.description?.trim()) ??
      (firstTextSection?.description?.trim()) ??
      (firstTextSection?.data?.body != null ? String(firstTextSection.data.body).trim() : '') ??
      ''
    const sessionBody: CreateSessionBody = {
      event_uuid: eventUuid,
      schedule_uuid: String(activeScheduleId),
      title: (data.title || '').trim() || currentScheduleName,
      description: derivedDescription,
      start_at: startAt,
      end_at: endAt,
      location: data.location ?? '',
      session_type: (data.sessionType?.trim() || 'keynote'),
      tag_uuids: tagUuids,
      tag_names: tagNames
    }
    try {
      let sessionUuid: string | undefined
      const isEditTemplate = Boolean(sessionId)
      if (sessionId) {
        const updateBody: UpdateSessionBody = { ...sessionBody }
        await updateSession(eventUuid, sessionId, String(activeScheduleId), updateBody)
        sessionUuid = sessionId
      } else {
        const created = await createSession(eventUuid, sessionBody)
        sessionUuid = getSessionUuidFromResponse(created)
      }

      const baseSections = data.sections ?? []
      if (!sessionUuid) {
        throw new Error('Failed to resolve session UUID for template save.')
      }

      // Build full section list so template video + resources are included for upload and PATCH order
      const syntheticVideo =
        data.videoFile || (data.videoUrl ?? data.videoPreviewUrl ?? '').trim()
          ? {
              id: 'template-video',
              type: 'video' as const,
              title: 'Video',
              description: '',
              data: {
                videoFile: data.videoFile ?? undefined,
                videoUrl: (data.videoUrl ?? data.videoPreviewUrl ?? '').trim()
              }
            }
          : null
      const syntheticResources =
        (data.resources?.length ?? 0) > 0
          ? {
              id: 'template-resources',
              type: 'resources' as const,
              title: 'Resources',
              description: '',
              data: { files: (data.resources ?? []) as File[] }
            }
          : null
      const templateSections: SessionDraft['sections'] = [
        ...(syntheticVideo ? [syntheticVideo] : []),
        ...(syntheticResources ? [syntheticResources] : []),
        ...baseSections
      ]

      // --- Session resources: mirror SessionSlideout behaviour ---
      const filesFromSections = collectFilesFromSections(templateSections)
      const allFiles = filesFromSections
      const attachmentCount = 0
      let newResourceIdsFromCreate: string[] = []

      if (allFiles.length > 0) {
        const resourcesResponse = await createSessionResources(eventUuid, allFiles, { session_uuid: sessionUuid })
        newResourceIdsFromCreate = extractResourceIdsFromResponse(resourcesResponse)
        const urls = extractUrlsFromResourcesResponse(resourcesResponse)
        const videoIndices = getVideoFileIndicesInFlattenedFiles(templateSections)
        videoIndices.forEach(({ sectionIndex, fileIndex }) => {
          const urlIndex = attachmentCount + fileIndex
          const url = urls[urlIndex]
          if (url) {
            const s = templateSections[sectionIndex]
            if (s?.type === 'video' && s.data?.videoFile) {
              templateSections[sectionIndex] = {
                ...s,
                data: {
                  ...(s.data || {}),
                  videoUrl: url,
                  video_url: url,
                  videoFile: undefined,
                  videoPreviewUrl: undefined
                }
              }
            }
          }
        })
      }

      // Re-order and update resources for this session (same POST+PATCH pattern as SessionSlideout)
      const orderedResourceIdsOrIndices = getOrderedResourceIdsOrIndices(templateSections, attachmentCount)
      for (let i = 0; i < orderedResourceIdsOrIndices.length; i++) {
        const entry = orderedResourceIdsOrIndices[i]
        const resourceId = entry.id ?? (entry.allFilesIndex != null ? newResourceIdsFromCreate[entry.allFilesIndex] : undefined)
        if (!resourceId?.trim()) continue
        const updateBody = {
          session_uuid: sessionUuid,
          order: i + 1
        }
        try {
          await updateSessionResource(eventUuid, resourceId.trim(), updateBody)
        } catch (e) {
          console.warn('[Template session save] updateSessionResource failed for', resourceId, e)
          showToast.error(`Failed to update resource order: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }
      // Fallback: when there were only newly-uploaded files (e.g. video in template)
      // and no existing resources to order, still issue PATCH calls for the created resources
      if (orderedResourceIdsOrIndices.length === 0 && newResourceIdsFromCreate.length > 0) {
        for (let i = 0; i < newResourceIdsFromCreate.length; i++) {
          const rid = newResourceIdsFromCreate[i]
          if (!rid?.trim()) continue
          const updateBody = {
            session_uuid: sessionUuid,
            order: i + 1
          }
          try {
            await updateSessionResource(eventUuid, rid.trim(), updateBody)
          } catch (e) {
            console.warn('[Template session save] fallback updateSessionResource failed for', rid, e)
          }
        }
      }

      // --- Session sections: create vs patch, mirroring SessionSlideout ---
      if (isEditTemplate) {
        const nonResourceSections = baseSections.filter(
          (s) => toApiSectionType((s.type === 'speaker' ? 'speakers' : s.type) || 'text') !== 'resource'
        )
        const toCreate: CreateSessionSectionsBody['sections'] = []
        for (let i = 0; i < nonResourceSections.length; i++) {
          const s = nonResourceSections[i]
          const payload = buildOneSectionPayload(s, i + 1)
          if (s.sectionId) {
            await updateSessionSection(eventUuid, s.sectionId, { ...payload, session_uuid: sessionUuid })
          } else {
            toCreate.push(payload)
          }
        }
        if (toCreate.length) {
          await createSessionSections(eventUuid, {
            session_uuid: sessionUuid,
            sections: toCreate
          })
        }
      } else {
        const sectionsToSend: CreateSessionSectionsBody['sections'] = []
        let order = 1
        for (const s of baseSections) {
          const rawType = (s.type === 'speaker' ? 'speakers' : s.type) || 'text'
          if (rawType === 'resources' || rawType === 'resource') continue
          const sectionType = toApiSectionType(rawType)
          if (sectionType === 'resource') continue
          let content: Record<string, unknown>
          if (sectionType === 'text') {
            const body = (s as { description?: string; data?: { body?: string } }).description ?? (s as { data?: { body?: string } }).data?.body ?? ''
            content = { title: s.title || 'Section', body: typeof body === 'string' ? body : '' }
          } else if (sectionType === 'speakers') {
            const speakerList = Array.isArray(s.data?.speakers)
              ? (s.data.speakers as { id: string; name?: string; role?: string }[])
              : []
            const uuids = speakerList.length > 0 ? speakerList.map((sp) => sp.id) : (Array.isArray(s.data?.speaker_uuids) ? s.data.speaker_uuids : [])
            content = {
              speaker_uuids: uuids,
              speakers: speakerList.length > 0
                ? speakerList.map((sp) => ({ id: sp.id, name: sp.name ?? '', role: sp.role ?? '' }))
                : uuids.map((id) => ({ id, name: '', role: '' }))
            }
          } else {
            content = (s.data && typeof s.data === 'object' ? { ...s.data } : {}) as Record<string, unknown>
            if (s.title) content.title = s.title
            if (s.description) content.body = s.description
          }
          sectionsToSend.push({ section_type: sectionType, order: order++, content })
        }
        // Template-only description → send as text section when no explicit text section exists
        const hasTextSection = baseSections.some((s) => s.type === 'text')
        if (!hasTextSection && data.description?.trim()) {
          sectionsToSend.push({
            section_type: 'text',
            order: order++,
            content: {
              title: 'Text',
              body: data.description.trim()
            }
          })
        }
        // Template-only video URL → send as video section when no explicit video section exists
        const effectiveVideoUrl = (data.videoUrl || data.videoPreviewUrl || '').trim()
        const hasVideoSection = baseSections.some((s) => s.type === 'video')
        if (!hasVideoSection && effectiveVideoUrl) {
          sectionsToSend.push({
            section_type: 'video',
            order: order++,
            content: {
              title: 'Video',
              url: effectiveVideoUrl,
              video_url: effectiveVideoUrl
            }
          })
        }
        if ((data.speakers ?? []).length > 0) {
          const speakerList = data.speakers as Array<{ id: string; name: string; role?: string }>
          sectionsToSend.push({
            section_type: 'speakers',
            order: order++,
            content: {
              speaker_uuids: speakerList.map((sp) => sp.id),
              speakers: speakerList.map((sp) => ({ id: sp.id, name: sp.name ?? '', role: sp.role ?? '' }))
            }
          })
        }
        if (sectionsToSend.length > 0) {
          await createSessionSections(eventUuid, {
            session_uuid: sessionUuid,
            sections: sectionsToSend
          })
        }
      }

      await loadSessions(activeScheduleId)
      showToast.success(sessionId ? 'Session updated' : 'Session saved')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save session.'
      showToast.error(msg)
      throw e
    }
  }

  const handleCreateScheduleFromList = () => {
    setEditingScheduleId(null)
    setScheduleDetailsInitialDetails(null)
    setIsScheduleDetailsSlideoutOpen(true)
  }

  const handleCloseScheduleDetailsSlideout = () => {
    setIsScheduleDetailsSlideoutOpen(false)
    setEditingScheduleId(null)
    setScheduleDetailsInitialDetails(null)
  }

  const handleSaveScheduleDetails = async (
    details: { title: string; tags: string[]; location: string[]; description: string },
    scheduleId?: string
  ) => {
    // Filter out "selectall" and store only the selected tags and locations
    const selectedTags = (details.tags || []).filter(tag => tag !== 'selectall')
    const selectedLocations = (details.location || []).filter(loc => loc !== 'selectall')

    const scheduleTitle = details.title?.trim() || (scheduleId ? 'Schedule' : `Schedule ${savedSchedules.length + 1}`)

    const eventUuid = createdEvent?.uuid
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')

    const isUpdate = Boolean(scheduleId && eventUuid && accessToken && organizationUuid)

    if (isUpdate && scheduleId && eventUuid && organizationUuid) {
      try {
        const url = API_ENDPOINTS.SCHEDULES.UPDATE(eventUuid, scheduleId)
        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Organization': organizationUuid
          },
          credentials: 'include',
          body: JSON.stringify({
            event_uuid: eventUuid,
            name: scheduleTitle,
            title: scheduleTitle,
            description: details.description || '',
            tags: selectedTags,
            locations: selectedLocations
          })
        })

        const rawText = await response.text()
        let data: any = null
        try {
          data = rawText ? JSON.parse(rawText) : null
        } catch {
          data = null
        }

        if (!response.ok) {
          const backendMessage =
            (typeof data?.detail === 'string' && data.detail.trim()) ||
            (typeof data?.message === 'string' && data.message.trim()) ||
            (typeof data?.error === 'string' && data.error.trim()) ||
            (typeof rawText === 'string' && rawText.trim()) ||
            ''
          showToast.error(
            backendMessage
              ? `Failed to update schedule: ${backendMessage}`
              : 'Failed to update schedule. Please try again.'
          )
        } else {
          showToast.success('Schedule updated successfully')
          await loadSchedules()
        }
      } catch (e) {
        showToast.error('Failed to update schedule. Please try again.')
      }
      setIsScheduleDetailsSlideoutOpen(false)
      setEditingScheduleId(null)
      setScheduleDetailsInitialDetails(null)
      return
    }

    // Create flow (same as before)
    let createdScheduleId: string | null = null

    if (eventUuid && accessToken && organizationUuid) {
      try {
        const url = API_ENDPOINTS.SCHEDULES.CREATE(eventUuid)
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Organization': organizationUuid
          },
          credentials: 'include',
          body: JSON.stringify({
            event_id: eventUuid,
            event_uuid: eventUuid,
            name: scheduleTitle,
            title: scheduleTitle,
            description: details.description || '',
            tags: selectedTags,
            locations: selectedLocations
          })
        })

        const rawText = await response.text()
        let data: any = null
        try {
          data = rawText ? JSON.parse(rawText) : null
        } catch {
          data = null
        }

        if (!response.ok) {
          const backendMessage =
            (typeof data?.detail === 'string' && data.detail.trim()) ||
            (typeof data?.message === 'string' && data.message.trim()) ||
            (typeof data?.error === 'string' && data.error.trim()) ||
            (typeof rawText === 'string' && rawText.trim()) ||
            ''
          console.log('❌ [Schedules] CREATE failed:', {
            status: response.status,
            statusText: response.statusText,
            rawText,
            parsed: data
          })
          showToast.error(
            backendMessage
              ? `Failed to create schedule: ${backendMessage}`
              : 'Failed to create schedule. Please try again.'
          )
        } else {
          const payload = data?.data ?? data
          createdScheduleId = payload?.uuid ?? payload?.id ?? null
          showToast.success('Schedule created successfully')
        }
      } catch (e) {
        showToast.error('Failed to create schedule. Please try again.')
      }
    } else {
      console.warn('Schedule create skipped (missing auth/event context). Creating locally.')
    }

    if (createdScheduleId) {
      await loadSchedules()
    } else {
      const newSchedule: SavedSchedule = {
        id: `schedule-${Date.now()}`,
        name: scheduleTitle,
        session: {
          ...defaultSessionDraft,
          title: scheduleTitle,
          location: selectedLocations.length > 0 ? selectedLocations[0] : '',
          tags: selectedTags,
          sections: details.description ? [{
            id: `section-${Date.now()}`,
            type: 'text',
            title: 'Description',
            description: details.description
          }] : []
        },
        availableTags: selectedTags,
        availableLocations: selectedLocations
      }
      setSavedSchedules((previous) => [...previous, newSchedule])
    }
    setIsScheduleDetailsSlideoutOpen(false)
  }

  const handleManageSession = (scheduleId: string) => {
    const target = savedSchedules.find((item) => item.id === scheduleId)
    if (!target) return
    setActiveScheduleId(scheduleId)
    setCurrentScheduleName(target.name)
    // Set available tags and locations for this schedule
    setAvailableTags(target.availableTags || [])
    setAvailableLocations(target.availableLocations || [])
    setCurrentView('content')
    // Load sessions for this event so grid reflects imported data
    loadSessions(scheduleId)
  }

  const handleBackToTable = () => {
    setCurrentView('table')
    setActiveScheduleId(null)
  }

  return (
    <div  className="min-h-screen overflow-x-hidden bg-white">
      {!hideNavbarAndSidebar && (
        <>
          {/* Navbar */}
          <EventHubNavbar
            eventName={eventName}
            isDraft={isDraft}
            eventStatus={eventStatus}
            onBackClick={onBackClick}
            onSearchClick={handleSearchClick}
            onNotificationClick={handleNotificationClick}
            onProfileClick={handleProfileClick}
            userAvatarUrl={userAvatarUrl}
          />

          {/* Sidebar */}
          <EventHubSidebar
            items={sidebarItems}
            activeItemId="schedule-session"
            onItemClick={handleSidebarItemClick}
          />
        </>
      )}

      {/* Schedule Content */}
      <div className={hideNavbarAndSidebar ? "" : "md:pl-[250px]"}>
        {currentView === 'table' ? (
          <SavedSchedulesTable
            schedules={savedSchedules}
            onCreateSchedule={handleCreateScheduleFromList}
            onUploadSessions={handleUploadSessionsForSchedule}
            onManageSession={handleManageSession}
            onDeleteSchedule={(scheduleId) => {
              const target = savedSchedules.find((s) => s.id === scheduleId)
              if (target) setScheduleToDelete(target)
            }}
            onEditSchedule={(scheduleId) => {
              const target = savedSchedules.find((item) => item.id === scheduleId)
              if (!target) return
              setEditingScheduleId(scheduleId)
              setScheduleDetailsInitialDetails({
                title: target.name || '',
                tags: target.availableTags ?? [],
                location: target.availableLocations ?? [],
                description:
                  target.session?.sections?.[0]?.description ??
                  (target as any).description ??
                  ''
              })
              setIsScheduleDetailsSlideoutOpen(true)
            }}
          />
        ) : (
          <ScheduleContent
            key={`${createdEvent?.uuid ?? 'no-event'}-${rangeStartDate?.getTime() ?? 'no-start'}-${rangeEndDate?.getTime() ?? 'no-end'}`}
            scheduleName={currentScheduleName}
            eventUuid={createdEvent?.uuid}
            onUpload={handleUpload}
            onUploadFiles={handleUploadSessions}
            onAddSession={handleAddSessionClick}
            onBack={handleBackToTable}
            sessions={activeScheduleId ? (savedSchedules.find(s => String(s.id) === String(activeScheduleId))?.sessions ?? []) : []}
            availableLocations={activeScheduleId ? (savedSchedules.find(s => String(s.id) === String(activeScheduleId))?.availableLocations ?? undefined) : undefined}
            selectedDate={selectedDate}
            rangeStartDate={rangeStartDate}
            rangeEndDate={rangeEndDate}
            sessionFormOpen={isSessionSlideoutOpen}
            onSessionClick={async (session) => {
              const eventUuid = createdEvent?.uuid
              const scheduleUuid = activeScheduleId
              const sessionId = session?.id && typeof session.id === 'string' ? String(session.id).trim() : ''
              const isUuid = sessionId && UUID_REGEX.test(sessionId)
              if (isUuid && eventUuid && scheduleUuid) {
                setActiveDraft(null)
                setSessionDraftLoading(true)
                setStartInEditMode(false)
                setIsSessionSlideoutOpen(true)
                try {
                  const result = await getSession(eventUuid, String(scheduleUuid), sessionId)
                  if (result.ok) {
                    const payload = result.data as any
                    const raw = payload?.data ?? payload?.sessions?.[0] ?? payload
                    if (raw && typeof raw === 'object') {
                      queueMicrotask(() => {
                        const draft = mapRetrieveSessionToDraftWithTimezone(raw)
                        const normalizedDraft = {
                          ...defaultSessionDraft,
                          ...draft,
                          // Preserve the time the user sees in the grid (session is already normalized for timezone there)
                          startTime: session.startTime ?? draft.startTime,
                          endTime: session.endTime ?? draft.endTime,
                          startPeriod: session.startPeriod ?? draft.startPeriod,
                          endPeriod: session.endPeriod ?? draft.endPeriod,
                          tags: [...(draft.tags ?? [])],
                          sections: draft.sections?.map((s) => ({ ...s })) ?? []
                        }
                        startTransition(() => {
                          setActiveDraft(normalizedDraft)
                          setSessionDraftLoading(false)
                        })
                      })
                      return
                    }
                  }
                  setSessionDraftLoading(false)
                  setActiveDraft({
                    ...defaultSessionDraft,
                    ...session,
                    tags: [...(session.tags ?? [])],
                    sections: session.sections?.map((s) => ({ ...s })) ?? []
                  })
                } catch {
                  setSessionDraftLoading(false)
                  showToast.error('Failed to load session details.')
                }
                return
              }
              setActiveDraft({
                ...defaultSessionDraft,
                ...session,
                tags: [...(session.tags ?? [])],
                sections: session.sections?.map((s) => ({ ...s })) ?? []
              })
              setStartInEditMode(false)
              setIsSessionSlideoutOpen(true)
            }}
            onDateChange={(date) => {
              const normalizedDate = new Date(date)
              normalizedDate.setHours(0, 0, 0, 0)
              setSelectedDate(normalizedDate)
            }}
            onEditSession={async (session) => {
              const eventUuid = createdEvent?.uuid
              const scheduleUuid = activeScheduleId
              const sessionId = session?.id && typeof session.id === 'string' ? String(session.id).trim() : ''
              const isUuid = sessionId && UUID_REGEX.test(sessionId)
              if (isUuid && eventUuid && scheduleUuid) {
                setActiveDraft(null)
                setSessionDraftLoading(true)
                setStartInEditMode(true)
                setIsSessionSlideoutOpen(true)
                try {
                  const result = await getSession(eventUuid, String(scheduleUuid), sessionId)
                  if (result.ok) {
                    const payload = result.data as any
                    const raw = payload?.data ?? payload?.sessions?.[0] ?? payload
                    if (raw && typeof raw === 'object') {
                      // Defer heavy mapping so loading spinner stays visible and UI stays responsive
                      queueMicrotask(() => {
                        const draft = mapRetrieveSessionToDraftWithTimezone(raw)
                        const normalizedDraft = {
                          ...defaultSessionDraft,
                          ...draft,
                          // Preserve the time the user sees in the grid (session is already normalized for timezone there)
                          startTime: session.startTime ?? draft.startTime,
                          endTime: session.endTime ?? draft.endTime,
                          startPeriod: session.startPeriod ?? draft.startPeriod,
                          endPeriod: session.endPeriod ?? draft.endPeriod,
                          tags: [...(draft.tags ?? [])],
                          sections: draft.sections?.map((s) => ({ ...s })) ?? []
                        }
                        startTransition(() => {
                          setActiveDraft(normalizedDraft)
                          setSessionDraftLoading(false)
                        })
                      })
                      return
                    }
                  }
                  setSessionDraftLoading(false)
                  setActiveDraft({
                    ...defaultSessionDraft,
                    ...session,
                    tags: [...(session.tags ?? [])],
                    sections: session.sections?.map((s) => ({ ...s })) ?? []
                  })
                } catch {
                  setSessionDraftLoading(false)
                  showToast.error('Failed to load session details.')
                }
                return
              }
              setActiveDraft({
                ...defaultSessionDraft,
                ...session,
                tags: [...(session.tags ?? [])],
                sections: session.sections?.map((s) => ({ ...s })) ?? []
              })
              setStartInEditMode(true)
              setIsSessionSlideoutOpen(true)
            }}
            onDeleteSession={(session) => {
              const eventUuid = createdEvent?.uuid
              const scheduleUuid = activeScheduleId
              if (!eventUuid || !scheduleUuid) {
                showToast.error('Missing event or schedule context.')
                return
              }
              setSessionToDelete(session)
            }}
          />
        )}
      </div>

      <SessionSlideout
        isOpen={isSessionSlideoutOpen}
        onClose={handleCloseSlideout}
        onSave={handleSaveSession}
        initialDraft={activeDraft}
        draftLoading={sessionDraftLoading}
        startInEditMode={startInEditMode}
        topOffset={64}
        panelWidthRatio={0.5}
        availableTags={availableSessionTags.map((t) => t.name)}
        sessionTagOptions={availableSessionTags}
        availableLocations={availableLocations}
        eventUuid={createdEvent?.uuid ?? ''}
        onBeforeRemoveSection={
          createdEvent?.uuid
            ? async (section) => {
                if (!section.sectionId) return
                try {
                  await deleteSessionSection(createdEvent.uuid, section.sectionId)
                } catch (e) {
                  showToast.error(e instanceof Error ? e.message : 'Failed to delete section.')
                }
              }
            : undefined
        }
        onBeforeRemoveResourceFile={
          createdEvent?.uuid
            ? async (_sectionId, file) => {
                if (!file.resourceId) return
                try {
                  await deleteSessionResource(createdEvent.uuid, file.resourceId)
                } catch (e) {
                  showToast.error(e instanceof Error ? e.message : 'Failed to delete resource.')
                }
              }
            : undefined
        }
        onDraftChange={(draft: SessionDraft) => setActiveDraft(draft)}
      />

      <TemplateSessionSlideout
        isOpen={isTemplateSessionSlideoutOpen}
        onClose={() => setIsTemplateSessionSlideoutOpen(false)}
        onSave={handleSaveTemplateSession}
        availableTags={availableSessionTags.map((t) => t.name)}
        sessionTagOptions={availableSessionTags}
        availableLocations={availableLocations}
        eventUuid={createdEvent?.uuid ?? ''}
        topOffset={64}
        panelWidthRatio={0.5}
        onBeforeRemoveSection={
          createdEvent?.uuid
            ? async (section) => {
                if (!section.sectionId) return
                try {
                  await deleteSessionSection(createdEvent.uuid, section.sectionId)
                } catch (e) {
                  showToast.error(e instanceof Error ? e.message : 'Failed to delete section.')
                }
              }
            : undefined
        }
        onBeforeRemoveResourceFile={
          createdEvent?.uuid
            ? async (_sectionId, file) => {
                if (!file.resourceId) return
                try {
                  await deleteSessionResource(createdEvent.uuid, file.resourceId)
                } catch (e) {
                  showToast.error(e instanceof Error ? e.message : 'Failed to delete resource.')
                }
              }
            : undefined
        }
      />

      <ScheduleDetailsSlideout
        isOpen={isScheduleDetailsSlideoutOpen}
        onClose={handleCloseScheduleDetailsSlideout}
        onSave={handleSaveScheduleDetails}
        initialDetails={scheduleDetailsInitialDetails}
        editingScheduleId={editingScheduleId}
        topOffset={64}
        panelWidthRatio={0.38}
        availableTags={useMemo(() => {
          const allTags = new Set<string>()
          savedSchedules.forEach(schedule => {
            if (schedule.availableTags) {
              schedule.availableTags.forEach(tag => allTags.add(tag))
            }
          })
          return Array.from(allTags)
        }, [savedSchedules])}
        availableLocations={useMemo(() => {
          const allLocations = new Set<string>()
          savedSchedules.forEach(schedule => {
            if (schedule.availableLocations) {
              schedule.availableLocations.forEach(location => allLocations.add(location))
            }
          })
          return Array.from(allLocations)
        }, [savedSchedules])}
      />

      <ConfirmDeleteModal
        isOpen={sessionToDelete != null}
        title="Delete session"
        itemName={sessionToDelete?.title ? String(sessionToDelete.title).slice(0, 60) + (String(sessionToDelete.title).length > 60 ? '…' : '') : undefined}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeletingSession}
        onCancel={() => setSessionToDelete(null)}
        onConfirm={handleConfirmDeleteSession}
      />

      <ConfirmDeleteModal
        isOpen={scheduleToDelete != null}
        title="Delete schedule?"
        itemName={scheduleToDelete?.name}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeletingSchedule}
        onCancel={() => {
          if (!isDeletingSchedule) setScheduleToDelete(null)
        }}
        onConfirm={handleConfirmDeleteSchedule}
      />
    </div>
  )
}

export default SchedulePage

