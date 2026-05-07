import { API_ENDPOINTS } from '../config/env'
import { handleApiError } from '../utils/errorHandler'

export type OverviewEventStatus = 'live' | 'draft'
export type OverviewEventMode = 'online' | 'offline' | 'hybrid'

export interface EventOverviewPayload {
  event: {
    title: string
    status: OverviewEventStatus
    startDate: string
    endDate: string
    location: string
    timezone: string
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

/** API overview response shape: { status, message, data: { name, status?, start_date, end_date, timezone, location, venue?, address?, registrations_total, ... } } */
interface OverviewApiData {
  name?: string
  status?: string
  event_status?: string
  publish_status?: string
  start_date?: string
  end_date?: string
  startDateTimeISO?: string
  endDateTimeISO?: string
  timezone?: string
  location?: string
  venue?: string
  address?: string
  registrations_total?: number
  communications_sent?: number
  communications_scheduled?: number
}

function statusFromApi(raw: string | undefined): OverviewEventStatus {
  const s = String(raw ?? '').toLowerCase().trim()
  if (s === 'live' || s === 'published' || s === 'publish') return 'live'
  return 'draft'
}

function modeFromLocation(location: string): OverviewEventMode {
  const raw = String(location || '').toLowerCase().trim()
  if (raw.includes('virtual') || raw.includes('online')) return 'online'
  if (raw.includes('in-person') || raw.includes('offline')) return 'offline'
  if (raw.includes('hybrid')) return 'hybrid'
  if (raw === 'in-person') return 'offline'
  return 'hybrid'
}

export async function fetchEventOverview(eventUuid: string): Promise<EventOverviewPayload> {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) {
    throw new Error(handleApiError('Authentication required.', undefined, 'Authentication required.'))
  }
  if (!organizationUuid) {
    throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))
  }

  const url = API_ENDPOINTS.EVENT.OVERVIEW(eventUuid)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })

  const raw = await response.text()
  if (!response.ok) {
    let err: unknown = raw
    try {
      if (raw) err = JSON.parse(raw)
    } catch {}
    throw new Error(handleApiError(err, response, 'Failed to load overview.'))
  }

  let json: { status?: string; data?: OverviewApiData } = {}
  try {
    json = raw ? JSON.parse(raw) : {}
  } catch {
    throw new Error(handleApiError(null, response, 'Invalid overview response.'))
  }

  if (json.status === 'error') {
    throw new Error(handleApiError(json, undefined, 'Failed to load overview.'))
  }

  // Support both { data: { name, location, ... } } and { data: { data: { name, ... } } }
  const rawData = json.data ?? {}
  const d: OverviewApiData = typeof (rawData as any)?.data === 'object' ? (rawData as any).data : rawData
  const title = String(d.name ?? '').trim() || 'Untitled event'

  // The overview API returns start_date/end_date as full ISO strings with timezone offset
  // e.g. "2026-08-18T00:00:00+05:30". Using new Date() + timeZone:'UTC' on these shifts
  // the date by the offset (showing Aug 17 instead of Aug 18). Extract only the date
  // portion (YYYY-MM-DD) directly from the string so the calendar date is preserved.
  const extractDate = (raw: string): string =>
    raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? raw

  const rawStart = String(d.startDateTimeISO ?? d.start_date ?? '').trim()
  const rawEnd = String(d.endDateTimeISO ?? d.end_date ?? '').trim()
  const startDate = extractDate(rawStart)
  const endDate = extractDate(rawEnd)
  // Location: prefer location, then venue, then address (API may use any of these)
  const location = String(d.location ?? d.venue ?? d.address ?? '').trim()
  const timezone = String(d.timezone ?? '').trim()
  // Status: backend may use status, event_status, or publish_status (or nest under event)
  const rawStatus =
    d.status ??
    d.event_status ??
    d.publish_status ??
    (typeof (rawData as any)?.event === 'object' ? (rawData as any).event?.status : undefined) ??
    (rawData as any)?.status

  return {
    event: {
      title,
      status: statusFromApi(rawStatus),
      startDate,
      endDate,
      location,
      timezone,
      mode: modeFromLocation(location),
    },
    stats: {
      registrations: {
        total: Number(d.registrations_total) || 0,
        invited: 0,
      },
      devices: {
        desktop: 0,
        mobile: 0,
      },
      communications: {
        scheduled: Number(d.communications_scheduled) || 0,
        sent: Number(d.communications_sent) || 0,
      },
    },
  }
}

