import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'

const pubAuthHeaders = (): Record<string, string> => {
  const t = localStorage.getItem('pub_accessToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

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
        headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
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

/**
 * Fetch all public events.
 * Endpoint: {{public_url}}event/
 */
export const fetchPublicEventList = async (): Promise<PublicEventData[]> => {
  const url = API_ENDPOINTS.PUBLIC.EVENT.LIST()
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
  })

  if (!response.ok) {
    let errorData: any = null
    try { errorData = await response.json() } catch { /* ignore */ }
    throw new Error(
      handleApiError(errorData ?? null, response, 'Failed to fetch events. Please try again.')
    )
  }

  let data: any
  try {
    data = await response.json()
  } catch {
    throw new Error(handleParseError('Invalid response from server. Please try again.'))
  }

  if (data?.status === 'error') {
    throw new Error(handleApiError(data, undefined, 'Failed to fetch events. Please try again.'))
  }

  const raw = data?.data ?? data?.results ?? data
  if (Array.isArray(raw)) return raw as PublicEventData[]
  if (raw && typeof raw === 'object' && Array.isArray(raw.results)) return raw.results as PublicEventData[]
  return []
}

/**
 * Fetch public events filtered by tag.
 * Endpoint: {{public_url}}events/?tag_id={{tag_uuid}}
 */
/**
 * Fetch bookmarked schedules for an event (authenticated).
 * Endpoint: GET {{public_url}}events/{{event_uuid}}/schedules/bookmarks/
 */
export const fetchBookmarkedSchedules = async (eventUuid: string): Promise<any[]> => {
  const accessToken = localStorage.getItem('pub_accessToken')
  if (!accessToken) return []
  const url = API_ENDPOINTS.PUBLIC.SCHEDULE_BOOKMARKS.LIST(eventUuid)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!response.ok) return []
  let data: any
  try { data = await response.json() } catch { return [] }
  const raw = data?.data ?? data?.results ?? data
  return Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : []
}

/**
 * Fetch bookmarked sessions within a schedule (authenticated).
 * Endpoint: GET {{public_url}}events/{{event_uuid}}/schedules/{{schedule_uuid}}/sessions/bookmarks/
 */
export const fetchBookmarkedScheduleSessions = async (eventUuid: string, scheduleUuid: string): Promise<any[]> => {
  const accessToken = localStorage.getItem('pub_accessToken')
  if (!accessToken) return []
  const url = API_ENDPOINTS.PUBLIC.SCHEDULE_BOOKMARKS.SESSIONS(eventUuid, scheduleUuid)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!response.ok) return []
  let data: any
  try { data = await response.json() } catch { return [] }
  const raw = data?.data ?? data?.results ?? data
  return Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : []
}

/**
 * Fetch bookmarked sessions for an event (authenticated).
 * Endpoint: GET {{public_url}}events/{{event_uuid}}/sessions/bookmarks/
 */
export const fetchBookmarkedSessions = async (eventUuid: string): Promise<any[]> => {
  const accessToken = localStorage.getItem('pub_accessToken')
  if (!accessToken) return []
  const url = API_ENDPOINTS.PUBLIC.SESSION_BOOKMARKS.LIST(eventUuid)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!response.ok) return []
  let data: any
  try { data = await response.json() } catch { return [] }
  const raw = data?.data ?? data?.results ?? data
  return Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : []
}

export interface EventProfileData {
  first_name?: string
  last_name?: string
  email?: string
  post?: string
  job_title?: string
  location?: string
  organization?: string
  organisation?: string
  bio?: string
  education?: string
  specialization?: string
  interests?: string[]
  networking_goals?: string[]
  profile_picture?: string
  picture?: string
  custom_fields?: Record<string, any>
  [key: string]: any
}

/**
 * Fetch the authenticated attendee's profile for a specific event.
 * GET {{public_url}}events/{eventUuid}/profile/
 */
export const fetchEventProfile = async (eventUuid: string): Promise<EventProfileData> => {
  const accessToken = localStorage.getItem('pub_accessToken')
  if (!accessToken) throw new Error('Authentication required.')

  const url = API_ENDPOINTS.PUBLIC.PROFILE(eventUuid)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errData: any = null
    try { errData = text ? JSON.parse(text) : null } catch { /* ignore */ }
    throw new Error(handleApiError(errData ?? text, response, 'Failed to fetch profile.'))
  }

  const data = await response.json()
  return (data?.data ?? data) as EventProfileData
}

/**
 * Update the authenticated attendee's profile for a specific event.
 * PATCH {{public_url}}events/{eventUuid}/profile/
 * Body: { first_name, last_name, organization, designation, role, description, custom_fields: { ... } }
 */
export const updateEventProfile = async (
  eventUuid: string,
  fields: {
    first_name?: string
    last_name?: string
    organization?: string
    designation?: string
    role?: string
    description?: string
    image?: File
    custom_fields?: Record<string, any>
  }
): Promise<EventProfileData> => {
  const accessToken = localStorage.getItem('pub_accessToken')
  if (!accessToken) throw new Error('Authentication required.')

  const url = API_ENDPOINTS.PUBLIC.PROFILE(eventUuid)

  let body: BodyInit
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }

  if (fields.image instanceof File) {
    const form = new FormData()
    if (fields.first_name !== undefined) form.append('first_name', fields.first_name)
    if (fields.last_name !== undefined) form.append('last_name', fields.last_name)
    if (fields.organization !== undefined) form.append('organization', fields.organization)
    if (fields.designation !== undefined) form.append('designation', fields.designation)
    if (fields.role !== undefined) form.append('role', fields.role)
    if (fields.description !== undefined) form.append('description', fields.description)
    form.append('image', fields.image)
    if (fields.custom_fields) form.append('custom_fields', JSON.stringify(fields.custom_fields))
    body = form
    // Let browser set Content-Type with boundary for multipart
  } else {
    const { image: _image, ...rest } = fields
    body = JSON.stringify(rest)
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errData: any = null
    try { errData = text ? JSON.parse(text) : null } catch { /* ignore */ }
    throw new Error(handleApiError(errData ?? text, response, 'Failed to update profile.'))
  }

  const data = await response.json()
  return (data?.data ?? data) as EventProfileData
}

export const fetchPublicEventsByTag = async (tagId: string): Promise<PublicEventData[]> => {
  try {
    if (!tagId) {
      const errorMessage = handleApiError('Tag ID is required.', undefined, 'Tag ID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.PUBLIC.EVENT.LIST_BY_TAG(tagId)
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
    })

    if (!response?.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }
      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        if (responseText?.trim()) {
          throw new Error(handleApiError(responseText.trim(), response, 'Failed to fetch events. Please try again.'))
        }
      }
      throw new Error(handleApiError(errorData ?? null, response, 'Failed to fetch events. Please try again.'))
    }

    let data: any
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data?.status === 'error') {
      throw new Error(handleApiError(data, undefined, 'Failed to fetch events. Please try again.'))
    }

    const raw = data?.data ?? data?.results ?? data
    if (Array.isArray(raw)) return raw as PublicEventData[]
    if (raw && typeof raw === 'object' && Array.isArray(raw.results)) return raw.results as PublicEventData[]
    return []
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) handleNetworkError(error)
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch events. Please try again.')
  }
}

