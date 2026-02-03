import { API_ENDPOINTS } from '../config/env'
import { handleApiError } from '../utils/errorHandler'
import { showToast } from '../utils/toast'
import { fetchWebsiteIndex } from './webpageService'

/**
 * Call event-tags set-published API so the group page displays in navigation.
 * Used for both speaker and attendee tags (single endpoint).
 */
export async function setTagPublished(tagUuid: string, eventUuid: string): Promise<void> {
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

  try {
    const responseData = responseText ? JSON.parse(responseText) : null
    console.log('Publish tag API response:', responseData)
  } catch {
    console.log('Publish tag API response (raw):', responseText)
  }

  // Immediately call list index so the published tag appears in the nav index
  try {
    await fetchWebsiteIndex(eventUuid)
  } catch {
    // Non-blocking; nav will refresh when user opens Event website > Navigation
  }
  showToast.success('Group page will appear in navigation')
  window.dispatchEvent(new CustomEvent('webpage-saved', { detail: { eventUuid } }))
}

/**
 * Call event-tags set-unpublished API so the group page is removed from navigation.
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

  const url = API_ENDPOINTS.EVENT_TAGS.SET_UNPUBLISHED(tagUuid, eventUuid)
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
