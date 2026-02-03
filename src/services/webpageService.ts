import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'
import type { ApiResponse } from './authService'

export interface CreateWebpageRequest {
  event_uuid: string
  // Some backend serializers require event_id in the payload (even if event_id is in query params).
  // We'll send both for compatibility.
  event_id?: string
  name: string
  content: {
    [key: string]: {
      title: string
      slug: string
      data: {
        [slug: string]: {
          root: {
            props: any
          }
          content: any[]
          zones: any
        }
      }
    }
  }
}

export interface CreateWebpageResponseData {
  uuid: string
  event: string
  name: string
  slug: string
  content: any
  created_by: number
  updated_by: number
  created_date: string
  updated_date: string
}

export interface WebpageData {
  uuid: string
  event: string
  name: string
  slug: string
  content: any
  created_by: number
  updated_by: number
  created_date: string
  updated_date: string
}

export interface WebsiteIndexTag {
  uuid: string
  name: string
}

export interface WebsiteIndexData {
  webpages: WebpageData[]
  speaker_tags?: WebsiteIndexTag[]
  attendee_tags?: WebsiteIndexTag[]
}

export const createOrUpdateWebpage = async (
  webpageUuid: string | null,
  eventUuid: string,
  request: CreateWebpageRequest
): Promise<CreateWebpageResponseData | WebpageData> => {
  if (webpageUuid) {
    // Update existing webpage
    return await updateWebpage(webpageUuid, eventUuid, request)
  } else {
    // Create new webpage
    return await createWebpage(request)
  }
}

export const createWebpage = async (request: CreateWebpageRequest): Promise<CreateWebpageResponseData> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }

    const eventUuid = String(request?.event_uuid || '').trim()
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBPAGE.CREATE(eventUuid)
    const payload: CreateWebpageRequest = {
      ...request,
      // Ensure event_id is present for backends that validate it.
      event_id: (request as any).event_id ?? eventUuid,
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify(payload),
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
        } catch (jsonError) {
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
        if (parseError instanceof Error && (
            parseError.message.includes('An error occurred') ||
            parseError.message.includes('Cannot connect') ||
            parseError.message.includes('Failed to')
        )) {
          throw parseError
        }
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: ApiResponse<CreateWebpageResponseData>
    try {
      data = await response.json()
    } catch (parseError) {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to create webpage. Please try again.')
      throw new Error(errorMessage)
    }

    // Success toast is handled by the calling UI (avoid duplicate toasts).

    if (!data.data) {
      throw new Error('No data returned from server')
    }

    return data.data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('No data returned') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create webpage. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to create webpage. Please try again.')
    throw new Error(errorMessage)
  }
}

export const fetchWebpages = async (eventUuid: string): Promise<WebpageData[]> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBPAGE.LIST(eventUuid)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
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
        } catch (jsonError) {
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
        if (parseError instanceof Error && (
            parseError.message.includes('An error occurred') ||
            parseError.message.includes('Cannot connect') ||
            parseError.message.includes('Failed to')
        )) {
          throw parseError
        }
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: any
    try {
      const responseText = await response.text()
      
      if (!responseText || responseText.trim() === '') {
        return []
      }
      
      data = JSON.parse(responseText)
    } catch (parseError) {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    // Handle ApiResponse format (with status field)
    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch webpages. Please try again.')
      throw new Error(errorMessage)
    }

    // Extract data from various possible response structures
    let responseData: any = null
    
    // Case 1: ApiResponse format with data field
    if (data.status === 'success' && data.data) {
      responseData = data.data
    }
    // Case 2: Direct array response
    else if (Array.isArray(data)) {
      responseData = data
    }
    // Case 3: Object with data field (no status)
    else if (data.data && Array.isArray(data.data)) {
      responseData = data.data
    }
    // Case 4: Object with results field
    else if (data.results && Array.isArray(data.results)) {
      responseData = data.results
    }
    // Case 5: Direct data field (no status, might be object)
    else if (data.data) {
      responseData = data.data
    }
    // Case 6: Empty or null
    else {
      return []
    }

    // Ensure responseData is an array
    let webpages: WebpageData[]
    if (Array.isArray(responseData)) {
      webpages = responseData
    } else {
      return []
    }

    return webpages
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch webpages. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to fetch webpages. Please try again.')
    throw new Error(errorMessage)
  }
}

