import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'
import type { WebsiteIndexData } from './webpageService'

const pubAuthHeaders = (): Record<string, string> => {
  const t = localStorage.getItem('pub_accessToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export interface PublicWebpageData {
  uuid: string
  event?: string
  name: string
  slug: string
  content: any
  [key: string]: any
}

/**
 * Fetch website index for the published site (no auth).
 * Endpoint: {{url}}{{public_url}}events/{{event_uuid}}/index/
 * Public-only wrapper, separate from the CMS-side index fetch.
 */
export const fetchPublicIndex = async (eventUuid: string): Promise<WebsiteIndexData> => {
  if (!eventUuid) {
    const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
    throw new Error(errorMessage)
  }

  const url = API_ENDPOINTS.PUBLIC.INDEX(eventUuid)
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
    credentials: 'include'
  })

  if (!response.ok) {
    return { webpages: [], speaker_tags: [], attendee_tags: [], navigation: undefined }
  }

  const text = await response.text()
  if (!text?.trim()) {
    return { webpages: [], speaker_tags: [], attendee_tags: [], navigation: undefined }
  }

  try {
    const data = JSON.parse(text)
    if (data?.status === 'error') {
      return { webpages: [], speaker_tags: [], attendee_tags: [], navigation: undefined }
    }
    const raw = data?.data ?? data
    const webpages = Array.isArray(raw?.webpages) ? raw.webpages : []
    const speaker_tags = Array.isArray(raw?.speaker_tags) ? raw.speaker_tags : []
    const attendee_tags = Array.isArray(raw?.attendee_tags) ? raw.attendee_tags : []
    const navigation = Array.isArray(raw?.navigation) ? raw.navigation : undefined
    return { webpages, speaker_tags, attendee_tags, navigation }
  } catch {
    return { webpages: [], speaker_tags: [], attendee_tags: [], navigation: undefined }
  }
}

/**
 * Fetch navigation tree for the published site.
 * Endpoint: GET {{public_url}}events/{{event_uuid}}/navigation/
 * Response shape: { status, data: { navigation: [...] } } or { navigation: [...] } or [...]
 */
export const fetchPublicNavigation = async (eventUuid: string): Promise<any[]> => {
  if (!eventUuid) return []

  const url = API_ENDPOINTS.PUBLIC.NAVIGATION(eventUuid)
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
    credentials: 'include',
  })

  if (!response.ok) return []

  try {
    const json = await response.json()
    const payload = json?.data ?? json
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.navigation)) return payload.navigation
    return []
  } catch {
    return []
  }
}

export const fetchPublicWebpages = async (eventUuid: string): Promise<PublicWebpageData[]> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.PUBLIC.WEBPAGES.LIST(eventUuid)
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
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
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch webpages. Please try again.')
      throw new Error(errorMessage)
    }

    const responseData = data?.data ?? data?.results ?? data
    if (Array.isArray(responseData)) {
      return responseData as PublicWebpageData[]
    }
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.results)) {
      return responseData.results as PublicWebpageData[]
    }

    return []
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch webpages. Please try again.')
  }
}

export const fetchPublicWebpage = async (
  eventUuid: string,
  webpageSlug: string
): Promise<PublicWebpageData> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }
    if (!webpageSlug) {
      const errorMessage = handleApiError('Webpage slug is required.', undefined, 'Webpage slug is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.PUBLIC.WEBPAGES.GET(eventUuid, webpageSlug)
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
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
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch webpage. Please try again.')
      throw new Error(errorMessage)
    }

    const webpageData = data?.data ?? data
    if (!webpageData || typeof webpageData !== 'object') {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    return webpageData as PublicWebpageData
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch webpage. Please try again.')
  }
}

