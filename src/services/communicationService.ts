import { API_ENDPOINTS } from '../config/env'
import { showToast } from '../utils/toast'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'
import type { ApiResponse } from './authService'

export interface RecipientFilter {
  type: 'group' | 'message_status'
  operator: 'is' | 'is_not'
  value: string
}

export interface SendCommunicationRequest {
  event_uuid: string
  title?: string
  subject: string
  message: string
  channel: 'email' | 'notification'
  tap_action?: {
    action_type: string
    action_value: string
  }
  attachment_uuids?: string[]
}

export interface UpdateCommunicationRecipientsRequest {
  recipient_match: 'all' | 'any'
  recipient_filters: RecipientFilter[]
}

export interface SendCommunicationResponseData {
  id: number
  event_uuid: string
  total_recipients: number
  status: string
}

export interface CommunicationTag {
  uuid?: string
  id?: string | number
  name?: string
}

export interface CommunicationRecipientFilter {
  type?: 'group' | 'message_status' | string
  operator?: 'is' | 'is_not' | string
  value?: string
}

export interface CommunicationData {
  id: number
  event_uuid: string
  title?: string
  subject?: string
  message?: string
  channel: 'email' | 'notification'
  tag_uuids?: string[]
  tags?: CommunicationTag[]
  recipient_filters?: CommunicationRecipientFilter[]
  total_recipients: number
  sent_count?: number
  delivered_count?: number
  failed_count?: number
  status: string
  created_at?: string
  created_date?: string
  scheduled_at?: string
}

export interface CommunicationDetailResponseData extends CommunicationData {
  title?: string
  recipient_match?: 'all' | 'any' | string
  recipients?: string
  attachments?: Array<{ uuid?: string; file_name?: string; file?: string; content_type?: string }>
}

/**
 * Send a communication (email or push notification) to recipients based on tags
 */
export const sendCommunication = async (
  request: SendCommunicationRequest
): Promise<SendCommunicationResponseData> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')

    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    if (!request.event_uuid) {
      const errorMessage = 'Event UUID is required.'
      showToast.error(errorMessage)
      throw new Error(errorMessage)
    }

    if (!request.subject || !request.subject.trim()) {
      const errorMessage = 'Subject is required.'
      showToast.error(errorMessage)
      throw new Error(errorMessage)
    }

    if (!request.message || !request.message.trim()) {
      const errorMessage = 'Message is required.'
      showToast.error(errorMessage)
      throw new Error(errorMessage)
    }

    const requestBody = {
      event_uuid: request.event_uuid,
      ...(request.title ? { title: request.title } : {}),
      channel: request.channel,
      subject: request.subject.trim(),
      message: request.message.trim(),
      ...(request.tap_action ? { tap_action: request.tap_action } : {}),
      attachment_uuids: request.attachment_uuids ?? [],
    }

    const response = await fetch(API_ENDPOINTS.COMMUNICATION.SEND, {
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
        const errorData: ApiResponse = await response.json()
        const errorMessage = handleApiError(
          errorData,
          response,
          'Failed to send communication. Please try again.'
        )
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('JSON')) {
          const errorMessage = handleApiError(
            null,
            response,
            'Failed to send communication. Please try again.'
          )
          throw new Error(errorMessage)
        }
        throw parseError
      }
    }

    let data: ApiResponse<SendCommunicationResponseData>
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'error') {
      const errorMessage = handleApiError(
        data,
        undefined,
        'Failed to send communication. Please try again.'
      )
      throw new Error(errorMessage)
    }

    if (data.status === 'success' && data.data) {
      showToast.success(data.message || 'Draft saved successfully.')
      return data.data
    }

    throw new Error('Unexpected response format from server.')
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const errorMessage = handleNetworkError(null)
      throw new Error(errorMessage)
    }

    // Re-throw if it's already a handled error
    if (error instanceof Error) {
      throw error
    }

    throw new Error('An unexpected error occurred while sending the communication.')
  }
}

/**
 * Trigger sending of an already-created communication by its ID.
 * POST event-communications/{id}/send/?event_id={eventUuid}
 */
export const sendCommunicationById = async (
  communicationId: number,
  eventUuid: string
): Promise<{ id?: number; status?: string; total_recipients?: number; sent_count?: number; failed_count?: number } | null> => {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')

  if (!accessToken) throw new Error('Authentication required. Please login again.')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')

  const response = await fetch(API_ENDPOINTS.COMMUNICATION.SEND_BY_ID(communicationId, eventUuid), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    let message = 'Failed to send communication. Please try again.'
    try {
      const err: ApiResponse = await response.json()
      message = handleApiError(err, response, message)
    } catch {
      message = handleApiError(null, response, message)
    }
    throw new Error(message)
  }

  // Some backend variants return 204 or 200 with empty/non-JSON body.
  if (response.status === 204) {
    showToast.success('Communication sent successfully.')
    return null
  }

  const raw = await response.text()
  if (!raw.trim()) {
    showToast.success('Communication sent successfully.')
    return null
  }

  try {
    const data: ApiResponse<{ id?: number; status?: string; total_recipients?: number; sent_count?: number; failed_count?: number }> = JSON.parse(raw)
    if (data.status === 'error' || data.status === 'failure') {
      throw new Error(handleApiError(data, undefined, 'Failed to send communication.'))
    }
    showToast.success(data.message || 'Communication sent successfully.')
    return data.data ?? null
  } catch {
    // Non-JSON body on 2xx should still be treated as success.
    showToast.success('Communication sent successfully.')
    return null
  }
}

