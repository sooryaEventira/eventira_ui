import { API_ENDPOINTS } from '../config/env'
import { handleApiError } from '../utils/errorHandler'

/** Payload for POST sessions (create session). Backend expects these field names. */
export interface CreateSessionBody {
  event_uuid: string
  schedule_uuid: string
  title: string
  description?: string
  start_at: string
  end_at: string
  location: string
  session_type: string
  tag_uuids: string[]
  /** Optional: parent session UUID when creating a child/parallel session */
  parent_session_uuid?: string
}

/** Payload for PUT/PATCH sessions (update session). Backend requires event_uuid and schedule_uuid in body. */
export interface UpdateSessionBody {
  event_uuid: string
  schedule_uuid: string
  title: string
  description?: string
  start_at: string
  end_at: string
  location: string
  session_type: string
  tag_uuids: string[]
  parent_session_uuid?: string | null
}

/** Content shape for text section. API expects content: { title, body }. */
export interface SessionSectionContentText {
  title: string
  body: string
}

/** Content shape for speakers section. API expects content: { speaker_uuids }. */
export interface SessionSectionContentSpeakers {
  speaker_uuids: string[]
}

/** Payload for POST session-sections. Backend requires session_uuid, section_type, order, and content (type-specific). */
export interface CreateSessionSectionItem {
  section_type: string
  order: number
  /** Type-specific content: text → { title, body }; speakers → { speaker_uuids }. */
  content?: Record<string, unknown>
}

export interface CreateSessionSectionsBody {
  session_uuid: string
  sections: CreateSessionSectionItem[]
}

/** Payload for PATCH session-sections/{{session_section_id}}/. Same shape as create item (session_uuid, section_type, order, content). */
export interface UpdateSessionSectionBody {
  session_uuid?: string
  section_type?: string
  order?: number
  content?: Record<string, unknown>
}

/** List sessions for a schedule. GET {{admin_url}}sessions/?event_id=&schedule_uuid= (admin/schedule page only; published website uses event store). */
export async function listSessions(
  eventUuid: string,
  scheduleUuid: string
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; errorText: string }> {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken || !organizationUuid) {
    return { ok: false, status: 401, errorText: 'Missing auth or organization context' }
  }
  const url = API_ENDPOINTS.SESSIONS.LIST(eventUuid, scheduleUuid)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })
  const rawText = await response.text().catch(() => '')
  if (!response.ok) {
    return { ok: false, status: response.status, errorText: rawText }
  }
  let data: unknown = null
  try {
    data = rawText ? JSON.parse(rawText) : null
  } catch {
    data = null
  }
  return { ok: true, data }
}

/** Fallback: find session UUID from list when create response doesn't return it. Matches by title + start_at. */
export async function findSessionUuidFromList(
  eventUuid: string,
  scheduleUuid: string,
  match: { title: string; start_at: string }
): Promise<string | undefined> {
  const result = await listSessions(eventUuid, scheduleUuid)
  if (!result.ok || !result.data) return undefined
  const payload = result.data as Record<string, unknown>
  const extractArray = (p: unknown): unknown[] => {
    if (!p || typeof p !== 'object') return []
    const x = p as Record<string, unknown>
    if (Array.isArray(x)) return x
    if (Array.isArray(x.data)) return x.data
    if (Array.isArray(x.results)) return x.results
    if (Array.isArray(x.sessions)) return x.sessions
    const d = x.data as Record<string, unknown> | undefined
    if (d && typeof d === 'object') {
      if (Array.isArray(d.results)) return d.results
      if (Array.isArray(d.sessions)) return d.sessions
      if (Array.isArray(d.data)) return d.data
    }
    return []
  }
  const items = extractArray(payload)
  const titleNorm = (match.title || '').trim().toLowerCase()
  const startPrefix = (match.start_at || '').trim().slice(0, 19)
  let matchByStartOnly: Record<string, unknown> | null = null
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const s = item as Record<string, unknown>
    const t = String(s.title ?? s.name ?? '').trim().toLowerCase()
    const start = String(s.start_at ?? s.startAt ?? s.start_datetime ?? '').trim()
    const titleMatch = t === titleNorm || (titleNorm && t.includes(titleNorm))
    const startMatch = !startPrefix || start === startPrefix || start.startsWith(startPrefix) || (start.length >= 19 && startPrefix.startsWith(start.slice(0, 19)))
    if (titleMatch && startMatch) {
      const uid = s.uuid ?? s.id ?? s.session_uuid ?? s.session_id
      if (uid != null) return typeof uid === 'string' ? uid : String(uid)
    }
    if (startMatch && !matchByStartOnly) matchByStartOnly = s
  }
  if (matchByStartOnly) {
    const uid = matchByStartOnly.uuid ?? matchByStartOnly.id ?? matchByStartOnly.session_uuid ?? matchByStartOnly.session_id
    if (uid != null) return typeof uid === 'string' ? uid : String(uid)
  }
  if (items.length === 1) {
    const s = items[0] as Record<string, unknown>
    if (s) {
      const uid = s.uuid ?? s.id ?? s.session_uuid ?? s.session_id
      if (uid != null) return typeof uid === 'string' ? uid : String(uid)
    }
  }
  return undefined
}

