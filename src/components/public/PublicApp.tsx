import React, { Suspense, lazy } from 'react'

const PublicEventListPage = lazy(() => import('./PublicEventListPage'))
const PublicEventWebsiteShell = lazy(() => import('./PublicEventWebsiteShell'))
const PublicLoginPage = lazy(() => import('./PublicLoginPage'))
const PublicRegisterPage = lazy(() => import('./PublicRegisterPage'))

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
)

/**
 * Returns true if the current URL is a public route (event list or event website).
 * Used in main.tsx to render PublicApp instead of App so dashboard/auth never run.
 */
export function isPublicRoute(): boolean {
  if (typeof window === 'undefined') return false
  const pathname = window.location.pathname
  const hash = (window.location.hash || '').replace(/^#\/?/, '')
  // Event list: path or hash
  if (pathname === '/events' || pathname === '/events/' || pathname === '/event-list' || pathname === '/event-list/') return true
  if (pathname === '/' && (hash === 'event-list' || hash === 'events')) return true
  // Event website: /events/:eventUuid/...
  if (/^\/events\/[^/]+/.test(pathname)) return true
  // Standalone login / register (from event list top bar or login page)
  if (pathname === '/login' || pathname === '/login/') return true
  if (pathname === '/register' || pathname === '/register/') return true
  return false
}

/**
 * Public-only layout. Renders event list or event website shell.
 * No auth, no dashboard – so post-registration always lands here when URL is public.
 */
const PublicApp: React.FC = () => {
  const pathname = window.location.pathname
  const hash = (window.location.hash || '').replace(/^#\/?/, '')

  const isEventList =
    pathname === '/events' ||
    pathname === '/events/' ||
    pathname === '/event-list' ||
    pathname === '/event-list/' ||
    (pathname === '/' && (hash === 'event-list' || hash === 'events'))

  if (isEventList) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicEventListPage />
      </Suspense>
    )
  }

  if (pathname === '/login' || pathname === '/login/') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicLoginPage />
      </Suspense>
    )
  }

  if (pathname === '/register' || pathname === '/register/') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicRegisterPage />
      </Suspense>
    )
  }

  const publicEventUuidMatch = pathname.match(/^\/events\/([^/]+)/)
  const publicEventUuid = publicEventUuidMatch ? publicEventUuidMatch[1] : null

  if (publicEventUuid) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicEventWebsiteShell eventUuid={publicEventUuid} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <PublicEventListPage />
    </Suspense>
  )
}

export default PublicApp
