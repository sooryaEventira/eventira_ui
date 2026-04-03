import type { SessionDraft } from '../sessionTypes'
import type { UpdateSessionSectionBody, CreateSessionSectionsBody } from '../../../services/sessionService'

/** Collect all File objects from session sections (image/poster, photo-gallery, resources, video). */
export const collectFilesFromSections = (sections: SessionDraft['sections']): File[] => {
  const out: File[] = []
  for (const s of sections ?? []) {
    const d = s.data
    if (!d) continue
    if (d.file instanceof File) out.push(d.file)
    const images = d.images as Array<{ file?: File }> | undefined
    if (Array.isArray(images)) {
      for (const img of images) {
        if (img?.file instanceof File) out.push(img.file)
      }
    }
    const files = d.files as File[] | undefined
    if (Array.isArray(files)) {
      for (const f of files) {
        if (f instanceof File) out.push(f)
      }
    }
    if (d.videoFile instanceof File) out.push(d.videoFile)
  }
  return out
}

/** Extract URLs from createSessionResources response. May be array or { results: [...] }. */
export const extractUrlsFromResourcesResponse = (res: unknown): string[] => {
  if (!res || typeof res !== 'object') return []
  const arr = Array.isArray(res) ? res : (res as any).results ?? (res as any).data ?? []
  if (!Array.isArray(arr)) return []
  return arr
    .map((item: any) => item?.file ?? item?.file_url ?? item?.url ?? '')
    .filter((u): u is string => typeof u === 'string' && u.length > 0)
}

/** Extract resource IDs from createSessionResources response (id, uuid, session_resource_id, pk; may be number or string). */
export const extractResourceIdsFromResponse = (res: unknown): string[] => {
  if (!res || typeof res !== 'object') return []
  const container: any = Array.isArray(res)
    ? res
    : (res as any).results ?? (res as any).data ?? res

  const arr = Array.isArray(container) ? container : [container]

  return arr
    .map((item: any) => item?.id ?? item?.uuid ?? item?.session_resource_id ?? item?.pk)
    .filter((v) => v != null && v !== '')
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0)
}

/** Build ordered list of resource IDs for the resources section: existing (resourceId) or index into allFiles for new uploads. */
export const getOrderedResourceIdsOrIndices = (
  sections: SessionDraft['sections'],
  attachmentCount: number
): Array<{ id?: string; allFilesIndex?: number }> => {
  const ordered: Array<{ id?: string; allFilesIndex?: number }> = []
  let idx = attachmentCount
  for (const s of sections ?? []) {
    if (s.type === 'video') {
      const videoResourceId = s.data?.videoResourceId
      if (videoResourceId && typeof videoResourceId === 'string' && videoResourceId.trim()) {
        ordered.push({ id: String(videoResourceId).trim() })
      }
      if (s.data?.videoFile instanceof File) {
        ordered.push({ allFilesIndex: idx++ })
      }
    } else if (s.type !== 'resources') {
      if (s.data?.file instanceof File) idx++
      for (const img of s.data?.images ?? []) {
        if (img?.file instanceof File) idx++
      }
      for (const f of s.data?.files ?? []) {
        if (f instanceof File) idx++
      }
    } else {
      const files = (s.data?.files as Array<{ resourceId?: string | number } | File>) ?? []
      for (const item of files) {
        if (item && typeof item === 'object' && !(item instanceof File)) {
          const raw = (item as { resourceId?: string | number }).resourceId
          if (raw != null && raw !== '') {
            const rid = String(raw).trim()
            if (rid) ordered.push({ id: rid })
          }
        } else if (item instanceof File) {
          ordered.push({ allFilesIndex: idx++ })
        }
      }
    }
  }
  return ordered
}

