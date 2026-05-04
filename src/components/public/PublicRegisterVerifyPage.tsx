import React, { useRef, useState } from 'react'
import PublicAuthTopbar from './PublicAuthTopbar'
import { verifyOtp, requestLoginOrRegister } from '../../services/publicAuthService'

interface PublicRegisterVerifyPageProps {
  eventName?: string
}

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

const PublicRegisterVerifyPage: React.FC<PublicRegisterVerifyPageProps> = ({ eventName }) => {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const email = sessionStorage.getItem('register_email') ?? ''

  const handleChange = (idx: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = char
    setDigits(next)
    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus()
    }
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const otp = digits.join('')
    if (otp.length < 6) {
      setError('Please enter the full 6-digit code.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await verifyOtp(email, otp)
      sessionStorage.setItem('register_otp', otp)
      window.location.href = '/register/password'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    setError(null)
    try {
      await requestLoginOrRegister(email, '', '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicAuthTopbar
        menuTitle="Verify email"
        menuItems={[{ label: 'Back to events', href: '/event-list' }]}
      />

      <main className="relative px-3 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="fixed left-3 top-[calc(4rem+0.75rem)] z-30 flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border border-slate-200 bg-[#E0E0E0] text-slate-700 shadow-sm hover:bg-slate-300 sm:left-6 sm:top-[calc(4rem+1rem)] sm:h-11 sm:w-11"
          aria-label="Back"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>

        <div className="mx-auto mt-10 w-full max-w-lg sm:mt-14">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-8">
            <h1 className="text-balance text-center text-base font-bold leading-snug text-slate-700 sm:text-lg sm:leading-6">
              Verify your email
              {eventName ? (
                <>
                  {' '}
                  <span className="break-words">for {eventName}</span>
                </>
              ) : null}
            </h1>
            <p className="mt-1 text-center text-sm font-normal leading-5 text-slate-500">
              Enter the 6-digit code sent to your email.
            </p>

            <form className="mt-5 space-y-5 sm:mt-6 sm:space-y-6" onSubmit={handleSubmit}>
              <div className="min-w-0">
                <label className="mb-2 block text-left text-sm font-medium text-slate-700">
                  Code verification
                </label>
                <div className="grid w-full grid-cols-6 gap-1.5 xs:gap-2 sm:gap-3">
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="aspect-square min-h-0 w-full min-w-0 rounded-lg border border-slate-300 bg-white p-0 text-center text-base font-semibold tabular-nums text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary xs:text-lg sm:text-xl"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-center text-sm text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="min-h-11 w-full touch-manipulation rounded-lg bg-primary px-4 py-3 text-base font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70 sm:min-h-0"
              >
                {loading ? 'Verifying…' : 'Verify code'}
              </button>

              <p className="text-pretty text-center text-sm text-slate-600">
                Didn&apos;t receive the code?{' '}
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="font-semibold text-primary hover:underline disabled:opacity-60"
                >
                  {resending ? 'Sending…' : 'Resend'}
                </button>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PublicRegisterVerifyPage
