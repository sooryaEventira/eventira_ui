import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'
import type { ApiResponse } from './authService'

export interface CreateWebpageRequest {
  event_uuid: string
  // Some backend serializers require event_id in the payload (even if event_id is in query params).
  // We'll send both for compatibility.
  event_id?: string
  name: string
  content: {
    [key: string]: {
      title: string
      slug: string
      data: {
        [slug: string]: {
          root: {
            props: any
          }
          content: any[]
          zones: any
        }
      }
    }
  }
}

export interface CreateWebpageResponseData {
  uuid: string
  event: string
  name: string
  slug: string
  content: any
  created_by: number
  updated_by: number
  created_date: string
  updated_date: string
}

export interface WebpageData {
  uuid: string
  event: string
  name: string
  slug: string
  content: any
  created_by: number
  updated_by: number
  created_date: string
  updated_date: string
}

export interface NavContentItem {
  uuid: string
  title: string
  slug?: string
}

export interface NavigationContentData {
  pages: NavContentItem[]
  participant_groups: NavContentItem[]
  schedules: NavContentItem[]
}

export interface WebsiteIndexTag {
  uuid: string
  name: string
}

export interface WebsiteIndexData {
  webpages: WebpageData[]
  speaker_tags?: WebsiteIndexTag[]
  attendee_tags?: WebsiteIndexTag[]
  /** Optional navigation tree from index API (public or admin). */
  navigation?: any[]
}

export interface WebsitePageConfigItem {
  uuid: string
  item_type: 'page' | 'participant_group' | 'schedule' | string
  resource_uuid: string
  resource_title: string
  title?: string
  icon?: string
  desktop_container_max_width?: number
  desktop_container_unit?: string
  browser?: 'in_app' | 'in_browser' | string
  feature_permission?: 'everyone' | 'logged_in' | 'guests' | 'certain_groups' | string
  visibility?: 'show' | 'show_without_access' | 'hide' | string
  hide_on_mobile?: boolean
  show_in_mobile_menu_without_access?: boolean
  is_desktop_home?: boolean
  is_mobile_home?: boolean
}

export const createOrUpdateWebpage = async (
  webpageUuid: string | null,
  eventUuid: string,
  request: CreateWebpageRequest
): Promise<CreateWebpageResponseData | WebpageData> => {
  if (webpageUuid) {
    // Update existing webpage
    return await updateWebpage(webpageUuid, eventUuid, request)
  } else {
    // Create new webpage
    return await createWebpage(request)
  }
}

export const createWebpage = async (request: CreateWebpageRequest): Promise<CreateWebpageResponseData> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }

    const eventUuid = String(request?.event_uuid || '').trim()
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBPAGE.CREATE(eventUuid)
    const payload: CreateWebpageRequest = {
      ...request,
      // Ensure event_id is present for backends that validate it.
      event_id: (request as any).event_id ?? eventUuid,
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      try {
        const responseText = await response.text()
        let errorData: any = null
        
        try {
          errorData = responseText ? JSON.parse(responseText) : null
        } catch (jsonError) {
          if (responseText && responseText.trim()) {
            const errorMessage = handleApiError(responseText.trim(), response, 'An error occurred. Please try again.')
            throw new Error(errorMessage)
          }
        }
        
        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'An error occurred. Please try again.')
          throw new Error(errorMessage)
        }
        
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && (
            parseError.message.includes('An error occurred') ||
            parseError.message.includes('Cannot connect') ||
            parseError.message.includes('Failed to')
        )) {
          throw parseError
        }
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: ApiResponse<CreateWebpageResponseData>
    try {
      data = await response.json()
    } catch (parseError) {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to create webpage. Please try again.')
      throw new Error(errorMessage)
    }

    // Success toast is handled by the calling UI (avoid duplicate toasts).

    if (!data.data) {
      throw new Error('No data returned from server')
    }

    return data.data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('No data returned') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create webpage. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to create webpage. Please try again.')
    throw new Error(errorMessage)
  }
}

