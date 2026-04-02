import { API_ENDPOINTS } from '../config/env'
import { handleApiError } from '../utils/errorHandler'
import { showToast } from '../utils/toast'
import { fetchWebsiteIndex } from './webpageService'

/** API response for event-tags set-published (data may or may not include slug depending on backend). */
export interface SetTagPublishedResponse {
  status?: string
  message?: string
  data?: {
    uuid: string
    name: string
    is_published: boolean
    slug?: string | null
  }
}

/**
 * Update a tag (group) name by UUID.
 * PATCH {{admin_url}}tags/{{tag_uuid}}/update/?event_id={{event_uuid}}
 */
export async function updateTag(tagUuid: string, eventUuid: string, name: string): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) throw new Error('Authentication required.')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')

  const url = API_ENDPOINTS.TAGS.UPDATE(tagUuid, eventUuid)
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errData: any = null
    try { errData = text ? JSON.parse(text) : null } catch { /* ignore */ }
    throw new Error(handleApiError(errData ?? text, response, 'Failed to update group name.'))
  }
}

/**
 * Delete a tag (group) by UUID.
 * DELETE {{admin_url}}tags/{{tag_uuid}}/delete/?event_id={{event_uuid}}
 */
export async function deleteTag(tagUuid: string, eventUuid: string): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) throw new Error('Authentication required.')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) throw new Error('Organization UUID is missing.')

  const url = API_ENDPOINTS.TAGS.DELETE(tagUuid, eventUuid)
  console.log('[deleteTag] DELETE', url)
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errData: any = null
    try { errData = text ? JSON.parse(text) : null } catch { /* ignore */ }
    console.log('[deleteTag] 404 response body:', text)
    throw new Error(handleApiError(errData ?? text, response, 'Failed to delete group.'))
  }
}

/**
 * Call event-tags set-published API so the group page displays in navigation.
 * Used for both speaker and attendee tags (single endpoint).
 * Response shape: { status, message, data: { uuid, name, is_published [, slug] } }.
 */
export async function setTagPublished(tagUuid: string, eventUuid: string): Promise<SetTagPublishedResponse | null> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    const msg = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required.')
    throw new Error(msg)
  }
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) {
    const msg = handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.')
    throw new Error(msg)
  }
  if (!tagUuid || !eventUuid) {
    throw new Error('Tag UUID and Event UUID are required.')
  }

  const url = API_ENDPOINTS.EVENT_TAGS.SET_PUBLISHED(tagUuid, eventUuid)
  if (import.meta.env.DEV) {
    console.log('Publishing single tag (event-tags):', { tagUuid, eventUuid })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify({ is_published: true }),
  })

  const responseText = await response.text()
  if (!response.ok) {
    let errorData: unknown = null
    try {
      errorData = responseText ? JSON.parse(responseText) : null
    } catch {
      if (responseText?.trim()) throw new Error(handleApiError(responseText.trim(), response, 'Failed to publish group page.'))
    }
    throw new Error(handleApiError(errorData ?? null, response, 'Failed to publish group page.'))
  }

  let responseData: SetTagPublishedResponse | null = null
  try {
    responseData = responseText ? (JSON.parse(responseText) as SetTagPublishedResponse) : null
    if (import.meta.env.DEV) {
      console.log('Publish tag API response:', responseData)
    }
  } catch {
    if (import.meta.env.DEV) {
      console.log('Publish tag API response (raw):', responseText)
    }
  }

  // Immediately call list index so the published tag appears in the nav index
  try {
    await fetchWebsiteIndex(eventUuid)
  } catch {
    // Non-blocking; nav will refresh when user opens Event website > Navigation
  }
  showToast.success('Group page will appear in navigation')
  window.dispatchEvent(new CustomEvent('webpage-saved', { detail: { eventUuid } }))
  return responseData
}

/**
 * Call event-tags set-unpublished API so the group page is removed from navigation.
 * Uses the same set-published endpoint with is_published: false when SET_UNPUBLISHED returns 404 (backend may only expose one endpoint).
 */
export async function setTagUnpublished(tagUuid: string, eventUuid: string): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    const msg = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required.')
    throw new Error(msg)
  }
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) {
    const msg = handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.')
    throw new Error(msg)
  }
  if (!tagUuid || !eventUuid) {
    throw new Error('Tag UUID and Event UUID are required.')
  }

  const url = API_ENDPOINTS.EVENT_TAGS.SET_PUBLISHED(tagUuid, eventUuid)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify({ is_published: false }),
  })

  if (!response.ok) {
    const responseText = await response.text()
    let errorData: unknown = null
    try {
      errorData = responseText ? JSON.parse(responseText) : null
    } catch {
      if (responseText?.trim()) throw new Error(handleApiError(responseText.trim(), response, 'Failed to unpublish group page.'))
    }
    throw new Error(handleApiError(errorData ?? null, response, 'Failed to unpublish group page.'))
  }

  // Immediately call list index so the nav index no longer lists the unpublished tag
  try {
    await fetchWebsiteIndex(eventUuid)
  } catch {
    // Non-blocking
  }
  showToast.success('Group page removed from navigation')
  window.dispatchEvent(new CustomEvent('webpage-saved', { detail: { eventUuid } }))
}
