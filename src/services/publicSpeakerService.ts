import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'

export interface PublicSpeakerData {
  id?: string | number
  uuid?: string
  name?: string
  first_name?: string
  last_name?: string
  title?: string
  organization?: string
  avatar_url?: string
  avatarUrl?: string
  bio?: string
  description?: string
  [key: string]: any
}

export const fetchPublicSpeakers = async (eventUuid: string): Promise<PublicSpeakerData[]> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }


    const url = tagId
    ? API_ENDPOINTS.PUBLIC.SPEAKERS.LIST_BY_TAG(eventUuid, tagId)
    : API_ENDPOINTS.PUBLIC.SPEAKERS.LIST(eventUuid)
  if (tagId) {
    console.log('[fetchPublicSpeakers] LIST_BY_TAG', { eventUuid, tagId, url })
  } else {
    console.log('[fetchPublicSpeakers] LIST (all)', { eventUuid, url })
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
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch speakers. Please try again.')
      throw new Error(errorMessage)
    }

    const responseData = data?.data ?? data?.results ?? data
    if (Array.isArray(responseData)) return responseData as PublicSpeakerData[]
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.results)) {
      return responseData.results as PublicSpeakerData[]
    }
    return []
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch speakers. Please try again.')
  }
}