export const fetchWebpages = async (eventUuid: string): Promise<WebpageData[]> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBSITE.NAVIGATION_CONTENT(eventUuid)
    
    const response = await fetch(url, {
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

      try {
        const responseText = await response.text()
        let errorData: any = null
        
        try {
          errorData = responseText ? JSON.parse(responseText) : null
        } catch (jsonError) {
          if (responseText && responseText.trim()) {
            const errorMessage = handleApiError(responseText.trim(), response, 'An error occurred. Please try again.')
            throw new Error(errorMessage)
          }
        }
        
        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'An error occurred. Please try again.')
          throw new Error(errorMessage)
        }
        
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && (
            parseError.message.includes('An error occurred') ||
            parseError.message.includes('Cannot connect') ||
            parseError.message.includes('Failed to')
        )) {
          throw parseError
        }
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: any
    try {
      const responseText = await response.text()
      
      if (!responseText || responseText.trim() === '') {
        return []
      }
      
      data = JSON.parse(responseText)
    } catch (parseError) {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    // Handle ApiResponse format (with status field)
    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch webpages. Please try again.')
      throw new Error(errorMessage)
    }

    // Extract data from various possible response structures
    let responseData: any = null

    // navigation/content response: { status: 'success', data: { pages: [...], ... } }
    if (data.status === 'success' && data.data?.pages && Array.isArray(data.data.pages)) {
      responseData = data.data.pages
    }
    // Direct array response
    else if (Array.isArray(data)) {
      responseData = data
    }
    // { data: [...] }
    else if (data.data && Array.isArray(data.data)) {
      responseData = data.data
    }
    // { status: 'success', data: [...] }
    else if (data.status === 'success' && Array.isArray(data.data)) {
      responseData = data.data
    }
    // { results: [...] }
    else if (data.results && Array.isArray(data.results)) {
      responseData = data.results
    }
    else {
      return []
    }

    // Normalise: API returns `title` instead of `name` for navigation/content pages
    const webpages: WebpageData[] = (responseData as any[]).map((p: any) => ({
      uuid: p.uuid ?? p.id ?? '',
      event: p.event ?? '',
      name: p.name ?? p.title ?? '',
      slug: p.slug ?? '',
      content: p.content ?? null,
      created_by: p.created_by ?? 0,
      updated_by: p.updated_by ?? 0,
      created_date: p.created_date ?? '',
      updated_date: p.updated_date ?? '',
    }))

    return webpages
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch webpages. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to fetch webpages. Please try again.')
    throw new Error(errorMessage)
  }
}

export const fetchNavigationContent = async (eventUuid: string): Promise<NavigationContentData> => {
  const empty: NavigationContentData = { pages: [], participant_groups: [], schedules: [] }
  if (!eventUuid) return empty
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken || !organizationUuid) return empty

  const url = API_ENDPOINTS.WEBSITE.NAVIGATION_CONTENT(eventUuid)
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Organization': organizationUuid },
    credentials: 'include',
  })
  if (!response.ok) {
    console.warn('[fetchNavigationContent] Response not OK:', response.status)
    return empty
  }
  try {
    const data = await response.json()
    console.log('[fetchNavigationContent] Raw response:', JSON.stringify(data).substring(0, 800))
    const d = data?.data ?? data
    const result = {
      pages: Array.isArray(d?.pages) ? d.pages : [],
      participant_groups: Array.isArray(d?.participant_groups) ? d.participant_groups : [],
      schedules: Array.isArray(d?.schedules) ? d.schedules : [],
    }
    console.log('[fetchNavigationContent] Parsed:', result.pages.length, 'pages,', result.participant_groups.length, 'groups,', result.schedules.length, 'schedules')
    return result
  } catch (e) {
    console.error('[fetchNavigationContent] Parse error:', e)
    return empty
  }
}

