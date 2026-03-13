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
    const sectionType = (sec?.section_type ?? sec?.type ?? 'text').toString()
    const uiType =
      sectionType === 'poster'
        ? 'slides'
        : sectionType === 'image'
          ? 'photo-gallery'
          : sectionType === 'speakers'
            ? 'speaker'
            : sectionType === 'resource'
              ? 'resources'
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
  const resourceFiles = rawResources.map((r: any) =>
    typeof r === 'string'
      ? { url: r, name: r?.split?.('/')?.pop?.() ?? 'File' }
      : {
          url: r?.file_url ?? r?.url ?? r?.file,
          name: r?.file_name ?? r?.name ?? (r?.url ?? r?.file_url ?? r?.file)?.split?.('/')?.pop?.() ?? 'File'
        }
  )

  if (resourceFiles.length > 0) {
    const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|ogg|m4v|ogv)(\?|$)/i
    const videoResources: typeof resourceFiles = []
    const nonVideoResources: typeof resourceFiles = []

    resourceFiles.forEach((item) => {
      const url = item?.url ?? ''
      const name = item?.name ?? ''
      if (VIDEO_EXTENSIONS.test(String(url)) || VIDEO_EXTENSIONS.test(String(name))) {
        videoResources.push(item)
      } else {
        nonVideoResources.push(item)
      }
    })

    // Create/augment Video section from first video resource
    if (videoResources.length > 0) {
      const firstVideo = videoResources[0]
      const videoUrl = firstVideo?.url ? String(firstVideo.url) : ''
      let videoSection = sections.find((s: any) => s.type === 'video')
      if (videoSection) {
        videoSection.data = {
          ...(videoSection.data || {}),
          videoUrl,
          video_url: videoUrl
        }
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

    // Non-video resources → Resources section
    if (nonVideoResources.length > 0) {
      const existing = sections.find((s: any) => s.type === 'resources')
      if (existing) {
        const current = (existing.data?.files as any[]) ?? []
        existing.data = { ...existing.data, files: [...current, ...nonVideoResources] }
      } else {
        sections.push({
          id: `section-${sessionId}-resources`,
          type: 'resources',
          title: 'Resources',
          description: '',
          data: { files: nonVideoResources }
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

