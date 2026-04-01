import { API_ENDPOINTS } from '../config/env'
import { handleApiError } from '../utils/errorHandler'

export interface SchedulePayload {
  eventUuid: string
  title: string
  description?: string
  locations?: string[]
  tagUuids?: string[]
  tagName?: string
}

export interface ScheduleResult {
  uuid: string | null
  id?: string | null
}

function getAuthHeaders(): { Authorization: string; 'X-Organization': string; 'Content-Type': string } {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) throw new Error('Authentication required.')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'X-Organization': organizationUuid,
  }
}

/**
 * Create a new schedule.
 * POST {{admin_url}}schedules/?event_id={{event_uuid}}
 */
export async function createSchedule(payload: SchedulePayload): Promise<ScheduleResult> {
  const headers = getAuthHeaders()

  const body: Record<string, unknown> = {
    event_id: payload.eventUuid,
    event_uuid: payload.eventUuid,
    name: payload.title,
    title: payload.title,
    description: payload.description ?? '',
    locations: payload.locations ?? [],
    tag_uuids: payload.tagUuids ?? [],
  }
  if (payload.tagName) body.tag_name = payload.tagName

  const response = await fetch(API_ENDPOINTS.SCHEDULES.CREATE(payload.eventUuid), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  })

  const rawText = await response.text().catch(() => '')
  let data: any = null
  try { data = rawText ? JSON.parse(rawText) : null } catch { /* ignore */ }

  if (!response.ok) {
    const msg = handleApiError(data ?? rawText, response, 'Failed to create schedule.')
    throw new Error(msg)
  }

  const result = data?.data ?? data
  return { uuid: result?.uuid ?? result?.id ?? null }
}

/**
 * Update an existing schedule.
 * PATCH {{admin_url}}schedules/{{schedule_uuid}}/?event_id={{event_uuid}}
 */
export async function updateSchedule(scheduleUuid: string, payload: SchedulePayload): Promise<void> {
  const headers = getAuthHeaders()

  const body: Record<string, unknown> = {
    event_uuid: payload.eventUuid,
    name: payload.title,
    title: payload.title,
    description: payload.description ?? '',
    locations: payload.locations ?? [],
    tag_uuids: payload.tagUuids ?? [],
  }
  if (payload.tagName) body.tag_name = payload.tagName

  const response = await fetch(API_ENDPOINTS.SCHEDULES.UPDATE(payload.eventUuid, scheduleUuid), {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  })

  const rawText = await response.text().catch(() => '')
  let data: any = null
  try { data = rawText ? JSON.parse(rawText) : null } catch { /* ignore */ }

  if (!response.ok) {
    const msg = handleApiError(data ?? rawText, response, 'Failed to update schedule.')
    throw new Error(msg)
  }
}
