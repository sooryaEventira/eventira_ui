import React, { useState } from 'react'
import PublicAuthTopbar from './PublicAuthTopbar'

interface PublicRegisterPageProps {
  eventUuid?: string
  eventName?: string
  onNavigate?: (path: string) => void
}

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

const CameraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
)

const PublicRegisterPage: React.FC<PublicRegisterPageProps> = ({
  eventUuid,
  eventName,
  onNavigate
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setIsLoading(true)
    window.location.href = '/event-list'
  }

  const handleBack = () => {
    if (eventUuid && onNavigate) {
      onNavigate(`/events/${eventUuid}`)
    } else {
      window.location.href = '/event-list'
    }
  }

  const handleLoginClick = () => {
    if (eventUuid && onNavigate) {
      onNavigate(`/events/${eventUuid}/login`)
    } else {
      window.location.href = '/login'
    }
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
            <div className="mx-auto w-full max-w-7xl">
              <div className="relative min-h-[8rem] w-full rounded-lg bg-[#E0E0E0]" aria-hidden>
                <div className="absolute mt-12 left-1/2 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border-2 border-slate-200 bg-white shadow-md">
                  <UserIcon className="h-12 w-12 text-slate-400" />
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-md border-2 border-primary bg-white shadow-sm">
                    <CameraIcon className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>

              {/* Signup card - same width as banner */}
              <div className="relative z-10 mt-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8">
                  <h1 className="text-center text-xl font-bold text-black">
                    Sign up {eventName ? `for ${eventName}` : ''}
                  </h1>

                  <form onSubmit={handleSignupSubmit} className="mt-6 space-y-4">
                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {error}
                      </div>
                    )}
                    <div>
                      <label htmlFor="public-register-name" className="block text-sm font-medium text-black">
                        Name
                      </label>
                      <input
                        id="public-register-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-black placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Enter your name"
                        disabled={isLoading}
                      />
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
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label htmlFor="public-register-password" className="block text-sm font-medium text-black">
                        Password
                      </label>
                      <input
                        id="public-register-password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-black placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Create a password"
                        disabled={isLoading}
                      />
                      <p className="mt-1 text-xs text-slate-500">Must be at least 8 characters.</p>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
                    >
                      {isLoading ? 'Signing up…' : 'Sign up'}
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
