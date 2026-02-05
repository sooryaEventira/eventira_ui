import React, { useState } from 'react'
import { sendRegistrationOtp } from '../../services/authService'

const STORAGE_KEY = (eventUuid: string) => `public-register-verify-${eventUuid}`

interface PublicRegisterPageProps {
  eventUuid: string
  eventName?: string
  onNavigate: (path: string) => void
}

const PublicRegisterPage: React.FC<PublicRegisterPageProps> = ({
  eventUuid,
  eventName,
  onNavigate
}) => {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    setIsLoading(true)
    try {
      await sendRegistrationOtp(email.trim())
      setStep('otp')
    } catch {
      setError('Failed to send verification code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueToPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!otp.trim()) {
      setError('Please enter the code from your email.')
      return
    }
    try {
      sessionStorage.setItem(
        STORAGE_KEY(eventUuid),
        JSON.stringify({ email: email.trim(), otp: otp.trim() })
      )
      onNavigate(`/events/${eventUuid}/register/verify`)
    } catch {
      setError('Could not continue. Please try again.')
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Create an account {eventName ? `for ${eventName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {step === 'email'
            ? 'Enter your email to receive a verification code.'
            : 'Enter the verification code we sent to your email, then continue to set your password.'}
        </p>
      </div>

      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="public-register-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="public-register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
            >
              {isLoading ? 'Sending code…' : 'Register'}
            </button>
            <p className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate(`/events/${eventUuid}/login`)}
                className="font-medium text-primary hover:underline"
              >
                Log in
              </button>
            </p>
          </div>
        </form>
      ) : (
        <form onSubmit={handleContinueToPassword} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="public-register-otp" className="block text-sm font-medium text-slate-700">
              Verification code
            </label>
            <input
              id="public-register-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="000000"
              disabled={isLoading}
              maxLength={6}
            />
            <p className="mt-1 text-xs text-slate-500">Check your email for the code</p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
            >
              Continue to set password
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              ← Use a different email
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default PublicRegisterPage
