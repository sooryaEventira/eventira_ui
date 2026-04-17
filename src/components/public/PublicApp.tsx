import React, { Suspense, lazy } from 'react'

const PublicEventListPage = lazy(() => import('./PublicEventListPage'))
const PublicEventWebsiteShell = lazy(() => import('./PublicEventWebsiteShell'))
const PublicLoginPage = lazy(() => import('./PublicLoginPage'))
const PublicRegisterPage = lazy(() => import('./PublicRegisterPage'))
const PublicRegisterVerifyPage = lazy(() => import('./PublicRegisterVerifyPage'))
const PublicCreatePasswordPage = lazy(() => import('./PublicCreatePasswordPage'))
const PublicProfilePage = lazy(() => import('./PublicProfilePage'))
const PublicMessagesPage = lazy(() => import('./PublicMessagesPage'))

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
)

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

  if (pathname === '/register/verify' || pathname === '/register/verify/') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicRegisterVerifyPage />
      </Suspense>
    )
  }

  if (pathname === '/register/password' || pathname === '/register/password/') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicCreatePasswordPage />
      </Suspense>
    )
  }

  if (pathname === '/profile' || pathname === '/profile/') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicProfilePage />
      </Suspense>
    )
  }

  if (pathname === '/messages' || pathname === '/messages/') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicMessagesPage />
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
