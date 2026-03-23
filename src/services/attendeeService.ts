import { API_ENDPOINTS } from '../config/env'
import { showToast } from '../utils/toast'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'
import type { ApiResponse } from './authService'

export interface UploadUserResponseData {
  message?: string
  data?: any
  [key: string]: any
}

export interface AttendeeData {
  id?: string
  uuid?: string
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar_url?: string
  banner_url?: string
  status?: string
  description?: string
  organisation?: string
  designation?: string
  bio?: string
  invite_code?: string
  // Backend can return groups as strings (e.g. ["speakers"]) or objects.
  groups?:
    | string[]
    | Array<{
        id: string
        name: string
        variant?: 'primary' | 'info' | 'muted'
      }>
  tags?: string | string[]
  institute?: string
  post?: string
  email_verified?: boolean
  email_verified_date?: string
  feedback_incomplete?: boolean
  [key: string]: any
}

type CreateAttendeeInput = {
  first_name: string
  last_name: string
  email: string
  organization?: string
  designation?: string
  role?: string
  description?: string
  groups?: string[]
  custom_fields?: Record<string, string>
  [key: string]: any
}

const cleanObject = (obj: Record<string, any>) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

export const uploadUserFile = async (file: File, eventUuid?: string): Promise<ApiResponse<UploadUserResponseData>> => {
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

    let event_uuid = eventUuid
    if (!event_uuid) {
      const storedEvent = localStorage.getItem('created-event')
      if (storedEvent) {
        try {
          const parsedEvent = JSON.parse(storedEvent)
          event_uuid = parsedEvent.uuid
        } catch {
          // Ignore parse errors
        }
      }
    }

    if (!event_uuid) {
      const errorMessage = handleApiError('Event UUID is required. Please select an event first.', undefined, 'Event UUID is required. Please select an event first.')
      throw new Error(errorMessage)
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('event_uuid', event_uuid)

    const response = await fetch(API_ENDPOINTS.ATTENDEE_MANAGEMENT.UPLOAD_USER, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: formData,
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
            const errorMessage = handleApiError(responseText.trim(), response, 'Failed to upload attendees. Please try again.')
            throw new Error(errorMessage)
          }
        }
        
        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'Failed to upload attendees. Please try again.')
          throw new Error(errorMessage)
        }
        
        const errorMessage = handleApiError(null, response, 'Failed to upload attendees. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && (
            parseError.message.includes('Failed to upload') ||
            parseError.message.includes('Cannot connect')
        )) {
          throw parseError
        }
        const errorMessage = handleApiError(null, response, 'Failed to upload attendees. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: ApiResponse<UploadUserResponseData>
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to upload attendees. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'success') {
      showToast.success(data.message || 'Users uploaded successfully')
    }

    return data
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
        error.message.includes('Failed to upload')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to upload attendees. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to upload attendees. Please try again.')
    throw new Error(errorMessage)
  }
}

export interface AttendeesPageResult {
  data: AttendeeData[]
  count: number
  next: string | null
  previous: string | null
}

