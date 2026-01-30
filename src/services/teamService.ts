import { API_ENDPOINTS } from '../config/env'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'
import type { ApiResponse } from './authService'

export type TeamMemberStatus = 'active' | 'pending'

export interface TeamMember {
  id: string
  name: string
  email: string
  status: TeamMemberStatus
  role: string
  avatarUrl?: string | null
  /** Present for pending invites in some APIs */
  inviteId?: string | null
}

export interface InviteTeamMemberRequest {
  email: string
  role: string
}

function getBaseHost(): string {
  // Derive host from any known endpoint (event list is always configured)
  // Example: https://host/api/v1/admin/event/  -> https://host
  return String(API_ENDPOINTS.EVENT.LIST).replace(/\/api\/v1\/admin\/.*$/i, '')
}

function isHtmlResponse(response: Response, bodyText?: string): boolean {
  const ct = response.headers.get('content-type') || ''
  if (ct.toLowerCase().includes('text/html')) return true
  const t = String(bodyText || '')
  return t.includes('<!DOCTYPE html') || t.includes('<html') || t.includes('<title>Page not found')
}

function friendlyHttpError(response: Response): string {
  if (response.status === 404) return 'Endpoint not found on server (404).'
  if (response.status === 401) return 'Authentication required. Please login again.'
  if (response.status === 403) return 'You do not have permission to perform this action.'
  return `Request failed (${response.status}).`
}

async function tryFetchJson(url: string, init: RequestInit): Promise<{ ok: true; json: any } | { ok: false; response: Response; text: string }> {
  const response = await fetch(url, init)
  const text = await response.text()
  if (!response.ok) return { ok: false, response, text }
  if (!text || !text.trim()) return { ok: true, json: [] }
  try {
    return { ok: true, json: JSON.parse(text) }
  } catch {
    // Some endpoints may return 200 + HTML; handle gracefully.
    return { ok: true, json: text }
  }
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  try {
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!accessToken) throw new Error(handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.'))
    if (!organizationUuid) throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))

    const base = getBaseHost()
    const candidates = [
      API_ENDPOINTS.TEAM.LIST,
      `${base}/api/v1/users/`,
      `${base}/api/v1/admin/users/`,
      `${base}/api/v1/admin/team-members/`,
    ].filter(Boolean)

    const init: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    }

    let lastError: { response: Response; text: string } | null = null
    let data: any = null

    for (const url of candidates) {
      const res = await tryFetchJson(url, init)
      if (res.ok) {
        data = res.json
        // If we got HTML back with 200, treat as failure and continue.
        if (typeof data === 'string' && data.includes('<html')) {
          continue
        }
        break
      }
      // If 404, try next candidate; otherwise stop and surface error.
      if (res.response.status === 404) {
        lastError = { response: res.response, text: res.text }
        continue
      }
      lastError = { response: res.response, text: res.text }
      break
    }

    if (data == null) {
      if (!lastError) throw new Error('Failed to fetch team members.')
      if (isHtmlResponse(lastError.response, lastError.text)) {
        throw new Error(friendlyHttpError(lastError.response))
      }
      let err: any = null
      try { err = lastError.text ? JSON.parse(lastError.text) : null } catch {}
      throw new Error(handleApiError(err || lastError.text, lastError.response, 'Failed to fetch team members.'))
    }

    // Support multiple shapes:
    // 1) ApiResponse: { status, data: TeamMember[] | { results: [] } }
    // 2) DRF pagination: { results: [] }
    // 3) Direct array: []
    let raw: any = null
    if (data?.status === 'error') throw new Error(handleApiError(data, undefined, 'Failed to fetch team members.'))
    if (data?.status === 'success') {
      raw = data.data ?? null
    } else {
      raw = data
    }

    const arr =
      Array.isArray(raw) ? raw :
      Array.isArray(raw?.results) ? raw.results :
      Array.isArray(raw?.data) ? raw.data :
      Array.isArray(raw?.data?.results) ? raw.data.results :
      []

    const normalize = (m: any): TeamMember => {
      const id = String(m?.uuid ?? m?.id ?? m?.user_uuid ?? m?.user?.uuid ?? '')
      const email = String(m?.email ?? m?.user?.email ?? '').trim()
      const name = String(m?.name ?? m?.full_name ?? m?.user?.name ?? m?.user?.full_name ?? '').trim() || email.split('@')[0] || 'Unknown'
      const role = String(m?.role ?? m?.role_name ?? m?.user_role ?? m?.permissions ?? '').trim() || 'Member'
      const statusRaw = String(m?.status ?? m?.invite_status ?? m?.state ?? '').toLowerCase()
      const status: TeamMemberStatus = statusRaw.includes('pending') || statusRaw.includes('invite') ? 'pending' : 'active'
      const avatarUrl = m?.avatar_url ?? m?.avatarUrl ?? m?.user?.avatar_url ?? null
      const inviteId = m?.invite_uuid ?? m?.inviteId ?? m?.invite?.uuid ?? null
      return { id, name, email, role, status, avatarUrl, inviteId }
    }

    return (arr as any[])
      .map(normalize)
      .filter((m) => Boolean(m.id) && Boolean(m.email))
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(handleNetworkError(error))
    }
    throw error instanceof Error ? error : new Error('Failed to fetch team members.')
  }
}