/** Retrieve a single session. GET {{admin_url}}sessions/{{session_uuid}}/?event_id=&schedule_uuid= */
export async function getSession(
  eventUuid: string,
  scheduleUuid: string,
  sessionUuid: string
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; errorText: string }> {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken || !organizationUuid) {
    return { ok: false, status: 401, errorText: 'Missing auth or organization context' }
  }
  const url = API_ENDPOINTS.SESSIONS.RETRIEVE(sessionUuid, eventUuid, scheduleUuid)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })
  const rawText = await response.text().catch(() => '')
  if (!response.ok) {
    return { ok: false, status: response.status, errorText: rawText }
  }
  let data: unknown = null
  try {
    data = rawText ? JSON.parse(rawText) : null
  } catch {
    data = null
  }
  return { ok: true, data }
}

/** Create a session. POST {{admin_url}}sessions/?event_id={{event_uuid}} */
export async function createSession(eventUuid: string, body: CreateSessionBody): Promise<{ uuid?: string; [key: string]: unknown }> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    const msg = handleApiError('Authentication required.', undefined, 'Authentication required.')
    throw new Error(msg)
  }
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) {
    const msg = handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.')
    throw new Error(msg)
  }

  const url = API_ENDPOINTS.SESSIONS.CREATE(eventUuid)
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

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let err: unknown = text
    try {
      if (text) err = JSON.parse(text)
    } catch {
      // use text as message
    }
    const message = handleApiError(err, response, 'Failed to create session.')
    throw new Error(message)
  }

  const text = await response.text()
  let result: Record<string, unknown> = {}
  try {
    if (text?.trim()) {
      const data = JSON.parse(text)
      const raw = data?.data ?? data
      result = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    }
    // Fallback: extract uuid from Location header (e.g. .../sessions/{uuid}/)
    const location = response.headers.get('Location')
    if (location && !result.uuid && !result.id) {
      const match = location.match(/sessions\/([a-f0-9-]{36})\/?/i) ?? location.match(/sessions\/([a-zA-Z0-9_-]+)\/?/)
      if (match?.[1]) {
        result = { ...result, uuid: match[1] }
      }
    }
    return result as { uuid?: string; [key: string]: unknown }
  } catch {
    return result as { uuid?: string; [key: string]: unknown }
  }
}

/** Extract session UUID from create/update session response. Handles common backend formats. */
export function getSessionUuidFromResponse(res: unknown): string | undefined {
  if (!res || typeof res !== 'object') return undefined
  const r = res as Record<string, unknown>
  const tryObj = (obj: Record<string, unknown>) =>
    obj?.uuid ?? obj?.id ?? obj?.session_uuid ?? obj?.session_id
  let val: unknown =
    tryObj(r) ??
    (r.data && typeof r.data === 'object' ? tryObj(r.data as Record<string, unknown>) : undefined) ??
    (r.result && typeof r.result === 'object' ? tryObj(r.result as Record<string, unknown>) : undefined) ??
    (r.session && typeof r.session === 'object' ? tryObj(r.session as Record<string, unknown>) : undefined)
  if (Array.isArray(r.data) && r.data.length > 0 && typeof r.data[0] === 'object') {
    val = val ?? tryObj(r.data[0] as Record<string, unknown>)
  }
  if (typeof val === 'string' && val.trim()) return val.trim()
  if (typeof val === 'number' && !Number.isNaN(val)) return String(val)
  return undefined
}

