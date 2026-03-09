import React, { useState } from 'react'
import PublicAuthTopbar from './PublicAuthTopbar'

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
  const [isLoading] = useState(false)

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault()
  //   setError(null)
  //   if (!email.trim() || !password.trim()) {
  //     setError('Please enter email and password.')
  //     return
  //   }
  //   setIsLoading(true)
  //   try {
  //     const response = await signIn(email.trim(), password)
  //     if (response.data) {
  //       const { access, refresh } = response.data
  //       if (access) localStorage.setItem('accessToken', access)
  //       if (refresh) localStorage.setItem('refreshToken', refresh)
  //       localStorage.setItem('userEmail', email.trim())
  //     }
  //     localStorage.setItem('isAuthenticated', 'true')
  //     window.location.href = '/event-list'
  //   } catch {
  //     setError('Invalid email or password. Please try again.')
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  const handleRegisterClick = (e?: React.MouseEvent) => {
    e?.preventDefault()
  }

  const handleBack = () => {
    // UI-only; no navigation
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicAuthTopbar
        menuTitle="Login"
        menuItems={[{ label: 'Back to events', href: '/event-list' }]}
      />

      <main className="px-4 pb-12 pt-12 sm:px-6">
        {/* Back arrow and banner in the same row */}
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
            <div className="mx-auto w-[500px] max-w-7xl">
              {/* Banner (same width as card below) with avatar overlapping only the banner */}
              {/* <div className="relative min-h-[8rem]  w-full rounded-lg bg-[#E0E0E0]" aria-hidden>
                <div className="absolute mt-12  left-1/2 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border-2 border-slate-200 bg-white shadow-md">
                  <UserIcon className="h-12 w-12 text-slate-400" />
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-md border-2 border-primary bg-white shadow-sm">
                    <CameraIcon className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div> */}

              {/* Login card: same width as banner */}
              <div className="relative z-10 mt-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8">
            <h1 className="text-center text-lg font-bold leading-6 text-slate-700">
              Login
            </h1>
            <p className="text-center text-sm font-normal leading-5 text-slate-500">Welcome back! Please enter your details.</p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
              }}
            >

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
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-black placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="public-login-password" className="block text-sm font-medium text-black">
                    Password
                  </label>

                </div>
                <input
                  id="public-login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-black placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                  <a href="#" className="text-sm font-medium text-primary hover:underline">
                    Forgot password
                  </a>
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-black">Remember for 30 days</span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
              >
                {isLoading ? 'Signing in…' : 'Login'}
              </button>

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-black shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
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
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PublicLoginPage
