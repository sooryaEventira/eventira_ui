import { API_ENDPOINTS } from '../config/env'
import { showToast } from '../utils/toast'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'
import type { ApiResponse } from './authService'

export type ParticipantRole = 'speaker' | 'attendee'

export interface ParticipantData {
  id?: string
  uuid?: string
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar_url?: string
  banner_url?: string
  status?: string
  role?: ParticipantRole
  description?: string
  bio?: string
  organisation?: string
  designation?: string
  invite_code?: string
  groups?: string[]
  tag_names?: string[]
  tag_uuids?: string[]
  tags?: string | string[]
  institute?: string
  post?: string
  email_verified?: boolean
  email_verified_date?: string
  feedback_incomplete?: boolean
  custom_fields?: Record<string, string>
  [key: string]: any
}

export interface ParticipantsPageResult {
  data: ParticipantData[]
  count: number
  next: string | null
  previous: string | null
}

const getAuthHeaders = () => {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) throw new Error('Authentication required. Please login again.')
  if (!organizationUuid) throw new Error('Organization UUID is missing. Please create or select an organization first.')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'X-Organization': organizationUuid,
  }
}

const getAuthHeadersNoContentType = () => {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) throw new Error('Authentication required. Please login again.')
  if (!organizationUuid) throw new Error('Organization UUID is missing. Please create or select an organization first.')
  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Organization': organizationUuid,
  }
}

const handleResponse = async (response: Response, fallbackMsg: string) => {
  if (!response.ok) {
    let errorData: any = null
    try {
      const text = await response.text()
      errorData = text ? JSON.parse(text) : null
    } catch {
      // ignore parse errors
    }
    const msg = handleApiError(errorData, response, fallbackMsg)
    throw new Error(msg)
  }
  try {
    return await response.json()
  } catch {
    throw new Error(handleParseError('Invalid response from server.'))
  }
}

/** Upload participants via Excel file */
export const uploadParticipantFile = async (
  file: File,
  eventUuid?: string
): Promise<ApiResponse<any>> => {
  const headers = getAuthHeadersNoContentType() as Record<string, string>
  let event_uuid = eventUuid
  if (!event_uuid) {
    const stored = localStorage.getItem('created-event')
    if (stored) {
      try { event_uuid = JSON.parse(stored).uuid } catch { /* ignore */ }
    }
  }
  if (!event_uuid) throw new Error('Event UUID is required. Please select an event first.')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('event_uuid', event_uuid)

  const response = await fetch(API_ENDPOINTS.PARTICIPANT_MANAGEMENT.UPLOAD, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  })

  const data = await handleResponse(response, 'Failed to upload participants. Please try again.')
  if (data?.status === 'success') {
    showToast.success(data.message || 'Participants uploaded successfully')
  }
  return data
}

/** Fetch paginated participants list */
export const fetchParticipants = async (
  eventUuid: string,
  page = 1,
  tagId?: string,
  ordering?: string,
  pageSize?: number,
  role?: ParticipantRole
): Promise<ParticipantsPageResult> => {
  if (!eventUuid) throw new Error('Event UUID is required.')
  const headers = getAuthHeaders()
  const url = API_ENDPOINTS.PARTICIPANT_MANAGEMENT.LIST(eventUuid, page, tagId, ordering, pageSize, role)

  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' })
  const responseData = await handleResponse(response, 'Failed to load participants. Please try again.')

  // Handle multiple pagination response shapes
  let items: ParticipantData[] = []
  let count = 0
  let next: string | null = null
  let previous: string | null = null

  if (Array.isArray(responseData)) {
    items = responseData
    count = responseData.length
  } else if (responseData?.data && Array.isArray(responseData.data)) {
    items = responseData.data.results ?? responseData.data
    count = responseData.count ?? responseData.data.count ?? items.length
    next = responseData.next ?? responseData.data.next ?? null
    previous = responseData.previous ?? responseData.data.previous ?? null
  } else if (responseData?.results && Array.isArray(responseData.results)) {
    items = responseData.results
    count = responseData.count ?? items.length
    next = responseData.next ?? null
    previous = responseData.previous ?? null
  }

  return { data: items, count, next, previous }
}

