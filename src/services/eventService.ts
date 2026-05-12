import { API_ENDPOINTS } from '../config/env'
import { showToast } from '../utils/toast'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'
import type { ApiResponse } from './authService'

export interface CreateEventRequest {
  eventName: string
  startDateTimeISO: string
  startTime: string
  endDateTimeISO: string
  endTime: string
  timezoneId: string
  location: string
  attendees: number
  eventExperience: 'in-person' | 'virtual' | 'hybrid'
  logo: File | null
  banner: File | null
  fixTimezoneForAttendees: boolean
}

export interface CreateEventResponseData {
  uuid: string
  eventName: string
  startDate?: string
  endDate?: string
  location?: string
  attendees?: number
  eventExperience?: 'in-person' | 'virtual' | 'hybrid'
  banner?: string // Banner URL from API response
  logo?: string // Logo URL from API response
  [key: string]: any // Allow additional fields
}

/**
 * Event data structure from API
 */
export interface EventData {
  uuid: string
  eventName: string
  startDate?: string
  endDate?: string
  location?: string
  attendees?: number
  eventExperience?: 'in-person' | 'virtual' | 'hybrid'
  status?: 'Live' | 'Draft' | 'Published' | 'draft' | 'live' | 'published'
  registrations?: number
  createdBy?: string
  createdAt?: string
  [key: string]: any // Allow additional fields
}

/**
 * Take ISO datetime or date-only string and return YYYY-MM-DD in the user's local timezone.
 * So when the user is in another timezone, the weekday selector shows the correct local day.
 */
