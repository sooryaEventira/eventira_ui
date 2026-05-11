import React, { useState } from 'react'
import PublicAuthTopbar from './PublicAuthTopbar'
import { publicLogin } from '../../services/publicAuthService'

interface PublicLoginPageProps {}

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

const PublicLoginPage: React.FC<PublicLoginPageProps> = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.')
      return
    }
    setIsLoading(true)
    try {
      const { access, refresh } = await publicLogin(email, password)
      if (access) localStorage.setItem('pub_accessToken', access)
      if (refresh) localStorage.setItem('pub_refreshToken', refresh)
      localStorage.setItem('pub_userEmail', email.trim())
      if (rememberMe) localStorage.setItem('pub_rememberMe', 'true')
      const returnTo = new URLSearchParams(window.location.search).get('returnTo')
      window.location.href = (returnTo && returnTo.startsWith('/')) ? returnTo : '/event-list'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterClick = (e?: React.MouseEvent) => {
    e?.preventDefault()
    window.location.href = '/register'
  }

  const handleBack = () => {
    window.history.back()
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicAuthTopbar
        menuTitle="Login"
        menuItems={[{ label: 'Back to events', href: '/event-list' }]}
      />

      <main className="relative px-3 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
        <button
          type="button"
          onClick={handleBack}
          className="fixed left-3 top-[calc(4rem+0.75rem)] z-30 flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border border-slate-200 bg-[#E0E0E0] text-slate-700 shadow-sm hover:bg-slate-300 sm:left-6 sm:top-[calc(4rem+1rem)] sm:h-11 sm:w-11"
          aria-label="Back"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="mx-auto mt-10 w-full max-w-lg sm:mt-14">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-8">
            <h1 className="text-balance text-center text-base font-bold leading-snug text-slate-700 sm:text-lg sm:leading-6">
              Login
            </h1>
            <p className="mt-1 text-center text-sm font-normal leading-5 text-slate-500">
              Welcome back! Please enter your details.
            </p>

            <form className="mt-5 space-y-4 sm:mt-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="public-login-email" className="block text-sm font-medium text-black">
                  Email
                </label>
                <input
                  id="public-login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-black placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:min-h-0 sm:text-sm"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="public-login-password" className="block text-sm font-medium text-black">
                  Password
                </label>
                <input
                  id="public-login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-black placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:min-h-0 sm:text-sm"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <a href="#" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                  Forgot password
                </a>
              </div>

              <label className="flex cursor-pointer items-center gap-2 touch-manipulation">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-black">Remember for 30 days</span>
              </label>

              {error && (
                <p className="text-center text-sm text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="min-h-11 w-full touch-manipulation rounded-lg bg-primary px-4 py-3 text-base font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70 sm:min-h-0"
              >
                {isLoading ? 'Signing in…' : 'Login'}
              </button>

              <button
                type="button"
                className="flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-black shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 sm:min-h-0"
                aria-label="Login with LinkedIn"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                Login with LinkedIn
              </button>

              <p className="text-center text-sm text-black">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={handleRegisterClick} className="font-bold text-primary hover:underline">
                  Sign up
                </button>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PublicLoginPage
