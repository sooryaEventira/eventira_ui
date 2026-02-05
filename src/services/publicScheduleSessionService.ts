import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'

export interface PublicScheduleSessionData {
  id?: string | number
  uuid?: string
  title?: string
  name?: string
  date?: string
  day?: string
  start_time?: string
  end_time?: string
  startTime?: string
  endTime?: string
  location?: string
  session_type?: string
  sessionType?: string
  parent_id?: string | number
  parentId?: string | number
  parent_uuid?: string
  parentUuid?: string
  attachments?: any[]
  attachments_count?: number
  attachmentsCount?: number
  [key: string]: any
}

export const fetchPublicScheduleSessions = async (
  eventUuid: string,
  scheduleUuid: string
): Promise<PublicScheduleSessionData[]> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }
    if (!scheduleUuid) {
      const errorMessage = handleApiError('Schedule UUID is required.', undefined, 'Schedule UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.PUBLIC.SESSIONS.LIST(eventUuid, scheduleUuid)
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }
      try {
        const responseText = await response.text()
        let errorData: any = null
        try {
          errorData = responseText ? JSON.parse(responseText) : null
        } catch {
          if (responseText && responseText.trim()) {
            const errorMessage = handleApiError(responseText.trim(), response, 'An error occurred. Please try again.')
            throw new Error(errorMessage)
          }
        }
        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'An error occurred. Please try again.')
          throw new Error(errorMessage)
        }
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error) throw parseError
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: any
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data?.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch sessions. Please try again.')
      throw new Error(errorMessage)
    }

    const responseData = data?.data ?? data?.results ?? data
    if (Array.isArray(responseData)) return responseData as PublicScheduleSessionData[]
    if (responseData && typeof responseData === 'object') {
      if (Array.isArray(responseData.results)) return responseData.results as PublicScheduleSessionData[]
      if (Array.isArray(responseData.sessions)) return responseData.sessions as PublicScheduleSessionData[]
    }
    return []
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch sessions. Please try again.')
  }
}