export const fetchAttendees = async (eventUuid: string, page = 1): Promise<AttendeesPageResult> => {
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

    const url = API_ENDPOINTS.ATTENDEE_MANAGEMENT.LIST(eventUuid, page)
    if (import.meta.env.DEV) {
      console.log('📡 fetchAttendees: Fetching from URL:', url)
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    })

    if (import.meta.env.DEV) {
      console.log('📡 fetchAttendees: Response status:', response.status, response.statusText)
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

    let responseData: any
    try {
      responseData = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (import.meta.env.DEV) {
      console.log('🧾 Attendee list API raw response:', responseData)
    }

    // Handle ApiResponse error envelope if present
    if (responseData && typeof responseData === 'object' && responseData.status === 'error') {
      const errorMessage = handleApiError(responseData, undefined, 'Failed to fetch attendees. Please try again.')
      throw new Error(errorMessage)
    }

    // Extract attendees from multiple possible formats
    // 1) Direct array: []
    if (Array.isArray(responseData)) return { data: responseData, count: responseData.length, next: null, previous: null }

    // 2) Paginated ApiResponse: { status, count, next, previous, data: [] }
    if (Array.isArray(responseData?.data)) return {
      data: responseData.data,
      count: typeof responseData.count === 'number' ? responseData.count : responseData.data.length,
      next: responseData.next ?? null,
      previous: responseData.previous ?? null,
    }

    // 3) DRF pagination: { count, next, previous, results: [] }
    if (Array.isArray(responseData?.results)) return {
      data: responseData.results,
      count: typeof responseData.count === 'number' ? responseData.count : responseData.results.length,
      next: responseData.next ?? null,
      previous: responseData.previous ?? null,
    }

    // 4) ApiResponse + pagination: { status, data: { results: [] } }
    if (Array.isArray(responseData?.data?.results)) return {
      data: responseData.data.results,
      count: typeof responseData.data.count === 'number' ? responseData.data.count : responseData.data.results.length,
      next: responseData.data.next ?? null,
      previous: responseData.data.previous ?? null,
    }

    // 5) Legacy nested: { data: { data: [] } }
    if (Array.isArray(responseData?.data?.data)) return { data: responseData.data.data, count: responseData.data.data.length, next: null, previous: null }

    return { data: [], count: 0, next: null, previous: null }
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

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch attendees. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to fetch attendees. Please try again.')
    throw new Error(errorMessage)
  }
}

/**
 * Search attendees by query string (server-side)
 */
export const searchAttendees = async (eventUuid: string, query: string, tagId?: string): Promise<AttendeesPageResult> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      throw new Error(handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.'))
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))
    }

    if (!eventUuid) {
      throw new Error(handleApiError('Event UUID is required.', undefined, 'Event UUID is required.'))
    }

    const url = API_ENDPOINTS.ATTENDEE_MANAGEMENT.SEARCH(eventUuid, query, tagId)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorData: any = null
      try { errorData = responseText ? JSON.parse(responseText) : null } catch { /* ignore */ }
      throw new Error(handleApiError(errorData || responseText || null, response, 'Failed to search attendees.'))
    }

    let responseData: any
    try {
      responseData = await response.json()
    } catch {
      throw new Error(handleParseError('Invalid response from server.'))
    }

    if (responseData?.status === 'error') {
      throw new Error(handleApiError(responseData, undefined, 'Failed to search attendees.'))
    }

    if (Array.isArray(responseData)) return { data: responseData, count: responseData.length, next: null, previous: null }
    if (Array.isArray(responseData?.data)) return {
      data: responseData.data,
      count: typeof responseData.count === 'number' ? responseData.count : responseData.data.length,
      next: responseData.next ?? null,
      previous: responseData.previous ?? null,
    }
    if (Array.isArray(responseData?.results)) return {
      data: responseData.results,
      count: typeof responseData.count === 'number' ? responseData.count : responseData.results.length,
      next: responseData.next ?? null,
      previous: responseData.previous ?? null,
    }

    return { data: [], count: 0, next: null, previous: null }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(error.message || 'Network error occurred')
    }
    throw error
  }
}

export interface CreateTagRequest {
  event_uuid: string
  name: string
  description?: string
  is_active?: boolean
}

export interface CreateTagResponseData {
  uuid?: string
  id?: string
  name: string
  description?: string
  is_active?: boolean
  [key: string]: any
}

