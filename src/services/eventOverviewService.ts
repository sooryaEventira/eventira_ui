import { fetchEvent, type EventData } from './eventService'
import { fetchAttendees, type AttendeeData } from './attendeeService'
import { fetchCommunications, type CommunicationData } from './communicationService'

export type OverviewEventStatus = 'live' | 'draft'
export type OverviewEventMode = 'online' | 'offline' | 'hybrid'

export interface EventOverviewPayload {
  event: {
    title: string
    status: OverviewEventStatus
    startDate: string
    endDate: string
    location: string
    mode: OverviewEventMode
  }
  stats: {
    registrations: {
      total: number
      invited: number
    }
    devices: {
      desktop: number
      mobile: number
    }
    communications: {
      scheduled: number
      sent: number
    }
  }
}

function normalizeStatus(raw: unknown): OverviewEventStatus {
  const s = String(raw || '').toLowerCase()
  if (s === 'live' || s === 'published') return 'live'
  return 'draft'
}

function normalizeMode(event: EventData): OverviewEventMode {
  // Backend uses: eventExperience: 'in-person' | 'virtual' | 'hybrid' (sometimes "Online/Offline/Hybrid")
  const raw = String((event as any)?.eventExperience ?? (event as any)?.attendance_type ?? (event as any)?.mode ?? '')
    .toLowerCase()
    .trim()

  if (raw.includes('hybrid')) return 'hybrid'
  if (raw.includes('virtual') || raw.includes('online')) return 'online'
  if (raw.includes('in-person') || raw.includes('offline')) return 'offline'
  // sensible default
  return 'hybrid'
}

function pickDateString(event: EventData, key: 'start' | 'end'): string {
  const candidates =
    key === 'start'
      ? [
          (event as any)?.startDateTimeISO,
          (event as any)?.startDate,
          (event as any)?.event_date,
          (event as any)?.eventDate,
        ]
      : [
          (event as any)?.endDateTimeISO,
          (event as any)?.endDate,
          (event as any)?.end_date,
          (event as any)?.endDate,
        ]

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c
  }
  return ''
}

function countInvited(attendees: AttendeeData[]): number {
  return attendees.filter((a) => {
    const status = String((a as any)?.status ?? '').toLowerCase()
    if (status.includes('invite') || status.includes('pending') || status.includes('sent')) return true
    // fallback signal: email not verified often means "invited but not yet registered"
    if ((a as any)?.email_verified === false) return true
    return false
  }).length
}

function countDevices(attendees: AttendeeData[]): { desktop: number; mobile: number } {
  let desktop = 0
  let mobile = 0

  for (const a of attendees) {
    const raw =
      String((a as any)?.device ?? (a as any)?.device_type ?? (a as any)?.platform ?? (a as any)?.user_agent ?? '')
        .toLowerCase()
        .trim()

    if (!raw) continue

    if (raw.includes('android') || raw.includes('iphone') || raw.includes('ios') || raw.includes('mobile')) {
      mobile += 1
      continue
    }

    if (raw.includes('windows') || raw.includes('mac') || raw.includes('linux') || raw.includes('desktop')) {
      desktop += 1
      continue
    }
  }

  return { desktop, mobile }
}

function countCommunications(comms: CommunicationData[]): { scheduled: number; sent: number } {
  let scheduled = 0
  let sent = 0
  const now = Date.now()

  for (const c of comms) {
    const status = String(c.status || '').toLowerCase()
    const scheduledAt = c.scheduled_at ? Date.parse(c.scheduled_at) : NaN

    if (status.includes('sent') || status.includes('delivered') || status.includes('success')) {
      sent += 1
      continue
    }

    if (status.includes('scheduled') || status.includes('pending')) {
      scheduled += 1
      continue
    }

    if (!Number.isNaN(scheduledAt) && scheduledAt > now) {
      scheduled += 1
      continue
    }
  }

  return { scheduled, sent }
}

export async function fetchEventOverview(eventUuid: string): Promise<EventOverviewPayload> {
  // Event is required; the rest can degrade to 0s if those endpoints return empty.
  const event = await fetchEvent(eventUuid)

  const [attendees, comms] = await Promise.all([
    fetchAttendees(eventUuid).catch(() => [] as AttendeeData[]),
    fetchCommunications(eventUuid).catch(() => [] as CommunicationData[]),
  ])

  const invited = countInvited(attendees)
  const devices = countDevices(attendees)
  const commStats = countCommunications(comms)

  const startDate = pickDateString(event, 'start')
  const endDate = pickDateString(event, 'end')

  return {
    event: {
      title: String((event as any)?.eventName ?? (event as any)?.title ?? '').trim() || 'Untitled event',
      status: normalizeStatus((event as any)?.status),
      startDate,
      endDate,
      location: String((event as any)?.location ?? '').trim(),
      mode: normalizeMode(event),
    },
    stats: {
      registrations: {
        total: attendees.length,
        invited,
      },
      devices,
      communications: commStats,
    },
  }
}

