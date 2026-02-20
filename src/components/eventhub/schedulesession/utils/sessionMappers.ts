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
  const normalizeTags = (tags: any): string[] => {
    if (!tags) return []
    if (Array.isArray(tags)) {
      return tags
        .map((t) => (typeof t === 'string' ? t : t?.name ?? t?.title ?? t?.label ?? null))
        .filter(Boolean)
    }
    return []
  }
  const tags = normalizeTags(raw?.tags)
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
    let sectionData: Record<string, unknown> = { ...content, speaker_uuids: content?.speaker_uuids ?? [], url: content?.url ?? content?.video_url ?? '' }
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
    return {
      id: `section-${id}-${i}`,
      ...(apiSectionId ? { sectionId: apiSectionId } : {}),
      type: uiType,
      title: (content?.title ?? sec?.title ?? 'Section').toString(),
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
    const nonVideoResources: typeof resourceFiles = []
    resourceFiles.forEach((item: { url?: string; name: string }) => {
      const url = item?.url ?? ''
      const name = item?.name ?? ''
      if (VIDEO_EXTENSIONS.test(String(url)) || VIDEO_EXTENSIONS.test(String(name))) {
        videoResources.push(item)
      } else {
        nonVideoResources.push(item)
      }
    })
    if (videoResources.length > 0) {
      const firstVideo = videoResources[0]
      const videoUrl = typeof firstVideo === 'object' && firstVideo?.url ? String(firstVideo.url) : ''
      let videoSection = sections.find((s: any) => s.type === 'video')
      if (videoSection) {
        videoSection.data = {
          ...(videoSection.data || {}),
          videoUrl,
          video_url: videoUrl
        }
      } else {
        sections.push({
          id: `section-${id}-video`,
          type: 'video',
          title: 'Video',
          description: '',
          data: { videoUrl, video_url: videoUrl }
        })
      }
    }
    if (nonVideoResources.length > 0) {
      const existingResources = sections.find((s: any) => s.type === 'resources')
      if (existingResources) {
        const current = (existingResources.data?.files as any[]) ?? []
        existingResources.data = { ...existingResources.data, files: [...current, ...nonVideoResources] }
      } else {
        sections.push({
          id: `section-${id}-resources`,
          type: 'resources',
          title: 'Resources',
          description: '',
          data: { files: nonVideoResources }
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
    attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
    date,
    parentId
  }
}
