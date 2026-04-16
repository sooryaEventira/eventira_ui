import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'
import type { ApiResponse } from './authService'
import type { NavigationItem } from '../types/navigation'

export interface NavigationApiItem {
  item_type: 'page' | 'folder' | 'participant' | 'schedule'
  uuid: string
  ref_uuid?: string
  webpage_uuid?: string
  title?: string
  slug?: string | null
  name?: string
  order?: number
  icon?: string | null
  items?: NavigationApiItem[] | null
}

export interface NavigationResponseData {
  navigation: NavigationApiItem[]
}

export interface CreateNavigationFolderResponseData {
  uuid: string
  item_type: 'folder'
  name?: string
  title?: string
  order?: number
  items?: NavigationApiItem[] | null
}

export interface AvailableNavigationPage {
  uuid: string
  name: string
  slug: string
  is_added: boolean
}

export interface AvailableNavigationSchedule {
  uuid: string
  title: string
  is_added: boolean
}

export interface AvailableNavigationParticipant {
  uuid: string
  name: string
  is_added: boolean
}

export interface NavigationAvailableResponseData {
  pages: AvailableNavigationPage[]
  schedules: AvailableNavigationSchedule[]
  participants: AvailableNavigationParticipant[]
}

export interface AvailableNavigationItems {
  pages: AvailableNavigationPage[]
  schedules: AvailableNavigationSchedule[]
  participants: AvailableNavigationParticipant[]
}

export async function fetchEventNavigation(eventUuid: string): Promise<NavigationResponseData> {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBSITE.NAVIGATION(eventUuid)
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
      let errorBody: any = null
      try {
        errorBody = await response.json()
      } catch {
        // ignore
      }
      const errorMessage = handleApiError(errorBody, response, `Failed to fetch navigation (HTTP ${response.status})`)
      throw new Error(errorMessage)
    }

    let parsed: ApiResponse<NavigationResponseData> | NavigationResponseData | null = null
    try {
      parsed = (await response.json()) as any
    } catch (e: any) {
      const errorMessage = handleParseError(e)
      throw new Error(errorMessage)
    }

    const data = (parsed as any)?.data ?? parsed
    const navigation = Array.isArray((data as any)?.navigation) ? (data as any).navigation : []
    return { navigation }
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'Failed to fetch navigation.'
    throw new Error(msg)
  }
}

export async function createNavigationFolder(eventUuid: string, name: string): Promise<CreateNavigationFolderResponseData> {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    const folderName = String(name || '').trim()
    if (!folderName) {
      throw new Error('Folder name is required.')
    }

    const url = API_ENDPOINTS.WEBSITE.NAVIGATION_FOLDERS(eventUuid)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify({ name: folderName }),
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }
      let errorBody: any = null
      try {
        errorBody = await response.json()
      } catch {
        // ignore
      }
      const errorMessage = handleApiError(errorBody, response, `Failed to create folder (HTTP ${response.status})`)
      throw new Error(errorMessage)
    }

    let parsed: ApiResponse<CreateNavigationFolderResponseData> | CreateNavigationFolderResponseData | null = null
    try {
      parsed = (await response.json()) as any
    } catch (e: any) {
      const errorMessage = handleParseError(e)
      throw new Error(errorMessage)
    }

    const data = (parsed as any)?.data ?? parsed
    const uuid = String((data as any)?.uuid ?? '').trim()
    if (!uuid) throw new Error('Folder created, but response was missing uuid.')
    return data as CreateNavigationFolderResponseData
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'Failed to create folder.'
    throw new Error(msg)
  }
}

export async function fetchAvailableNavigationPages(eventUuid: string): Promise<AvailableNavigationItems> {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBSITE.NAVIGATION_AVAILABLE(eventUuid)
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
      let errorBody: any = null
      try {
        errorBody = await response.json()
      } catch {
        // ignore
      }
      const errorMessage = handleApiError(
        errorBody,
        response,
        `Failed to fetch available navigation pages (HTTP ${response.status})`
      )
      throw new Error(errorMessage)
    }

    let parsed: ApiResponse<NavigationAvailableResponseData> | NavigationAvailableResponseData | null = null
    try {
      parsed = (await response.json()) as any
    } catch (e: any) {
      const errorMessage = handleParseError(e)
      throw new Error(errorMessage)
    }

    const data = (parsed as any)?.data ?? parsed

    // Response shape: { data: { items: [...] } }
    // Each item has item_type: "page" | "participant" | "schedule"
    const rawItems: any[] = Array.isArray((data as any)?.items) ? (data as any).items : []

    // Fallback: if server still sends separate keys
    const rawPages: any[] = Array.isArray((data as any)?.pages) ? (data as any).pages : []
    const rawSchedules: any[] = Array.isArray((data as any)?.schedules) ? (data as any).schedules : []
    const rawParticipants: any[] = Array.isArray((data as any)?.participants) ? (data as any).participants : []

    const pages: AvailableNavigationPage[] = rawItems.length
      ? rawItems
          .filter((i: any) => i.item_type === 'page')
          .map((i: any) => ({ uuid: i.ref_uuid ?? i.uuid ?? '', name: i.name ?? i.title ?? '', slug: i.slug ?? '', is_added: !!i.is_added }))
      : rawPages.map((i: any) => ({ uuid: i.uuid ?? '', name: i.name ?? '', slug: i.slug ?? '', is_added: !!i.is_added }))

    const schedules: AvailableNavigationSchedule[] = rawItems.length
      ? rawItems
          .filter((i: any) => i.item_type === 'schedule')
          .map((i: any) => ({ uuid: i.ref_uuid ?? i.uuid ?? '', title: i.name ?? i.title ?? '', is_added: !!i.is_added }))
      : rawSchedules.map((i: any) => ({ uuid: i.uuid ?? '', title: i.title ?? '', is_added: !!i.is_added }))

    const participants: AvailableNavigationParticipant[] = rawItems.length
      ? rawItems
          .filter((i: any) => i.item_type === 'participant')
          .map((i: any) => ({ uuid: i.ref_uuid ?? i.uuid ?? '', name: i.name ?? i.title ?? '', is_added: !!i.is_added }))
      : rawParticipants.map((i: any) => ({ uuid: i.uuid ?? '', name: i.name ?? '', is_added: !!i.is_added }))

    return { pages, schedules, participants }
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'Failed to fetch available navigation pages.'
    throw new Error(msg)
  }
}

