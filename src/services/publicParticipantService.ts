import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'

const pubAuthHeaders = (): Record<string, string> => {
  const t = localStorage.getItem('pub_accessToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export interface PublicParticipantData {
  id?: string | number
  uuid?: string
  name?: string
  first_name?: string
  last_name?: string
  role?: 'speaker' | 'attendee'
  post?: string
  designation?: string
  organization?: string
  institute?: string
  bio?: string
  description?: string
  avatar_url?: string
  avatarUrl?: string
  [key: string]: any
}

const parseListResponse = (data: any): PublicParticipantData[] => {
  const raw = data?.data ?? data?.results ?? data
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object' && Array.isArray(raw.results)) return raw.results
  return []
}

const handleFetchError = async (response: Response, fallback: string): Promise<never> => {
  let errorData: any = null
  try {
    const text = await response.text()
    errorData = text ? JSON.parse(text) : null
  } catch { /* ignore */ }
  throw new Error(handleApiError(errorData, response, fallback))
}

export interface PublicParticipantsPage {
  items: PublicParticipantData[]
  count: number
  totalPages: number
}

/** Fetch a page of public participants for an event */
export const fetchPublicParticipants = async (
  eventUuid: string,
  tagId?: string,
  page = 1,
  pageSize = 10
): Promise<PublicParticipantsPage> => {
  try {
    if (!eventUuid) throw new Error('Event UUID is required.')

    const base = tagId
      ? API_ENDPOINTS.PUBLIC.PARTICIPANTS.LIST_BY_TAG(eventUuid, tagId)
      : API_ENDPOINTS.PUBLIC.PARTICIPANTS.LIST(eventUuid)

    const separator = base.includes('?') ? '&' : '?'
    const url = `${base}${separator}page=${page}&page_size=${pageSize}`

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
    })

    if (!response.ok) await handleFetchError(response, 'Failed to fetch participants.')

    let data: any
    try { data = await response.json() } catch {
      throw new Error(handleParseError('Invalid response from server.'))
    }

    if (data?.status === 'error') throw new Error(handleApiError(data, undefined, 'Failed to fetch participants.'))

    const items = parseListResponse(data)
    const count: number = typeof data?.count === 'number' ? data.count : items.length
    const totalPages = Math.max(1, Math.ceil(count / pageSize))
    return { items, count, totalPages }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) handleNetworkError(error)
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch participants.')
  }
}

/** Fetch a single participant's public detail */
export const fetchPublicParticipant = async (
  eventUuid: string,
  participantUuid: string
): Promise<PublicParticipantData | null> => {
  try {
    if (!eventUuid) throw new Error('Event UUID is required.')
    if (!participantUuid) throw new Error('Participant UUID is required.')

    const url = API_ENDPOINTS.PUBLIC.PARTICIPANTS.GET(participantUuid, eventUuid)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
    })

    if (!response.ok) await handleFetchError(response, 'Failed to fetch participant.')

    let data: any
    try { data = await response.json() } catch {
      throw new Error(handleParseError('Invalid response from server.'))
    }

    if (data?.status === 'error') throw new Error(handleApiError(data, undefined, 'Failed to fetch participant.'))

    return (data?.data ?? data) as PublicParticipantData ?? null
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) handleNetworkError(error)
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch participant.')
  }
}