export async function inviteTeamMember(request: InviteTeamMemberRequest): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) throw new Error(handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.'))
  if (!organizationUuid) throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))

  const base = getBaseHost()
  const candidates = [
    API_ENDPOINTS.TEAM.INVITE,
    `${base}/api/v1/admin/team-invites/`,
    `${base}/api/v1/users/invite/`,
    `${base}/api/v1/admin/users/invite/`,
  ].filter(Boolean)

  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify({ email: request.email.trim(), role: request.role }),
  }

  let last: { response: Response; text: string } | null = null
  for (const url of candidates) {
    const response = await fetch(url, init)
    const txt = await response.text()
    if (response.ok) return
    if (response.status === 404) {
      last = { response, text: txt }
      continue
    }
    last = { response, text: txt }
    break
  }

  if (last) {
    if (isHtmlResponse(last.response, last.text)) throw new Error(friendlyHttpError(last.response))
    let err: any = null
    try { err = last.text ? JSON.parse(last.text) : null } catch {}
    throw new Error(handleApiError(err || last.text, last.response, 'Failed to invite team member.'))
  }
  throw new Error('Failed to invite team member.')
}

export async function updateTeamMemberRole(memberUuid: string, role: string): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) throw new Error(handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.'))
  if (!organizationUuid) throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))

  const base = getBaseHost()
  const candidates = [
    API_ENDPOINTS.TEAM.UPDATE_MEMBER(memberUuid),
    `${base}/api/v1/users/${memberUuid}/`,
    `${base}/api/v1/admin/users/${memberUuid}/`,
    `${base}/api/v1/admin/team-members/${memberUuid}/`,
  ].filter(Boolean)

  let last: { response: Response; text: string } | null = null
  for (const url of candidates) {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
      body: JSON.stringify({ role }),
    })
    const txt = await response.text()
    if (response.ok) return
    if (response.status === 404) {
      last = { response, text: txt }
      continue
    }
    last = { response, text: txt }
    break
  }
  if (last) {
    if (isHtmlResponse(last.response, last.text)) throw new Error(friendlyHttpError(last.response))
    let err: any = null
    try { err = last.text ? JSON.parse(last.text) : null } catch {}
    throw new Error(handleApiError(err || last.text, last.response, 'Failed to update role.'))
  }
  throw new Error('Failed to update role.')
}

export async function removeTeamMember(memberUuid: string): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) throw new Error(handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.'))
  if (!organizationUuid) throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))

  const base = getBaseHost()
  const candidates = [
    API_ENDPOINTS.TEAM.REMOVE_MEMBER(memberUuid),
    `${base}/api/v1/users/${memberUuid}/`,
    `${base}/api/v1/admin/users/${memberUuid}/`,
    `${base}/api/v1/admin/team-members/${memberUuid}/`,
  ].filter(Boolean)

  let last: { response: Response; text: string } | null = null
  for (const url of candidates) {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    })
    const txt = await response.text()
    if (response.ok) return
    if (response.status === 404) {
      last = { response, text: txt }
      continue
    }
    last = { response, text: txt }
    break
  }

  if (last) {
    if (isHtmlResponse(last.response, last.text)) throw new Error(friendlyHttpError(last.response))
    let err: any = null
    try { err = last.text ? JSON.parse(last.text) : null } catch {}
    throw new Error(handleApiError(err || last.text, last.response, 'Failed to remove team member.'))
  }
  throw new Error('Failed to remove team member.')
}

export async function resendTeamInvite(inviteUuid: string): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) throw new Error(handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.'))
  if (!organizationUuid) throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))

  const base = getBaseHost()
  const candidates = [
    API_ENDPOINTS.TEAM.RESEND_INVITE(inviteUuid),
    `${base}/api/v1/admin/team-invites/${inviteUuid}/resend/`,
  ].filter(Boolean)

  let last: { response: Response; text: string } | null = null
  for (const url of candidates) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    })
    const txt = await response.text()
    if (response.ok) return
    if (response.status === 404) {
      last = { response, text: txt }
      continue
    }
    last = { response, text: txt }
    break
  }

  if (last) {
    if (isHtmlResponse(last.response, last.text)) throw new Error(friendlyHttpError(last.response))
    let err: any = null
    try { err = last.text ? JSON.parse(last.text) : null } catch {}
    throw new Error(handleApiError(err || last.text, last.response, 'Failed to resend invite.'))
  }
  throw new Error('Failed to resend invite.')
}