/** Search participants */
export const searchParticipants = async (
  eventUuid: string,
  query: string,
  tagId?: string,
  role?: ParticipantRole
): Promise<ParticipantsPageResult> => {
  const headers = getAuthHeaders()
  const url = API_ENDPOINTS.PARTICIPANT_MANAGEMENT.SEARCH(eventUuid, query, tagId, role)
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' })
  const responseData = await handleResponse(response, 'Failed to search participants.')

  let items: ParticipantData[] = []
  let count = 0

  if (Array.isArray(responseData)) {
    items = responseData
    count = responseData.length
  } else if (responseData?.data && Array.isArray(responseData.data)) {
    items = Array.isArray(responseData.data.results) ? responseData.data.results : responseData.data
    count = responseData.count ?? items.length
  } else if (responseData?.results) {
    items = responseData.results
    count = responseData.count ?? items.length
  }

  return { data: items, count, next: null, previous: null }
}

/** Fetch participant tags/groups */
export const fetchParticipantTags = async (eventUuid: string): Promise<any[]> => {
  const headers = getAuthHeaders()
  const url = API_ENDPOINTS.PARTICIPANT_MANAGEMENT.TAGS(eventUuid)
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' })
  const data = await handleResponse(response, 'Failed to load participant groups.')
  return Array.isArray(data) ? data : data?.data ?? data?.results ?? []
}

/** Create a new participant */
export const createParticipant = async (
  eventUuid: string,
  participantData: Partial<ParticipantData>
): Promise<ParticipantData> => {
  const headers = getAuthHeaders()
  const response = await fetch(API_ENDPOINTS.PARTICIPANT_MANAGEMENT.CREATE(eventUuid), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(participantData),
  })
  const data = await handleResponse(response, 'Failed to create participant. Please try again.')
  showToast.success('Participant created successfully')
  return data?.data ?? data
}

/** Get a single participant's details */
export const getParticipant = async (
  participantUuid: string,
  eventUuid: string
): Promise<ParticipantData> => {
  const headers = getAuthHeaders()
  const response = await fetch(API_ENDPOINTS.PARTICIPANT_MANAGEMENT.GET(participantUuid, eventUuid), {
    method: 'GET',
    headers,
    credentials: 'include',
  })
  const data = await handleResponse(response, 'Failed to load participant details.')
  return data?.data ?? data
}

/** Update an existing participant */
export const updateParticipant = async (
  participantUuid: string,
  eventUuid: string,
  participantData: Partial<ParticipantData>
): Promise<ParticipantData> => {
  const headers = getAuthHeaders()
  const response = await fetch(API_ENDPOINTS.PARTICIPANT_MANAGEMENT.UPDATE(participantUuid, eventUuid), {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(participantData),
  })
  const data = await handleResponse(response, 'Failed to update participant. Please try again.')
  showToast.success('Participant updated successfully')
  return data?.data ?? data
}

/** Delete a participant */
export const deleteParticipant = async (participantUuid: string, eventUuid: string): Promise<void> => {
  const headers = getAuthHeaders()
  const response = await fetch(API_ENDPOINTS.PARTICIPANT_MANAGEMENT.DELETE(participantUuid, eventUuid), {
    method: 'DELETE',
    headers,
    credentials: 'include',
  })
  if (!response.ok) {
    const msg = handleApiError(null, response, 'Failed to delete participant.')
    throw new Error(msg)
  }
  showToast.success('Participant deleted successfully')
}

/** Bulk add participants to a tag/group */
export const bulkAddParticipantTag = async (
  eventUuid: string,
  participantIds: string[],
  tagId: string
): Promise<void> => {
  const headers = getAuthHeaders()
  const response = await fetch(API_ENDPOINTS.PARTICIPANT_MANAGEMENT.BULK_ADD_TAG(eventUuid), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ participant_ids: participantIds, tag_id: tagId }),
  })
  await handleResponse(response, 'Failed to add participants to group.')
  showToast.success('Participants added to group')
}

/** Bulk delete participants */
export const bulkDeleteParticipants = async (
  eventUuid: string,
  participantIds: string[],
  selectAll?: boolean
): Promise<void> => {
  const headers = getAuthHeaders()
  const response = await fetch(API_ENDPOINTS.PARTICIPANT_MANAGEMENT.BULK_DELETE(eventUuid), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ participant_ids: participantIds, select_all: selectAll ?? false }),
  })
  await handleResponse(response, 'Failed to delete participants.')
  showToast.success('Participants deleted successfully')
}

/** Helper: try to handle network errors uniformly */
export const safeParticipantCall = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      handleNetworkError(error)
    }
    throw error
  }
}