export const createTag = async (request: CreateTagRequest): Promise<CreateTagResponseData> => {
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

    if (!request.event_uuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    if (!request.name || !request.name.trim()) {
      const errorMessage = handleApiError('Tag name is required.', undefined, 'Tag name is required.')
      throw new Error(errorMessage)
    }

    const requestBody = {
      event_uuid: request.event_uuid,
      // Some backends require event_id in the payload as well.
      event_id: request.event_uuid,
      name: request.name.trim(),
      description: request.description || '',
      is_active: request.is_active !== undefined ? request.is_active : true
    }

    if (import.meta.env.DEV) {
      console.log('🏷️ [createTag] Creating tag:', {
        url: API_ENDPOINTS.TAGS.CREATE,
        requestBody
      })
    }

    const response = await fetch(API_ENDPOINTS.TAGS.CREATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
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
            const errorMessage = handleApiError(responseText.trim(), response, 'Failed to create tag. Please try again.')
            throw new Error(errorMessage)
          }
        }
        
        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'Failed to create tag. Please try again.')
          throw new Error(errorMessage)
        }
        
        const errorMessage = handleApiError(null, response, 'Failed to create tag. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && (
            parseError.message.includes('Failed to create') ||
            parseError.message.includes('Cannot connect') ||
            parseError.message.includes('Failed to')
        )) {
          throw parseError
        }
        const errorMessage = handleApiError(null, response, 'Failed to create tag. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: any
    try {
      // Log raw response text for debugging (then parse)
      const rawText = await response.text()
      if (import.meta.env.DEV) {
        console.log('🏷️ [createTag] Response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          rawText
        })
      }
      data = rawText ? JSON.parse(rawText) : {}
    } catch (parseError) {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    // ApiResponse format
    if (data?.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to create tag. Please try again.')
      throw new Error(errorMessage)
    }

    if (data?.status === 'success') {
      showToast.success(data.message || 'Tag created successfully')
    }

    // If backend returns ApiResponse { status, data }
    if (data?.data) {
      if (import.meta.env.DEV) {
        console.log('🏷️ [createTag] Created tag (parsed):', data.data)
      }
      return data.data as CreateTagResponseData
    }

    if (import.meta.env.DEV) {
      console.log('🏷️ [createTag] Created tag (non-ApiResponse):', data)
    }

    // If backend returns a direct object (common DRF create response)
    if (data && typeof data === 'object' && (data.uuid || data.id || data.name)) {
      showToast.success('Tag created successfully')
      return data as CreateTagResponseData
    }

    throw new Error('No data returned from server')
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
        error.message.includes('Tag name') ||
        error.message.includes('No data returned') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create tag. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to create tag. Please try again.')
    throw new Error(errorMessage)
  }
}

export interface TagData {
  uuid: string
  name: string
  description: string
  is_active: boolean
  /** Whether this tag has a published group page (from attendees/tags list). */
  is_published?: boolean
  attendee_count?: number
}

