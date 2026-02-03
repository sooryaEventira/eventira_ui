import { API_ENDPOINTS } from '../config/env'
import { handleApiError } from '../utils/errorHandler'

export interface WebsiteSettingsBody {
  heading_font: string
  body_font: string
  brand_primary_color: string
  visibility: 'public' | 'private' | 'hidden'
  require_registration: boolean
  domain_url: string
}

/** Response shape from GET website-settings (same fields as body + any extras from backend). */
export interface WebsiteSettingsData extends WebsiteSettingsBody {
  [key: string]: unknown
}

/**
 * Fetch website settings for an event.
 * GET {{admin_url}}website-settings/?event_id={{event_uuid}}
 */
export async function fetchWebsiteSettings(eventUuid: string): Promise<WebsiteSettingsData | null> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) return null
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) return null
  if (!eventUuid) return null

  const url = API_ENDPOINTS.WEBSITE.SETTINGS(eventUuid)
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
    if (response.status === 404) return null
    return null
  }

  const text = await response.text()
  if (!text?.trim()) return null
  try {
    const data = JSON.parse(text)
    const raw = data?.data ?? data
    if (!raw || typeof raw !== 'object') return null
    return {
      heading_font: String(raw.heading_font ?? 'Inter'),
      body_font: String(raw.body_font ?? 'Inter'),
      brand_primary_color: String(raw.brand_primary_color ?? '#6366f1'),
      visibility: raw.visibility === 'public' || raw.visibility === 'hidden' ? raw.visibility : 'private',
      require_registration: Boolean(raw.require_registration),
      domain_url: String(raw.domain_url ?? ''),
      ...raw,
    } as WebsiteSettingsData
  } catch {
    return null
  }
}

/**
 * Fetch website settings for the published site (no auth).
 * Uses same GET URL; backend must allow unauthenticated read for public display.
 * Returns only brand_primary_color for theme; other fields can be added if needed.
 */
export async function fetchPublicWebsiteSettings(
  eventUuid: string
): Promise<{ brand_primary_color?: string } | null> {
  if (!eventUuid) return null
  const url = API_ENDPOINTS.WEBSITE.SETTINGS(eventUuid)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!response.ok) return null
    const text = await response.text()
    if (!text?.trim()) return null
    const data = JSON.parse(text)
    const raw = data?.data ?? data
    if (!raw || typeof raw !== 'object') return null
    const brand_primary_color =
      typeof raw.brand_primary_color === 'string' && raw.brand_primary_color.trim()
        ? raw.brand_primary_color.trim()
        : undefined
    return brand_primary_color ? { brand_primary_color } : null
  } catch {
    return null
  }
}

/**
 * Update website settings for an event.
 * PUT {{admin_url}}website-settings/?event_id={{event_uuid}}
 */
export async function updateWebsiteSettings(
  eventUuid: string,
  body: WebsiteSettingsBody
): Promise<void> {
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
  if (!eventUuid) {
    throw new Error('Event UUID is required.')
  }

  const url = API_ENDPOINTS.WEBSITE.SETTINGS(eventUuid)
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  const responseText = await response.text()
  if (!response.ok) {
    let errorData: unknown = null
    try {
      errorData = responseText ? JSON.parse(responseText) : null
    } catch {
      if (responseText?.trim()) {
        throw new Error(handleApiError(responseText.trim(), response, 'Failed to save website settings.'))
      }
    }
    throw new Error(handleApiError(errorData ?? null, response, 'Failed to save website settings.'))
  }
}