export const fetchWebsitePageConfigs = async (eventUuid: string): Promise<WebsitePageConfigItem[]> => {
  if (!eventUuid) return []
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken || !organizationUuid) return []

  const url = API_ENDPOINTS.WEBSITE.PAGE_CONFIGS(eventUuid)
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
    console.warn('[fetchWebsitePageConfigs] Response not OK:', response.status)
    return []
  }

  try {
    const data = await response.json()
    const rows = data?.data ?? data
    return Array.isArray(rows) ? rows as WebsitePageConfigItem[] : []
  } catch (e) {
    console.error('[fetchWebsitePageConfigs] Parse error:', e)
    return []
  }
}

/**
 * Fetch event website index (webpages + tags for navigation).
 * Endpoint: {{url}}{{admin_url}}website/index/?event_id={{event_uuid}}
 */
export const fetchWebsiteIndex = async (eventUuid: string): Promise<WebsiteIndexData> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }
    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBSITE.INDEX(eventUuid)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    })

    if (!response?.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }
      const responseText = await response.text()
      let errorData: any = null
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch {
        if (responseText?.trim()) {
          throw new Error(handleApiError(responseText.trim(), response, 'Failed to fetch website index. Please try again.'))
        }
      }
      throw new Error(handleApiError(errorData ?? null, response, 'Failed to fetch website index. Please try again.'))
    }

    const responseText = await response.text()
    if (!responseText?.trim()) {
      return { webpages: [], speaker_tags: [], attendee_tags: [] }
    }
    const data = JSON.parse(responseText)

    if (data?.status === 'error') {
      throw new Error(handleApiError(data, undefined, 'Failed to fetch website index. Please try again.'))
    }

    const raw = data?.data ?? data
    const webpages = Array.isArray(raw?.webpages) ? raw.webpages : []
    const speaker_tags = Array.isArray(raw?.speaker_tags) ? raw.speaker_tags : []
    const attendee_tags = Array.isArray(raw?.attendee_tags) ? raw.attendee_tags : []
    const navigation = Array.isArray(raw?.navigation) ? raw.navigation : undefined
    const result: WebsiteIndexData = { webpages, speaker_tags, attendee_tags, navigation }
    console.log('Website index API response:', { raw: data, parsed: result })
    return result
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) handleNetworkError(error)
      throw new Error(error.message || 'Network error occurred')
    }
    if (error instanceof Error && (
      error.message.includes('Cannot connect') ||
      error.message.includes('Invalid response') ||
      error.message.includes('Authentication required') ||
      error.message.includes('Organization UUID') ||
      error.message.includes('Event UUID') ||
      error.message.includes('Failed to')
    )) {
      throw error
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch website index. Please try again.'
    handleApiError(msg, undefined, 'Failed to fetch website index. Please try again.')
    throw new Error(msg)
  }
}

/**
 * Fetch website index for the published site (no auth).
 * Endpoint: {{url}}{{public_url}}events/{{event_uuid}}/index/
 */
export async function fetchPublicWebsiteIndex(eventUuid: string): Promise<WebsiteIndexData> {
  if (!eventUuid) return { webpages: [], speaker_tags: [], attendee_tags: [] }
  const url = API_ENDPOINTS.PUBLIC.INDEX(eventUuid)
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  if (!response.ok) return { webpages: [], speaker_tags: [], attendee_tags: [], navigation: undefined }
  const text = await response.text()
  if (!text?.trim()) return { webpages: [], speaker_tags: [], attendee_tags: [], navigation: undefined }
  try {
    const data = JSON.parse(text)
    if (data?.status === 'error') return { webpages: [], speaker_tags: [], attendee_tags: [], navigation: undefined }
    const raw = data?.data ?? data
    const webpages = Array.isArray(raw?.webpages) ? raw.webpages : []
    const speaker_tags = Array.isArray(raw?.speaker_tags) ? raw.speaker_tags : []
    const attendee_tags = Array.isArray(raw?.attendee_tags) ? raw.attendee_tags : []
    const navigation = Array.isArray(raw?.navigation) ? raw.navigation : undefined
    return { webpages, speaker_tags, attendee_tags, navigation }
  } catch {
    return { webpages: [], speaker_tags: [], attendee_tags: [], navigation: undefined }
  }
}

