import type { SavedSession } from '../sessionTypes'

/**
 * Map GET session response (single session) to SavedSession for the slideout.
 * Sections come from session retrieve. Uses event timezone so edit form shows same time as grid (09:00 not 03:30 UTC).
 */
export const mapRetrieveSessionToDraft = (
  raw: any,
  timeZone: string | null
): SavedSession => {
  const id = String(raw?.uuid ?? raw?.id ?? `session-${Math.random().toString(36).slice(2)}`)
  const title = raw?.title ?? raw?.name ?? 'Session'
  const parseIsoToTime = (value: any): { time: string; period: 'AM' | 'PM' } => {
    const fallback = { time: '00:00', period: 'AM' as const }
    if (value == null) return fallback
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return fallback
    if (timeZone) {
      try {
        const formatted = new Intl.DateTimeFormat('en-US', {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).format(d)
        const m = formatted.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
        if (m) {
          const hh = String(m[1]).padStart(2, '0')
          const mm = m[2]
          const period = m[3].toUpperCase() as 'AM' | 'PM'
          return { time: `${hh}:${mm}`, period }
        }
      } catch {
        // fall through to UTC
      }
    }
    const hours24 = d.getUTCHours ? d.getUTCHours() : d.getHours()
    const minutes = d.getUTCMinutes != null ? d.getUTCMinutes() : d.getMinutes()
    const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
    let hours12 = hours24 % 12
    if (hours12 === 0) hours12 = 12
    const hh = String(hours12).padStart(2, '0')
    const mm = String(minutes).padStart(2, '0')
    return { time: `${hh}:${mm}`, period }
  }
  const startCandidate = raw?.start_time ?? raw?.startTime ?? raw?.start_at ?? raw?.starts_at ?? null
  const endCandidate = raw?.end_time ?? raw?.endTime ?? raw?.end_at ?? raw?.ends_at ?? null
  const start = parseIsoToTime(startCandidate)
  const end = parseIsoToTime(endCandidate)
  const normalizeTags = (rawTags: any): string[] => {
    if (!rawTags) return []
    if (Array.isArray(rawTags)) {
      return rawTags
        .map((t) => {
          if (typeof t === 'string') return t
          if (t && typeof t === 'object') {
            const nested = t?.resource_tag ?? t?.tag ?? t?.session_tag
            // Prefer name for display — selectedTagOptions resolves name→uuid via tagOptions
            const name = nested?.name ?? nested?.title ?? t?.name ?? t?.title ?? t?.label
            if (typeof name === 'string' && name.trim()) return name.trim()
            // Fall back to uuid if no name available
            const uuid = nested?.uuid ?? t?.uuid ?? t?.id
            return uuid ? String(uuid) : null
          }
          return null
        })
        .filter((x): x is string => typeof x === 'string')
    }
    return []
  }
  // Prefer tag_uuids from API so we send them back on save; fallback to tags (names or objects)
  const tags = normalizeTags(raw?.tag_uuids ?? raw?.tags)
  const description = raw?.description ?? raw?.summary ?? ''
  const apiSections =
    Array.isArray(raw?.sections)
      ? raw.sections
      : Array.isArray(raw?.session_sections)
        ? raw.session_sections
        : Array.isArray((raw?.session_sections as any)?.results)
          ? (raw.session_sections as any).results
          : Array.isArray((raw?.sections as any)?.results)
            ? (raw.sections as any).results
            : []
  const sections = apiSections.map((sec: any, i: number) => {
    const rawContent = sec?.content
    // Backend returns content as a plain string[] for speakers sections
    const contentIsArray = Array.isArray(rawContent)
    const content = contentIsArray ? {} : (rawContent && typeof rawContent === 'object' ? rawContent : {})
    const sectionType = (sec?.section_type ?? sec?.type ?? 'text').toString()
    let uiType =
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
                : sectionType === 'live_chat'
                  ? 'live-chat'
                  : sectionType
    // Treat text sections whose title matches any known live-chat label as live-chat UI type.
    if (sectionType === 'text') {
      const rawTitle = (content?.title ?? sec?.title ?? '').toString().trim().toLowerCase()
      if (
        rawTitle === 'live chat' ||
        rawTitle === 'live-chat' ||
        rawTitle === 'discussion/comment' ||
        rawTitle === 'discussion/chat'
      ) {
        uiType = 'live-chat'
      }
    }
    // Handle all three backend content formats for speakers:
    //   1. Plain string[] → ["uuid1", "uuid2"]
    //   2. { speakers: [{ uuid, name, role }] }  ← current backend format
    //   3. { speaker_uuids: ["uuid1", "uuid2"] }  ← older format
    let speakerUuids: string[] = []
    let speakersList: { id: string; name: string; role: string; avatarUrl?: string }[] = []
    if (contentIsArray) {
      speakerUuids = (rawContent as string[])
      speakersList = speakerUuids.map((id) => ({ id, name: '', role: '' }))
    } else if (Array.isArray(content?.speakers) && content.speakers.length > 0) {
      speakersList = (content.speakers as any[]).map((sp: any) => ({
        id: sp?.uuid ?? sp?.id ?? sp?.speaker_uuid ?? '',
        name: sp?.name ?? '',
        role: sp?.role ?? '',
        avatarUrl: sp?.image ?? sp?.avatar_url ?? sp?.avatarUrl ?? sp?.profile_picture ?? undefined
      }))
      speakerUuids = speakersList.map((sp) => sp.id).filter(Boolean)
    } else if (Array.isArray(content?.speaker_uuids)) {
      speakerUuids = content.speaker_uuids
      speakersList = speakerUuids.map((id) => ({ id, name: '', role: '' }))
    }
    const resolvedVideoUrl = (content?.video_uri ?? content?.video_url ?? content?.videoUrl ?? content?.url ?? '').toString().trim()
    let sectionData: Record<string, unknown> = {
      speaker_uuids: speakerUuids,
      speakers: speakersList,
      url: resolvedVideoUrl,
      ...(uiType === 'video' ? { videoUrl: resolvedVideoUrl, video_url: resolvedVideoUrl } : {})
    }
    if (uiType === 'resources' && Array.isArray(content?.files)) {
      sectionData = { ...sectionData, files: content.files }
    } else if (uiType === 'resources' && (content?.file_url || content?.url)) {
      sectionData = { ...sectionData, files: [{ url: content.file_url ?? content.url, name: content.file_name ?? content.name }] }
    }
    const rawSectionId = sec?.id ?? sec?.uuid ?? sec?.session_section_id ?? sec?.section_id ?? sec?.pk
    const apiSectionId =
      typeof rawSectionId === 'string' && rawSectionId.trim()
        ? rawSectionId.trim()
        : typeof rawSectionId === 'number' && !Number.isNaN(rawSectionId)
          ? String(rawSectionId)
          : undefined
    const defaultTitle =
      uiType === 'speaker' || sectionType === 'speakers'
        ? 'Speakers'
        : uiType === 'live-chat'
          ? 'Live Chat'
          : 'Section'
    return {
      id: `section-${id}-${i}`,
      ...(apiSectionId ? { sectionId: apiSectionId } : {}),
      type: uiType,
      title: (uiType === 'speaker' ? defaultTitle : (content?.title ?? sec?.title ?? defaultTitle)).toString(),
      description: (content?.body ?? content?.body ?? sec?.description ?? '').toString(),
      data: sectionData
    }
  })
  const rawResources =
    raw?.session_resources ??
    raw?.resources ??
    (raw?.resource_files as any) ??
    []
  const apiResources = Array.isArray(rawResources)
    ? rawResources
    : Array.isArray((rawResources as any)?.results)
      ? (rawResources as any).results
      : rawResources && typeof rawResources === 'object' && !Array.isArray(rawResources)
        ? [(rawResources as any)]
        : []
  const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|ogg|m4v|ogv)(\?|$)/i
  const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|bmp|avif|tiff?)(\?|$)/i
  const SLIDES_EXTENSIONS = /\.(pdf|pptx?|key|odp)(\?|$)/i
  if (apiResources.length > 0) {
    const resourceFiles = apiResources.map((r: any) => {
      if (typeof r === 'string') return { url: r, name: r?.split?.('/')?.pop?.() ?? 'File' }
      const rawId = [r?.id, r?.uuid, r?.session_resource_id, r?.pk].find((v) => v != null && v !== '')
      const resourceId = rawId != null ? String(rawId).trim() : undefined
      return {
        url: r?.file_url ?? r?.url ?? r?.file,
        name: r?.file_name ?? r?.name ?? (r?.url ?? r?.file_url ?? r?.file)?.split?.('/')?.pop?.() ?? 'File',
        ...(resourceId ? { resourceId } : {})
      }
    })
    const videoResources: typeof resourceFiles = []
    const imageResources: typeof resourceFiles = []
    const slidesResources: typeof resourceFiles = []
    const otherResources: typeof resourceFiles = []
    resourceFiles.forEach((item: { url?: string; name: string }) => {
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
    if (videoResources.length > 0) {
      const firstVideo = videoResources[0] as { url?: string; name?: string; resourceId?: string }
      const videoUrl = typeof firstVideo === 'object' && firstVideo?.url ? String(firstVideo.url) : ''
      const videoResourceId = firstVideo?.resourceId != null && firstVideo.resourceId !== '' ? String(firstVideo.resourceId).trim() : undefined
      let videoSection = sections.find((s: any) => s.type === 'video')
      if (videoSection) {
        videoSection.data = {
          ...(videoSection.data || {}),
          videoUrl,
          video_url: videoUrl,
          ...(videoResourceId ? { videoResourceId } : {})
        }
      } else {
        sections.push({
          id: `section-${id}-video`,
          type: 'video',
          title: 'Video',
          description: '',
          data: { videoUrl, video_url: videoUrl, ...(videoResourceId ? { videoResourceId } : {}) }
        })
      }
    }
    if (imageResources.length === 1) {
      // Single image resource → restore as `image` section
      const r = imageResources[0] as { url?: string; name?: string; resourceId?: string }
      const existingImage = sections.find((s: any) => s.type === 'image')
      if (existingImage) {
        existingImage.data = { ...existingImage.data, url: r.url ?? '', previewUrl: r.url ?? '', ...(r.resourceId ? { resourceId: r.resourceId } : {}) }
      } else {
        sections.push({
          id: `section-${id}-image`,
          type: 'image',
          title: 'Image',
          description: '',
          data: { url: r.url ?? '', previewUrl: r.url ?? '', ...(r.resourceId ? { resourceId: r.resourceId } : {}) }
        })
      }
    } else if (imageResources.length > 1) {
      // Multiple image resources → restore as `photo-gallery` section
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
          id: `section-${id}-gallery`,
          type: 'photo-gallery',
          title: 'Photo Gallery',
          description: '',
          data: { images: galleryImages }
        })
      }
    }
    if (slidesResources.length > 0) {
      const slidesFiles = slidesResources.map((r: { url?: string; name?: string; resourceId?: string }) => ({
        url: r.url ?? '',
        name: r.name ?? (r.url ?? '').split('/').pop() ?? 'File',
        ...(r.resourceId ? { resourceId: r.resourceId } : {})
      }))
      const existingSlides = sections.find((s: any) => s.type === 'slides')
      if (existingSlides) {
        const current = (existingSlides.data?.files as any[]) ?? []
        existingSlides.data = { ...existingSlides.data, files: [...current, ...slidesFiles] }
      } else {
        sections.push({
          id: `section-${id}-slides`,
          type: 'slides',
          title: 'Slides',
          description: '',
          data: { files: slidesFiles }
        })
      }
    }
    if (otherResources.length > 0) {
      const existingResources = sections.find((s: any) => s.type === 'resources')
      if (existingResources) {
        const current = (existingResources.data?.files as any[]) ?? []
        existingResources.data = { ...existingResources.data, files: [...current, ...otherResources] }
      } else {
        sections.push({
          id: `section-${id}-resources`,
          type: 'resources',
          title: 'Resources',
          description: '',
          data: { files: otherResources }
        })
      }
    }
  }
  // Deduplicate video sections: keep one (first) and merge videoUrl (avoids empty duplicate Video block)
  let sectionsOut = sections
  const videoIndices = sections.map((s: any, i: number) => (s.type === 'video' ? i : -1)).filter((i: number) => i >= 0)
  if (videoIndices.length > 1) {
    const mergedUrl =
      videoIndices
        .map((i: number) => sections[i].data?.videoUrl ?? sections[i].data?.video_url ?? '')
        .find((u: string) => String(u).trim()) ?? ''
    const keepIndex = videoIndices[0]
    const filtered = sections.filter((s: any, i: number) => s.type !== 'video' || i === keepIndex)
    const videoSectionNewIndex = filtered.findIndex((s: any) => s.type === 'video')
    if (videoSectionNewIndex !== -1) {
      filtered[videoSectionNewIndex] = {
        ...filtered[videoSectionNewIndex],
        data: { ...filtered[videoSectionNewIndex].data, videoUrl: mergedUrl, video_url: mergedUrl }
      }
    }
    sectionsOut = filtered
  }
  if (!sectionsOut.length && description) {
    sectionsOut = [
      ...sectionsOut,
      { id: `section-${id}-desc`, type: 'text', title: 'Description', description }
    ]
  }
  let date: Date | undefined
  const rawDate = raw?.date ?? raw?.start_at ?? raw?.start_datetime ?? null
  if (rawDate) {
    const d = new Date(rawDate)
    if (!Number.isNaN(d.getTime())) date = d
  }
  const parentId = (() => {
    const p = raw?.parent_session_uuid ?? raw?.parentSessionUuid ?? raw?.parent_id ?? raw?.parentId ?? null
    if (p == null) return undefined
    if (typeof p === 'string') return p.trim() || undefined
    if (typeof p === 'object' && p !== null) {
      const u = (p as any)?.uuid ?? (p as any)?.id
      return u != null ? String(u) : undefined
    }
    return undefined
  })()
  return {
    id,
    title,
    startTime: start.time,
    startPeriod: start.period,
    endTime: end.time,
    endPeriod: end.period,
    location: raw?.location ?? raw?.venue ?? '',
    sessionType: raw?.session_type ?? raw?.sessionType ?? raw?.type ?? 'keynote',
    tags,
    sections: sectionsOut,
    attachment_count:
      typeof raw?.attachment_count === 'number'
        ? raw.attachment_count
        : Array.isArray(raw?.attachments)
          ? raw.attachments.length
          : 0,
    attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
    date,
    parentId
  }
}
