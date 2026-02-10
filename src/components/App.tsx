import React, { useState, useEffect } from 'react'

import { usePageManagement } from '../hooks/usePageManagement'
import { usePublish } from '../hooks/usePublish'
import { useAppHandlers } from '../hooks/useAppHandlers'
import { useAuth, hasOrganization } from '../hooks/useAuth'
import { useAppRouting, type AppView } from '../hooks/useAppRouting'
import { setupPuckStyling } from '../utils/puckStyling'

import { AuthScreens, MainScreens } from './AppShell'

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard')
  const [showPreview, setShowPreview] = useState(false)
  const [puckUi, setPuckUi] = useState<any>(undefined)
  const [showPageCreationModal, setShowPageCreationModal] = useState(false)
  const [showLeftSidebar] = useState(true)
  const [showRightSidebar] = useState(true)

  const auth = useAuth(setCurrentView as (v: string) => void)

  const {
    currentData,
    setCurrentData,
    currentPage,
    setCurrentPage,
    currentPageName,
    setCurrentPageName,
    pages,
    showPageManager,
    setShowPageManager,
    showPageNameDialog,
    setShowPageNameDialog,
    loadPage,
    loadPages,
    createNewPage,
    confirmNewPage,
    createPageFromTemplate
  } = usePageManagement()

  const { handlePublish, handleDataChange } = usePublish(
    currentData,
    setCurrentData,
    currentPage,
    currentPageName,
    setCurrentPage,
    loadPages
  )

  const {
    handleProfileClick,
    handlePageCreationSelect,
    handleNavigateToEditor,
    handleAddComponent
  } = useAppHandlers({
    setCurrentView: setCurrentView as (v: string) => void,
    setCurrentData,
    setPuckUi,
    setShowPreview,
    createNewPage
  })

  useAppRouting(auth.isAuthenticated, currentView, setCurrentView, loadPage)

  // History pushState/replaceState sync
  useEffect(() => {
    const notify = () => window.dispatchEvent(new Event('locationchange'))
    const origPush = window.history.pushState
    const origReplace = window.history.replaceState
    window.history.pushState = function (...args) {
      origPush.apply(this, args as any)
      notify()
    }
    window.history.replaceState = function (...args) {
      origReplace.apply(this, args as any)
      notify()
    }
    const onPop = () => notify()
    window.addEventListener('popstate', onPop)
    return () => {
      window.history.pushState = origPush
      window.history.replaceState = origReplace
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  // Puck styling
  useEffect(() => {
    if (!showPreview && auth.isAuthenticated) setupPuckStyling()
  }, [showPreview, auth.isAuthenticated])

  // navigate-to-schedule event
  useEffect(() => {
    if (!auth.isAuthenticated) return
    const handler = () => setCurrentView('schedule')
    window.addEventListener('navigate-to-schedule', handler)
    return () => window.removeEventListener('navigate-to-schedule', handler)
  }, [auth.isAuthenticated])

  const handleEventHubCardClick = (cardId: string) => {
    if (cardId === 'schedule-session') setCurrentView('schedule')
    else if (cardId === 'communications') setCurrentView('communication')
    else if (cardId === 'resource-management') setCurrentView('resource-management')
  }

  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    window.history.pushState({}, '', '/dashboard')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleBackToEditor = () => setCurrentView('editor')

  const editorProps = {
    currentData,
    currentPage,
    currentPageName,
    pages,
    puckUi,
    showPreview,
    showLeftSidebar,
    showRightSidebar,
    showPageManager,
    showPageNameDialog,
    showPageCreationModal,
    onPublish: handlePublish,
    onDataChange: handleDataChange,
    setCurrentData,
    loadPage,
    setShowPageManager,
    setShowPageNameDialog,
    setCurrentPageName,
    confirmNewPage,
    setShowPageCreationModal,
    handlePageCreationSelect,
    handleNavigateToEditor,
    handleAddComponent,
    setShowPreview,
    handleBackToEditor,
    handleBackToDashboard,
    createPageFromTemplate,
    createNewPage,
    handleProfileClick
  }

  // Auth screens when not authenticated or no organization
  if (!auth.isAuthenticated || !hasOrganization()) {
    return <AuthScreens auth={auth} />
  }

  // Main app screens (authenticated with organization)
  return (
    <MainScreens
      currentView={currentView}
      auth={auth}
      onEventHubCardClick={handleEventHubCardClick}
      onBackToDashboard={handleBackToDashboard}
      handleProfileClick={handleProfileClick}
      editorProps={editorProps}
    />
  )
}

export default App
