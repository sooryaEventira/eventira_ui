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

/** localStorage key for website settings, scoped by event so switching events does not show old data. */
export function getWebsiteSettingsStorageKey(eventUuid: string | null | undefined): string {
  return eventUuid ? `event-website-settings-api-${eventUuid}` : 'event-website-settings-api'
}

const BRANDING_STORAGE_PREFIX = 'event-website-branding'

/** localStorage key for branding (fonts, primary color), scoped by event. */
export function getBrandingStorageKey(eventUuid: string | null | undefined): string {
  return eventUuid ? `${BRANDING_STORAGE_PREFIX}-${eventUuid}` : BRANDING_STORAGE_PREFIX
}

/** Build full WebsiteSettingsBody from localStorage (branding + settings keys) for API calls. */
export function buildWebsiteSettingsBodyFromStorage(eventUuid: string | null | undefined): WebsiteSettingsBody {
  if (typeof window === 'undefined') {
    return {
      heading_font: 'Inter',
      body_font: 'Inter',
      brand_primary_color: '#6366f1',
      visibility: 'private',
      require_registration: true,
      domain_url: '',
    }
  }
  const settingsKey = getWebsiteSettingsStorageKey(eventUuid)
  const brandingKey = getBrandingStorageKey(eventUuid)
  const storedSettings = localStorage.getItem(settingsKey)
  const storedBranding = localStorage.getItem(brandingKey)
  const settings = storedSettings ? (() => { try { return JSON.parse(storedSettings) } catch { return {} } })() : {}
  const branding = storedBranding ? (() => { try { return JSON.parse(storedBranding) } catch { return {} } })() : {}
  return {
    heading_font: branding.headingFont ?? 'Inter',
    body_font: branding.bodyFont ?? 'Inter',
    brand_primary_color: branding.primaryColor ?? '#6366f1',
    visibility: settings.visibility === 'public' || settings.visibility === 'hidden' ? settings.visibility : 'private',
    require_registration: settings.require_registration ?? true,
    domain_url: settings.domain_url ?? '',
  }
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
  console.log('[website-settings GET] url:', url, 'payload: (none)')
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })

  const text = await response.text()
  console.log('[website-settings GET] response status:', response.status, 'body:', text || '(empty)')

  if (!response.ok) {
    if (response.status === 404) return null
    return null
  }

  if (!text?.trim()) return null
  try {
    const data = JSON.parse(text)
    const raw = data?.data ?? data
    if (!raw || typeof raw !== 'object') return null
    console.log('[website-settings GET] parsed:', raw)
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

/** Read brand_primary_color from API response (e.g. "brand_primary_color": "#14b8a6"). Supports nested data. */
function parseBrandPrimaryColor(raw: Record<string, unknown>): string | undefined {
  const from =
    raw.brand_primary_color ??
    (raw as any).website_settings?.brand_primary_color ??
    (raw as any).websiteSettings?.brand_primary_color ??
    (raw as any).data?.brand_primary_color
  const s = typeof from === 'string' ? from.trim() : ''
  if (!s) return undefined
  return s.startsWith('#') ? s : `#${s}`
}

/**
 * Fetch website settings for the published site (no auth).
 * Tries public API first; falls back to admin URL in case backend allows unauthenticated GET.
 * Returns brand_primary_color so the saved primary color reflects on the published website.
 */
export async function fetchPublicWebsiteSettings(
  eventUuid: string
): Promise<{ brand_primary_color?: string } | null> {
  if (!eventUuid) return null
  const opts: RequestInit = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  }

  // Try admin URL first (same as PATCH) - backend often allows unauthenticated GET for public events
  const adminUrl = API_ENDPOINTS.WEBSITE.SETTINGS(eventUuid)
  const eventUrl = API_ENDPOINTS.PUBLIC.EVENT.GET(eventUuid)
  const publicBase = eventUrl.slice(0, eventUrl.indexOf('/event/'))
  const publicUrl = `${publicBase}/events/${eventUuid}/website-settings/`

  console.log('[GET website-settings] eventId:', eventUuid, '| will try: 1) admin, 2) public')

  for (const [label, url] of [
    ['admin', adminUrl],
    ['public', publicUrl]
  ] as const) {
    try {
      console.log('[GET website-settings]', label, '→', url)
      const response = await fetch(url, opts)
      const text = await response.text()
      console.log('[GET website-settings]', label, '←', response.status, response.statusText, '| body:', text?.slice(0, 200) || '(empty)')
      if (!response.ok) continue
      if (!text?.trim()) continue
      const data = JSON.parse(text)
      const raw = (data?.data ?? data) as Record<string, unknown>
      if (!raw || typeof raw !== 'object') continue
      let brand_primary_color = parseBrandPrimaryColor(raw)
      if (!brand_primary_color && raw && typeof (raw as any).data === 'object' && (raw as any).data !== null) {
        brand_primary_color = parseBrandPrimaryColor((raw as any).data as Record<string, unknown>)
      }
      if (brand_primary_color) {
        console.log('[GET website-settings]', label, '✓ brand_primary_color:', brand_primary_color)
        return { brand_primary_color }
      }
      return {}
    } catch (e) {
      console.warn('[GET website-settings]', label, 'fetch failed', e)
      continue
    }
  }
  console.warn('[GET website-settings] No brand_primary_color from any URL. Backend must allow unauthenticated GET or include it in public event response.')
  return null
}

/**
 * Create website settings for an event (when none exist yet).
 * POST {{admin_url}}website-settings/?event_id={{event_uuid}}
 */
export async function createWebsiteSettings(
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
  console.log('[website-settings POST] url:', url, 'payload:', body)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  const responseText = await response.text()
  console.log('[website-settings POST] response status:', response.status, 'body:', responseText || '(empty)')
  if (!response.ok) {
    let errorData: unknown = null
    try {
      errorData = responseText ? JSON.parse(responseText) : null
    } catch {
      if (responseText?.trim()) {
        throw new Error(handleApiError(responseText.trim(), response, 'Failed to create website settings.'))
      }
    }
    throw new Error(handleApiError(errorData ?? null, response, 'Failed to create website settings.'))
  }
}

/**
 * Update or create website settings for an event.
 * Uses PATCH when settings exist; uses POST when none exist (404).
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
  console.log('[website-settings PATCH] url:', url, 'payload:', body)
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  const responseText = await response.text()
  console.log('[website-settings PATCH] response status:', response.status, 'body:', responseText || '(empty)')

  if (response.status === 404) {
    await createWebsiteSettings(eventUuid, body)
    // Backend may ignore visibility (and other fields) on POST and default to private. PATCH again to persist.
    const patchAgain = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!patchAgain.ok) {
      const text = await patchAgain.text()
      console.warn('[website-settings] PATCH after POST failed:', patchAgain.status, text)
    }
    return
  }

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