export const fetchTags = async (eventUuid: string): Promise<TagData[]> => {
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

    const url = API_ENDPOINTS.ATTENDEE_MANAGEMENT.TAGS(eventUuid)
    if (import.meta.env.DEV) {
      console.log('🏷️ [fetchTags] Requesting tags:', { eventUuid, url })
    }
    
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

      // Handle 404 as empty tags list (no tags exist yet)
      if (response.status === 404) {
        return []
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
    if (import.meta.env.DEV) {
      console.log('🏷️ [fetchTags] Raw response shape:', {
        hasStatus: typeof data?.status !== 'undefined',
        keys: data && typeof data === 'object' ? Object.keys(data) : null,
        hasResultsArray: Array.isArray(data?.results),
        hasDataResultsArray: Array.isArray(data?.data?.results),
        hasDataArray: Array.isArray(data?.data)
      })
    }

    // Handle ApiResponse format (with status field)
    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch tags. Please try again.')
      throw new Error(errorMessage)
    }

    // Extract data from various possible response structures
    let responseData: any = null

    /**
     * Common backend shapes we need to support:
     * 1) ApiResponse: { status: 'success', data: Tag[] }
     * 2) ApiResponse + pagination: { status: 'success', data: { count, results: Tag[] } }
     * 3) DRF pagination: { count, results: Tag[] }
     * 4) Direct array: Tag[]
     * 5) Legacy: { data: Tag[] } or { data: { results: Tag[] } }
     */

    // ApiResponse wrapper
    if (data?.status === 'success') {
      if (Array.isArray(data.data)) {
        responseData = data.data
      } else if (Array.isArray(data?.data?.results)) {
        responseData = data.data.results
      } else if (Array.isArray(data?.results)) {
        // sometimes results sits alongside status
        responseData = data.results
      }
    }

    // Direct array response
    if (!responseData && Array.isArray(data)) {
      responseData = data
    }

    // Legacy object with data array
    if (!responseData && Array.isArray(data?.data)) {
      responseData = data.data
    }

    // DRF-style pagination
    if (!responseData && Array.isArray(data?.results)) {
      responseData = data.results
    }

    // Nested pagination inside data { data: { results: [] } }
    if (!responseData && Array.isArray(data?.data?.results)) {
      responseData = data.data.results
    }

    if (!responseData) {
      if (import.meta.env.DEV) {
        console.warn('🏷️ [fetchTags] Could not extract tags array from response:', data)
      }
      return []
    }

    // Ensure responseData is an array (handle paginated objects captured earlier)
    if (!Array.isArray(responseData)) {
      return []
    }

    const tagsRaw = responseData as any[]
    const tags = tagsRaw
      .map((t) => ({
        // normalize common API shapes
        uuid: t?.uuid ?? t?.id ?? '',
        name: t?.name ?? t?.title ?? '',
        description: t?.description ?? '',
        is_active: t?.is_active ?? t?.isActive ?? true,
        // New field from attendees/tags/ and speakers/tags/ responses
        is_published: typeof t?.is_published === 'boolean' ? t.is_published : undefined,
        attendee_count: typeof t?.attendee_count === 'number' ? t.attendee_count : (typeof t?.attendeeCount === 'number' ? t.attendeeCount : undefined)
      }))
      .filter((t) => Boolean(t.uuid) && Boolean(t.name)) as TagData[]

    if (import.meta.env.DEV) {
      console.log('🏷️ [fetchTags] Parsed tags:', {
        count: tags.length,
        tags: tags.map((t) => ({ uuid: t.uuid, name: t.name, is_active: t.is_active }))
      })
    }
    return tags
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

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tags. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to fetch tags. Please try again.')
    throw new Error(errorMessage)
  }
}

export const createAttendee = async (
  eventUuid: string,
  input: CreateAttendeeInput
): Promise<any> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.ATTENDEE_MANAGEMENT.CREATE(eventUuid)

    const payload = cleanObject({
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      organization: input.organization,
      designation: input.designation,
      role: input.role,
      description: input.description,
      groups: input.groups,
      custom_fields: input.custom_fields,
    })

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

    if (response.ok) {
      let responseData: any = null
      try {
        responseData = await response.json()
      } catch {
        responseData = null
      }
      showToast.success('Attendee created successfully')
      return responseData
    }

    const responseText = await response.text()
    let errorData: any = null
    try {
      errorData = responseText ? JSON.parse(responseText) : null
    } catch {
      errorData = responseText?.trim() ? responseText.trim() : null
    }

    const errorMessage = handleApiError(errorData, response, 'Failed to create attendee. Please try again.')
    throw new Error(errorMessage)
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error) {
      handleApiError(error.message, undefined, 'Failed to create attendee. Please try again.')
      throw error
    }

    const errorMessage = 'Failed to create attendee. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}

export const deleteAttendee = async (attendeeUuid: string): Promise<void> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    if (!attendeeUuid) {
      const errorMessage = handleApiError('Attendee UUID is required.', undefined, 'Attendee UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.ATTENDEE_MANAGEMENT.DELETE(attendeeUuid)
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        errorData = responseText?.trim() ? responseText.trim() : null
      }
      const errorMessage = handleApiError(errorData, response, 'Failed to delete attendee. Please try again.')
      throw new Error(errorMessage)
    }

    showToast.success('Attendee deleted successfully')
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error) {
      handleApiError(error.message, undefined, 'Failed to delete attendee. Please try again.')
      throw error
    }

    const errorMessage = 'Failed to delete attendee. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Bulk add attendees to a tag/group.
 * Endpoint: POST attendees/bulk-add-tag/?event_id={{event_uuid}}
 * Body: { uuids: [attendee_uuid1, attendee_uuid2], tag_uuid: tag_uuid }
 */
