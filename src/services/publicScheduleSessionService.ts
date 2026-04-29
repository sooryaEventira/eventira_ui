import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'

const pubAuthHeaders = (): Record<string, string> => {
  const t = localStorage.getItem('pub_accessToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

/** Map API section format to UI SavedSession section format. Shared for public retrieve and admin. */
export function mapApiSectionsToSavedSections(
  apiSections: any[],
  apiResources: any[],
  sessionId: string,
  fallbackDescription?: string
): Array<{ id: string; type: string; title: string; description: string; data: Record<string, unknown> }> {
  const sections = (apiSections ?? []).map((sec: any, i: number) => {
    const content = sec?.content && typeof sec.content === 'object' ? sec.content : {}
    const sectionType = (sec?.section_type ?? sec?.type ?? 'text').toString().toLowerCase()
    const title = (content?.title ?? sec?.title ?? '').toString().toLowerCase()

    // Check if it's a live chat section by type or title
    const isLiveChat =
      sectionType === 'chat' ||
      sectionType === 'livechat' ||
      sectionType === 'live_chat' ||
      sectionType === 'live-chat' ||
      title === 'live chat' ||
      title === 'live-chat' ||
      title === 'livechat' ||
      title === 'discussion/chat'

    const uiType =
      sectionType === 'poster'
        ? 'slides'
        : sectionType === 'gallery' || sectionType === 'photo_gallery' || sectionType === 'photo-gallery'
          ? 'photo-gallery'
          : sectionType === 'image'
            ? 'image'
            : sectionType === 'speakers'
              ? 'speaker'
              : sectionType === 'resource'
                ? 'resources'
                : sectionType === 'comments'
                  ? 'comments'
                  : isLiveChat
                    ? 'live-chat'
                    : sectionType
    let sectionData: Record<string, unknown> = {
      ...content,
      speaker_uuids: content?.speaker_uuids ?? [],
      url: content?.url ?? content?.video_url ?? '',
      videoUrl: content?.videoUrl ?? content?.video_url ?? '',
      video_url: content?.video_url ?? content?.videoUrl ?? ''
    }
    if (uiType === 'speaker') {
      const rawSpeakers =
        Array.isArray(sec?.speakers) ? sec.speakers :
        Array.isArray(content?.speakers) ? content.speakers :
        Array.isArray(sec?.data?.speakers) ? sec.data.speakers :
        Array.isArray(sec?.content) ? sec.content :
        Array.isArray(content) ? content as any[] : []
      const speakers = rawSpeakers.map((sp: any) => ({
        id: String(sp?.uuid ?? sp?.id ?? sp?.speaker_uuid ?? ''),
        name: String(sp?.name ?? [sp?.first_name, sp?.last_name].filter(Boolean).join(' ') ?? sp?.speaker_name ?? 'Speaker'),
        role: String(sp?.role ?? sp?.designation ?? sp?.title ?? ''),
        avatarUrl: sp?.image ?? sp?.avatar_url ?? sp?.avatarUrl ?? undefined,
      }))
      sectionData = { ...sectionData, speakers }
    } else if (uiType === 'resources' && Array.isArray(content?.files)) {
      sectionData = { ...sectionData, files: content.files }
    } else if (uiType === 'resources' && (content?.file_url || content?.url)) {
      sectionData = { ...sectionData, files: [{ url: content.file_url ?? content.url, name: content.file_name ?? content.name }] }
    }
    const defaultTitle =
      uiType === 'speaker' ? 'Speakers'
      : uiType === 'video' ? 'Video'
      : uiType === 'resources' ? 'Resources'
      : uiType === 'live-chat' ? 'Live Chat'
      : 'Section'
    return {
      id: `section-${sessionId}-${i}`,
      type: uiType,
      title: (content?.title ?? sec?.title ?? defaultTitle).toString(),
      description: (content?.body ?? sec?.description ?? '').toString(),
      data: sectionData
    }
  })
  const rawResources = apiResources ?? []
  const resourceFiles = rawResources.map((r: any) => {
    if (typeof r === 'string') return { url: r, name: r?.split?.('/')?.pop?.() ?? 'File' }
    const rawId = [r?.id, r?.uuid, r?.session_resource_id, r?.pk].find((v) => v != null && v !== '')
    const resourceId = rawId != null ? String(rawId).trim() : undefined
    return {
      url: r?.file_url ?? r?.url ?? r?.file,
      name: r?.file_name ?? r?.name ?? (r?.url ?? r?.file_url ?? r?.file)?.split?.('/')?.pop?.() ?? 'File',
      ...(resourceId ? { resourceId } : {})
    }
  })

  if (resourceFiles.length > 0) {
    const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|ogg|m4v|ogv)(\?|$)/i
    const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|bmp|avif|tiff?)(\?|$)/i
    const DOCUMENT_EXTENSIONS = /\.(pdf|docx?|xlsx?|xlsm|csv|pptx?|key|odp|odt|rtf|txt)(\?|$)/i
    const videoResources: typeof resourceFiles = []
    const imageResources: typeof resourceFiles = []
    const documentResources: typeof resourceFiles = []
    const otherResources: typeof resourceFiles = []

    resourceFiles.forEach((item) => {
      const url = item?.url ?? ''
      const name = item?.name ?? ''
      if (VIDEO_EXTENSIONS.test(String(url)) || VIDEO_EXTENSIONS.test(String(name))) {
        videoResources.push(item)
      } else if (IMAGE_EXTENSIONS.test(String(url)) || IMAGE_EXTENSIONS.test(String(name))) {
        imageResources.push(item)
      } else if (DOCUMENT_EXTENSIONS.test(String(url)) || DOCUMENT_EXTENSIONS.test(String(name))) {
        documentResources.push(item)
      } else {
        otherResources.push(item)
      }
    })

    // Create/augment Video section from first video resource
    if (videoResources.length > 0) {
      const firstVideo = videoResources[0]
      const videoUrl = firstVideo?.url ? String(firstVideo.url) : ''
      let videoSection = sections.find((s: any) => s.type === 'video')
      if (videoSection) {
        videoSection.data = { ...(videoSection.data || {}), videoUrl, video_url: videoUrl }
      } else {
        sections.push({
          id: `section-${sessionId}-video`,
          type: 'video',
          title: 'Video',
          description: '',
          data: { videoUrl, video_url: videoUrl }
        })
      }
    }

    // Single image → `image` section; multiple → `photo-gallery`
    if (imageResources.length === 1) {
      const r = imageResources[0] as { url?: string; name?: string; resourceId?: string }
      const existingImage = sections.find((s: any) => s.type === 'image')
      if (existingImage) {
        existingImage.data = { ...existingImage.data, url: r.url ?? '', previewUrl: r.url ?? '', ...(r.resourceId ? { resourceId: r.resourceId } : {}) }
      } else {
        sections.push({
          id: `section-${sessionId}-image`,
          type: 'image',
          title: 'Image',
          description: '',
          data: { url: r.url ?? '', previewUrl: r.url ?? '', ...(r.resourceId ? { resourceId: r.resourceId } : {}) }
        })
      }
    } else if (imageResources.length > 1) {
      const existingGallery = sections.find((s: any) => s.type === 'photo-gallery')
      const galleryImages = imageResources.map((r: { url?: string; name?: string; resourceId?: string }) => ({
        url: r.url ?? '',
        previewUrl: r.url ?? '',
        name: r.name ?? '',
        ...(r.resourceId ? { resourceId: r.resourceId } : {})
      }))
      if (existingGallery) {
        const current = (existingGallery.data?.images as any[]) ?? []
        existingGallery.data = { ...existingGallery.data, images: [...current, ...galleryImages] }
      } else {
        sections.push({
          id: `section-${sessionId}-gallery`,
          type: 'photo-gallery',
          title: 'Photo Gallery',
          description: '',
          data: { images: galleryImages }
        })
      }
    }

    // Document/presentation files + other non-image/non-video files → Resources section
    if (documentResources.length > 0 || otherResources.length > 0) {
      const resourceFilesCombined = [
        ...documentResources.map((r: { url?: string; name?: string; resourceId?: string }) => ({
          url: r.url ?? '',
          name: r.name ?? (r.url ?? '').split('/').pop() ?? 'File',
          ...(r.resourceId ? { resourceId: r.resourceId } : {})
        })),
        ...otherResources
      ]
      const existing = sections.find((s: any) => s.type === 'resources')
      if (existing) {
        const current = (existing.data?.files as any[]) ?? []
        existing.data = { ...existing.data, files: [...current, ...resourceFilesCombined] }
      } else {
        sections.push({
          id: `section-${sessionId}-resources`,
          type: 'resources',
          title: 'Resources',
          description: '',
          data: { files: resourceFilesCombined }
        })
      }
    }
  }
  if (!sections.length && fallbackDescription) {
    sections.push({
      id: `section-${sessionId}-desc`,
      type: 'text',
      title: 'Description',
      description: fallbackDescription,
      data: {}
    })
  }
  return sections
}

