import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError } from '../utils/errorHandler'

/**
 * Fetch a short-lived Ably token for real-time chat.
 * Pass channelName so the backend can issue a token scoped to that channel.
 * Returns the raw token value — could be a JWT string, TokenRequest, or TokenDetails object.
 * Ably's authCallback accepts all three; we must NOT call String() on an object.
 */
export async function fetchAblyToken(channelName?: string): Promise<string | object> {
  const pubToken = localStorage.getItem('pub_accessToken')
  const response = await fetch(API_ENDPOINTS.PUBLIC.ABLY_TOKEN(channelName), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(pubToken ? { Authorization: `Bearer ${pubToken}` } : {}),
    },
  })
  if (!response.ok) throw new Error('Failed to fetch Ably token.')
  const data = await response.json()

  // Unwrap up to 3 levels of { status, data } envelope to reach the token object/string.
  // e.g. { status, data: { status, data: { token: "jwt", client_id, capability } } }
  let unwrapped = data
  for (let i = 0; i < 3; i++) {
    if (unwrapped && typeof unwrapped === 'object' && 'data' in unwrapped) {
      unwrapped = unwrapped.data
    } else {
      break
    }
  }
  // unwrapped is now { token: "jwt", client_id, capability } or the JWT string itself
  const token = (unwrapped && typeof unwrapped === 'object' ? unwrapped.token ?? unwrapped : unwrapped) ?? data?.token ?? data
  if (!token) throw new Error('Ably token missing in response.')

  // Return as-is — do NOT coerce to String. Ably handles JWT strings and TokenRequest objects natively.
  return token
}

export interface SessionComment {
  uuid: string
  parent_uuid: string | null
  content: string
  author_name: string
  created_date: string
  updated_date: string
}

export interface SessionCommentsResponse {
  status: string
  message: string
  count: number
  next: string | null
  previous: string | null
  data: SessionComment[]
}

/**
 * Fetch comments for a session (public API)
 */
export async function fetchSessionComments(
  eventUuid: string,
  sessionUuid: string
): Promise<SessionComment[]> {
  try {
    if (!eventUuid || !sessionUuid) {
      throw new Error('Event UUID and Session UUID are required.')
    }

    const url = API_ENDPOINTS.PUBLIC.SESSION_COMMENTS.LIST(eventUuid, sessionUuid)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
        if (responseText && responseText.trim()) {
          const errorMessage = handleApiError(responseText.trim(), response, 'Failed to fetch comments.')
          throw new Error(errorMessage)
        }
      }

      const errorMessage = handleApiError(errorData, response, 'Failed to fetch comments.')
      throw new Error(errorMessage)
    }

    const data = await response.json()

    if (data?.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch comments.')
      throw new Error(errorMessage)
    }

    const comments = data?.data ?? data?.results ?? data
    return Array.isArray(comments) ? comments : []
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch comments.')
  }
}

/**
 * Post a comment to a session (public API)
 */
export async function postSessionComment(
  eventUuid: string,
  sessionUuid: string,
  content: string,
  parentUuid?: string | null,
  isAnonymous?: boolean
): Promise<SessionComment> {
  try {
    if (!eventUuid || !sessionUuid || !content) {
      throw new Error('Event UUID, Session UUID and content are required.')
    }

    const url = API_ENDPOINTS.PUBLIC.SESSION_COMMENTS.CREATE(eventUuid, sessionUuid)
    const body: any = {
      session_uuid: sessionUuid,
      content: content.trim(),
    }

    if (parentUuid) {
      body.parent_uuid = parentUuid
    }

    if (isAnonymous) {
      body.is_anonymous = true
    }

    const token = localStorage.getItem('pub_accessToken')
    if (!token) {
      throw new Error('Please log in to send a message.')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Please log in to send a message.')
      }

      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        if (responseText && responseText.trim()) {
          const errorMessage = handleApiError(responseText.trim(), response, 'Failed to post comment.')
          throw new Error(errorMessage)
        }
      }

      const errorMessage = handleApiError(errorData, response, 'Failed to post comment.')
      throw new Error(errorMessage)
    }

    const data = await response.json()

    if (data?.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to post comment.')
      throw new Error(errorMessage)
    }

    // Unwrap up to 3 levels of { status, data } envelope to reach the comment object
    let comment = data
    for (let i = 0; i < 3; i++) {
      if (comment && typeof comment === 'object' && 'data' in comment && comment.data !== null && typeof comment.data === 'object' && ('uuid' in comment.data || 'id' in comment.data || 'content' in comment.data)) {
        comment = comment.data
        break
      } else if (comment && typeof comment === 'object' && 'data' in comment) {
        comment = comment.data
      } else {
        break
      }
    }
    return comment
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to post comment.')
  }
}