/**
 * Save navigation items to the server.
 * POST {{admin_url}}navigation/save/?event_id={{event_uuid}}
 * Body: { items: [...] }
 */
function resolveItemType(item: NavigationItem): 'page' | 'participant' | 'schedule' {
  if (item.type === 'page') {
    return (item as any).itemType ?? 'page'
  }
  // folder with originalItemType
  const original = (item as any).originalItemType as string | undefined
  if (original === 'schedule_group' || original === 'schedule') return 'schedule'
  if (original === 'attendee_group' || original === 'speaker_group' || original === 'participant') return 'participant'
  return 'page'
}

function buildNavItems(items: NavigationItem[]): object[] {
  return items.map((item, index) => {
    if (item.type === 'folder' && ((item as any).originalItemType ?? 'folder') === 'folder') {
      // Regular user-created folder
      return {
        item_type: 'folder',
        name: item.title,
        order: index + 1,
        icon: (item as any).iconKey ?? '',
        items: buildNavItems(item.children || []),
      }
    }

    // Leaf item — page, participant, or schedule
    const apiItemType = resolveItemType(item)
    const refUuid = item.type === 'page'
      ? ((item as any).webpageUuid ?? item.id)
      : item.id

    return {
      item_type: apiItemType,
      ref_uuid: refUuid,
      order: index + 1,
      icon: (item as any).iconKey ?? '',
    }
  })
}

export async function saveNavigation(
  eventUuid: string,
  navItems: NavigationItem[]
): Promise<void> {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBSITE.NAVIGATION_SAVE(eventUuid)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify({ items: buildNavItems(navItems) }),
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }
      let errorBody: any = null
      try {
        errorBody = await response.json()
      } catch {
        // ignore
      }
      const errorMessage = handleApiError(
        errorBody,
        response,
        `Failed to save navigation (HTTP ${response.status})`
      )
      throw new Error(errorMessage)
    }
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'Failed to save navigation.'
    throw new Error(msg)
  }
}

/**
 * Delete a navigation folder. Uses backend endpoint:
 * DELETE {{admin_url}}navigation/folders/{{folderUuid}}/?event_id={{event_uuid}}
 */
export async function deleteNavigationFolder(eventUuid: string, folderUuid: string): Promise<void> {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      throw new Error(handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.'))
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))
    }

    const url = API_ENDPOINTS.WEBSITE.NAVIGATION_FOLDER_DELETE(eventUuid, folderUuid)
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    })

    if (!response || !response.ok) {
      if (!response) throw new Error(handleNetworkError(null))
      let errorBody: any = null
      try { errorBody = await response.json() } catch { /* ignore */ }
      throw new Error(handleApiError(errorBody, response, `Failed to delete folder (HTTP ${response.status})`))
    }
  } catch (e: any) {
    throw new Error(e?.message || 'Failed to delete folder.')
  }
}

/**
 * PATCH navigation item icon. Uses backend endpoint:
 * PATCH {{admin_url}}navigation/items/{{nav_item_uuid}}/icon/?event_id={{event_uuid}}
 * Body: { "icon": "star" } (or "home", "users", "" to clear).
 */
export async function updateNavigationItemIcon(
  eventUuid: string,
  itemUuid: string,
  icon: string | null,
  childUuid?: string
): Promise<void> {
  try {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      const errorMessage = handleApiError(
        'Authentication required. Please login again.',
        undefined,
        'Authentication required. Please login again.'
      )
      throw new Error(errorMessage)
    }

    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!organizationUuid) {
      const errorMessage = handleApiError(
        'Organization UUID is missing. Please create or select an organization first.',
        undefined,
        'Organization UUID is missing. Please create or select an organization first.'
      )
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.WEBSITE.NAVIGATION_ITEM_ICON(eventUuid, itemUuid)
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify({ icon: icon, ...(childUuid ? { child_uuid: childUuid } : {}) }),
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }
      let errorBody: any = null
      try {
        errorBody = await response.json()
      } catch {
        // ignore
      }
      const errorMessage = handleApiError(
        errorBody,
        response,
        `Failed to update navigation item icon (HTTP ${response.status})`
      )
      throw new Error(errorMessage)
    }
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'Failed to update navigation item icon.'
    throw new Error(msg)
  }
}


