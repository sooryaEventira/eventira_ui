import React, { useState } from 'react'
import PublicAuthTopbar from './PublicAuthTopbar'
import { setPassword } from '../../services/publicAuthService'

const EyeIcon = ({ className }: { className?: string }) => (
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
    <path d="M1.5 12C3.25 7.75 7.25 5 12 5s8.75 2.75 10.5 7c-1.75 4.25-5.75 7-10.5 7S3.25 16.25 1.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = ({ className }: { className?: string }) => (
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
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const PublicCreatePasswordPage: React.FC = () => {
  const [password, setPasswordValue] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = sessionStorage.getItem('register_email') ?? ''
  const otp = sessionStorage.getItem('register_otp') ?? ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await setPassword(email, otp, password)
      sessionStorage.removeItem('register_email')
      sessionStorage.removeItem('register_otp')
      window.location.href = '/login'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicAuthTopbar
        menuTitle="Create password"
        menuItems={[{ label: 'Back to events', href: '/event-list' }]}
      />

      <main className="px-4 pb-12 pt-12 sm:px-6">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-md">
              <div className="relative z-10 mt-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8">
                  <h1 className="text-center text-lg font-bold leading-6 text-slate-700">
                    Create your password
                  </h1>
                  <p className="mt-1 text-center text-sm font-normal leading-5 text-slate-500">
                    Set a secure password to finish creating your account.
                  </p>

                  <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPasswordValue(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-black placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Enter password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? (
                            <EyeOffIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Must be at least 8 characters
                      </p>
                    </div>

                    {error && (
                      <p className="text-center text-sm text-red-500">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-primary px-4 py-2 text-base font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
                    >
                      {loading ? 'Creating account…' : 'Create account'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PublicCreatePasswordPage
