/**
 * Centralized error handling utility
 * Ensures only one user-friendly toast message is shown per error
 */

import { showToast } from './toast'

// Track recently shown error messages to prevent duplicate toasts
const shownErrors = new Map<string, number>() // message → timestamp
const ERROR_DEBOUNCE_MS = 5000 // suppress the same message for 5 seconds

/**
 * Get user-friendly error message from various error formats
 */
const getUserFriendlyMessage = (error: any, defaultMessage: string = 'An error occurred. Please try again.'): string => {
  // If it's already a user-friendly string, return it
  if (typeof error === 'string') {
    // Reject raw HTML responses (server error pages) — never show them to users
    if (/^\s*</.test(error) || /<!doctype/i.test(error)) return defaultMessage
    // Remove technical prefixes like "Server error: 401 Unauthorized"
    const cleaned = error.replace(/^Server error:\s*/i, '').trim()
    if (cleaned) return cleaned
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message
    // Remove technical prefixes
    const cleaned = message.replace(/^Server error:\s*/i, '').trim()
    if (cleaned && !cleaned.includes('fetch') && !cleaned.includes('NetworkError')) {
      return cleaned
    }
  }

  // Handle API error response objects
  if (error && typeof error === 'object') {
    // Check for common error message fields
    let errorMessage = error.message || error.detail || error.error || null
    
    // Check for non_field_errors (Django REST framework style)
    if (error.non_field_errors && Array.isArray(error.non_field_errors) && error.non_field_errors.length > 0) {
      errorMessage = error.non_field_errors.join(', ')
    }
    
    // Check for errors array
    if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      errorMessage = error.errors.join(', ')
    }
    
    // If no message found, try to extract from first field error
    if (!errorMessage && typeof error === 'object') {
      const errorKeys = Object.keys(error)
      if (errorKeys.length > 0) {
        const firstError = error[errorKeys[0]]
        if (Array.isArray(firstError) && firstError.length > 0) {
          errorMessage = firstError[0]
        } else if (typeof firstError === 'string') {
          errorMessage = firstError
        }
      }
    }
    
    if (errorMessage) {
      // Clean up technical prefixes
      return String(errorMessage).replace(/^Server error:\s*/i, '').trim()
    }
  }

  return defaultMessage
}

/**
 * Show error toast only if it hasn't been shown recently
 */
const showErrorToast = (message: string): void => {
  const now = Date.now()

  // Evict expired entries
  for (const [msg, ts] of shownErrors.entries()) {
    if (now - ts > ERROR_DEBOUNCE_MS) shownErrors.delete(msg)
  }

  // Skip if this exact message was already shown recently
  if (shownErrors.has(message)) return

  shownErrors.set(message, now)
  showToast.error(message)
}

/**
 * Handle API error response and show user-friendly message
 * Returns the error message for throwing
 */
export const handleApiError = (
  error: any,
  response?: Response,
  defaultMessage: string = 'An error occurred. Please try again.'
): string => {
  let userMessage = defaultMessage

  // Handle HTTP error responses
  if (response && !response.ok) {
    // Try to parse error response
    if (error && typeof error === 'object') {
      userMessage = getUserFriendlyMessage(error, defaultMessage)
    } else if (typeof error === 'string') {
      userMessage = getUserFriendlyMessage(error, defaultMessage)
    } else {
      // Generate user-friendly message based on status code
      switch (response.status) {
        case 401:
          userMessage = 'Invalid email or password. Please check your credentials and try again.'
          break
        case 403:
          userMessage = 'You do not have permission to perform this action.'
          break
        case 404:
          userMessage = 'The requested resource was not found.'
          break
        case 500:
          userMessage = 'A server error occurred. Please try again later.'
          break
        case 503:
          userMessage = 'Service is temporarily unavailable. Please try again later.'
          break
        default:
          userMessage = defaultMessage
      }
    }
  } else {
    // Handle other error types
    userMessage = getUserFriendlyMessage(error, defaultMessage)
  }

  // Show only one toast
  showErrorToast(userMessage)
  
  return userMessage
}

/**
 * Handle network/connection errors
 */
export const handleNetworkError = (_error: any): string => {
  const message = 'Cannot connect to the server. Please check your internet connection and try again.'
  showErrorToast(message)
  return message
}

/**
 * Handle parse/response format errors
 */
export const handleParseError = (defaultMessage: string = 'Invalid response from server. Please try again.'): string => {
  showErrorToast(defaultMessage)
  return defaultMessage
}

/**
 * Reset error tracking (useful for testing or manual reset)
 */
export const resetErrorTracking = (): void => {
  shownErrors.clear()
}
