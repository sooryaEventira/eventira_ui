import { API_ENDPOINTS } from '../config/env'

export interface PublicLoginResult {
  access: string
  refresh: string
}

/**
 * Login with email + password.
 *
 * POST {{public_url}}auth/token/
 * Body: { email, password }
 */
export async function publicLogin(
  email: string,
  password: string
): Promise<PublicLoginResult> {
  const response = await fetch(API_ENDPOINTS.PUBLIC.TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  })

  let data: any = null
  try {
    data = await response.json()
  } catch {
    // ignore parse error
  }

  if (!response.ok) {
    const msg =
      data?.detail ||
      data?.message ||
      data?.data?.detail ||
      `Login failed (${response.status})`
    throw new Error(msg)
  }

  return {
    access: data?.access ?? data?.data?.access ?? '',
    refresh: data?.refresh ?? data?.data?.refresh ?? '',
  }
}

export type RequestLoginOrRegisterResult =
  | { type: 'otp_sent' }
  | { type: 'password_already_set' }

/**
 * Step 1: Request login or register.
 * - If the user is new → OTP is sent to email → result: 'otp_sent'
 * - If the user already has a password → result: 'password_already_set' (redirect to login)
 *
 * POST {{public_url}}auth/request-login-or-register/
 * Body: { email, first_name, last_name }
 */
export async function requestLoginOrRegister(
  email: string,
  firstName: string,
  lastName: string
): Promise<RequestLoginOrRegisterResult> {
  const response = await fetch(API_ENDPOINTS.PUBLIC.REQUEST_LOGIN_OR_REGISTER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    }),
  })

  let data: any = null
  try {
    data = await response.json()
  } catch {
    // ignore parse error
  }

  if (!response.ok) {
    const msg =
      data?.message ||
      data?.detail ||
      data?.data?.detail ||
      `Request failed (${response.status})`
    throw new Error(msg)
  }

  const detail: string = data?.data?.detail ?? ''
  if (detail.toLowerCase().includes('password already set')) {
    return { type: 'password_already_set' }
  }
  return { type: 'otp_sent' }
}

/**
 * Step 2: Verify OTP.
 *
 * POST {{public_url}}auth/verify-otp/
 * Body: { email, otp }
 */
export async function verifyOtp(email: string, otp: string): Promise<void> {
  const response = await fetch(API_ENDPOINTS.PUBLIC.VERIFY_OTP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
  })

  let data: any = null
  try {
    data = await response.json()
  } catch {
    // ignore parse error
  }

  if (!response.ok) {
    const msg =
      data?.message ||
      data?.detail ||
      data?.data?.detail ||
      `OTP verification failed (${response.status})`
    throw new Error(msg)
  }
}

/**
 * Step 3: Set password after OTP verification.
 *
 * POST {{public_url}}auth/set-password/
 * Body: { email, otp, password }
 */
export async function setPassword(
  email: string,
  otp: string,
  password: string
): Promise<void> {
  const response = await fetch(API_ENDPOINTS.PUBLIC.SET_PASSWORD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      otp: otp.trim(),
      password,
    }),
  })

  let data: any = null
  try {
    data = await response.json()
  } catch {
    // ignore parse error
  }

  if (!response.ok) {
    const msg =
      data?.message ||
      data?.detail ||
      data?.data?.detail ||
      `Failed to set password (${response.status})`
    throw new Error(msg)
  }
}
