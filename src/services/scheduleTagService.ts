import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError } from '../utils/errorHandler'

export interface ScheduleTag {
  uuid: string
  id?: number
  name: string
  event?: string
  created_at?: string
  updated_at?: string
}

/**
 * Create a new schedule tag for an event
 */
export async function createScheduleTag(scheduleUuid: string, eventUuid: string, name: string): Promise<ScheduleTag> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) throw new Error('Authentication required.')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')

  const response = await fetch(API_ENDPOINTS.SCHEDULE_TAGS.CREATE(scheduleUuid, eventUuid), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errData: any = null
    try { errData = text ? JSON.parse(text) : null } catch { /* ignore */ }
    const msg = handleApiError(errData ?? text, response, 'Failed to create tag.')
    throw new Error(msg)
  }

  const data = await response.json()
  return (data?.data ?? data) as ScheduleTag
}

/**
 * Delete a schedule tag
 */
export async function deleteScheduleTag(tagUuid: string, eventUuid: string): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) throw new Error('Authentication required.')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')

  const response = await fetch(API_ENDPOINTS.SCHEDULE_TAGS.DELETE(tagUuid, eventUuid), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errData: any = null
    try { errData = text ? JSON.parse(text) : null } catch { /* ignore */ }
    const msg = handleApiError(errData ?? text, response, 'Failed to delete tag.')
    throw new Error(msg)
  }
}

/**
 * Fetch all schedule tags for an event
 */
export async function fetchScheduleTags(scheduleUuid: string, eventUuid: string): Promise<ScheduleTag[]> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    const msg = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required.')
    throw new Error(msg)
  }

  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) {
    const msg = handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.')
    throw new Error(msg)
  }

  if (!eventUuid) {
    const msg = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
    throw new Error(msg)
  }

  try {
    const url = API_ENDPOINTS.SCHEDULE_TAGS.LIST(scheduleUuid, eventUuid)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        if (responseText && responseText.trim()) {
          const errorMessage = handleApiError(responseText.trim(), response, 'Failed to fetch schedule tags.')
          throw new Error(errorMessage)
        }
      }

      const errorMessage = handleApiError(errorData, response, 'Failed to fetch schedule tags.')
      throw new Error(errorMessage)
    }

    const data = await response.json()
    const tags = data?.data ?? data?.results ?? data

    if (Array.isArray(tags)) {
      return tags as ScheduleTag[]
    }

    return []
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch schedule tags.')
  }
}
