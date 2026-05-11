import { useEffect, useRef } from 'react'

export type AppView =
  | 'dashboard'
  | 'editor'
  | 'events'
  | 'schedule'
  | 'communication'
  | 'resource-management'
  | 'analytics'
  | 'public'

export function useAppRouting(
  isAuthenticated: boolean,
  currentView: AppView,
  setCurrentView: (view: AppView) => void,
  loadPage: (filename: string) => Promise<any>
) {
  const loadPageRef = useRef(loadPage)
  const currentViewRef = useRef(currentView)

  useEffect(() => {
    loadPageRef.current = loadPage
  }, [loadPage])

  useEffect(() => {
    currentViewRef.current = currentView
  }, [currentView])

  useEffect(() => {
    if (!isAuthenticated) return

    let lastCheckedPath = ''

    const checkRoute = () => {
      const path = window.location.pathname
      const pathUnchanged = path === lastCheckedPath
      lastCheckedPath = path

      if (path.startsWith('/event/website/editor/')) {
        const pathWithoutQuery = path.split('?')[0]
        const pageIdMatch = pathWithoutQuery.match(/\/event\/website\/editor\/(.+)/)
        const pageId = pageIdMatch ? pageIdMatch[1] : 'welcome'

        if (currentViewRef.current !== 'editor') {
          setCurrentView('editor')
        }
        const pageFilename = pageId.endsWith('.json') ? pageId : `${pageId}.json`
        loadPageRef.current(pageFilename).catch(() => {})
      } else if (path.startsWith('/event/hub')) {
        if (currentViewRef.current !== 'events') setCurrentView('events')
      } else if (path === '/event/create/template') {
        if (currentViewRef.current !== 'dashboard') setCurrentView('dashboard')
      } else if (path === '/dashboard' || path.startsWith('/dashboard/')) {
        if (currentViewRef.current !== 'dashboard') setCurrentView('dashboard')
      } else if (path.startsWith('/event/website/preview/') || path.startsWith('/event/website')) {
        if (currentViewRef.current !== 'dashboard') setCurrentView('dashboard')
      }

      void pathUnchanged
    }

    checkRoute()
    const handleLocationChange = () => checkRoute()
    window.addEventListener('locationchange', handleLocationChange)
    return () => window.removeEventListener('locationchange', handleLocationChange)
  }, [isAuthenticated, setCurrentView])
}
