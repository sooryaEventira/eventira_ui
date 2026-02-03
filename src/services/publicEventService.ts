import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'

export interface PublicEventData {
  uuid: string
  eventName?: string
  logo?: string
  banner?: string
  [key: string]: any
}

export const fetchPublicEvent = async (eventUuid: string): Promise<PublicEventData> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const ensureTrailingSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`)

    const urlPrimary = ensureTrailingSlash(API_ENDPOINTS.PUBLIC.EVENT.GET(eventUuid))
    // Fallback for environments that use plural `events/{uuid}/`
    const urlFallback = ensureTrailingSlash(urlPrimary.replace('/event/', '/events/'))

    const tryFetch = async (url: string) => {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      return response
    }

    let response = await tryFetch(urlPrimary)
    if (response.status === 404 && urlFallback !== urlPrimary) {
      response = await tryFetch(urlFallback)
    }

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

    // Accept either direct object or ApiResponse-style { status, data }
    if (data?.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch event. Please try again.')
      throw new Error(errorMessage)
    }

    const eventData = data?.data ?? data
    if (!eventData || typeof eventData !== 'object') {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    return eventData as PublicEventData
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch event. Please try again.')
  }
}

