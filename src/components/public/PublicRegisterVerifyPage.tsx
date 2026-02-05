import React, { useState, useEffect } from 'react'
import { verifyOtpSetPassword, fetchPublicEventList } from '../../services/authService'

const STORAGE_KEY = (eventUuid: string) => `public-register-verify-${eventUuid}`

interface PublicRegisterVerifyPageProps {
  eventUuid: string
  eventName?: string
  onNavigate: (path: string) => void
}

const PublicRegisterVerifyPage: React.FC<PublicRegisterVerifyPageProps> = ({
  eventUuid,
  eventName,
  onNavigate
}) => {
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY(eventUuid)) : null
      const data = raw ? JSON.parse(raw) : null
      if (data && typeof data.email === 'string' && typeof data.otp === 'string') {
        setEmail(data.email)
        setOtp(data.otp)
        setReady(true)
      }
    } catch {
      setReady(false)
    }
  }, [eventUuid])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !otp) return
    setError(null)
    if (!password.trim()) {
      setError('Please enter a password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setIsLoading(true)
    try {
      await verifyOtpSetPassword(email, otp, password)
      await fetchPublicEventList()
      try {
        sessionStorage.removeItem(STORAGE_KEY(eventUuid))
      } catch {
        // ignore
      }
      // Clear dashboard auth state so the app shows public event list, not dashboard
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('organizationUuid')
      localStorage.removeItem('organizationName')
      // Use hash URL so server only gets "/" and cannot redirect to dashboard
      const origin = window.location.origin
      window.location.replace(`${origin}/#event-list`)
    } catch {
      setError('Invalid code or failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!ready || !email) {
    return (
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-center text-slate-600">
          Missing verification data. Please start from the register page.
        </p>
        <button
          type="button"
          onClick={() => onNavigate(`/events/${eventUuid}/register`)}
          className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          Go to Register
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Set your password {eventName ? `for ${eventName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your password below and click Verify to complete registration.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="public-verify-password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="public-verify-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="••••••••"
            disabled={isLoading}
            minLength={6}
          />
          <p className="mt-1 text-xs text-slate-500">At least 6 characters</p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
          >
            {isLoading ? 'Verifying…' : 'Verify'}
          </button>
          {/* <button
            type="button"
            onClick={() => onNavigate(`/events/${eventUuid}/register`)}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to register
          </button> */}
        </div>
      </form>
    </div>
  )
}

export default PublicRegisterVerifyPage