export interface PublicScheduleSessionData {
  id?: string | number
  uuid?: string
  title?: string
  name?: string
  date?: string
  day?: string
  start_time?: string
  end_time?: string
  startTime?: string
  endTime?: string
  location?: string
  session_type?: string
  sessionType?: string
  parent_id?: string | number
  parentId?: string | number
  parent_session_uuid?: string
  parent_uuid?: string
  parentUuid?: string
  attachments?: any[]
  attachments_count?: number
  attachment_count?: number
  attachmentsCount?: number
  [key: string]: any
}

export interface PublicScheduleTag {
  uuid?: string
  id?: string | number
  name?: string
  [key: string]: any
}

export interface PublicScheduleLocation {
  uuid?: string
  id?: string | number
  name?: string
  location?: string
  [key: string]: any
}

const extractPageData = (data: any): { results: PublicScheduleSessionData[]; next: string | null } => {
  if (data?.status === 'error') {
    const errorMessage = handleApiError(data, undefined, 'Failed to fetch sessions. Please try again.')
    throw new Error(errorMessage)
  }
  const next: string | null = data?.next ?? null
  const responseData = data?.data ?? data?.results ?? data
  if (Array.isArray(responseData)) return { results: responseData as PublicScheduleSessionData[], next }
  if (responseData && typeof responseData === 'object') {
    if (Array.isArray(responseData.results)) return { results: responseData.results as PublicScheduleSessionData[], next: responseData.next ?? next }
    if (Array.isArray(responseData.sessions)) return { results: responseData.sessions as PublicScheduleSessionData[], next }
  }
  return { results: [], next }
}