/** Update a session. PATCH .../sessions/{{session_uuid}}/?event_id=&schedule_uuid= */
export async function updateSession(
  eventUuid: string,
  sessionUuid: string,
  scheduleUuid: string,
  body: UpdateSessionBody
): Promise<{ uuid?: string; [key: string]: unknown }> {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken || !organizationUuid) {
    throw new Error('Authentication or organization context missing.')
  }
  const url = API_ENDPOINTS.SESSIONS.UPDATE(sessionUuid, eventUuid, scheduleUuid)
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
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let err: unknown = text
    try {
      if (text) err = JSON.parse(text)
    } catch {
      // use text as message
    }
    const message = handleApiError(err, response, 'Failed to update session.')
    throw new Error(message)
  }
  const text = await response.text()
  if (!text?.trim()) return {}
  try {
    const data = JSON.parse(text)
    const raw = data?.data ?? data
    return (raw && typeof raw === 'object' ? raw : {}) as { uuid?: string; [key: string]: unknown }
  } catch {
    return {}
  }
}

/** Delete a session. DELETE .../sessions/{{session_uuid}}/?schedule_uuid= with body { event_id }. */
export async function deleteSession(
  eventUuid: string,
  sessionUuid: string,
  scheduleUuid: string
): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken || !organizationUuid) {
    throw new Error('Authentication or organization context missing.')
  }
  const url = API_ENDPOINTS.SESSIONS.DELETE(sessionUuid, scheduleUuid)
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify({ event_id: eventUuid }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let err: unknown = text
    try {
      if (text) err = JSON.parse(text)
    } catch {
      // use text as message
    }
    const message = handleApiError(err, response, 'Failed to delete session.')
    throw new Error(message)
  }
}

/** Single section body for POST. Backend requires session_uuid, section_type, order, and content (type-specific). */
function postOneSessionSection(
  eventUuid: string,
  body: { session_uuid: string; section_type: string; order: number; content?: Record<string, unknown> }
): Promise<unknown> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    const msg = handleApiError('Authentication required.', undefined, 'Authentication required.')
    return Promise.reject(new Error(msg))
  }
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) {
    const msg = handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.')
    return Promise.reject(new Error(msg))
  }

  const url = API_ENDPOINTS.SESSION_SECTIONS.CREATE(eventUuid)
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify(body),
  }).then(async (response) => {
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      let err: unknown = text
      try {
        if (text) err = JSON.parse(text)
      } catch {
        // ignore
      }
      const message = handleApiError(err, response, 'Failed to create session section.')
      throw new Error(message)
    }
    const text = await response.text()
    if (!text?.trim()) return null
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  })
}

/** Update a single session section. PATCH {{admin_url}}session-sections/{{session_section_id}}/?event_id={{event_uuid}} */
export async function updateSessionSection(
  eventUuid: string,
  sessionSectionId: string,
  body: UpdateSessionSectionBody
): Promise<unknown> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    const msg = handleApiError('Authentication required.', undefined, 'Authentication required.')
    throw new Error(msg)
  }
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) {
    const msg = handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.')
    throw new Error(msg)
  }
  const url = API_ENDPOINTS.SESSION_SECTIONS.UPDATE(sessionSectionId, eventUuid)
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
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let err: unknown = text
    try {
      if (text) err = JSON.parse(text)
    } catch {
      // ignore
    }
    const message = handleApiError(err, response, 'Failed to update session section.')
    throw new Error(message)
  }
  const text = await response.text()
  if (!text?.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Delete a session section. DELETE {{admin_url}}session-sections/{{session_section_id}}/?event_id={{event_uuid}} */
export async function deleteSessionSection(
  eventUuid: string,
  sessionSectionId: string
): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    const msg = handleApiError('Authentication required.', undefined, 'Authentication required.')
    throw new Error(msg)
  }
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) {
    const msg = handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.')
    throw new Error(msg)
  }
  const url = API_ENDPOINTS.SESSION_SECTIONS.DELETE(sessionSectionId, eventUuid)
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let err: unknown = text
    try {
      if (text) err = JSON.parse(text)
    } catch {
      // ignore
    }
    const message = handleApiError(err, response, 'Failed to delete session section.')
    throw new Error(message)
  }
}

