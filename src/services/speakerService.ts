import { API_ENDPOINTS } from '../config/env'
import { showToast } from '../utils/toast'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'
import type { ApiResponse } from './authService'
import type { TagData } from './attendeeService'

export interface UploadedSpeakerItem {
  id: number
  event: number
  profile: number
  designation: string
  organization: string
  is_active: boolean
  user_email: string
}

export interface UploadSpeakerResponseData {
  message?: string
  data?: UploadedSpeakerItem[]
  [key: string]: any
}

export interface SpeakerData {
  id?: string
  uuid?: string
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar_url?: string
  bio?: string
  // role?: string
  // banner_url?: string
  status?: string
  description?: string
  organisation?: string
  designation?: string
  // Backend can return groups as strings (e.g. ["speakers"]) or objects.
  groups?:
    | string[]
    | Array<{
        id: string
        name: string
        variant?: 'primary' | 'info' | 'muted'
      }>
  // sessions?: string[]
  // social_links?: {
  //   linkedin?: string
  //   twitter?: string
  //   website?: string
  // }
  [key: string]: any
}

/**
 * Upload speaker file (XLSX) for speaker management
 */
export const uploadSpeakerFile = async (file: File, eventUuid?: string): Promise<ApiResponse<UploadSpeakerResponseData>> => {
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

    // Get event UUID - try from parameter, then from localStorage, then from created event
    let event_uuid = eventUuid
    if (!event_uuid) {
      // Try to get from localStorage (stored created event)
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

    // Prepare FormData for file upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('event', event_uuid)

    const response = await fetch(API_ENDPOINTS.SPEAKER_MANAGEMENT.UPLOAD_SPEAKER, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: formData,
    })

    console.log('📤 uploadSpeakerFile: Response status:', response.status, response.statusText)
    console.log('📤 uploadSpeakerFile: Response headers:', Object.fromEntries(response.headers.entries()))

    // Get response text first (can only read once)
    const responseText = await response.text()
    console.log('📥 uploadSpeakerFile: Raw response text:', responseText)

    // Check for network/CORS errors before parsing response
    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      // HTTP error - try to parse error response
      try {
        let errorData: any = null
        
        // Try to parse as JSON
        try {
          errorData = responseText ? JSON.parse(responseText) : null
          console.error('❌ uploadSpeakerFile: Error response data:', errorData)
        } catch (jsonError) {
          // Response is not JSON, use text as error message if available
          console.error('❌ uploadSpeakerFile: Error response text (not JSON):', responseText)
          if (responseText && responseText.trim()) {
            const errorMessage = handleApiError(responseText.trim(), response, 'Failed to upload speakers. Please try again.')
            throw new Error(errorMessage)
          }
        }
        
        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'Failed to upload speakers. Please try again.')
          throw new Error(errorMessage)
        }
        
        // If we couldn't parse or extract error, show generic message only as last resort
        const errorMessage = handleApiError(null, response, 'Failed to upload speakers. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        // If it's already our custom error, re-throw it
        if (parseError instanceof Error && (
            parseError.message.includes('Failed to upload') ||
            parseError.message.includes('Cannot connect')
        )) {
          throw parseError
        }
        // Last resort: only show generic message if we truly can't extract anything
        const errorMessage = handleApiError(null, response, 'Failed to upload speakers. Please try again.')
        throw new Error(errorMessage)
      }
    }

    // Parse successful response
    let data: ApiResponse<UploadSpeakerResponseData>
    try {
      // Parse JSON from text
      data = JSON.parse(responseText)
      console.log('✅ uploadSpeakerFile: Parsed response data:', JSON.stringify(data, null, 2))
    } catch (parseError) {
      console.error('❌ uploadSpeakerFile: Failed to parse response:', parseError)
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    // Check if response has error status
    if (data.status === 'error') {
      console.error('❌ uploadSpeakerFile: Error response:', data)
      const errorMessage = handleApiError(data, undefined, 'Failed to upload speakers. Please try again.')
      throw new Error(errorMessage)
    }

    // Success response
    if (data.status === 'success') {
      console.log('✅ uploadSpeakerFile: Success response:', data)

      // Speaker Excel import: "create" response (what backend created)
      console.log('🧾 Speaker Excel Import (create) response:', {
        message: (data as any).message,
        count: Array.isArray((data as any).data) ? (data as any).data.length : undefined,
        data: (data as any).data
      })
      
      // Log uploaded speakers details
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        console.log(`✅ uploadSpeakerFile: Successfully uploaded ${data.data.length} speaker(s):`)
        data.data.forEach((speaker, index) => {
          console.log(`  ${index + 1}. ${speaker.user_email} - Role: ${speaker.role} (ID: ${speaker.id}, Profile: ${speaker.profile}, Active: ${speaker.is_active})`)
        })
      } else {
        console.log('⚠️ uploadSpeakerFile: Success response but no speaker data in response')
      }
      
      const successMessage = data.message || (data.data && data.data.length > 0 
        ? `Successfully uploaded ${data.data.length} speaker(s)` 
        : 'Speakers uploaded successfully')
      showToast.success(successMessage)
    }

    return data
  } catch (error) {
    // Handle network errors
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
        error.message.includes('Event UUID') ||
        error.message.includes('Failed to upload')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to upload speakers. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to upload speakers. Please try again.')
    throw new Error(errorMessage)
  }
}

