import { API_ENDPOINTS } from '../config/env'

export interface ProfileEvent {
  uuid: string
  title: string
  start_date: string
  end_date: string
}

export interface UserProfile {
  uuid: string
  email: string
  first_name: string
  last_name: string
  profile_pic: string | null
  access_level: string
  events: ProfileEvent[]
}

export interface UpdateProfilePayload {
  first_name?: string
  last_name?: string
  profile_pic?: File | null
}

export const fetchUserProfile = async (): Promise<UserProfile> => {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    throw new Error('Authentication required. Please login again.')
  }

  const organizationUuid = localStorage.getItem('organizationUuid') || ''

  const response = await fetch(API_ENDPOINTS.USER_PROFILE, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch profile (${response.status})`)
  }

  const json = await response.json()
  const data = json?.data ?? json

  return {
    uuid: data.uuid ?? data.user_uuid ?? '',
    email: data.email ?? '',
    first_name: data.first_name ?? '',
    last_name: data.last_name ?? '',
    profile_pic: data.profile_pic ?? null,
    access_level: data.access_level ?? '',
    events: Array.isArray(data.events) ? data.events : [],
  }
}

export const updateUserProfile = async (
  payload: UpdateProfilePayload
): Promise<UserProfile> => {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    throw new Error('Authentication required. Please login again.')
  }

  const organizationUuid = localStorage.getItem('organizationUuid') || ''

  const formData = new FormData()
  if (payload.first_name !== undefined) formData.append('first_name', payload.first_name)
  if (payload.last_name !== undefined) formData.append('last_name', payload.last_name)
  if (payload.profile_pic) formData.append('profile_pic', payload.profile_pic)

  const response = await fetch(API_ENDPOINTS.USER_PROFILE, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Failed to update profile (${response.status})`)
  }

  const json = await response.json()
  const data = json?.data ?? json

  return {
    uuid: data.uuid ?? data.user_uuid ?? '',
    email: data.email ?? '',
    first_name: data.first_name ?? '',
    last_name: data.last_name ?? '',
    profile_pic: data.profile_pic ?? null,
    access_level: data.access_level ?? '',
    events: Array.isArray(data.events) ? data.events : [],
  }
}
