import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleParseError } from '../utils/errorHandler'

export interface PublicNotificationItem {
  id: string
  title?: string
  message?: string
  body?: string
  is_read?: boolean
  created_at?: string
  [key: string]: any
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('pub_accessToken')
  if (!token) throw new Error('Authentication required.')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

const extractArray = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data?.results)) return payload.data.results
  return []
}

export const registerPublicDeviceToken = async (
  deviceToken: string
): Promise<void> => {
  if (!deviceToken) return
  const authToken = localStorage.getItem('pub_accessToken')
  if (!authToken) throw new Error('Authentication required.')
  const form = new FormData()
  form.append('fcm_token', deviceToken)
  form.append('platform', 'web')
  const response = await fetch(API_ENDPOINTS.PUBLIC.NOTIFICATIONS.DEVICE_REGISTER, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    credentials: 'include',
    body: form,
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }
    throw new Error(handleApiError(data, response, 'Failed to register device for notifications.'))
  }
}

export const fetchPublicNotifications = async (): Promise<PublicNotificationItem[]> => {
  const headers = getAuthHeaders()
  const response = await fetch(API_ENDPOINTS.PUBLIC.NOTIFICATIONS.LIST, {
    method: 'GET',
    headers,
    credentials: 'include',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }
    throw new Error(handleApiError(data, response, 'Failed to fetch notifications.'))
  }
  const payload = await response.json().catch(() => {
    throw new Error(handleParseError('Invalid response from notifications API.'))
  })
  return extractArray(payload).map((item: any, idx: number) => ({
    id: String(item?.id ?? item?.uuid ?? idx),
    ...item,
  }))
}

export const readAllPublicNotifications = async (): Promise<void> => {
  const headers = getAuthHeaders()
  const response = await fetch(API_ENDPOINTS.PUBLIC.NOTIFICATIONS.READ_ALL, {
    method: 'PATCH',
    headers,
    credentials: 'include',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }
    throw new Error(handleApiError(data, response, 'Failed to mark notifications as read.'))
  }
}
