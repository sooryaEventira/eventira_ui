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
  /** Organization UUID (defaults to localStorage organizationUuid when not provided). */
  organization?: string
  /** Event UUIDs to grant access to. */
  events?: string[]
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

    const url = API_ENDPOINTS.TEAM.LIST
    const init: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    }

    const res = await tryFetchJson(url, init)
    if (!res.ok) {
      if (isHtmlResponse(res.response, res.text)) throw new Error(friendlyHttpError(res.response))
      let err: any = null
      try { err = res.text ? JSON.parse(res.text) : null } catch {}
      throw new Error(handleApiError(err || res.text, res.response, 'Failed to fetch team members.'))
    }

    let data: any = res.json
    if (typeof data === 'string' && data.includes('<html')) {
      throw new Error('Invalid response from server.')
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

/** Response from invite API: contains teamInviteUuid used for accept/revoke and for the invite link (dashboard?invite=uuid). */
export interface InviteTeamMemberResponse {
  teamInviteUuid: string
}

export async function inviteTeamMember(request: InviteTeamMemberRequest): Promise<InviteTeamMemberResponse> {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) throw new Error(handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.'))
  if (!organizationUuid) throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))

  const url = API_ENDPOINTS.TEAM.INVITE
  const body = {
    email: request.email.trim(),
    organization: request.organization ?? organizationUuid,
    role: request.role,
    events: Array.isArray(request.events) ? request.events : [],
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  const responseText = await response.text()

  if (!response.ok) {
    if (isHtmlResponse(response, responseText)) throw new Error(friendlyHttpError(response))
    let err: any = null
    try { err = responseText ? JSON.parse(responseText) : null } catch {}
    throw new Error(handleApiError(err || responseText, response, 'Failed to invite team member.'))
  }

  let data: any = null
  try {
    data = responseText ? JSON.parse(responseText) : null
  } catch {
    console.log('[inviteTeamMember] response:', { status: response.status, raw: responseText })
    throw new Error(handleApiError(null, response, 'Invalid invite response.'))
  }

  console.log('[inviteTeamMember] response:', { status: response.status, data })

  const inner = data?.data
  const uuid = inner?.uuid ?? data?.uuid ?? ''
  if (!uuid) {
    console.warn('[inviteTeamMember] No uuid in response; accept/revoke link will be unavailable.', data)
  }

  return { teamInviteUuid: String(uuid || '') }
}

export interface AcceptTeamInviteResponse {
  organization_uuid: string
  organization_name?: string
}

export interface MyInvitation {
  uuid: string
  organization: { uuid: string; name: string }
  role: string
  events: { uuid: string; title: string }[]
  status: string
  expires_at: string
  created_date: string
}

export async function fetchMyInvitations(): Promise<MyInvitation[]> {
  const accessToken = localStorage.getItem('accessToken')
  const organizationUuid = localStorage.getItem('organizationUuid')
  if (!accessToken) throw new Error(handleApiError('Authentication required.', undefined, 'Authentication required.'))
  if (!organizationUuid) throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))

  const res = await tryFetchJson(API_ENDPOINTS.TEAM.INVITATIONS_MINE, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Organization': organizationUuid,
    },
    credentials: 'include',
  })

  if (!res.ok) {
    if (isHtmlResponse(res.response, res.text)) throw new Error(friendlyHttpError(res.response))
    let err: any = null
    try { err = res.text ? JSON.parse(res.text) : null } catch {}
    throw new Error(handleApiError(err || res.text, res.response, 'Failed to fetch invitations.'))
  }

  const data = res.json
  const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
  return arr as MyInvitation[]
}

export async function acceptTeamInvite(teamInviteUuid: string): Promise<AcceptTeamInviteResponse> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) throw new Error(handleApiError('Authentication required.', undefined, 'Authentication required.'))

  const url = API_ENDPOINTS.TEAM.ACCEPT_INVITE(teamInviteUuid)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  })

  const txt = await response.text()
  if (!response.ok) {
    if (isHtmlResponse(response, txt)) throw new Error(friendlyHttpError(response))
    let err: any = null
    try { err = txt ? JSON.parse(txt) : null } catch {}
    throw new Error(handleApiError(err || txt, response, 'Failed to accept invitation.'))
  }

  let data: any = null
  try { data = txt ? JSON.parse(txt) : null } catch {}
  const inner = data?.data ?? data
  return {
    organization_uuid: String(inner?.organization_uuid ?? ''),
    organization_name: inner?.organization_name ? String(inner.organization_name) : undefined,
  }
}

