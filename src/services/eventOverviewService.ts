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

/** API overview response shape: { status, message, data: { name, start_date, end_date, timezone, location, registrations_total, communications_sent, communications_scheduled } } */
interface OverviewApiData {
  name?: string
  start_date?: string
  end_date?: string
  timezone?: string
  location?: string
  registrations_total?: number
  communications_sent?: number
  communications_scheduled?: number
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

  const d: OverviewApiData = json.data ?? {}
  const title = String(d.name ?? '').trim() || 'Untitled event'
  const startDate = String(d.start_date ?? '').trim()
  const endDate = String(d.end_date ?? '').trim()
  const location = String(d.location ?? '').trim()

  return {
    event: {
      title,
      status: 'draft',
      startDate,
      endDate,
      location,
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