/** Return set of tag UUIDs that have a published group page (for Build page checkbox state). Listing from API only. */
export async function fetchPublishedTagIds(eventUuid: string): Promise<Set<string>> {
  try {
    const index = await fetchWebsiteIndex(eventUuid)
    const ids: string[] = []
    for (const t of index.speaker_tags ?? []) {
      if (t?.uuid) ids.push(t.uuid)
    }
    for (const t of index.attendee_tags ?? []) {
      if (t?.uuid) ids.push(t.uuid)
    }
    return new Set(ids)
  } catch {
    return new Set()
  }
}

/** Published speaker tag UUIDs only (for Speaker management Build page checkbox). */
export async function fetchPublishedSpeakerTagIds(eventUuid: string): Promise<Set<string>> {
  try {
    const index = await fetchWebsiteIndex(eventUuid)
    const ids = (index.speaker_tags ?? []).map((t) => t?.uuid).filter(Boolean) as string[]
    return new Set(ids)
  } catch {
    return new Set()
  }
}

/** Published attendee tag UUIDs only (for Attendee/Organization management Build page checkbox). */
export async function fetchPublishedAttendeeTagIds(eventUuid: string): Promise<Set<string>> {
  try {
    const index = await fetchWebsiteIndex(eventUuid)
    const ids = (index.attendee_tags ?? []).map((t) => t?.uuid).filter(Boolean) as string[]
    return new Set(ids)
  } catch {
    return new Set()
  }
}

export const updateWebpage = async (
  webpageUuid: string,
  eventUuid: string,
  request: CreateWebpageRequest
): Promise<WebpageData> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }

    if (!webpageUuid) {
      const errorMessage = handleApiError('Webpage UUID is required.', undefined, 'Webpage UUID is required.')
      throw new Error(errorMessage)
    }

    // Use PATCH method for updating existing webpage
    // URL format: {{admin_url}}webpages/{{webpage_uuid}}/
    const url = API_ENDPOINTS.WEBPAGE.UPDATE(webpageUuid)
    
    const payload: CreateWebpageRequest = {
      ...request,
      // Ensure event_id is present for backends that validate it.
      event_id: (request as any).event_id ?? eventUuid,
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      try {
        const responseText = await response.text()
        let errorData: any = null
        
        try {
          errorData = responseText ? JSON.parse(responseText) : null
        } catch (jsonError) {
          if (responseText && responseText.trim()) {
            const errorMessage = handleApiError(responseText.trim(), response, 'An error occurred. Please try again.')
            throw new Error(errorMessage)
          }
        }
        
        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'An error occurred. Please try again.')
          throw new Error(errorMessage)
        }
        
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && (
            parseError.message.includes('An error occurred') ||
            parseError.message.includes('Cannot connect') ||
            parseError.message.includes('Failed to')
        )) {
          throw parseError
        }
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: ApiResponse<WebpageData>
    try {
      data = await response.json()
    } catch (parseError) {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to update webpage. Please try again.')
      throw new Error(errorMessage)
    }

    // Success toast is handled by the calling UI (avoid duplicate toasts).

    if (!data.data) {
      throw new Error('No data returned from server')
    }

    return data.data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('Webpage UUID') ||
        error.message.includes('No data returned') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to update webpage. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to update webpage. Please try again.')
    throw new Error(errorMessage)
  }
}

