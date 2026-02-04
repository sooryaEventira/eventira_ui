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
  if (!text?.trim()) return {}
  try {
    const data = JSON.parse(text)
    const raw = data?.data ?? data
    return (raw && typeof raw === 'object' ? raw : {}) as { uuid?: string; [key: string]: unknown }
  } catch {
    return {}
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

/** Create session sections (one POST per section). POST {{admin_url}}session-sections/?event_id={{event_uuid}} */
export async function createSessionSections(
  eventUuid: string,
  body: CreateSessionSectionsBody
): Promise<unknown[]> {
  const { session_uuid, sections } = body
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
  files.forEach((file) => formData.append('files', file))
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
