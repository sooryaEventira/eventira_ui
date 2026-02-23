import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'

export interface ExhibitorData {
  id?: string
  uuid?: string
  name?: string
  company_name?: string
  website?: string
  linkedin?: string
  description?: string
  logo?: string
  logo_url?: string
  logo_link?: string
  stall_number?: string
  stallNumber?: string
  [key: string]: any
}

export interface CreateExhibitorPayload {
  name: string
  website?: string
  linkedin?: string
  description?: string
  logo_link?: string
  stall_number?: string
  // allow extra keys without breaking callers
  [key: string]: any
}

const getAuthHeaders = () => {
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

  return {
    accessToken,
    organizationUuid
  }
}

export const fetchExhibitors = async (eventUuid: string): Promise<ExhibitorData[]> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const { accessToken, organizationUuid } = getAuthHeaders()
    const url = API_ENDPOINTS.EXHIBITORS.LIST(eventUuid)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include'
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
        // keep as text
      }
      const errorMessage = handleApiError(
        errorData ?? responseText ?? null,
        response,
        'Failed to fetch organizations. Please try again.'
      )
      throw new Error(errorMessage)
    }

    let data: any
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data?.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch organizations. Please try again.')
      throw new Error(errorMessage)
    }

    const payload = data?.data ?? data?.results ?? data
    if (Array.isArray(payload)) return payload as ExhibitorData[]
    if (payload && typeof payload === 'object' && Array.isArray(payload.results)) {
      return payload.results as ExhibitorData[]
    }

    return []
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch organizations. Please try again.')
  }
}

export const createExhibitor = async (
  eventUuid: string,
  payload: CreateExhibitorPayload
): Promise<ExhibitorData> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }
    if (!payload?.name || !String(payload.name).trim()) {
      const errorMessage = handleApiError('Name is required.', undefined, 'Name is required.')
      throw new Error(errorMessage)
    }

    const { accessToken, organizationUuid } = getAuthHeaders()
    // Backend expects POST to: exhibitors/?event_uuid=...
    const url = API_ENDPOINTS.EXHIBITORS.LIST(eventUuid)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify(payload)
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
        // keep as text
      }
      const errorMessage = handleApiError(
        errorData ?? responseText ?? null,
        response,
        'Failed to create organization. Please try again.'
      )
      throw new Error(errorMessage)
    }

    const responseText = await response.text()
    if (!responseText || !responseText.trim()) {
      return { name: payload.name } as ExhibitorData
    }
    let data: any
    try {
      data = JSON.parse(responseText)
    } catch {
      return { name: payload.name, message: responseText } as ExhibitorData
    }

    if (data?.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to create organization. Please try again.')
      throw new Error(errorMessage)
    }

    return (data?.data ?? data) as ExhibitorData
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to create organization. Please try again.')
  }
}

/** Update exhibitor. PATCH {{admin_url}}exhibitors/{{exhibitor_uuid}}/?event_id={{event_uuid}} */
export const updateExhibitor = async (
  eventUuid: string,
  exhibitorUuid: string,
  payload: CreateExhibitorPayload
): Promise<ExhibitorData> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }
    if (!exhibitorUuid) {
      const errorMessage = handleApiError('Exhibitor UUID is required.', undefined, 'Exhibitor UUID is required.')
      throw new Error(errorMessage)
    }
    if (!payload?.name || !String(payload.name).trim()) {
      const errorMessage = handleApiError('Name is required.', undefined, 'Name is required.')
      throw new Error(errorMessage)
    }

    const { accessToken, organizationUuid } = getAuthHeaders()
    const url = API_ENDPOINTS.EXHIBITORS.UPDATE(exhibitorUuid, eventUuid)

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify(payload)
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
        // keep as text
      }
      const errorMessage = handleApiError(
        errorData ?? responseText ?? null,
        response,
        'Failed to update organization. Please try again.'
      )
      throw new Error(errorMessage)
    }

    const responseText = await response.text()
    if (!responseText || !responseText.trim()) {
      return { ...payload, uuid: exhibitorUuid } as ExhibitorData
    }
    let data: any
    try {
      data = JSON.parse(responseText)
    } catch {
      return { ...payload, uuid: exhibitorUuid, message: responseText } as ExhibitorData
    }

    if (data?.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to update organization. Please try again.')
      throw new Error(errorMessage)
    }

    return (data?.data ?? data ?? { ...payload, uuid: exhibitorUuid }) as ExhibitorData
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to update organization. Please try again.')
  }
}

export const deleteExhibitor = async (exhibitorUuid: string): Promise<void> => {
  try {
    if (!exhibitorUuid) {
      const errorMessage = handleApiError('Exhibitor UUID is required.', undefined, 'Exhibitor UUID is required.')
      throw new Error(errorMessage)
    }

    const { accessToken, organizationUuid } = getAuthHeaders()
    const url = API_ENDPOINTS.EXHIBITORS.DELETE(exhibitorUuid)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include'
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
        // keep as text
      }
      const errorMessage = handleApiError(
        errorData ?? responseText ?? null,
        response,
        'Failed to delete organization. Please try again.'
      )
      throw new Error(errorMessage)
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to delete organization. Please try again.')
  }
}

export const importExhibitors = async (file: File, eventUuid: string): Promise<any> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }
    if (!file) {
      const errorMessage = handleApiError('File is required.', undefined, 'File is required.')
      throw new Error(errorMessage)
    }

    const { accessToken, organizationUuid } = getAuthHeaders()
    const url = API_ENDPOINTS.EXHIBITORS.IMPORT(eventUuid)

    const formData = new FormData()
    formData.append('file', file)
    // Some backends also accept event_uuid in form body; safe to include.
    formData.append('event_uuid', eventUuid)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: formData
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
        // keep as text
      }
      const errorMessage = handleApiError(
        errorData ?? responseText ?? null,
        response,
        'Failed to upload organizations. Please try again.'
      )
      throw new Error(errorMessage)
    }

    // Response can be JSON or empty
    const text = await response.text()
    if (!text || !text.trim()) return { status: 'success' }
    try {
      return JSON.parse(text)
    } catch {
      return { status: 'success', message: text }
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to upload organizations. Please try again.')
  }
}