/**
 * Fetch speakers for an event
 */
export const fetchSpeakers = async (eventUuid: string): Promise<SpeakerData[]> => {
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

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.SPEAKER_MANAGEMENT.CREATE(eventUuid)
    console.log('📡 fetchSpeakers: Fetching from URL:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    })
    
    console.log('📡 fetchSpeakers: Response status:', response.status, response.statusText)

    // Check for network/CORS errors before parsing response
    if (!response || !response.ok) {
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
            const errorMessage = handleApiError(responseText.trim(), response, 'Failed to fetch speakers. Please try again.')
            throw new Error(errorMessage)
          }
        }
        
        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'Failed to fetch speakers. Please try again.')
          throw new Error(errorMessage)
        }
        
        // If we couldn't parse or extract error, try to get response status text
        const errorMessage = handleApiError(null, response, 'Failed to fetch speakers. Please try again.')
        console.error('Speaker fetch error - Status:', response.status, 'Response:', responseText?.substring(0, 200))
        throw new Error(errorMessage)
      } catch (parseError) {
        // If it's already our custom error, re-throw it
        if (parseError instanceof Error && (
            parseError.message.includes('Failed to fetch') ||
            parseError.message.includes('Cannot connect')
        )) {
          throw parseError
        }
        // Last resort: show status-based error message
        const errorMessage = handleApiError(null, response, 'Failed to fetch speakers. Please try again.')
        console.error('Speaker fetch parse error:', parseError)
        throw new Error(errorMessage)
      }
    }

    // Parse successful response
    let responseData: any
    try {
      responseData = await response.json()
    } catch (parseError) {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    // Handle different response formats
    // Check if response has error status (ApiResponse format)
    if (responseData.status === 'error') {
      const errorMessage = handleApiError(responseData, undefined, 'Failed to fetch speakers. Please try again.')
      throw new Error(errorMessage)
    }

    // Extract speakers from response - handle multiple formats
    let speakers: SpeakerData[]
    
    console.log('📡 fetchSpeakers: Raw response data:', responseData)
    
    // Format 1: Direct array
    if (Array.isArray(responseData)) {
      speakers = responseData
      console.log('✅ fetchSpeakers: Found direct array format with', speakers.length, 'speakers')
    }
    // Format 2: Wrapped in data field (ApiResponse format)
    else if (responseData.data && Array.isArray(responseData.data)) {
      speakers = responseData.data
      console.log('✅ fetchSpeakers: Found data array format with', speakers.length, 'speakers')
    }
    // Format 2b: ApiResponse + pagination: { status, data: { results: [] } }
    else if (responseData.data && Array.isArray(responseData.data.results)) {
      speakers = responseData.data.results
      console.log('✅ fetchSpeakers: Found data.results array format with', speakers.length, 'speakers')
    }
    // Format 3: Wrapped in results field (Django REST Framework pagination)
    else if (responseData.results && Array.isArray(responseData.results)) {
      speakers = responseData.results
      console.log('✅ fetchSpeakers: Found results array format with', speakers.length, 'speakers')
    }
    // Format 3b: Legacy nested: { data: { data: [] } }
    else if (responseData.data && Array.isArray(responseData.data.data)) {
      speakers = responseData.data.data
      console.log('✅ fetchSpeakers: Found data.data array format with', speakers.length, 'speakers')
    }
    // Format 4: Direct object with data
    else if (responseData.data && typeof responseData.data === 'object' && !Array.isArray(responseData.data)) {
      // Single object - wrap in array
      speakers = [responseData.data]
      console.log('✅ fetchSpeakers: Found single object format, wrapped in array')
    }
    // Format 5: Empty or unexpected format
    else {
      console.warn('⚠️ fetchSpeakers: Unexpected response format:', responseData)
      return []
    }

    console.log('📡 fetchSpeakers: Extracted speakers:', speakers)
    // Speaker Excel import: "list" response (raw speaker records returned by backend)
    console.log('🧾 Speaker Excel Import (list) response:', {
      count: Array.isArray(speakers) ? speakers.length : 0,
      speakers
    })
    // Note: Profile data should ideally be included in the API response
    // If profile is just an ID, the mapping in SpeakerManagementPage will handle it
    return speakers || []
  } catch (error) {
    // Handle network errors
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
        error.message.includes('Event UUID') ||
        error.message.includes('Failed to fetch')
    )) {
      throw error
    }

    // For any other errors, show the actual error message if available
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch speakers. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to fetch speakers. Please try again.')
    throw new Error(errorMessage)
  }
}