export const deleteWebpage = async (webpageUuid: string, eventUuid: string): Promise<void> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }

    if (!webpageUuid) {
      const errorMessage = handleApiError('Webpage UUID is required.', undefined, 'Webpage UUID is required.')
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBPAGE.DELETE(webpageUuid, eventUuid)
    const response = await fetch(url, {
      method: 'DELETE',
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

      // Some backends return 204 No Content on delete; ok is already true.
      // For error responses, try to parse message.
      try {
        const responseText = await response.text()
        let errorData: any = null
        try {
          errorData = responseText ? JSON.parse(responseText) : null
        } catch {
          if (responseText && responseText.trim()) {
            const errorMessage = handleApiError(responseText.trim(), response, 'Failed to delete webpage. Please try again.')
            throw new Error(errorMessage)
          }
        }
        const errorMessage = handleApiError(errorData, response, 'Failed to delete webpage. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error) throw parseError
        const errorMessage = handleApiError(null, response, 'Failed to delete webpage. Please try again.')
        throw new Error(errorMessage)
      }
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('Webpage UUID') ||
        error.message.includes('Failed to delete')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete webpage. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to delete webpage. Please try again.')
    throw new Error(errorMessage)
  }
}

export const fetchWebpage = async (webpageUuid: string, eventUuid: string): Promise<WebpageData> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError('Organization UUID is missing. Please create or select an organization first.', undefined, 'Organization UUID is missing. Please create or select an organization first.')
      throw new Error(errorMessage)
    }

    if (!webpageUuid) {
      const errorMessage = handleApiError('Webpage UUID is required.', undefined, 'Webpage UUID is required.')
      throw new Error(errorMessage)
    }

    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBPAGE.GET(webpageUuid, eventUuid)
    
    const response = await fetch(url, {
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

      try {
        const responseText = await response.text()
        let errorData: any = null
        
        try {
          errorData = responseText ? JSON.parse(responseText) : null
        } catch (jsonError) {
          if (responseText && responseText.trim()) {
            const errorMessage = handleApiError(responseText.trim(), response, 'An error occurred. Please try again.')
            throw new Error(errorMessage)
          }
        }
        
        if (errorData) {
          const errorMessage = handleApiError(errorData, response, 'An error occurred. Please try again.')
          throw new Error(errorMessage)
        }
        
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && (
            parseError.message.includes('An error occurred') ||
            parseError.message.includes('Cannot connect') ||
            parseError.message.includes('Failed to')
        )) {
          throw parseError
        }
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: any
    try {
      const responseText = await response.text()
      
      if (!responseText || responseText.trim() === '') {
        const errorMessage = handleParseError('Empty response from server. Please try again.')
        throw new Error(errorMessage)
      }
      
      data = JSON.parse(responseText)
    } catch (parseError) {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    // Handle ApiResponse format (with status field)
    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch webpage. Please try again.')
      throw new Error(errorMessage)
    }

    // Extract data from various possible response structures
    let webpageData: WebpageData | null = null
    
    // Case 1: ApiResponse format with data field
    if (data.status === 'success' && data.data) {
      webpageData = data.data
    }
    // Case 2: Direct object response
    else if (data && typeof data === 'object' && data.uuid) {
      webpageData = data
    }
    // Case 3: Object with data field (no status)
    else if (data.data && typeof data.data === 'object' && data.data.uuid) {
      webpageData = data.data
    }
    // Case 4: Empty or null
    else {
      const errorMessage = handleParseError('No webpage data found in response. Please try again.')
      throw new Error(errorMessage)
    }

    if (!webpageData) {
      const errorMessage = handleParseError('Invalid webpage data received from server. Please try again.')
      throw new Error(errorMessage)
    }

    return webpageData
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Authentication required') ||
        error.message.includes('Organization UUID') ||
        error.message.includes('Event UUID') ||
        error.message.includes('Webpage UUID') ||
        error.message.includes('No webpage data') ||
        error.message.includes('Invalid webpage data') ||
        error.message.includes('Empty response') ||
        error.message.includes('Failed to')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch webpage. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to fetch webpage. Please try again.')
    throw new Error(errorMessage)
  }
}