function isoToDateOnly(iso: unknown): string | undefined {
  if (iso == null || typeof iso !== 'string') return undefined
  const s = String(iso).trim()
  if (s.length < 10 || !/^\d{4}-\d{2}-\d{2}/.test(s)) return undefined
  if (s.length === 10) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return undefined
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Normalize single-event API response so startDate/endDate match the dashboard "EVENT DATE" (event_date).
 * Prefer event_date for startDate; fall back to startDateTimeISO/endDateTimeISO so weekday selector and HeroSection get correct dates.
 */
function normalizeSingleEventResponse(raw: any): EventData {
  const obj = raw?.event && typeof raw.event === 'object' ? raw.event : raw
  if (!obj || typeof obj !== 'object') return raw as EventData
  const startDateRaw = obj.event_date ?? obj.start_date ?? obj.startDate ?? isoToDateOnly(obj.startDateTimeISO)
  const endDateRaw = obj.end_date ?? obj.endDate ?? isoToDateOnly(obj.endDateTimeISO)
  return {
    ...obj,
    uuid: String(obj.uuid || ''),
    eventName: String(obj.title ?? obj.eventName ?? ''),
    startDate: startDateRaw != null && String(startDateRaw).trim() !== '' ? String(startDateRaw) : undefined,
    endDate: endDateRaw != null && String(endDateRaw).trim() !== '' ? String(endDateRaw) : undefined,
    location: obj.location ?? undefined,
    createdAt: obj.created_at ?? obj.createdAt ?? obj.created_date,
  }
}

/**
 * Create a new event
 */
export const createEvent = async (request: CreateEventRequest): Promise<CreateEventResponseData> => {
  try {
    // Get access token from localStorage
    const accessToken = localStorage.getItem('accessToken')
    
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    // Get organization UUID from localStorage
    const organizationUuid = localStorage.getItem('organizationUuid')
    
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }

    // Prepare FormData for file uploads
    const formData = new FormData()
    
    // Add text fields
    formData.append('eventName', request.eventName)
    formData.append('startDateTimeISO', request.startDateTimeISO)
    formData.append('startTime', request.startTime)
    formData.append('endDateTimeISO', request.endDateTimeISO)
    formData.append('endTime', request.endTime)
    formData.append('timezoneId', request.timezoneId)
    formData.append('location', request.location)
    formData.append('attendees', request.attendees.toString())
    formData.append('eventExperience', request.eventExperience)
    formData.append('fixTimezoneForAttendees', request.fixTimezoneForAttendees.toString())

    // Add files if present
    if (request.logo) {
      formData.append('logo', request.logo)
    }
    if (request.banner) {
      formData.append('banner', request.banner)
    }

    const response = await fetch(API_ENDPOINTS.EVENT.CREATE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: formData,
    })

    // Check for network/CORS errors before parsing response
    if (!response || !response.ok) {
      // Network error or CORS error - response might not exist
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      // HTTP error - try to parse error response
      try {
        const responseText = await response.text()
        let errorData: any = null
        
        // Try to parse as JSON
        try {
          errorData = responseText ? JSON.parse(responseText) : null
        } catch (jsonError) {
          // Response is not JSON, use text as error message if available
          if (responseText && responseText.trim()) {
            const errorMessage = handleApiError(responseText.trim(), response, 'An error occurred. Please try again.')
            throw new Error(errorMessage)
          }
        }
        
        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'An error occurred. Please try again.')
          throw new Error(errorMessage)
        }
        
        // If we couldn't parse or extract error, show generic message only as last resort
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        // If it's already our custom error, re-throw it
        if (parseError instanceof Error && (
            parseError.message.includes('An error occurred') ||
            parseError.message.includes('Cannot connect') ||
            parseError.message.includes('Failed to')
        )) {
          throw parseError
        }
        // Last resort: only show generic message if we truly can't extract anything
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    // Parse successful response
    let data: CreateEventResponseData
    try {
      const apiResponse: ApiResponse<CreateEventResponseData> = await response.json()
      
      // Validate response structure
      if (!apiResponse || typeof apiResponse !== 'object') {
        throw new Error('Invalid response format from server: response is not an object')
      }
      
      // Check if response has error status
      if (apiResponse.status === 'error') {
        const errorMessage = handleApiError(apiResponse, undefined, 'Failed to create event. Please try again.')
        throw new Error(errorMessage)
      }
      
      // Ensure status is 'success'
      if (apiResponse.status !== 'success') {
        const errorMessage = handleApiError(apiResponse, undefined, 'An error occurred while processing the response. Please try again.')
        throw new Error(errorMessage)
      }
      
      // Extract event data from the wrapped response
      let responseData: any = apiResponse.data
      
      // Check if data field is an empty string (backend issue)
      if (typeof responseData === 'string' && responseData === '') {
        const errorMessage = handleParseError('Event data not returned. Please try again or contact support.')
        throw new Error(errorMessage)
      }
      
      // Validate that data field exists and is an object
      if (!responseData || typeof responseData !== 'object') {
        const errorMessage = handleParseError('Invalid response format. Please try again.')
        throw new Error(errorMessage)
      }
      
      // Handle nested data structure: if responseData has a 'data' property with uuid, use that instead
      if (responseData.data && typeof responseData.data === 'object' && responseData.data.uuid) {
        responseData = responseData.data
      }
      
      // Validate required fields (uuid and eventName)
      if (!responseData.uuid) {
        throw new Error('Invalid response format from server: missing uuid in event data')
      }
      
      if (!responseData.eventName) {
        throw new Error('Invalid response format from server: missing eventName in event data')
      }
      
      // Map the response to CreateEventResponseData interface
      data = {
        uuid: String(responseData.uuid),
        eventName: String(responseData.eventName),
        startDate: responseData.startDate || undefined,
        endDate: responseData.endDate || undefined,
        location: responseData.location || undefined,
        attendees: responseData.attendees || undefined,
        eventExperience: responseData.eventExperience || undefined,
        ...responseData,
      }
    } catch (parseError) {
      // Check if it's our custom validation error - re-throw it
      if (parseError instanceof Error && (
          parseError.message.includes('Invalid response format') ||
          parseError.message.includes('Event data not returned')
      )) {
        throw parseError
      }
      
      // JSON parsing or other error
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    // Success - show toast notification
    showToast.success('Event created successfully')

    return data
  } catch (error) {
    // Handle network errors (CORS, connection refused, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    // Re-throw if it's already our custom error
    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Failed to create') ||
        error.message.includes('Event data not returned')
    )) {
      throw error
    }

    // Generic error fallback
    const errorMessage = error instanceof Error ? error.message : 'Failed to create event. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to create event. Please try again.')
    throw new Error(errorMessage)
  }
}

