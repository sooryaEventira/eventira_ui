import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'

export interface PublicAttendeeData {
  id?: string | number
  uuid?: string
  name?: string
  first_name?: string
  last_name?: string
  post?: string
  organization?: string
  institute?: string
  avatar_url?: string
  avatarUrl?: string
  [key: string]: any
}

export const fetchPublicAttendee = async (
  eventUuid: string,
  attendeeUuid: string
): Promise<PublicAttendeeData | null> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }
    if (!attendeeUuid) {
      const errorMessage = handleApiError('Attendee UUID is required.', undefined, 'Attendee UUID is required.')
      throw new Error(errorMessage)
    }

    // Endpoint: {{public_url}}events/{{event_uuid}}/attendees/{{attendee_uuid}}/
    const url = `${API_ENDPOINTS.PUBLIC.ATTENDEES.LIST(eventUuid)}${attendeeUuid}/`
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
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
          const errorMessage = handleApiError(responseText.trim(), response, 'Failed to fetch attendee.')
          throw new Error(errorMessage)
        }
      }
      const errorMessage = handleApiError(errorData, response, 'Failed to fetch attendee.')
      throw new Error(errorMessage)
    }

    let data: any
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data?.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch attendee.')
      throw new Error(errorMessage)
    }

    const responseData = data?.data ?? data
    return (responseData as PublicAttendeeData) ?? null
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch attendee.')
  }
}

export const fetchPublicAttendees = async (
  eventUuid: string,
  tagId?: string
): Promise<PublicAttendeeData[]> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    // env.ts PUBLIC.ATTENDEES: LIST (all) or LIST_BY_TAG (tag_id=)
    const url = tagId
      ? API_ENDPOINTS.PUBLIC.ATTENDEES.LIST_BY_TAG(eventUuid, tagId)
      : API_ENDPOINTS.PUBLIC.ATTENDEES.LIST(eventUuid)
    if (tagId) {
      console.log('[fetchPublicAttendees] LIST_BY_TAG', { eventUuid, tagId, url })
    } else {
      console.log('[fetchPublicAttendees] LIST (all)', { eventUuid, url })
    }
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
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch attendees. Please try again.')
      throw new Error(errorMessage)
    }

    const responseData = data?.data ?? data?.results ?? data
    let result: PublicAttendeeData[]
    if (Array.isArray(responseData)) {
      result = responseData as PublicAttendeeData[]
    } else if (responseData && typeof responseData === 'object' && Array.isArray(responseData.results)) {
      result = responseData.results as PublicAttendeeData[]
    } else {
      result = []
    }
    if (tagId) {
      console.log('Attendees by tag: fetchPublicAttendees(eventUuid, tagUuid) response', { eventUuid, tagId, count: result.length, data: result })
    } else {
      console.log('[fetchPublicAttendees] LIST (all) response', { count: result.length, data: result })
    }
    return result
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch attendees. Please try again.')
  }
}