/** Create session sections (one POST per section). POST {{admin_url}}session-sections/?event_id={{event_uuid}} */
export async function createSessionSections(
  eventUuid: string,
  body: CreateSessionSectionsBody
): Promise<unknown[]> {
  const { session_uuid, sections } = body
  console.log('[Session-sections] createSessionSections called:', sections.length, 'sections, section_types:', sections.map((s) => s.section_type))
  const results: unknown[] = []
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    const result = await postOneSessionSection(eventUuid, {
      session_uuid,
      section_type: s.section_type,
      order: s.order,
      content: s.content
    })
    results.push(result)
  }
  return results
}

/** Payload for PATCH session-resources/{{session_resource_id}}/. Backend may accept JSON (e.g. title, order) or FormData to replace file. */
export interface UpdateSessionResourceBody {
  session_uuid?: string
  title?: string
  order?: number
  [key: string]: unknown
}

/** Update a session resource. PATCH {{admin_url}}session-resources/{{session_resource_id}}/?event_id={{event_uuid}} */
export async function updateSessionResource(
  eventUuid: string,
  sessionResourceId: string,
  body: UpdateSessionResourceBody
): Promise<unknown> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    const msg = handleApiError('Authentication required.', undefined, 'Authentication required.')
    throw new Error(msg)
  }
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) {
    const msg = handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.')
    throw new Error(msg)
  }
  const url = API_ENDPOINTS.SESSION_RESOURCES.UPDATE(sessionResourceId, eventUuid)
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
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let err: unknown = text
    try {
      if (text) err = JSON.parse(text)
    } catch {
      // ignore
    }
    const message = handleApiError(err, response, 'Failed to update session resource.')
    throw new Error(message)
  }
  const text = await response.text()
  if (!text?.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Delete a session resource. DELETE {{admin_url}}session-resources/{{session_resource_id}}/?event_id={{event_uuid}} */
export async function deleteSessionResource(
  eventUuid: string,
  sessionResourceId: string
): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    const msg = handleApiError('Authentication required.', undefined, 'Authentication required.')
    throw new Error(msg)
  }
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) {
    const msg = handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.')
    throw new Error(msg)
  }
  const url = API_ENDPOINTS.SESSION_RESOURCES.DELETE(sessionResourceId, eventUuid)
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let err: unknown = text
    try {
      if (text) err = JSON.parse(text)
    } catch {
      // ignore
    }
    const message = handleApiError(err, response, 'Failed to delete session resource.')
    throw new Error(message)
  }
}

/** Create session resources (files). POST {{admin_url}}session-resources/?event_id={{event_uuid}} */
export async function createSessionResources(
  eventUuid: string,
  files: File[],
  options?: { session_uuid?: string }
): Promise<unknown> {
  if (!files.length) return null

  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    const msg = handleApiError('Authentication required.', undefined, 'Authentication required.')
    throw new Error(msg)
  }
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!organizationUuid) {
    const msg = handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.')
    throw new Error(msg)
  }

  const formData = new FormData()
  files.forEach((file) => formData.append('file', file))
  if (options?.session_uuid) {
    formData.append('session_uuid', options.session_uuid)
  }
  formData.append('event_uuid', eventUuid)

  const url = API_ENDPOINTS.SESSION_RESOURCES.CREATE(eventUuid)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let err: unknown = text
    try {
      if (text) err = JSON.parse(text)
    } catch {
      // ignore
    }
    const message = handleApiError(err, response, 'Failed to upload session resources.')
    throw new Error(message)
  }

  const text = await response.text()
  if (!text?.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