/** Map section indices with videoFile to their index in the flattened files array. */
export const getVideoFileIndicesInFlattenedFiles = (
  sections: SessionDraft['sections']
): Array<{ sectionIndex: number; fileIndex: number }> => {
  const result: Array<{ sectionIndex: number; fileIndex: number }> = []
  let fileIndex = 0
  ;(sections ?? []).forEach((s, sectionIndex) => {
    const d = s.data
    if (!d) return
    if (d.file instanceof File) fileIndex++
    const images = d.images as Array<{ file?: File }> | undefined
    if (Array.isArray(images)) {
      images.forEach((img) => {
        if (img?.file instanceof File) fileIndex++
      })
    }
    const files = d.files as File[] | undefined
    if (Array.isArray(files)) {
      files.forEach((f) => {
        if (f instanceof File) fileIndex++
      })
    }
    if (d.videoFile instanceof File) {
      result.push({ sectionIndex, fileIndex })
      fileIndex++
    }
  })
  return result
}

/** Map UI section type to API section_type.
 * File uploads (images, galleries, generic documents, uploaded videos) are sent via the
 * session-resources endpoint and represented as `resource` on the backend. Non-file content
 * (text blocks, speakers, YouTube embeds, etc.) is sent via session-sections.
 */
export const toApiSectionType = (uiType: string): string => {
  const map: Record<string, string> = {
    // File-based sections → backend "resource"
    'photo-gallery': 'resource',
    image: 'resource',
    slides: 'resource',
    resources: 'resource',
    // Non-file content keeps its dedicated section types
    speaker: 'speakers',
    video: 'video',
    text: 'text',
    speakers: 'speakers',
    poll: 'text',
    location: 'text',
    qas: 'text',
    hyperlink: 'text',
    button: 'text',
    'live-chat': 'text'
  }
  const normalized = (uiType || 'text').trim().toLowerCase()
  return map[normalized] ?? (normalized || 'text')
}

export const stripFilesFromPayload = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v instanceof File) continue
    if (Array.isArray(v)) {
      out[k] = v.map((item) => (item && typeof item === 'object' && !(item instanceof File) ? stripFilesFromPayload(item as Record<string, unknown>) : item))
      continue
    }
    if (v && typeof v === 'object' && !(v instanceof Date)) out[k] = stripFilesFromPayload(v as Record<string, unknown>)
    else out[k] = v
  }
  return out
}

/** Build one section payload for session-sections API (PATCH or POST item). */
export const buildOneSectionPayload = (
  s: SessionDraft['sections'][number],
  order: number
): UpdateSessionSectionBody & { section_type: string; order: number; content: Record<string, unknown> | string[] } => {
  const sectionType = toApiSectionType((s.type === 'speaker' ? 'speakers' : s.type) || 'text')
  let content: Record<string, unknown> | string[]
  if (sectionType === 'text') {
    content = { title: s.title || 'Section', body: s.description ?? '' }
  } else if (sectionType === 'speakers') {
    const speakerUuids: string[] = Array.isArray(s.data?.speaker_uuids)
      ? s.data.speaker_uuids
      : Array.isArray(s.data?.speakers)
        ? (s.data.speakers as { id: string }[]).map((sp) => sp.id)
        : []
    // Backend expects content to be a plain array of speaker UUIDs
    content = speakerUuids
  } else if (sectionType === 'video') {
    const videoUrl = s.data?.videoUrl ?? s.data?.video_url ?? ''
    content = { video_url: typeof videoUrl === 'string' ? videoUrl : String(videoUrl || ''), title: s.title || 'Video' }
  } else if (sectionType === 'image' || sectionType === 'poster') {
    content = (s.data && typeof s.data === 'object' ? { ...s.data } : {}) as Record<string, unknown>
    if (s.title) content.title = s.title
    if (s.description != null) content.body = s.description
    content = stripFilesFromPayload(content)
  } else {
    content = (s.data && typeof s.data === 'object' ? { ...s.data } : {}) as Record<string, unknown>
    if (s.title) content.title = s.title
    if (s.description != null) content.body = s.description
    content = stripFilesFromPayload(content)
  }
  return { section_type: sectionType, order, content }
}

/** Build section payload for session-sections API. Only text, video, speakers, image, poster. Resource sections (files) are sent via session-resources, not session-sections. */
export const buildSectionsPayload = (
  sections: SessionDraft['sections'],
  sessionUuid: string
): CreateSessionSectionsBody => {
  const sectionItems = (sections ?? [])
    .map((s, index) => buildOneSectionPayload(s, index + 1))
    .filter((item) => item.section_type !== 'resource')
  return { session_uuid: sessionUuid, sections: sectionItems }
}