/**
 * Fetch event website index (webpages + tags for navigation).
 * Endpoint: {{url}}{{admin_url}}website/index/?event_id={{event_uuid}}
 */
export const fetchWebsiteIndex = async (eventUuid: string): Promise<WebsiteIndexData> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }
    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBSITE.INDEX(eventUuid)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
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
          throw new Error(handleApiError(responseText.trim(), response, 'Failed to fetch website index. Please try again.'))
        }
      }
      throw new Error(handleApiError(errorData ?? null, response, 'Failed to fetch website index. Please try again.'))
    }

    const responseText = await response.text()
    if (!responseText?.trim()) {
      return { webpages: [], speaker_tags: [], attendee_tags: [] }
    }
    const data = JSON.parse(responseText)

    if (data?.status === 'error') {
      throw new Error(handleApiError(data, undefined, 'Failed to fetch website index. Please try again.'))
    }

    const raw = data?.data ?? data
    const webpages = Array.isArray(raw?.webpages) ? raw.webpages : []
    const speaker_tags = Array.isArray(raw?.speaker_tags) ? raw.speaker_tags : []
    const attendee_tags = Array.isArray(raw?.attendee_tags) ? raw.attendee_tags : []
    const result = { webpages, speaker_tags, attendee_tags }
    console.log('Website index API response:', { raw: data, parsed: result })
    return result
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) handleNetworkError(error)
      throw new Error(error.message || 'Network error occurred')
    }
    if (error instanceof Error && (
      error.message.includes('Cannot connect') ||
      error.message.includes('Invalid response') ||
      error.message.includes('Authentication required') ||
      error.message.includes('Organization UUID') ||
      error.message.includes('Event UUID') ||
      error.message.includes('Failed to')
    )) {
      throw error
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch website index. Please try again.'
    handleApiError(msg, undefined, 'Failed to fetch website index. Please try again.')
    throw new Error(msg)
  }
}

/** Return set of tag UUIDs that have a published group page (for Build page checkbox state). Listing from API only. */
export async function fetchPublishedTagIds(eventUuid: string): Promise<Set<string>> {
  try {
    const index = await fetchWebsiteIndex(eventUuid)
    const ids: string[] = []
    for (const t of index.speaker_tags ?? []) {
      if (t?.uuid) ids.push(t.uuid)
    }
    for (const t of index.attendee_tags ?? []) {
      if (t?.uuid) ids.push(t.uuid)
    }
    return new Set(ids)
  } catch {
    return new Set()
  }
}

/** Published speaker tag UUIDs only (for Speaker management Build page checkbox). */
export async function fetchPublishedSpeakerTagIds(eventUuid: string): Promise<Set<string>> {
  try {
    const index = await fetchWebsiteIndex(eventUuid)
    const ids = (index.speaker_tags ?? []).map((t) => t?.uuid).filter(Boolean) as string[]
    return new Set(ids)
  } catch {
    return new Set()
  }
}

/** Published attendee tag UUIDs only (for Attendee/Organization management Build page checkbox). */
export async function fetchPublishedAttendeeTagIds(eventUuid: string): Promise<Set<string>> {
  try {
    const index = await fetchWebsiteIndex(eventUuid)
    const ids = (index.attendee_tags ?? []).map((t) => t?.uuid).filter(Boolean) as string[]
    return new Set(ids)
  } catch {
    return new Set()
  }
}

