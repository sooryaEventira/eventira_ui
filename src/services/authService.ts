import { API_ENDPOINTS } from '../config/env'
import { showToast } from '../utils/toast'
import { handleApiError, handleNetworkError, handleParseError } from '../utils/errorHandler'

export interface ApiResponse<T = any> {
  message: string
  errors: string[]
  data: T
  status: 'success' | 'error'
}

export interface SendOtpRequest {
  email: string
  otp?: string
}

export interface SendOtpResponse {
  email: string
}

export interface VerifyOtpRequest {
  email: string
  otp: string
}

export interface VerifyOtpResponse {
  // Empty data field based on API response
  data: string
}

export interface CreatePasswordRequest {
  email: string
  password: string
}

export interface UserData {
  email: string
  first_name: string
  last_name: string
}

export interface RegisterResponseData {
  user: UserData
  access: string
  refresh: string
}

export interface CreatePasswordResponse {
  user: UserData
  access: string
  refresh: string
}

export interface SignInResponse {
  access: string
  refresh: string
  organizations: any[]
}

export interface CreateOrganizationRequest {
  name: string
}

export interface OrganizationData {
  uuid: string
  name: string
  registration_number?: string | null
  tax_number?: string | null
  affiliations?: any | null
  email?: string | null
  website_url?: string | null
}

/** Public: request login or register (sends OTP to email). POST {{public_url}}auth/request-login-or-register/ */
export const requestLoginOrRegister = async (email: string): Promise<void> => {
  const response = await fetch(API_ENDPOINTS.PUBLIC_AUTH.REQUEST_LOGIN_OR_REGISTER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: email.trim() }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let err: any = text
    try {
      if (text) err = JSON.parse(text)
    } catch {
      // use text
    }
    const msg = handleApiError(err, response, 'Failed to send verification code.')
    throw new Error(msg)
  }
}

/** Public: verify OTP and set password. POST {{public_url}}auth/verify-otp-set-password/ body: { email, otp, password } */
export const verifyOtpSetPassword = async (
  email: string,
  otp: string,
  password: string
): Promise<void> => {
  const response = await fetch(API_ENDPOINTS.PUBLIC_AUTH.VERIFY_OTP_SET_PASSWORD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: email.trim(), otp: otp.trim(), password }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let err: any = text
    try {
      if (text) err = JSON.parse(text)
    } catch {
      // use text
    }
    const msg = handleApiError(err, response, 'Verification or password set failed.')
    throw new Error(msg)
  }
}

/** Public: fetch event list after registration. GET {{public_url}}event/ */
export const fetchPublicEventList = async (): Promise<unknown> => {
  const response = await fetch(API_ENDPOINTS.PUBLIC_AUTH.EVENT_LIST, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || 'Failed to load events.')
  }
  const text = await response.text()
  if (!text?.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const sendRegistrationOtp = async (email: string, otp?: string): Promise<ApiResponse<SendOtpResponse>> => {
  try {
    const requestBody: SendOtpRequest = { email }
    if (otp) {
      requestBody.otp = otp
    }

    const response = await fetch(API_ENDPOINTS.AUTH.REGISTER_SEND_OTP, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      try {
        const errorData: ApiResponse = await response.json()
        const errorMessage = handleApiError(errorData, response, 'Failed to send verification code. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('JSON')) {
          const errorMessage = handleApiError(null, response, 'Failed to send verification code. Please try again.')
          throw new Error(errorMessage)
        }
        throw parseError
      }
    }

    let data: ApiResponse<SendOtpResponse>
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to send verification code. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'success') {
      showToast.success(data.message || 'Verification code sent successfully')
    }

    return data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Failed to send')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to send verification code. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to send verification code. Please try again.')
    throw new Error(errorMessage)
  }
}

export const verifyRegistrationOtp = async (email: string, otp: string): Promise<ApiResponse<VerifyOtpResponse>> => {
  try {
    const response = await fetch(API_ENDPOINTS.AUTH.REGISTER_VERIFY_OTP, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      try {
        const errorData: ApiResponse = await response.json()
        const errorMessage = handleApiError(errorData, response, 'Invalid verification code. Please check and try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('JSON')) {
          const errorMessage = handleApiError(null, response, 'Invalid verification code. Please check and try again.')
          throw new Error(errorMessage)
        }
        throw parseError
      }
    }

    let data: ApiResponse<VerifyOtpResponse>
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Invalid verification code. Please check and try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'success') {
      showToast.success(data.message || 'Verification code verified successfully')
    }

    return data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Invalid verification code') ||
        error.message.includes('Failed to verify')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to verify verification code. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to verify verification code. Please try again.')
    throw new Error(errorMessage)
  }
}

export const createPassword = async (email: string, password: string): Promise<ApiResponse<CreatePasswordResponse>> => {
  try {
    const response = await fetch(API_ENDPOINTS.AUTH.CREATE_PASSWORD, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      try {
        const errorData: any = await response.json()
        const errorMessage = handleApiError(errorData, response, 'Failed to create password. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('JSON')) {
          const errorMessage = handleApiError(null, response, 'Failed to create password. Please try again.')
          throw new Error(errorMessage)
        }
        throw parseError
      }
    }

    let data: ApiResponse<CreatePasswordResponse>
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to create password. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'success') {
      showToast.success(data.message || 'Password created successfully')
    }

    return data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Failed to create password')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create password. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to create password. Please try again.')
    throw new Error(errorMessage)
  }
}