/**
 * Fetch speaker tags for an event.
 * Endpoint: {{url}}{{admin_url}}speakers/tags/?event_id={{event_uuid}}
 */
export const fetchSpeakerTags = async (eventUuid: string): Promise<TagData[]> => {
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

    const url = API_ENDPOINTS.SPEAKER_MANAGEMENT.TAGS(eventUuid)
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
      if (response?.status === 404) return []
      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        if (responseText?.trim()) throw new Error(handleApiError(responseText.trim(), response!, 'Failed to fetch speaker tags. Please try again.'))
      }
      throw new Error(handleApiError(errorData ?? null, response!, 'Failed to fetch speaker tags. Please try again.'))
    }

    const responseText = await response.text()
    if (!responseText?.trim()) return []
    const data = JSON.parse(responseText)

    if (data?.status === 'error') {
      throw new Error(handleApiError(data, undefined, 'Failed to fetch speaker tags. Please try again.'))
    }

    let responseData: any[] | null = null
    if (data?.status === 'success') {
      if (Array.isArray(data.data)) responseData = data.data
      else if (Array.isArray(data?.data?.results)) responseData = data.data.results
      else if (Array.isArray(data?.results)) responseData = data.results
    }
    if (!responseData && Array.isArray(data)) responseData = data
    if (!responseData && Array.isArray(data?.data)) responseData = data.data
    if (!responseData && Array.isArray(data?.results)) responseData = data.results
    if (!responseData && Array.isArray(data?.data?.results)) responseData = data.data.results
    if (!responseData || !Array.isArray(responseData)) return []

    const tags = responseData
      .map((t: any) => ({
        uuid: t?.uuid ?? t?.id ?? '',
        name: t?.name ?? t?.title ?? '',
        description: t?.description ?? '',
        is_active: t?.is_active ?? t?.isActive ?? true,
        speaker_count: typeof t?.speaker_count === 'number' ? t.speaker_count : (typeof t?.speakerCount === 'number' ? t.speakerCount : undefined),
      }))
      .filter((t: any) => Boolean(t.uuid) && Boolean(t.name)) as (TagData & { speaker_count?: number })[]
    return tags
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
      error.message.includes('Failed to fetch')
    )) {
      throw error
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch speaker tags. Please try again.'
    handleApiError(msg, undefined, 'Failed to fetch speaker tags. Please try again.')
    throw new Error(msg)
  }
}

type UpdateSpeakerInput = {
  first_name?: string
  last_name?: string
  email?: string
  organization?: string
  designation?: string
  /** Profile picture file; when set, request is sent as multipart/form-data. */
  image?: File
  [key: string]: any
}

const cleanObject = (obj: Record<string, any>) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

/**
 * Update a speaker by UUID.
 * Endpoint: /api/v1/admin/speakers/{speaker_uuid}/
 */