export const updateWebpage = async (
  webpageUuid: string,
  eventUuid: string,
  request: CreateWebpageRequest
): Promise<WebpageData> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }

    if (!webpageUuid) {
      const errorMessage = handleApiError('Webpage UUID is required.', undefined, 'Webpage UUID is required.')
      throw new Error(errorMessage)
    }

    // Use PATCH method for updating existing webpage
    // URL format: {{admin_url}}webpages/{{webpage_uuid}}/
    const url = API_ENDPOINTS.WEBPAGE.UPDATE(webpageUuid)
    
    const payload: CreateWebpageRequest = {
      ...request,
      // Ensure event_id is present for backends that validate it.
      event_id: (request as any).event_id ?? eventUuid,
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify(payload),
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
        } catch (jsonError) {
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
        if (parseError instanceof Error && (
            parseError.message.includes('An error occurred') ||
            parseError.message.includes('Cannot connect') ||
            parseError.message.includes('Failed to')
        )) {
          throw parseError
        }
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: ApiResponse<WebpageData>
    try {
      data = await response.json()
    } catch (parseError) {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to update webpage. Please try again.')
      throw new Error(errorMessage)
    }

    // Success toast is handled by the calling UI (avoid duplicate toasts).

    if (!data.data) {
      throw new Error('No data returned from server')
    }

    return data.data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('Webpage UUID') ||
        error.message.includes('No data returned') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to update webpage. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to update webpage. Please try again.')
    throw new Error(errorMessage)
  }
}

export const deleteWebpage = async (webpageUuid: string, eventUuid: string): Promise<void> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }

    if (!webpageUuid) {
      const errorMessage = handleApiError('Webpage UUID is required.', undefined, 'Webpage UUID is required.')
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBPAGE.DELETE(webpageUuid)
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      // Some backends return 204 No Content on delete; ok is already true.
      // For error responses, try to parse message.
      try {
        const responseText = await response.text()
        let errorData: any = null
        try {
          errorData = responseText ? JSON.parse(responseText) : null
        } catch {
          if (responseText && responseText.trim()) {
            const errorMessage = handleApiError(responseText.trim(), response, 'Failed to delete webpage. Please try again.')
            throw new Error(errorMessage)
          }
        }
        const errorMessage = handleApiError(errorData, response, 'Failed to delete webpage. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error) throw parseError
        const errorMessage = handleApiError(null, response, 'Failed to delete webpage. Please try again.')
        throw new Error(errorMessage)
      }
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('Webpage UUID') ||
        error.message.includes('Failed to delete')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete webpage. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to delete webpage. Please try again.')
    throw new Error(errorMessage)
  }
}

export const fetchWebpage = async (webpageUuid: string, eventUuid: string): Promise<WebpageData> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }

    if (!webpageUuid) {
      const errorMessage = handleApiError('Webpage UUID is required.', undefined, 'Webpage UUID is required.')
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBPAGE.GET(webpageUuid, eventUuid)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
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
        } catch (jsonError) {
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
        if (parseError instanceof Error && (
            parseError.message.includes('An error occurred') ||
            parseError.message.includes('Cannot connect') ||
            parseError.message.includes('Failed to')
        )) {
          throw parseError
        }
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: any
    try {
      const responseText = await response.text()
      
      if (!responseText || responseText.trim() === '') {
        const errorMessage = handleParseError('Empty response from server. Please try again.')
        throw new Error(errorMessage)
      }
      
      data = JSON.parse(responseText)
    } catch (parseError) {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    // Handle ApiResponse format (with status field)
    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch webpage. Please try again.')
      throw new Error(errorMessage)
    }

    // Extract data from various possible response structures
    let webpageData: WebpageData | null = null
    
    // Case 1: ApiResponse format with data field
    if (data.status === 'success' && data.data) {
      webpageData = data.data
    }
    // Case 2: Direct object response
    else if (data && typeof data === 'object' && data.uuid) {
      webpageData = data
    }
    // Case 3: Object with data field (no status)
    else if (data.data && typeof data.data === 'object' && data.data.uuid) {
      webpageData = data.data
    }
    // Case 4: Empty or null
    else {
      const errorMessage = handleParseError('No webpage data found in response. Please try again.')
      throw new Error(errorMessage)
    }

    if (!webpageData) {
      const errorMessage = handleParseError('Invalid webpage data received from server. Please try again.')
      throw new Error(errorMessage)
    }

    return webpageData
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('Webpage UUID') ||
        error.message.includes('No webpage data') ||
        error.message.includes('Invalid webpage data') ||
        error.message.includes('Empty response') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch webpage. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to fetch webpage. Please try again.')
    throw new Error(errorMessage)
  }
}