/**
 * Update only recipient targeting for a communication draft.
 * PATCH event-communications/{id}/?event_id={eventUuid}
 * Body: { recipient_match, recipient_filters }
 */
export const updateCommunicationRecipients = async (
  communicationId: number,
  eventUuid: string,
  request: UpdateCommunicationRecipientsRequest
): Promise<void> => {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')

  if (!accessToken) throw new Error('Authentication required. Please login again.')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')

  const response = await fetch(API_ENDPOINTS.COMMUNICATION.DETAIL(communicationId, eventUuid), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify({
      recipient_match: request.recipient_match,
      recipient_filters: request.recipient_filters,
    }),
  })

  if (!response.ok) {
    let message = 'Failed to update recipient filters.'
    try {
      const err: ApiResponse = await response.json()
      message = handleApiError(err, response, message)
    } catch {
      message = handleApiError(null, response, message)
    }
    throw new Error(message)
  }
}

/**
 * Upload a single attachment file and return its UUID
 */
export const uploadAttachment = async (file: File): Promise<{ uuid: string; fileUrl: string }> => {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')

  if (!accessToken) throw new Error('Authentication required. Please login again.')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(API_ENDPOINTS.COMMUNICATION.ATTACHMENT_UPLOAD, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    let message = 'Failed to upload attachment.'
    try {
      const err: ApiResponse = await response.json()
      message = handleApiError(err, response, message)
    } catch {
      message = handleApiError(null, response, message)
    }
    throw new Error(message)
  }

  let data: ApiResponse<{ uuid: string }>
  try {
    data = await response.json()
  } catch {
    throw new Error(handleParseError('Invalid response from server.'))
  }

  if (data.status === 'error') throw new Error(handleApiError(data, undefined, 'Failed to upload attachment.'))
  if (data.data?.uuid) return { uuid: data.data.uuid, fileUrl: (data.data as { uuid: string; file_url?: string }).file_url ?? '' }

  throw new Error('Unexpected response: missing UUID.')
}

/**
 * Fetch communications for an event
 */
export const fetchCommunications = async (
  eventUuid: string
): Promise<CommunicationData[]> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')

    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = 'Event UUID is required.'
      throw new Error(errorMessage)
    }

    const extractItemsAndNext = (payload: unknown): { items: CommunicationData[]; next: string | null } => {
      if (!payload || typeof payload !== 'object') return { items: [], next: null }
      const p = payload as Record<string, unknown>

      if (p.status === 'error' || p.status === 'failure') {
        throw new Error(handleApiError(p as unknown as ApiResponse, undefined, 'Failed to fetch communications. Please try again.'))
      }

      // Plain paginated shape: { results: [...], next: "..." }
      if (Array.isArray(p.results)) {
        return {
          items: p.results as CommunicationData[],
          next: typeof p.next === 'string' && p.next.trim() ? p.next : null,
        }
      }

      // Success wrapper shape
      if (p.status === 'success') {
        const data = p.data
        if (Array.isArray(data)) {
          return {
            items: data as CommunicationData[],
            next: typeof p.next === 'string' && p.next.trim() ? p.next : null,
          }
        }
        if (data && typeof data === 'object') {
          const d = data as Record<string, unknown>
          if (Array.isArray(d.results)) {
            return {
              items: d.results as CommunicationData[],
              next:
                (typeof d.next === 'string' && d.next.trim() ? d.next : null) ??
                (typeof p.next === 'string' && p.next.trim() ? p.next : null),
            }
          }
        }
      }

      return { items: [], next: null }
    }

    const merged: CommunicationData[] = []
    let nextUrl: string | null = API_ENDPOINTS.COMMUNICATION.LIST(eventUuid)
    let pageGuard = 0
    const maxPages = 100

    while (nextUrl) {
      pageGuard += 1
      if (pageGuard > maxPages) break

      const response = await fetch(nextUrl, {
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
        if (response.status === 404) return []
        try {
          const errorData: ApiResponse<CommunicationData[]> = await response.json()
          const errorMessage = handleApiError(
            errorData,
            response,
            'Failed to fetch communications. Please try again.'
          )
          throw new Error(errorMessage)
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes('JSON')) {
            const errorMessage = handleApiError(null, response, 'Failed to fetch communications. Please try again.')
            throw new Error(errorMessage)
          }
          throw parseError
        }
      }

      const raw = await response.text()
      let payload: unknown = null
      try {
        payload = raw ? JSON.parse(raw) : null
      } catch {
        const errorMessage = handleParseError('Invalid response from server. Please try again.')
        throw new Error(errorMessage)
      }

      const { items, next } = extractItemsAndNext(payload)
      merged.push(...items)

      if (next && next.trim()) {
        nextUrl = next.startsWith('http')
          ? next
          : new URL(next, nextUrl).href
      } else {
        nextUrl = null
      }
    }

    return merged
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const errorMessage = handleNetworkError(null)
      throw new Error(errorMessage)
    }

    // Re-throw if it's already a handled error
    if (error instanceof Error) {
      throw error
    }

    throw new Error('An unexpected error occurred while fetching communications.')
  }
}

