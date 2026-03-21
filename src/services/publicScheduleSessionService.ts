import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'

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
      sectionType === 'comments' ||
      title === 'live chat' ||
      title === 'live-chat' ||
      title === 'livechat' ||
      title === 'discussion/chat' ||
      title === 'discussion/comment'

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
    if (uiType === 'resources' && Array.isArray(content?.files)) {
      sectionData = { ...sectionData, files: content.files }
    } else if (uiType === 'resources' && (content?.file_url || content?.url)) {
      sectionData = { ...sectionData, files: [{ url: content.file_url ?? content.url, name: content.file_name ?? content.name }] }
    }
    return {
      id: `section-${sessionId}-${i}`,
      type: uiType,
      title: (content?.title ?? sec?.title ?? 'Section').toString(),
      description: (content?.body ?? content?.body ?? sec?.description ?? '').toString(),
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
    const SLIDES_EXTENSIONS = /\.(pdf|pptx?|key|odp)(\?|$)/i
    const videoResources: typeof resourceFiles = []
    const imageResources: typeof resourceFiles = []
    const slidesResources: typeof resourceFiles = []
    const otherResources: typeof resourceFiles = []

    resourceFiles.forEach((item) => {
      const url = item?.url ?? ''
      const name = item?.name ?? ''
      if (VIDEO_EXTENSIONS.test(String(url)) || VIDEO_EXTENSIONS.test(String(name))) {
        videoResources.push(item)
      } else if (IMAGE_EXTENSIONS.test(String(url)) || IMAGE_EXTENSIONS.test(String(name))) {
        imageResources.push(item)
      } else if (SLIDES_EXTENSIONS.test(String(url)) || SLIDES_EXTENSIONS.test(String(name))) {
        slidesResources.push(item)
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

    // Slides/PDF resources → `slides` section
    if (slidesResources.length > 0) {
      slidesResources.forEach((r: { url?: string; name?: string; resourceId?: string }, idx: number) => {
        sections.push({
          id: `section-${sessionId}-slides-${idx}`,
          type: 'slides',
          title: 'Slides',
          description: '',
          data: { url: r.url ?? '', previewUrl: r.url ?? '', ...(r.resourceId ? { resourceId: r.resourceId } : {}) }
        })
      })
    }

    // Other non-image, non-video files → Resources section
    if (otherResources.length > 0) {
      const existing = sections.find((s: any) => s.type === 'resources')
      if (existing) {
        const current = (existing.data?.files as any[]) ?? []
        existing.data = { ...existing.data, files: [...current, ...otherResources] }
      } else {
        sections.push({
          id: `section-${sessionId}-resources`,
          type: 'resources',
          title: 'Resources',
          description: '',
          data: { files: otherResources }
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

export const fetchPublicScheduleSessions = async (
  eventUuid: string,
  scheduleUuid: string
): Promise<PublicScheduleSessionData[]> => {
  try {
    if (!eventUuid) {
      const errorMessage = handleApiError('Event UUID is required.', undefined, 'Event UUID is required.')
      throw new Error(errorMessage)
    }
    if (!scheduleUuid) {
      const errorMessage = handleApiError('Schedule UUID is required.', undefined, 'Schedule UUID is required.')
      throw new Error(errorMessage)
    }

    const url = API_ENDPOINTS.PUBLIC.SESSIONS.LIST(eventUuid, scheduleUuid)
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
        } catch {
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
        if (parseError instanceof Error) throw parseError
        const errorMessage = handleApiError(null, response, 'An error occurred. Please try again.')
        throw new Error(errorMessage)
      }
    }

    let data: any
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data?.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to fetch sessions. Please try again.')
      throw new Error(errorMessage)
    }

    const responseData = data?.data ?? data?.results ?? data
    if (Array.isArray(responseData)) return responseData as PublicScheduleSessionData[]
    if (responseData && typeof responseData === 'object') {
      if (Array.isArray(responseData.results)) return responseData.results as PublicScheduleSessionData[]
      if (Array.isArray(responseData.sessions)) return responseData.sessions as PublicScheduleSessionData[]
    }
    return []
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }
    throw error instanceof Error ? error : new Error('Failed to fetch sessions. Please try again.')
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
      headers: { 'Content-Type': 'application/json' },
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