export const updateSpeaker = async (
  speakerUuid: string,
  input: UpdateSpeakerInput
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

    if (!speakerUuid) {
      const errorMessage = handleApiError('Speaker UUID is required.', undefined, 'Speaker UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.SPEAKER_MANAGEMENT.UPDATE(speakerUuid)
    const hasImage = input.image instanceof File

    if (hasImage) {
      const form = new FormData()
      if (input.first_name != null) form.append('first_name', input.first_name)
      if (input.last_name != null) form.append('last_name', input.last_name)
      if (input.email != null) form.append('email', input.email)
      if (input.organization != null) form.append('organisation', input.organization)
      if (input.designation != null) form.append('designation', input.designation)
      if (input.bio != null && input.bio !== '') form.append('bio', input.bio)
      if (Array.isArray(input.groups)) input.groups.forEach((g) => form.append('group_names', g))
      form.append('image', input.image!)

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Organization': organizationUuid,
        },
        credentials: 'include',
        body: form,
      })

      if (response.ok) {
        let responseData: any = null
        try {
          responseData = await response.json()
        } catch {
          responseData = null
        }
        console.log('PATCH speaker API response (with image):', responseData)
        showToast.success('Speaker updated successfully')
        return responseData
      }

      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        errorData = responseText?.trim() ? responseText.trim() : null
      }
      const errorMessage = handleApiError(errorData, response, 'Failed to update speaker. Please try again.')
      throw new Error(errorMessage)
    }

    const designation = input.designation
    const organization = input.organization
    const email = input.email
    const base = cleanObject({
      ...input,
      designation,
      organization,
      email,
    })
    delete (base as any).image

    const candidates: Array<Record<string, any>> = [
      base,
      cleanObject({
        ...input,
        designation,
        organisation: organization,
        user_email: email,
        organization: undefined,
        email: undefined,
        image: undefined,
      }),
    ]

    let lastError: any = null

    for (const payload of candidates) {
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
          // Some endpoints respond with 204 or non-JSON; treat as success.
          responseData = null
        }
        console.log('PATCH speaker API response:', responseData)
        showToast.success('Speaker updated successfully')
        return responseData
      }

      // Read body for error details
      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        errorData = responseText?.trim() ? responseText.trim() : null
      }

      lastError = { response, errorData }

      // Only try next candidate for validation-ish errors
      if (response.status !== 400 && response.status !== 404 && response.status !== 422) {
        const errorMessage = handleApiError(errorData, response, 'Failed to update speaker. Please try again.')
        throw new Error(errorMessage)
      }
    }

    const errorMessage = handleApiError(
      lastError?.errorData ?? null,
      lastError?.response,
      'Failed to update speaker. Please try again.'
    )
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
      handleApiError(error.message, undefined, 'Failed to update speaker. Please try again.')
      throw error
    }

    const errorMessage = 'Failed to update speaker. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Delete a speaker by UUID.
 * Endpoint: /api/v1/admin/speakers/{speaker_uuid}/
 */
