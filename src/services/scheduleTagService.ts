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
 * Fetch all schedule tags for an event
 */
export async function fetchScheduleTags(eventUuid: string): Promise<ScheduleTag[]> {
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
    const url = API_ENDPOINTS.SCHEDULE_TAGS.LIST(eventUuid)
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
