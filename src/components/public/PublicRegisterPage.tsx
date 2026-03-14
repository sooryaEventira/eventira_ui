import React, { useState } from 'react'
import PublicAuthTopbar from './PublicAuthTopbar'
import { requestLoginOrRegister } from '../../services/publicAuthService'

interface PublicRegisterPageProps {
  eventName?: string
}

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

const PublicRegisterPage: React.FC<PublicRegisterPageProps> = ({ eventName }) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await requestLoginOrRegister(email, firstName, lastName)
      if (result.type === 'otp_sent') {
        sessionStorage.setItem('register_email', email.trim())
        window.location.href = '/register/verify'
      } else {
        window.location.href = '/login'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    window.history.back()
  }

  const handleLoginClick = () => {
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicAuthTopbar
        menuTitle="Sign up"
        menuItems={[{ label: 'Back to events', href: '/event-list' }]}
      />

      <main className="px-4 pb-12 pt-12 sm:px-6">
        {/* Back arrow and banner in the same row - same as login */}
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-[#E0E0E0] text-slate-700 hover:bg-slate-300"
            aria-label="Back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-lg">
              {/* Signup card - same width as banner */}
              <div className="relative z-10 mt-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8">
                  <h1 className="text-center text-lg font-bold leading-6 text-slate-700">
                    Create your account {eventName ? `for ${eventName}` : ''}
                  </h1>
                  <p className="text-center text-sm font-normal leading-5 text-slate-500">Enter your email to continue.</p> 

                  <form onSubmit={handleSignupSubmit} className="mt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="public-register-first-name" className="block text-sm font-medium text-black">
                          First name
                        </label>
                        <input
                          id="public-register-first-name"
                          type="text"
                          autoComplete="given-name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-black placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div>
                        <label htmlFor="public-register-last-name" className="block text-sm font-medium text-black">
                          Last name
                        </label>
                        <input
                          id="public-register-last-name"
                          type="text"
                          autoComplete="family-name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-black placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="public-register-email" className="block text-sm font-medium text-black">
                        Email
                      </label>
                      <input
                        id="public-register-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-black placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Enter your email"
                      />
                    </div>

                    {error && (
                      <p className="text-center text-sm text-red-500">{error}</p>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-primary px-4 py-2 text-base font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
                    >
                      {loading ? 'Please wait…' : 'Continue'}
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-black shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
                      aria-label="Sign up with LinkedIn"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden>
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      Sign up with LinkedIn
                    </button>
                    <p className="text-center text-sm text-black">
                      Already have an account?{' '}
                      <button type="button" onClick={handleLoginClick} className="font-bold text-primary hover:underline">
                        Log in
                      </button>
                    </p>
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

export default PublicRegisterPage