export const deleteSpeaker = async (speakerUuid: string): Promise<void> => {
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

    if (!speakerUuid) {
      const errorMessage = handleApiError('Speaker UUID is required.', undefined, 'Speaker UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.SPEAKER_MANAGEMENT.DELETE(speakerUuid)
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
      const errorMessage = handleApiError(errorData, response, 'Failed to delete speaker. Please try again.')
      throw new Error(errorMessage)
    }

    showToast.success('Speaker deleted successfully')
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error) {
      handleApiError(error.message, undefined, 'Failed to delete speaker. Please try again.')
      throw error
    }

    const errorMessage = 'Failed to delete speaker. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Bulk add speakers to a tag/group.
 * Endpoint: POST speakers/bulk-add-tag/?event_id={{event_uuid}}
 * Body: { uuids: [speaker_uuid1, speaker_uuid2], tag_uuid: tag_uuid }
 */
export const bulkAddSpeakerTag = async (
  eventUuid: string,
  speakerUuids: string[],
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
    if (!speakerUuids?.length) {
      return
    }

    const url = API_ENDPOINTS.SPEAKER_MANAGEMENT.BULK_ADD_TAG(eventUuid)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify({
        uuids: speakerUuids,
        tag_uuid: tagUuid,
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        errorData = responseText?.trim() ? responseText.trim() : null
      }
      const errorMessage = handleApiError(errorData, response, 'Failed to update speakers. Please try again.')
      throw new Error(errorMessage)
    }

    showToast.success('Speakers updated successfully')
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error) {
      handleApiError(error.message, undefined, 'Failed to update speakers. Please try again.')
      throw error
    }

    const errorMessage = 'Failed to update speakers. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Bulk delete speakers.
 * Endpoint: POST speakers/bulk-delete/?event_id={{event_uuid}}
 * Body: { uuids: [speaker_uuid1, speaker_uuid2] }
 */
export const bulkDeleteSpeakers = async (eventUuid: string, speakerUuids: string[]): Promise<void> => {
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
    if (!speakerUuids?.length) {
      return
    }

    const url = API_ENDPOINTS.SPEAKER_MANAGEMENT.BULK_DELETE(eventUuid)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify({
        uuids: speakerUuids,
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        errorData = responseText?.trim() ? responseText.trim() : null
      }
      const errorMessage = handleApiError(errorData, response, 'Failed to delete speakers. Please try again.')
      throw new Error(errorMessage)
    }

    showToast.success('Speakers deleted successfully')
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error) {
      handleApiError(error.message, undefined, 'Failed to delete speakers. Please try again.')
      throw error
    }

    const errorMessage = 'Failed to delete speakers. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}

type CreateSpeakerInput = {
  first_name: string
  last_name: string
  email: string
  organization?: string
  designation?: string
  bio?: string
  groups?: string[]
  /** Profile picture file; when set, request is sent as multipart/form-data. */
  image?: File
  [key: string]: any
}

/**
 * Create a speaker for an event.
 * Endpoint: /api/v1/admin/speakers/?event_id={event_uuid}
 */
export const createSpeaker = async (
  eventUuid: string,
  input: CreateSpeakerInput
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

    const url = API_ENDPOINTS.SPEAKER_MANAGEMENT.CREATE(eventUuid)
    const hasImage = input.image instanceof File

    if (hasImage) {
      const form = new FormData()
      form.append('user_email', input.email)
      form.append('first_name', input.first_name)
      form.append('last_name', input.last_name)
      if (input.organization != null && input.organization !== '') form.append('organisation', input.organization)
      const description = (input as any).description ?? input.designation ?? input.bio ?? ''
      if (description !== '') form.append('description', description)
      if (input.bio != null && input.bio !== '') form.append('bio', input.bio)
      if (Array.isArray(input.groups) && input.groups.length) {
        input.groups.forEach((g) => form.append('groups', g))
      }
      form.append('image', input.image!)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Organization': organizationUuid,
        },
        credentials: 'include',
        body: form,
      })

      if (response.ok) {
        let responseData: any = null
        try {
          responseData = await response.json()
        } catch {
          responseData = null
        }
        showToast.success('Speaker created successfully')
        return responseData
      }

      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        errorData = responseText?.trim() ? responseText.trim() : null
      }
      const errorMessage = handleApiError(errorData, response, 'Failed to create speaker. Please try again.')
      throw new Error(errorMessage)
    }

    // No image: JSON body — payload shape: user_email, first_name, last_name, organisation, description, groups, bio
    const description = (input as any).description ?? input.designation ?? input.bio ?? ''
    const base = cleanObject({
      user_email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      organisation: input.organization,
      description: description || undefined,
      groups: Array.isArray(input.groups) && input.groups.length ? input.groups : undefined,
      bio: input.bio,
    })

    const candidates: Array<Record<string, any>> = [base]

    let lastError: any = null

    for (const payload of candidates) {
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
        showToast.success('Speaker created successfully')
        return responseData
      }

      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        errorData = responseText?.trim() ? responseText.trim() : null
      }

      lastError = { response, errorData }

      if (response.status !== 400 && response.status !== 404 && response.status !== 422) {
        const errorMessage = handleApiError(errorData, response, 'Failed to create speaker. Please try again.')
        throw new Error(errorMessage)
      }
    }

    const errorMessage = handleApiError(
      lastError?.errorData ?? null,
      lastError?.response,
      'Failed to create speaker. Please try again.'
    )
    throw new Error(errorMessage)
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error) {
      handleApiError(error.message, undefined, 'Failed to create speaker. Please try again.')
      throw error
    }

    const errorMessage = 'Failed to create speaker. Please try again.'
    handleApiError(errorMessage, undefined, errorMessage)
    throw new Error(errorMessage)
  }
}