/**
 * Fetch all events created by the authenticated user
 */
export const fetchEvents = async (): Promise<EventData[]> => {
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

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    }

    const response = await fetch(API_ENDPOINTS.EVENT.LIST, {
      method: 'GET',
      headers,
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
        
        // Try to parse as JSON
        try {
          errorData = responseText ? JSON.parse(responseText) : null
        } catch (jsonError) {
          // Response is not JSON, use text as error message if available
          if (responseText && responseText.trim()) {
            const errorMessage = handleApiError(responseText.trim(), response, 'An error occurred. Please try again.')
            throw new Error(errorMessage)
          }
        }
        
        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'An error occurred. Please try again.')
          throw new Error(errorMessage)
        }
        
        // If we couldn't parse or extract error, show generic message only as last resort
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        // If it's already our custom error, re-throw it
        if (parseError instanceof Error && (
            parseError.message.includes('An error occurred') ||
            parseError.message.includes('Cannot connect') ||
            parseError.message.includes('Failed to')
        )) {
          throw parseError
        }
        // Last resort: only show generic message if we truly can't extract anything
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    const responseText = await response.text()
    const apiResponse: ApiResponse<EventData[] | EventData> = JSON.parse(responseText)
    
    if (!apiResponse || typeof apiResponse !== 'object') {
      throw new Error('Invalid response format from server')
    }
    
    if (apiResponse.status === 'error') {
      const errorMessage = handleApiError(apiResponse, undefined, 'Failed to fetch events. Please try again.')
      throw new Error(errorMessage)
    }
    
    if (apiResponse.status !== 'success') {
      const errorMessage = handleApiError(null, undefined, 'An error occurred while processing the response. Please try again.')
      throw new Error(errorMessage)
    }
    
    let responseData: any = apiResponse.data
    console.log('[Event List API] response:', apiResponse)
    console.log('[Event List API] events data:', responseData)
    if (!responseData) {
      return []
    }

    const mapEvent = (event: any): EventData => {
      const createdBy = event.created_by 
        ? (typeof event.created_by === 'object' 
            ? (event.created_by.name || event.created_by.email?.split('@')[0] || '')
            : event.created_by)
        : (event.createdBy || '')
      
      const attendanceTypeMap: Record<string, string> = {
        'Online': 'virtual',
        'Offline': 'in-person',
        'Hybrid': 'hybrid',
      }
      const attendanceType = event.attendance_type || event.eventExperience
      const mappedEventExperience = attendanceType 
        ? (attendanceTypeMap[attendanceType] || attendanceType.toLowerCase())
        : undefined
      
      // Use same date fallbacks as single-event; prioritize new *_date fields from list API
      // Example list payload:
      // - event_date: "2026-02-16"
      // - start_date: "2026-02-15T18:30:08Z"
      // - end_date:   "2026-02-17T18:29:59Z"
      const startDateRaw =
        isoToDateOnly(event.start_date) ??
        event.event_date ??
        event.startDate ??
        isoToDateOnly(event.start_datetime) ??
        isoToDateOnly(event.startDateTimeISO) ??
        isoToDateOnly(event.start_datetime_iso)
      const endDateRaw =
        isoToDateOnly(event.end_date) ??
        event.endDate ??
        isoToDateOnly(event.end_datetime) ??
        isoToDateOnly(event.endDateTimeISO) ??
        isoToDateOnly(event.end_datetime_iso) ??
        isoToDateOnly(event.end_date_time_iso)
      // Map is_published to status when API returns it (e.g. list response)
      const status =
        event.status ??
        (typeof event.is_published === 'boolean' ? (event.is_published ? 'Published' : 'draft') : undefined)
      return {
        ...event, // Preserve all original fields from API
        uuid: String(event.uuid || ''),
        eventName: String(event.title || event.eventName || ''),
        startDate: startDateRaw != null && String(startDateRaw).trim() !== '' ? String(startDateRaw) : undefined,
        endDate: endDateRaw != null && String(endDateRaw).trim() !== '' ? String(endDateRaw) : undefined,
        location: event.location || undefined,
        attendees: event.attendees || undefined,
        eventExperience: mappedEventExperience || event.eventExperience || undefined,
        status: status,
        registrations: event.registrations || 0,
        createdBy: createdBy,
        createdAt: event.created_at || event.createdAt || event.created_date || undefined,
        // Preserve original field names for sorting
        created_at: event.created_at,
        created_date: event.created_date,
        event_date: event.event_date,
      }
    }

    let data: EventData[]
    if (Array.isArray(responseData)) {
      data = responseData.map(mapEvent)
    } else if (typeof responseData === 'object') {
      if (responseData.data && Array.isArray(responseData.data)) {
        data = responseData.data.map(mapEvent)
      } else {
        data = [mapEvent(responseData)]
      }
    } else {
      throw new Error('Invalid response format: event data should be an array or object')
    }
    
    data = data
      .filter(event => event.uuid && (event.eventName || event.title))
      .map(event => ({
        ...event,
        eventName: event.eventName || event.title || 'Untitled Event'
      }))

    return data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.startsWith('Cannot connect') || 
        error.message.startsWith('Server error') ||
        error.message.startsWith('Invalid response') ||
        error.message.startsWith('Authentication required') ||
        error.message.startsWith('Organization UUID')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch events. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to fetch events. Please try again.')
    throw new Error(errorMessage)
  }
}

