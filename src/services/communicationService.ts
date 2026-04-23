import { API_ENDPOINTS } from '../config/env'
import { showToast } from '../utils/toast'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'
import type { ApiResponse } from './authService'

export interface RecipientFilter {
  type: 'group' | 'message_status' | 'user_status'
  operator: 'is' | 'is_not'
  value: string
}

export interface SendCommunicationRequest {
  event_uuid: string
  subject: string
  message: string
  channel: 'email' | 'push-notification'
  recipient_match: 'all' | 'any'
  recipient_filters: RecipientFilter[]
  save_as_draft?: boolean
  attachment_uuids?: string[]
}

export interface SendCommunicationResponseData {
  id: number
  event_uuid: string
  total_recipients: number
  status: string
}

export interface CommunicationData {
  id: number
  event_uuid: string
  subject?: string
  message?: string
  channel: 'email' | 'push-notification'
  tag_uuids?: string[]
  total_recipients: number
  status: string
  created_at?: string
  scheduled_at?: string
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

    const response = await fetch(API_ENDPOINTS.COMMUNICATION.SEND, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify({
        event_uuid: request.event_uuid,
        channel: request.channel,
        subject: request.subject.trim(),
        message: request.message.trim(),
        save_as_draft: request.save_as_draft ?? false,
        recipient_match: request.recipient_match,
        recipient_filters: request.recipient_filters,
        attachment_uuids: request.attachment_uuids ?? [],
      }),
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
      showToast.success(
        data.message || `Communication sent successfully to ${data.data.total_recipients} recipient(s)`
      )
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

    const response = await fetch(API_ENDPOINTS.COMMUNICATION.LIST(eventUuid), {
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

      // Handle 404 as empty list (no communications found)
      if (response.status === 404) {
        return []
      }

      try {
        const errorData: ApiResponse = await response.json()
        const errorMessage = handleApiError(
          errorData,
          response,
          'Failed to fetch communications. Please try again.'
        )
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('JSON')) {
          const errorMessage = handleApiError(
            null,
            response,
            'Failed to fetch communications. Please try again.'
          )
          throw new Error(errorMessage)
        }
        throw parseError
      }
    }

    let data: ApiResponse<CommunicationData[]>
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
        'Failed to fetch communications. Please try again.'
      )
      throw new Error(errorMessage)
    }

    if (data.status === 'success' && data.data) {
      return Array.isArray(data.data) ? data.data : []
    }

    return []
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
