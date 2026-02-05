import React, { useState } from 'react'
import { signIn } from '../../services/authService'

interface PublicLoginPageProps {
  eventUuid: string
  eventName?: string
  onNavigate: (path: string) => void
}

const PublicLoginPage: React.FC<PublicLoginPageProps> = ({
  eventUuid,
  eventName,
  onNavigate
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasOrganization = (): boolean => {
    return Boolean(typeof window !== 'undefined' && localStorage.getItem('organizationUuid'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.')
      return
    }
    setIsLoading(true)
    try {
      const response = await signIn(email.trim(), password)
      if (response.data) {
        const { access, refresh, organizations } = response.data
        if (access) localStorage.setItem('accessToken', access)
        if (refresh) localStorage.setItem('refreshToken', refresh)
        localStorage.setItem('userEmail', email.trim())
        if (organizations?.length) {
          const first = organizations[0]
          if (first.uuid) localStorage.setItem('organizationUuid', first.uuid)
          if (first.name) localStorage.setItem('organizationName', first.name)
        } else {
          localStorage.removeItem('organizationUuid')
          localStorage.removeItem('organizationName')
        }
      }
      localStorage.setItem('isAuthenticated', 'true')
      if (hasOrganization()) {
        window.location.href = '/dashboard'
      } else {
        window.location.href = '/'
      }
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Log in {eventName ? `to ${eventName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your email and password to continue.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="public-login-email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="public-login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="you@example.com"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="public-login-password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="public-login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="••••••••"
            disabled={isLoading}
          />
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
          >
            {isLoading ? 'Signing in…' : 'Login'}
          </button>
          <p className="text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            {eventUuid ? (
              <button
                type="button"
                onClick={() => onNavigate(`/events/${eventUuid}/register`)}
                className="font-medium text-primary hover:underline"
              >
                Go to register
              </button>
            ) : (
              <a href="/register" className="font-medium text-primary hover:underline">
                Go to register
              </a>
            )}
          </p>
        </div>
      </form>
    </div>
  )
}

export default PublicLoginPage