export async function revokeTeamInvite(teamInviteUuid: string): Promise<void> {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) throw new Error(handleApiError('Authentication required.', undefined, 'Authentication required.'))

  const url = API_ENDPOINTS.TEAM.REVOKE_INVITE(teamInviteUuid)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const txt = await response.text()
    if (isHtmlResponse(response, txt)) throw new Error(friendlyHttpError(response))
    let err: any = null
    try { err = txt ? JSON.parse(txt) : null } catch {}
    throw new Error(handleApiError(err || txt, response, 'Failed to revoke invitation.'))
  }
}

// export async function removeTeamMember(memberUuid: string): Promise<void> {
//   const accessToken = localStorage.getItem('accessToken')
//   const organizationUuid = localStorage.getItem('organizationUuid')
//   if (!accessToken) throw new Error(handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.'))
//   if (!organizationUuid) throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))

//   const base = getBaseHost()
//   const candidates = [
//     API_ENDPOINTS.TEAM.REMOVE_MEMBER(memberUuid),
//     `${base}/api/v1/users/${memberUuid}/`,
//     `${base}/api/v1/admin/users/${memberUuid}/`,
//     `${base}/api/v1/admin/team-members/${memberUuid}/`,
//   ].filter(Boolean)

//   let last: { response: Response; text: string } | null = null
//   for (const url of candidates) {
//     const response = await fetch(url, {
//       method: 'DELETE',
//       headers: {
//         'Authorization': `Bearer ${accessToken}`,
//         'X-Organization': organizationUuid,
//       },
//       credentials: 'include',
//     })
//     const txt = await response.text()
//     if (response.ok) return
//     if (response.status === 404) {
//       last = { response, text: txt }
//       continue
//     }
//     last = { response, text: txt }
//     break
//   }

//   if (last) {
//     if (isHtmlResponse(last.response, last.text)) throw new Error(friendlyHttpError(last.response))
//     let err: any = null
//     try { err = last.text ? JSON.parse(last.text) : null } catch {}
//     throw new Error(handleApiError(err || last.text, last.response, 'Failed to remove team member.'))
//   }
//   throw new Error('Failed to remove team member.')
// }

// export async function resendTeamInvite(inviteUuid: string): Promise<void> {
//   const accessToken = localStorage.getItem('accessToken')
//   const organizationUuid = localStorage.getItem('organizationUuid')
//   if (!accessToken) throw new Error(handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.'))
//   if (!organizationUuid) throw new Error(handleApiError('Organization UUID is missing.', undefined, 'Organization UUID is missing.'))

//   const base = getBaseHost()
//   const candidates = [
//     API_ENDPOINTS.TEAM.RESEND_INVITE(inviteUuid),
//     `${base}/api/v1/admin/team-invites/${inviteUuid}/resend/`,
//   ].filter(Boolean)

//   let last: { response: Response; text: string } | null = null
//   for (const url of candidates) {
//     const response = await fetch(url, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${accessToken}`,
//         'X-Organization': organizationUuid,
//       },
//       credentials: 'include',
//     })
//     const txt = await response.text()
//     if (response.ok) return
//     if (response.status === 404) {
//       last = { response, text: txt }
//       continue
//     }
//     last = { response, text: txt }
//     break
//   }

//   if (last) {
//     if (isHtmlResponse(last.response, last.text)) throw new Error(friendlyHttpError(last.response))
//     let err: any = null
//     try { err = last.text ? JSON.parse(last.text) : null } catch {}
//     throw new Error(handleApiError(err || last.text, last.response, 'Failed to resend invite.'))
//   }
//   throw new Error('Failed to resend invite.')
// }