export const fetchPublicScheduleSessions = async (
  eventUuid: string,
  scheduleUuid: string
): Promise<PublicScheduleSessionData[]> => {
  try {
    if (!eventUuid) {
      throw new Error(handleApiError('Event UUID is required.', undefined, 'Event UUID is required.'))
    }
    if (!scheduleUuid) {
      throw new Error(handleApiError('Schedule UUID is required.', undefined, 'Schedule UUID is required.'))
    }

    const all: PublicScheduleSessionData[] = []
    let nextUrl: string | null = API_ENDPOINTS.PUBLIC.SESSIONS.LIST(eventUuid, scheduleUuid)

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
      })

      if (!response || !response.ok) {
        if (!response) throw new Error(handleNetworkError(null))
        let errorData: any = null
        try { errorData = await response.json() } catch { /* ignore */ }
        throw new Error(handleApiError(errorData, response, 'An error occurred. Please try again.'))
      }

      let data: any
      try {
        data = await response.json()
      } catch {
        throw new Error(handleParseError('Invalid response from server. Please try again.'))
      }

      const { results, next } = extractPageData(data)
      all.push(...results)
      nextUrl = next
    }

    return all
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) handleNetworkError(error)
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch sessions. Please try again.')
  }
}

export const fetchPublicScheduleTags = async (
  eventUuid: string,
  scheduleUuid: string
): Promise<PublicScheduleTag[]> => {
  try {
    if (!eventUuid || !scheduleUuid) return []
    const response = await fetch(API_ENDPOINTS.PUBLIC.SCHEDULE_TAGS.LIST(eventUuid, scheduleUuid), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
    })
    if (!response || !response.ok) return []
    const data = await response.json().catch(() => null)
    const items = data?.data ?? data?.results ?? data
    return Array.isArray(items) ? (items as PublicScheduleTag[]) : []
  } catch {
    return []
  }
}

export const fetchPublicScheduleLocations = async (
  eventUuid: string,
  scheduleUuid: string
): Promise<PublicScheduleLocation[]> => {
  try {
    if (!eventUuid || !scheduleUuid) return []
    const response = await fetch(API_ENDPOINTS.PUBLIC.SCHEDULE_LOCATIONS.LIST(eventUuid, scheduleUuid), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
    })
    if (!response || !response.ok) return []
    const data = await response.json().catch(() => null)
    const items = data?.data ?? data?.results ?? data
    return Array.isArray(items) ? (items as PublicScheduleLocation[]) : []
  } catch {
    return []
  }
}

/** Fetch a single session with full details (sections, video, resources, speakers, text). Returns null if 404. */
export const fetchPublicSession = async (
  eventUuid: string,
  scheduleUuid: string,
  sessionUuid: string
): Promise<Record<string, any> | null> => {
  try {
    if (!eventUuid || !scheduleUuid || !sessionUuid) return null
    const url = API_ENDPOINTS.PUBLIC.SESSIONS.RETRIEVE(eventUuid, scheduleUuid, sessionUuid)
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...pubAuthHeaders() },
    })
    if (!response || response.status === 404) return null
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(text || `HTTP ${response.status}`)
    }
    const data = await response.json().catch(() => null)
    if (!data) return null
    const raw = data?.data ?? data?.session ?? data
    return raw && typeof raw === 'object' ? raw : null
  } catch {
    return null
  }
}

