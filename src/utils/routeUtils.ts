/**
 * Returns true if the current URL is a public route (event list or event website).
 * Extracted so main.tsx can decide which app to load without importing PublicApp.
 */
export function isPublicRoute(): boolean {
  if (typeof window === 'undefined') return false
  const pathname = window.location.pathname
  const hash = (window.location.hash || '').replace(/^#\/?/, '')
  if (pathname === '/events' || pathname === '/events/' || pathname === '/event-list' || pathname === '/event-list/') return true
  if (pathname === '/' && (hash === 'event-list' || hash === 'events')) return true
  if (/^\/events\/[^/]+/.test(pathname)) return true
  if (pathname === '/login' || pathname === '/login/') return true
  if (pathname === '/register' || pathname === '/register/') return true
  if (pathname === '/register/verify' || pathname === '/register/verify/') return true
  if (pathname === '/register/password' || pathname === '/register/password/') return true
  if (pathname === '/profile' || pathname === '/profile/') return true
  return false
}