/**
 * Fetch one communication detail by ID
 * GET event-communications/{id}/?event_id={eventUuid}
 */
export const fetchCommunicationById = async (
  communicationId: string | number,
  eventUuid: string
): Promise<CommunicationDetailResponseData> => {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) throw new Error('Authentication required. Please login again.')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')
  if (!eventUuid) throw new Error('Event UUID is required.')

  const response = await fetch(API_ENDPOINTS.COMMUNICATION.DETAIL(communicationId, eventUuid), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    let message = 'Failed to fetch communication details.'
    try {
      const err: ApiResponse = await response.json()
      message = handleApiError(err, response, message)
    } catch {
      message = handleApiError(null, response, message)
    }
    throw new Error(message)
  }

  let data: ApiResponse<CommunicationDetailResponseData>
  try {
    data = await response.json()
  } catch {
    throw new Error(handleParseError('Invalid response from server.'))
  }

  if (data.status === 'error' || data.status === 'failure' || !data.data) {
    throw new Error(handleApiError(data, undefined, 'Failed to fetch communication details.'))
  }

  return data.data
}

/**
 * Delete a communication draft by ID.
 * DELETE event-communications/{id}/?event_id={eventUuid}
 */
export const deleteCommunicationById = async (
  communicationId: string | number,
  eventUuid: string
): Promise<void> => {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) throw new Error('Authentication required. Please login again.')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')
  if (!eventUuid) throw new Error('Event UUID is required.')

  const response = await fetch(API_ENDPOINTS.COMMUNICATION.DETAIL(communicationId, eventUuid), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    let message = 'Failed to delete communication.'
    try {
      const err: ApiResponse = await response.json()
      message = handleApiError(err, response, message)
    } catch {
      message = handleApiError(null, response, message)
    }
    throw new Error(message)
  }
}

export interface RecipientItem {
  id: number
  name: string
  email: string
  status?: string
  error?: string
  sent_at?: string
  is_opened?: boolean
  opened_at?: string | null
}

export interface RecipientPageResult {
  count: number
  next: string | null
  previous: string | null
  data: RecipientItem[]
}

export const fetchCommunicationRecipients = async (
  communicationId: string | number,
  eventUuid: string,
  tab: 'received' | 'not_received'
): Promise<RecipientPageResult> => {
  const url = API_ENDPOINTS.COMMUNICATION.RECIPIENTS(communicationId, eventUuid, tab)
  return fetchRecipientsPage(url)
}

export const fetchRecipientsPage = async (url: string): Promise<RecipientPageResult> => {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) throw new Error('Authentication required.')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 404) {
      return { count: 0, next: null, previous: null, data: [] }
    }
    let message = 'Failed to fetch recipients.'
    try {
      const err = await response.json()
      message = handleApiError(err, response, message)
    } catch {
      message = handleApiError(null, response, message)
    }
    throw new Error(message)
  }

  const json = await response.json()
  return {
    count: json.count ?? 0,
    next: json.next ?? null,
    previous: json.previous ?? null,
    data: Array.isArray(json.data) ? json.data : [],
  }
}

/**
 * Fetch user groups (tags) for the communication Settings recipient filters.
 * GET user-tags/?event_uuid={eventUuid}
 */
export const fetchUserTags = async (
  eventUuid: string
): Promise<Array<{ uuid: string; name: string }>> => {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')

  if (!accessToken) throw new Error('Authentication required. Please login again.')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')
  if (!eventUuid) return []

  const response = await fetch(API_ENDPOINTS.TAGS.LIST(eventUuid), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 404) return []
    throw new Error(`Failed to fetch user groups (${response.status}).`)
  }

  let data: ApiResponse<Array<{ uuid: string; name: string; is_active?: boolean }>>
  try {
    data = await response.json()
  } catch {
    throw new Error(handleParseError('Invalid response from server.'))
  }

  if (data.status === 'error') throw new Error(handleApiError(data, undefined, 'Failed to fetch user groups.'))

  const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? (data as unknown as Array<{ uuid: string; name: string; is_active?: boolean }>) : []
  return list
    .filter((t) => t.is_active !== false && t.uuid && t.name)
    .map((t) => ({ uuid: t.uuid, name: t.name }))
}