/**
 * Fetch a single event by UUID
 */
export const fetchEvent = async (eventUuid: string): Promise<EventData> => {
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

    const response = await fetch(API_ENDPOINTS.EVENT.GET(eventUuid), {
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

    let data: ApiResponse<EventData> | EventData
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    // Handle ApiResponse format
    if (typeof data === 'object' && 'status' in data) {
      const apiResponse = data as ApiResponse<EventData>
      if (apiResponse.status === 'error') {
        const errorMessage = handleApiError(apiResponse, undefined, 'Failed to fetch event. Please try again.')
        throw new Error(errorMessage)
      }

      if (apiResponse.status === 'success' && apiResponse.data) {
        return normalizeSingleEventResponse(apiResponse.data) as EventData
      }
    }

    // Handle direct EventData response
    if (typeof data === 'object' && ('uuid' in data || 'eventName' in data || 'title' in data)) {
      return normalizeSingleEventResponse(data) as EventData
    }

    throw new Error('No event data returned from server')
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.startsWith('Cannot connect') || 
        error.message.startsWith('Server error') ||
        error.message.startsWith('Invalid response') ||
        error.message.startsWith('Authentication required') ||
        error.message.startsWith('Organization UUID') ||
        error.message.startsWith('Event UUID') ||
        error.message.startsWith('No event data')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch event. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to fetch event. Please try again.')
    throw new Error(errorMessage)
  }
}

export interface UpdateEventRequest {
  eventName?: string
  startDateTimeISO?: string
  endDateTimeISO?: string
  timezoneId?: string
  location?: string
  venue?: string
  attendees?: number
  eventExperience?: 'in-person' | 'virtual' | 'hybrid'
}

/**
 * Update (PATCH) an event by UUID
 */
export const updateEvent = async (eventUuid: string, request: UpdateEventRequest): Promise<EventData> => {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) throw new Error('Authentication required. Please login again.')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')

  const experienceMap: Record<string, string> = {
    'in-person': 'Offline',
    'virtual': 'Online',
    'hybrid': 'Hybrid',
  }

  const body: Record<string, any> = {}
  if (request.eventName != null) {
    body.title = request.eventName
    body.eventName = request.eventName
    body.event_name = request.eventName
  }
  if (request.startDateTimeISO != null) body.startDateTimeISO = request.startDateTimeISO
  if (request.endDateTimeISO != null) body.endDateTimeISO = request.endDateTimeISO
  if (request.timezoneId != null) body.timezone_id = request.timezoneId
  if (request.location != null) body.location = request.location
  if (request.venue != null) body.venue = request.venue
  if (request.attendees != null) body.attendees = request.attendees
  if (request.eventExperience != null) body.attendance_type = experienceMap[request.eventExperience] ?? request.eventExperience

  const response = await fetch(API_ENDPOINTS.EVENT.UPDATE(eventUuid), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errData: any = null
    try { errData = text ? JSON.parse(text) : null } catch { /* ignore */ }
    const msg = handleApiError(errData ?? text, response, 'Failed to update event.')
    throw new Error(msg)
  }

  const json = await response.json()
  const raw = json?.data ?? json
  return normalizeSingleEventResponse(raw)
}