export const bulkAddAttendeeTag = async (
  eventUuid: string,
  attendeeUuids: string[],
  tagUuid: string
): Promise<void> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }
    if (!attendeeUuids?.length) {
      return
    }

    const url = API_ENDPOINTS.ATTENDEE_MANAGEMENT.BULK_ADD_TAG(eventUuid)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid
      },
      credentials: 'include',
      body: JSON.stringify({
        uuids: attendeeUuids,
        tag_uuid: tagUuid
      })
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        errorData = responseText?.trim() ? responseText.trim() : null
      }
      const errorMessage = handleApiError(errorData, response, 'Failed to update attendees. Please try again.')
      throw new Error(errorMessage)
    }

    showToast.success('Attendees updated successfully')
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error) {
      handleApiError(error.message, undefined, 'Failed to update attendees. Please try again.')
      throw error
    }

    const errorMessage = 'Failed to update attendees. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Bulk delete attendees.
 * Endpoint: POST attendees/bulk-delete-attendee/?event_id={{event_uuid}}
 * Body: { uuids: [attendee_uuid1, attendee_uuid2] }
 */
export const bulkDeleteAttendees = async (eventUuid: string, attendeeUuids: string[]): Promise<void> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }
    if (!attendeeUuids?.length) {
      return
    }

    const url = API_ENDPOINTS.ATTENDEE_MANAGEMENT.BULK_DELETE(eventUuid)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid
      },
      credentials: 'include',
      body: JSON.stringify({
        uuids: attendeeUuids
      })
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        errorData = responseText?.trim() ? responseText.trim() : null
      }
      const errorMessage = handleApiError(errorData, response, 'Failed to delete attendees. Please try again.')
      throw new Error(errorMessage)
    }

    showToast.success('Attendees deleted successfully')
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error) {
      handleApiError(error.message, undefined, 'Failed to delete attendees. Please try again.')
      throw error
    }

    const errorMessage = 'Failed to delete attendees. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}

type UpdateAttendeeInput = {
  first_name?: string
  last_name?: string
  email?: string
  organization?: string
  designation?: string
  role?: string
  description?: string
  groups?: string[]
  custom_fields?: Record<string, string>
  [key: string]: any
}



export const updateAttendee = async (
  attendeeUuid: string,
  input: UpdateAttendeeInput
): Promise<any> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    if (!attendeeUuid) {
      const errorMessage = handleApiError('Attendee UUID is required.', undefined, 'Attendee UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.ATTENDEE_MANAGEMENT.UPDATE(attendeeUuid)

    const payload = cleanObject({
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      organization: input.organization,
      designation: input.designation,
      role: input.role,
      description: input.description,
      groups: input.groups,
      custom_fields: input.custom_fields,
    })

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

    if (response.ok) {
      let responseData: any = null
      try {
        responseData = await response.json()
      } catch {
        responseData = null
      }
      showToast.success('Attendee updated successfully')
      return responseData
    }

    const responseText = await response.text()
    let errorData: any = null
    try {
      errorData = responseText ? JSON.parse(responseText) : null
    } catch {
      errorData = responseText?.trim() ? responseText.trim() : null
    }

    const errorMessage = handleApiError(errorData, response, 'Failed to update attendee. Please try again.')
    throw new Error(errorMessage)
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error) {
      // Let UI decide whether to keep slideout open; still show toast for visibility.
      handleApiError(error.message, undefined, 'Failed to update attendee. Please try again.')
      throw error
    }

    const errorMessage = 'Failed to update attendee. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}