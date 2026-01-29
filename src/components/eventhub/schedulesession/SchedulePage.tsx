import React, { useMemo, useEffect, useCallback } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import ScheduleContent from './ScheduleContent'
import SessionSlideout from './SessionSlideout'
import TemplateSessionSlideout from './TemplateSessionSlideout'
import ScheduleDetailsSlideout from './ScheduleDetailsSlideout'
import SavedSchedulesTable from './SavedSchedulesTable'
import { SavedSchedule, SavedSession, SessionDraft } from './sessionTypes'
import { defaultSessionDraft } from './sessionConfig'
import { defaultCards, ContentCard } from '../EventHubContent'
import { InfoCircle, CodeBrowser, Globe01 } from '@untitled-ui/icons-react'
import { API_ENDPOINTS } from '../../../config/env'
import { showToast } from '../../../utils/toast'
import { fetchTimezones } from '../../../services/timezoneService'
import * as XLSX from 'xlsx'
import { writeEventStoreJSON } from '../../../utils/eventLocalStore'

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

  const buildSessionSignature = useCallback((input: {
    dateKey: string
    title: string
    location: string
    startTime: string
    startPeriod: 'AM' | 'PM'
    endTime: string
    endPeriod: 'AM' | 'PM'
  }) => {
    return [
      input.dateKey,
      input.title.trim(),
      input.location.trim(),
      `${input.startTime} ${input.startPeriod}`,
      `${input.endTime} ${input.endPeriod}`
    ].join('||')
  }, [])

  const parseExcelDateKey = (value: any): string | null => {
    if (value === null || value === undefined) return null
    // Date object
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10)
    }
    // Excel date number
    if (typeof value === 'number' && Number.isFinite(value)) {
      try {
        const d = XLSX.SSF.parse_date_code(value)
        if (!d || !d.y || !d.m || !d.d) return null
        const mm = String(d.m).padStart(2, '0')
        const dd = String(d.d).padStart(2, '0')
        return `${d.y}-${mm}-${dd}`
      } catch {
        return null
      }
    }
    const raw = String(value).trim()
    if (!raw) return null
    // Try parseable string date
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    return null
  }

  const parseExcelTimeToMinutes = (value: any): number | null => {
    if (value === null || value === undefined) return null
    // Excel time number (fraction of day) or full datetime number
    if (typeof value === 'number' && Number.isFinite(value)) {
      // If it's a fraction-of-day time, keep fractional part
      const fractional = value % 1
      const minutes = Math.round(fractional * 24 * 60)
      return minutes >= 0 && minutes < 24 * 60 ? minutes : null
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.getHours() * 60 + value.getMinutes()
    }
    const raw = String(value).trim()
    if (!raw) return null
    // "09:00" or "9:00" or "09:00 AM"
    const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (ampm) {
      let h = Number(ampm[1])
      const m = Number(ampm[2])
      const p = ampm[3].toUpperCase()
      if (p === 'PM' && h !== 12) h += 12
      if (p === 'AM' && h === 12) h = 0
      return h * 60 + m
    }
    const h24 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
    if (h24) {
      const h = Number(h24[1])
      const m = Number(h24[2])
      return h * 60 + m
    }
    return null
  }

  const minutesToTimePeriod = (minutes: number): { time: string; period: 'AM' | 'PM' } => {
    const m = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60)
    const hours24 = Math.floor(m / 60)
    const mins = String(m % 60).padStart(2, '0')
    const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
    let hours12 = hours24 % 12
    if (hours12 === 0) hours12 = 12
    const hh = String(hours12).padStart(2, '0')
    return { time: `${hh}:${mins}`, period }
  }

  const storeExcelParentMap = useCallback(
    async (file: File, eventUuid: string, scheduleUuid: string) => {
      try {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const sheetName = wb.SheetNames?.[0]
        if (!sheetName) return
        const ws = wb.Sheets[sheetName]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][]
        if (!rows || rows.length < 2) return

        const header = (rows[0] || []).map((h) => String(h ?? '').trim().toLowerCase())
        const idx = (name: string) => header.findIndex((h) => h === name)
        const titleIdx = idx('title')
        const parentIdx = idx('parent session')
        const dateIdx = idx('date')
        const startIdx = idx('start time')
        const endIdx = idx('end time')
        const locationIdx = idx('location')

        if (titleIdx === -1 || dateIdx === -1 || startIdx === -1 || endIdx === -1) {
          console.log('⚠️ [Sessions] Excel parse: required columns not found', { header })
          return
        }

        type MapEntry = {
          signature: string
          title: string
          dateKey: string
          location: string
          startTime: string
          startPeriod: 'AM' | 'PM'
          endTime: string
          endPeriod: 'AM' | 'PM'
          sessionType: 'parent' | 'child'
          parentTitle: string | null
        }

        const entries: MapEntry[] = []
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] || []
          const title = String(row[titleIdx] ?? '').trim()
          if (!title) continue
          const dateKey = parseExcelDateKey(row[dateIdx])
          if (!dateKey) continue
          const startMin = parseExcelTimeToMinutes(row[startIdx])
          const endMinRaw = parseExcelTimeToMinutes(row[endIdx])
          if (startMin === null || endMinRaw === null) continue

          // handle cross-day (end < start)
          const endMin = endMinRaw < startMin ? endMinRaw + 24 * 60 : endMinRaw

          const start = minutesToTimePeriod(startMin)
          const end = minutesToTimePeriod(endMin)
          const location = locationIdx !== -1 ? String(row[locationIdx] ?? '').trim() : ''
          const parentTitle =
            parentIdx !== -1 && String(row[parentIdx] ?? '').trim()
              ? String(row[parentIdx]).trim()
              : null
          const sessionType: 'parent' | 'child' = parentTitle ? 'child' : 'parent'

          const signature = buildSessionSignature({
            dateKey,
            title,
            location,
            startTime: start.time,
            startPeriod: start.period,
            endTime: end.time,
            endPeriod: end.period,
          })

          entries.push({
            signature,
            title,
            dateKey,
            location,
            startTime: start.time,
            startPeriod: start.period,
            endTime: end.time,
            endPeriod: end.period,
            sessionType,
            parentTitle
          })
        }

        const key = `session-import-map:${eventUuid}:${scheduleUuid}`
        localStorage.setItem(key, JSON.stringify({ version: 1, entries, savedAt: Date.now() }))
        console.log('💾 [Sessions] Stored Excel parent map:', { key, count: entries.length })
      } catch (e) {
        console.log('⚠️ [Sessions] Failed to parse/store Excel map:', e)
      }
    },
    [buildSessionSignature]
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
      setEventTimeZone(null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const timezones = await fetchTimezones()
        const match = timezones.find((tz) => tz.uuid === String(timezoneUuid))
        const name = match?.name ?? null
        if (!cancelled) {
          setEventTimeZone(name)
          console.log('🕒 [Schedules] Resolved event timezone:', { timezoneUuid, name })
        }
      } catch (e) {
        if (!cancelled) {
          setEventTimeZone(null)
          console.log('⚠️ [Schedules] Failed to resolve timezone, using browser local time:', {
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
  
  // Prioritize createdEvent data from API (set when clicking event from dashboard), 
  // fallback to eventData from form, then props
  const eventName = createdEvent?.eventName || eventData?.eventName || propEventName || 'Highly important conference of 2025'
  const isDraft = propIsDraft !== undefined ? propIsDraft : true
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
      { id: 'overview', label: 'Overview', icon: <InfoCircle className="h-5 w-5" /> },
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
  const [activeScheduleId, setActiveScheduleId] = React.useState<string | null>(null)
  const [activeDraft, setActiveDraft] = React.useState<SessionDraft | null>(null)
  const [startInEditMode, setStartInEditMode] = React.useState(true)
  const [currentView, setCurrentView] = React.useState<'table' | 'content'>('table')
  const [availableTags, setAvailableTags] = React.useState<string[]>([])
  const [availableLocations, setAvailableLocations] = React.useState<string[]>([])

  const parseEventStartDate = React.useCallback((): Date | null => {
    const raw =
      (createdEvent as any)?.startDate ??
      (createdEvent as any)?.start_date ??
      (eventData as any)?.startDate ??
      (eventData as any)?.start_date
    if (!raw) return null
    const d = new Date(raw as any)
    if (Number.isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }, [createdEvent, eventData])

  const parseEventEndDate = React.useCallback((): Date | null => {
    const raw =
      (createdEvent as any)?.endDate ??
      (createdEvent as any)?.end_date ??
      (eventData as any)?.endDate ??
      (eventData as any)?.end_date
    if (!raw) return null
    const d = new Date(raw as any)
    if (Number.isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }, [createdEvent, eventData])

  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    const eventStart = parseEventStartDate()
    if (eventStart) return eventStart
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  })
  const [parentSessionId, setParentSessionId] = React.useState<string | undefined>(undefined)

  // If the event start date becomes available after initial render, sync once.
  const didInitSelectedFromEventRef = React.useRef(false)
  React.useEffect(() => {
    const eventStart = parseEventStartDate()
    if (!eventStart) return
    if (didInitSelectedFromEventRef.current) return
    didInitSelectedFromEventRef.current = true
    setSelectedDate(eventStart)
  }, [parseEventStartDate])

  // After refresh, selectedDate becomes "today". If today's date has no sessions, the grid looks empty.
  // Auto-pick the first session day for the active schedule so sessions show immediately.
  React.useEffect(() => {
    const schedule =
      (activeScheduleId ? savedSchedules.find((s) => s.id === activeScheduleId) : undefined) ??
      savedSchedules[0]
    if (!schedule) return
    const list = Array.isArray(schedule.sessions) ? schedule.sessions : []
    if (list.length === 0) return

    const dates: Date[] = []
    for (const s of list) {
      if (!s?.date) continue
      const d = new Date(s.date as any)
      if (Number.isNaN(d.getTime())) continue
      d.setHours(0, 0, 0, 0)
      dates.push(d)
    }
    if (dates.length === 0) return
    dates.sort((a, b) => a.getTime() - b.getTime())

    const normalizedSelected = new Date(selectedDate)
    normalizedSelected.setHours(0, 0, 0, 0)
    const hasSelected = dates.some((d) => d.getTime() === normalizedSelected.getTime())
    if (!hasSelected) {
      setSelectedDate(dates[0])
    }
  }, [activeScheduleId, savedSchedules, selectedDate])

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
        const id = s?.uuid ?? s?.id ?? `schedule-${Math.random().toString(36).slice(2)}`
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
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')

    if (!eventUuid || !accessToken || !organizationUuid) {
      return
    }

    try {
      const url = API_ENDPOINTS.SESSIONS.LIST(eventUuid)
      console.log('📥 [Sessions] LIST request:', { url, eventUuid })

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
        console.log('❌ [Sessions] LIST failed:', {
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

      console.log('✅ [Sessions] LIST response:', {
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
        if (Array.isArray(payload.results)) return payload.results
        if (Array.isArray(payload.data?.results)) return payload.data.results
        if (Array.isArray(payload.data)) return payload.data
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

          const start = parseTime(startCandidate, { timeZone: eventTimeZone ?? undefined })
          let end = parseTime(endCandidate, { timeZone: eventTimeZone ?? undefined })

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

          // Important: if backend returns YYYY-MM-DD, do NOT timezone-shift it.
          // Treat it as the intended session day.
          let date: Date | undefined
          if (isYmdOnly) {
            const d = new Date(`${rawStr}T00:00:00`)
            if (!Number.isNaN(d.getTime())) {
              d.setHours(0, 0, 0, 0)
              date = d
            }
          } else {
            const rawDateObj = rawDate ? new Date(rawDate as any) : undefined
            date = rawDateObj && !Number.isNaN(rawDateObj.getTime()) ? rawDateObj : undefined

            if (date && eventTimeZone) {
              // Normalize to event timezone day (for full datetimes)
              try {
                const ymd = new Intl.DateTimeFormat('en-CA', {
                  timeZone: eventTimeZone,
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                }).format(date)
                const d = new Date(`${ymd}T00:00:00`)
                if (!Number.isNaN(d.getTime())) {
                  d.setHours(0, 0, 0, 0)
                  date = d
                }
              } catch {
                // keep local fallback
              }
            } else if (date && !Number.isNaN(date.getTime())) {
              // If we have an ISO datetime but no timezone info, at least anchor to local day
              // using the date portion (avoids UTC -> local shifting issues).
              if (rawStr && rawStr.includes('T') && /^\d{4}-\d{2}-\d{2}T/.test(rawStr)) {
                const ymd = rawStr.slice(0, 10)
                const d = new Date(`${ymd}T00:00:00`)
                if (!Number.isNaN(d.getTime())) {
                  d.setHours(0, 0, 0, 0)
                  date = d
                }
              } else {
                date.setHours(0, 0, 0, 0)
              }
            }
          }

          const description = s?.description ?? s?.summary ?? ''
          const tags = normalizeTags(s?.tags)

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
            sections: Array.isArray(s?.sections)
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
                : [],
            attachments: Array.isArray(s?.attachments) ? s.attachments : [],
            date: date && !Number.isNaN(date.getTime()) ? date : undefined,
            parentId:
              s?.parent_session_uuid ??
              s?.parentSessionUuid ??
              s?.parent_id ??
              s?.parentId ??
              s?.parent_session_id ??
              s?.parentSessionId ??
              s?.parent_session ??
              s?.parentSession ??
              undefined
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
      if (!hasExcelMap && !hasBackendParentLinks) {
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

          let lastParentId: string | null = null
          for (const item of group) {
            const type = String(item.session.sessionType ?? '').toLowerCase()
            const isChild = type === 'child'
            const isParent = type === 'parent'

            if (isParent) {
              lastParentId = item.session.id
              continue
            }

            const hasExplicitParentTitle = Boolean((item as any).parentTitle)
            if (isChild && !hasExplicitParentTitle && !item.session.parentId && lastParentId) {
              item.session.parentId = lastParentId
              inferredCount += 1
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
      const parentsByIdGlobal = new Map<string, SavedSession>()
      const parentsByDay: Record<string, SavedSession[]> = {}
      for (const item of deduped) {
        const type = String(item.session.sessionType ?? '').toLowerCase()
        if (type !== 'parent') continue
        parentsByIdGlobal.set(item.session.id, item.session)
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

        // If parentId exists but parent isn't in this list, treat as orphan
        if (item.session.parentId && !parentsByIdGlobal.has(item.session.parentId)) {
          item.session.parentId = undefined
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
        const scheduleUuid =
          item.scheduleUuid ??
          (fallbackScheduleUuid ? fallbackScheduleUuid : null)
        if (!scheduleUuid) continue
        if (!sessionsBySchedule[scheduleUuid]) sessionsBySchedule[scheduleUuid] = []
        sessionsBySchedule[scheduleUuid].push(item.session)
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

      setSavedSchedules((previous) =>
        previous.map((schedule) => {
          const nextSessions = sessionsBySchedule[schedule.id]
          return nextSessions
            ? { ...schedule, sessions: nextSessions }
            : schedule
        })
      )
    } catch {
      // keep current UI state on failure
    }
  }, [createdEvent?.uuid, eventTimeZone, buildSessionSignature])

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
        formData.append('event_uuid', eventUuid)

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
        formData.append('event_uuid', eventUuid)

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
    
    // Store parent session ID for parallel sessions
    setParentSessionId(parentId)
    
    if (creationType === 'template') {
      // Open TemplateSessionSlideout for "Template"
      setIsTemplateSessionSlideoutOpen(true)
    } else if (creationType === 'scratch') {
      // Open SessionSlideout for "Create from scratch"
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
  }

  const handleSaveSession = (session: SessionDraft) => {
    setSavedSchedules((previous) => {
      const normalizedSession: SessionDraft = {
        ...defaultSessionDraft,
        ...session,
        title: session.title?.trim() || currentScheduleName,
        tags: session.tags ? [...session.tags] : [],
        sections: session.sections ? session.sections.map((section) => ({ ...section })) : []
      }

      if (activeScheduleId) {
        // Add session to existing schedule
        const existingSchedule = previous.find((item) => item.id === activeScheduleId)
        if (existingSchedule) {
          // Normalize date to start of day for consistent comparison
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

      // If no active schedule, create new one (shouldn't happen in content view)
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

    setActiveDraft(null)
    setStartInEditMode(false)
    setParentSessionId(undefined)
    setIsSessionSlideoutOpen(false)
  }

  const handleCreateScheduleFromList = () => {
    setIsScheduleDetailsSlideoutOpen(true)
  }

  const handleCloseScheduleDetailsSlideout = () => {
    setIsScheduleDetailsSlideoutOpen(false)
  }

  const handleSaveScheduleDetails = async (details: { title: string; tags: string[]; location: string[]; description: string }) => {
    // Filter out "selectall" and store only the selected tags and locations
    const selectedTags = (details.tags || []).filter(tag => tag !== 'selectall')
    const selectedLocations = (details.location || []).filter(loc => loc !== 'selectall')

    const scheduleTitle = details.title?.trim() || `Schedule ${savedSchedules.length + 1}`

    // POST {{admin_url}}schedules/
    const eventUuid = createdEvent?.uuid
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')

    let createdScheduleId: string | null = null

    if (eventUuid && accessToken && organizationUuid) {
      try {
        const response = await fetch(API_ENDPOINTS.SCHEDULES.CREATE, {
          method: 'POST',
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
          showToast.error('Failed to create schedule. Please try again.')
        } else {
          // Support both ApiResponse and direct-object responses
          const payload = data?.data ?? data
          createdScheduleId = payload?.uuid ?? payload?.id ?? null
          showToast.success('Schedule created successfully')
        }
      } catch (e) {
        showToast.error('Failed to create schedule. Please try again.')
      }
    } else {
      // Keep local behavior if auth/event context missing (avoid breaking UI)
      console.warn('Schedule create skipped (missing auth/event context). Creating locally.')
    }

    // Refresh list from backend so table matches server truth
    if (createdScheduleId) {
      await loadSchedules()
    } else {
      // Fallback: keep local behavior if we couldn't read an id
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
            onEditSchedule={(scheduleId) => {
              const target = savedSchedules.find((item) => item.id === scheduleId)
              if (!target || !target.session) return
              setActiveScheduleId(scheduleId)
              setCurrentScheduleName(target.name)
              setActiveDraft({
                ...defaultSessionDraft,
                ...target.session,
                tags: [...(target.session.tags ?? [])],
                sections: target.session.sections?.map((section) => ({ ...section })) ?? []
              })
              setStartInEditMode(false)
              setIsSessionSlideoutOpen(true)
            }}
          />
        ) : (
          <ScheduleContent
            scheduleName={currentScheduleName}
            onUpload={handleUpload}
            onUploadFiles={handleUploadSessions}
            onAddSession={handleAddSessionClick}
            onBack={handleBackToTable}
            sessions={activeScheduleId ? savedSchedules.find(s => s.id === activeScheduleId)?.sessions || [] : []}
            selectedDate={selectedDate}
            rangeStartDate={parseEventStartDate() || undefined}
            rangeEndDate={parseEventEndDate() || undefined}
            onDateChange={(date) => {
              const normalizedDate = new Date(date)
              normalizedDate.setHours(0, 0, 0, 0)
              setSelectedDate(normalizedDate)
            }}
          />
        )}
      </div>

      <SessionSlideout
        isOpen={isSessionSlideoutOpen}
        onClose={handleCloseSlideout}
        onSave={handleSaveSession}
        initialDraft={activeDraft}
        startInEditMode={startInEditMode}
        topOffset={64}
        panelWidthRatio={0.5}
        availableTags={availableTags}
        availableLocations={availableLocations}
      />

      <TemplateSessionSlideout
        isOpen={isTemplateSessionSlideoutOpen}
        onClose={() => setIsTemplateSessionSlideoutOpen(false)}
        onSave={(data) => {
          // Convert template data to SessionDraft format if needed
          console.log('Template session data:', data)
          setIsTemplateSessionSlideoutOpen(false)
        }}
        availableTags={availableTags}
        availableLocations={availableLocations}
        topOffset={64}
        panelWidthRatio={0.8}
      />

      <ScheduleDetailsSlideout
        isOpen={isScheduleDetailsSlideoutOpen}
        onClose={handleCloseScheduleDetailsSlideout}
        onSave={handleSaveScheduleDetails}
        topOffset={64}
        panelWidthRatio={0.5}
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
    </div>
  )
}

export default SchedulePage