export const signIn = async (email: string, password: string): Promise<ApiResponse<SignInResponse>> => {
  try {
    const response = await fetch(API_ENDPOINTS.AUTH.SIGNIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      try {
        const errorData: any = await response.json()
        const errorMessage = handleApiError(errorData, response, 'Failed to sign in. Please check your credentials and try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        // If JSON parse failed, handle as API error with response status
        if (parseError instanceof Error && parseError.message.includes('JSON')) {
          const errorMessage = handleApiError(null, response, 'Failed to sign in. Please try again.')
          throw new Error(errorMessage)
        }
        // Re-throw if it's our custom error
        throw parseError
      }
    }

    let data: ApiResponse<SignInResponse>
    try {
      data = await response.json()
    } catch {
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'error') {
      const errorMessage = handleApiError(data, undefined, 'Failed to sign in. Please check your credentials and try again.')
      throw new Error(errorMessage)
    }

    if (data.status === 'success') {
      showToast.success(data.message || 'Signed in successfully')
    }

    return data
  } catch (error) {
    // If error was already handled (has our custom message), just re-throw without showing toast
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error - already handled by handleNetworkError if called
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    // If error message suggests it was already handled, just re-throw
    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Failed to sign in') ||
        error.message.includes('Invalid email or password') ||
        error.message.includes('check your credentials')
    )) {
      throw error
    }

    // Last resort - show generic error (only if not already shown)
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign in. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to sign in. Please try again.')
    throw new Error(errorMessage)
  }
}

export const createOrganization = async (name: string): Promise<OrganizationData> => {
  try {
    const accessToken = localStorage.getItem('accessToken')
    
    if (!accessToken) {
      const errorMessage = handleApiError('Authentication required. Please login again.', undefined, 'Authentication required. Please login again.')
      throw new Error(errorMessage)
    }

    const requestBody = { name }

    const response = await fetch(API_ENDPOINTS.AUTH.CREATE_ORGANIZATION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    })

    if (!response || !response.ok) {
      if (!response) {
        const errorMessage = handleNetworkError(null)
        throw new Error(errorMessage)
      }

      try {
        const responseText = await response.text()
        
        let errorData: any
        try {
          errorData = JSON.parse(responseText)
        } catch {
          const errorMessage = handleApiError(null, response, 'Failed to create organization. Please try again.')
          throw new Error(errorMessage)
        }
        
        const errorMessage = handleApiError(errorData, response, 'Failed to create organization. Please try again.')
        throw new Error(errorMessage)
      } catch (parseError) {
        if (parseError instanceof Error && !parseError.message.includes('Failed to create')) {
          const errorMessage = handleApiError(null, response, 'Failed to create organization. Please try again.')
          throw new Error(errorMessage)
        }
        throw parseError
      }
    }
    let data: OrganizationData
    try {
      const apiResponse: ApiResponse<OrganizationData | string> = await response.json()
      
      if (!apiResponse || typeof apiResponse !== 'object') {
        const errorMessage = handleParseError('Invalid response format from server. Please try again.')
        throw new Error(errorMessage)
      }
      
      if (apiResponse.status === 'error') {
        const errorMessage = handleApiError(apiResponse, undefined, 'Failed to create organization. Please try again.')
        throw new Error(errorMessage)
      }
      
      if (apiResponse.status !== 'success') {
        const errorMessage = handleApiError(null, undefined, 'Unexpected response from server. Please try again.')
        throw new Error(errorMessage)
      }
      
      let responseData: any = apiResponse.data
      
      if (typeof responseData === 'string' && responseData === '') {
        const errorMessage = handleParseError('Organization data not returned. Please try again.')
        throw new Error(errorMessage)
      }
      
      if (!responseData || typeof responseData !== 'object') {
        const errorMessage = handleParseError('Invalid organization data format. Please try again.')
        throw new Error(errorMessage)
      }
      
      if (responseData.data && typeof responseData.data === 'object' && responseData.data.uuid) {
        responseData = responseData.data
      }
      
      if (!responseData.uuid) {
        const errorMessage = handleParseError('Invalid response format. Please try again.')
        throw new Error(errorMessage)
      }
      
      if (!responseData.name) {
        const errorMessage = handleParseError('Invalid response format. Please try again.')
        throw new Error(errorMessage)
      }
      
      data = {
        uuid: String(responseData.uuid),
        name: String(responseData.name),
        registration_number: responseData.registration_number || null,
        tax_number: responseData.tax_number || null,
        affiliations: responseData.affiliations || null,
        email: responseData.email || null,
        website_url: responseData.website_url || null,
      }
    } catch (parseError) {
      if (parseError instanceof Error && (
          parseError.message.includes('Invalid response') ||
          parseError.message.includes('Failed to create') ||
          parseError.message.includes('Unexpected response') ||
          parseError.message.includes('Organization data')
      )) {
        throw parseError
      }
      
      const errorMessage = handleParseError('Invalid response from server. Please try again.')
      throw new Error(errorMessage)
    }

    showToast.success('Organization created successfully')

    return data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!error.message.includes('Cannot connect')) {
        handleNetworkError(error)
      }
      throw new Error(error.message || 'Network error occurred')
    }

    if (error instanceof Error && (
        error.message.includes('Cannot connect') || 
        error.message.includes('Invalid response') ||
        error.message.includes('Failed to create') ||
        error.message.includes('Authentication required')
    )) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create organization. Please try again.'
    handleApiError(errorMessage, undefined, 'Failed to create organization. Please try again.')
    throw new Error(errorMessage)
  }
}