/**
 * Delete an event by UUID
 * Endpoint: {{admin_url}}event/{{event_uuid}}/
 */
export const deleteEvent = async (eventUuid: string): Promise<void> => {
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

    const response = await fetch(API_ENDPOINTS.EVENT.GET(eventUuid), {
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

      try {
        const responseText = await response.text()
        let errorData: any = null

        try {
          errorData = responseText ? JSON.parse(responseText) : null
        } catch {
          if (responseText && responseText.trim()) {
            const errorMessage = handleApiError(responseText.trim(), response, 'Failed to delete event.')
            throw new Error(errorMessage)
          }
        }

        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'Failed to delete event.')
          throw new Error(errorMessage)
        }

        const errorMessage = handleApiError(null, response, 'Failed to delete event.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error) {
          throw parseError
        }
        const errorMessage = handleParseError('Failed to delete event. Please try again.')
        throw new Error(errorMessage)
      }
    }

    showToast.success('Event deleted successfully')
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error) {
      throw error
    }

    const errorMessage = 'Failed to delete event. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Publish an event by UUID (used when clicking Publish on Event website page).
 * Endpoint: {{url}}{{admin_url}}event/{{event_uuid}}/publish/  (POST)
 */
export const publishEvent = async (eventUuid: string): Promise<any> => {
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

    const response = await fetch(API_ENDPOINTS.EVENT.PUBLISH(eventUuid), {
      method: 'POST',
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

      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        // If the server returned an HTML error page, don't pass it as the message
        const isHtml = responseText
          ? /^\s*</.test(responseText) || /<!doctype/i.test(responseText)
          : false
        errorData = isHtml ? null : (responseText?.trim() || null)
      }
      const errorMessage = handleApiError(errorData, response, 'Failed to publish event. Please try again.')
      throw new Error(errorMessage)
    }

    let data: any = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    // Some endpoints respond 200 with ApiResponse { status: 'error' }
    if (data && typeof data === 'object' && data.status === 'error') {
      const errorMessage = handleApiError(data, response, 'Failed to publish event. Please try again.')
      throw new Error(errorMessage)
    }

    showToast.success('Event published successfully')
    return data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error) {
      // keep UI stable; callers can show additional UI if needed
      throw error
    }

    const errorMessage = 'Failed to publish event. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}`,
  'X-Organization': localStorage.getItem('organizationUuid') ?? '',
})

export const fetchArchivedEvents = async (): Promise<EventData[]> => {
  const response = await fetch(API_ENDPOINTS.EVENT.ARCHIVED_LIST, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  })
  if (!response.ok) {
    const msg = handleApiError(null, response, 'Failed to fetch archived events.')
    throw new Error(msg)
  }
  try {
    const data = await response.json()
    const raw = data?.data ?? data
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : []
    return list as EventData[]
  } catch {
    return []
  }
}

export const archiveEvent = async (eventUuid: string): Promise<void> => {
  const response = await fetch(API_ENDPOINTS.EVENT.ARCHIVE(eventUuid), {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
  })
  if (!response.ok) {
    const msg = handleApiError(null, response, 'Failed to archive event.')
    showToast.error(msg)
    throw new Error(msg)
  }
  showToast.success('Event archived')
}

export const unarchiveEvent = async (eventUuid: string): Promise<void> => {
  const response = await fetch(API_ENDPOINTS.EVENT.UNARCHIVE(eventUuid), {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
  })
  if (!response.ok) {
    const msg = handleApiError(null, response, 'Failed to unarchive event.')
    showToast.error(msg)
    throw new Error(msg)
  }
  showToast.success('Event unarchived')
}
