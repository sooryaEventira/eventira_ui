import React, { useState, useEffect, useRef, Suspense, lazy } from 'react'

import { usePageManagement } from '../hooks/usePageManagement'
import { usePublish } from '../hooks/usePublish'
import { useAppHandlers } from '../hooks/useAppHandlers'
import { PageManager, PageNameDialog, PageCreationModal } from './page'
import { EventHubNavbar } from './eventhub'
import { useEventForm } from '../contexts/EventFormContext'
import { setupPuckStyling } from '../utils/puckStyling'
import { showToast } from '../utils/toast'
import { verifyRegistrationOtp, createPassword, createOrganization, signIn } from '../services/authService'

// Lazy load heavy components for code splitting
const EventHubPage = lazy(() => import('./eventhub').then(module => ({ default: module.EventHubPage })))
const SchedulePage = lazy(() => import('./eventhub/schedulesession/SchedulePage'))
const CommunicationPage = lazy(() => import('./eventhub/communication/CommunicationPage'))
const ResourceManagementPage = lazy(() => import('./eventhub/resourcemanagement/ResourceManagementPage'))
const EditorView = lazy(() => import('./shared/EditorView'))
const LoginPage = lazy(() => import('../pages').then(module => ({ default: module.LoginPage })))
const RegistrationPage = lazy(() => import('../pages').then(module => ({ default: module.RegistrationPage })))
const EmailVerificationPage = lazy(() => import('../pages').then(module => ({ default: module.EmailVerificationPage })))
const CreatePasswordPage = lazy(() => import('../pages').then(module => ({ default: module.CreatePasswordPage })))
const EventspaceSetupPage = lazy(() => import('../pages').then(module => ({ default: module.EventspaceSetupPage })))
const OrganizationSelectPage = lazy(() => import('../pages').then(module => ({ default: module.OrganizationSelectPage })))
const DashboardLayout = lazy(() => import('./dashboard/DashboardLayout'))

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
)

const App: React.FC = () => {
  // Check if user is authenticated (check localStorage on mount)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true'
  })
  const [showRegistration, setShowRegistration] = useState(false)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showEventspaceSetup, setShowEventspaceSetup] = useState(false)
  const [showOrganizationSelect, setShowOrganizationSelect] = useState(false)
  const [registrationEmail, setRegistrationEmail] = useState('')
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpVerificationError, setOtpVerificationError] = useState<string | null>(null)
  const [isCreatingPassword, setIsCreatingPassword] = useState(false)
  const [passwordCreationError, setPasswordCreationError] = useState<string | null>(null)
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false)
  const [organizationCreationError, setOrganizationCreationError] = useState<string | null>(null)
  
  const [showPreview, setShowPreview] = useState(false)
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor' | 'events' | 'schedule' | 'communication' | 'resource-management' | 'public'>('dashboard')
  const [puckUi, setPuckUi] = useState<any>(undefined)
  const [showPageCreationModal, setShowPageCreationModal] = useState(false)
  const [showLeftSidebar] = useState(true)
  const [showRightSidebar] = useState(true)

  // Global navigation sync:
  // Many parts of the app call history.pushState/replaceState without dispatching popstate.
  // Emit a consistent event so route handlers stay in sync without requiring hard refresh.
  useEffect(() => {
    const notify = () => window.dispatchEvent(new Event('locationchange'))
    const originalPush = window.history.pushState
    const originalReplace = window.history.replaceState

    window.history.pushState = function (...args) {
      originalPush.apply(this, args as any)
      notify()
    }
    window.history.replaceState = function (...args) {
      originalReplace.apply(this, args as any)
      notify()
    }

    const onPop = () => notify()
    window.addEventListener('popstate', onPop)

    return () => {
      window.history.pushState = originalPush
      window.history.replaceState = originalReplace
      window.removeEventListener('popstate', onPop)
    }
  }, [])
  
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
    loadPages,
    loadPage,
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

  // App event handlers
  const {
    handleProfileClick,
    handlePageCreationSelect,
    handleNavigateToEditor,
    handleAddComponent,
  } = useAppHandlers({
    setCurrentView,
    setCurrentData,
    setPuckUi,
    setShowPreview,
    createNewPage,
  })

  // Handle card click from EventHubContent or sidebar
  const handleEventHubCardClick = (cardId: string) => {
    if (cardId === 'schedule-session') {
      // Navigate to schedule management view
      setCurrentView('schedule')
    } else if (cardId === 'communications') {
      // Navigate to communication page
      setCurrentView('communication')
    } else if (cardId === 'resource-management') {
      // Navigate to resource management page
      setCurrentView('resource-management')
    } else {
      // Handle other card IDs (attendee-management, analytics, website-settings)
      // TODO: Implement navigation for other card types when their pages are created
    }
  }

  // Custom back to editor handler
  const handleBackToEditor = () => {
    setCurrentView('editor')
  }

  // Custom back to dashboard handler
  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    window.history.pushState({}, '', '/dashboard')
    // IMPORTANT: pushState does not trigger popstate; keep dashboard route state in sync
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // Helper function to check if user has an organization
  const hasOrganization = (): boolean => {
    const orgUuid = localStorage.getItem('organizationUuid')
    const orgName = localStorage.getItem('organizationName')
    return !!(orgUuid && orgName)
  }

  // Handle login
  const handleLogin = async (email: string, password: string) => {
    try {
      // Call the sign in API
      const response = await signIn(email, password)
      
      const organizations = response.data?.organizations
      if (response.data) {
        const { access, refresh } = response.data
        if (access) {
          localStorage.setItem('accessToken', access)
        }
        if (refresh) {
          localStorage.setItem('refreshToken', refresh)
        }
        
        // Store email for reference
        localStorage.setItem('userEmail', email)
        
        // Store organizations from token (organization_uuid, organization_name, role)
        if (organizations && organizations.length > 0) {
          localStorage.setItem('organizationsFromToken', JSON.stringify(organizations))
          if (organizations.length === 1) {
            const o = organizations[0]
            const uuid = o.organization_uuid ?? o.uuid ?? o.id
            const name = o.organization_name ?? o.name ?? o.title
            if (uuid) localStorage.setItem('organizationUuid', String(uuid))
            if (name) localStorage.setItem('organizationName', String(name))
            if (o.role) localStorage.setItem('userRole', String(o.role))
          } else {
            localStorage.removeItem('organizationUuid')
            localStorage.removeItem('organizationName')
            localStorage.removeItem('userRole')
          }
        } else {
          localStorage.removeItem('organizationsFromToken')
          localStorage.removeItem('organizationUuid')
          localStorage.removeItem('organizationName')
        }
      }
      
      // Set authentication state
      setIsAuthenticated(true)
      localStorage.setItem('isAuthenticated', 'true')
      
      // Check if user has organization
      const hasOrg = hasOrganization()
      
      if (hasOrg) {
        setCurrentView('dashboard')
      } else if (organizations && organizations.length > 0) {
        // Multiple orgs - show org picker (organizations from token)
        setShowOrganizationSelect(true)
      } else {
        // No orgs - redirect to create organization (eventspace setup)
        setShowEventspaceSetup(true)
      }
    } catch (error) {
      // Error is already handled in authService with toast
      // Authentication failed, user remains on login page
    }
  }

  // Handle registration
  // Note: OTP is already sent in RegistrationPage.tsx, this function only handles navigation
  const handleRegistration = (email: string) => {
    // Store email and navigate to verification page
    // The OTP API call and toast notification are already handled in RegistrationPage.tsx
    setRegistrationEmail(email)
    setShowRegistration(false)
    setShowEmailVerification(true)
  }

  // Handle email verification
  const handleEmailVerification = async (code: string) => {
    setIsVerifyingOtp(true)
    setOtpVerificationError(null)

    try {
      // Call the verify OTP API
      const response = await verifyRegistrationOtp(registrationEmail, code)
      
      if (response.status === 'success') {
        // Toast notification is already shown by authService
        // Navigate to password creation page
        setShowEmailVerification(false)
        setShowCreatePassword(true)
      }
    } catch (error) {
      // Error is already handled in authService with toast
      // Set local error state for UI display
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP. Please try again.'
      setOtpVerificationError(errorMessage)
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Handle password creation
  const handlePasswordCreation = async (password: string) => {
    setIsCreatingPassword(true)
    setPasswordCreationError(null)

    try {
      // Call the create password API with email and password
      const response = await createPassword(registrationEmail, password)
      
      // Store tokens in localStorage if available
      if (response.data) {
        const { access, refresh, user } = response.data
        if (access) {
          localStorage.setItem('accessToken', access)
        }
        if (refresh) {
          localStorage.setItem('refreshToken', refresh)
        }
        
        // Store user data
        if (user?.email) {
          localStorage.setItem('userEmail', user.email)
        }
      }
      
      // Navigate to eventspace setup page - always navigate if API call succeeded
      setShowCreatePassword(false)
      setShowEventspaceSetup(true)
    } catch (error) {
      // Error is already handled in authService with toast
      // Set local error state for UI display
      const errorMessage = error instanceof Error ? error.message : 'Failed to create password. Please try again.'
      setPasswordCreationError(errorMessage)
    } finally {
      setIsCreatingPassword(false)
    }
  }

  // Handle eventspace setup
  const handleEventspaceSetup = async (eventspaceName: string) => {
    setIsCreatingOrganization(true)
    setOrganizationCreationError(null)

    try {
      // Call the create organization API
      const organization = await createOrganization(eventspaceName)
      
      // Store organization data in localStorage
      if (organization.uuid) {
        localStorage.setItem('organizationUuid', organization.uuid)
        localStorage.setItem('organizationName', organization.name)
      }
      
      // Ensure user is authenticated (in case they skipped password creation)
      if (!isAuthenticated) {
        setIsAuthenticated(true)
        localStorage.setItem('isAuthenticated', 'true')
      }
      
      // Hide eventspace setup page
      setShowEventspaceSetup(false)
      
      // Navigate to dashboard
      setCurrentView('dashboard')
      
      // Show success message
      showToast.success('Organization created successfully!')
    } catch (error) {
      // Error is already handled in authService with toast
      // Set local error state for UI display
      const errorMessage = error instanceof Error ? error.message : 'Failed to create organization. Please try again.'
      setOrganizationCreationError(errorMessage)
    } finally {
      setIsCreatingOrganization(false)
    }
  }

  // Handle resend OTP code
  const handleResendCode = () => {
    // TODO: Implement actual resend logic
  }

  // Handle organization selection (from token org list)
  const handleOrganizationSelect = (org: { uuid: string; name: string; role?: string }) => {
    localStorage.setItem('organizationUuid', org.uuid)
    localStorage.setItem('organizationName', org.name)
    if (org.role) localStorage.setItem('userRole', org.role)
    setShowOrganizationSelect(false)
    setCurrentView('dashboard')
    window.history.pushState({}, '', '/dashboard')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleNeedToCreateOrg = () => {
    setShowOrganizationSelect(false)
    setShowEventspaceSetup(true)
  }

  // Handle logout - clear all authentication data
  const handleLogout = () => {
    // Clear authentication state
    setIsAuthenticated(false)
    
    // Clear all localStorage items related to authentication
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('organizationUuid')
    localStorage.removeItem('organizationName')
    localStorage.removeItem('organizationsFromToken')
    localStorage.removeItem('userRole')
    
    // Show logout confirmation
    showToast.success('Logged out successfully')
  }

  // Handle social sign-in (placeholder)
  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    setIsAuthenticated(true)
    localStorage.setItem('isAuthenticated', 'true')
  }

  const handleMicrosoftSignIn = () => {
    // TODO: Implement Microsoft OAuth
    setIsAuthenticated(true)
    localStorage.setItem('isAuthenticated', 'true')
  }

  const handleMagicLinkSignIn = () => {
    // TODO: Implement magic link authentication
  }

  // Check organization status on mount and when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      const hasOrg = hasOrganization()
      const inRegistrationFlow = showCreatePassword || showEmailVerification || showRegistration
      const orgsJson = localStorage.getItem('organizationsFromToken')
      let orgsFromToken: any[] = []
      try {
        if (orgsJson) orgsFromToken = JSON.parse(orgsJson)
      } catch { /* ignore */ }

      if (!hasOrg && !inRegistrationFlow && !showEventspaceSetup) {
        if (orgsFromToken.length > 0) {
          setShowOrganizationSelect(true)
        } else {
          setShowEventspaceSetup(true)
        }
      }
    }
  }, [isAuthenticated, showEventspaceSetup, showCreatePassword, showEmailVerification, showRegistration])

  // Apply Puck styling when not in preview mode
  useEffect(() => {
    if (!showPreview && isAuthenticated) {
      return setupPuckStyling()
    }
  }, [showPreview, isAuthenticated])

  // Store loadPage in a ref to avoid re-running effect when function reference changes
  const loadPageRef = useRef(loadPage)
  const currentViewRef = useRef(currentView)
  
  useEffect(() => {
    loadPageRef.current = loadPage
  }, [loadPage])
  
  useEffect(() => {
    currentViewRef.current = currentView
  }, [currentView])

  // Detect editor route from WebsitePreviewPage and handle route changes
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    let lastCheckedPath = ''

    const checkRoute = () => {
      const path = window.location.pathname

      // If path hasn't changed, we still need to enforce the correct view.
      // (Several parts of the app call setCurrentView without updating the URL, which can
      // leave us in an inconsistent state until a hard refresh.)
      const pathUnchanged = path === lastCheckedPath
      lastCheckedPath = path
      
      if (path.startsWith('/event/website/editor/')) {
        // Extract pageId from path: /event/website/editor/:pageId
        // Remove query params if present
        const pathWithoutQuery = path.split('?')[0]
        const pageIdMatch = pathWithoutQuery.match(/\/event\/website\/editor\/(.+)/)
        const pageId = pageIdMatch ? pageIdMatch[1] : 'welcome'
        
        // Only switch to editor view if not already in editor view
        if (currentViewRef.current !== 'editor') {
          setCurrentView('editor')
        }
        setShowPreview(false)
        
        // Load the page data - ensure it loads even if page is not in pages array
        const pageFilename = pageId.endsWith('.json') ? pageId : `${pageId}.json`
        loadPageRef.current(pageFilename)
          .catch(() => {
            // Error loading page
          })
      } else if (path.startsWith('/event/hub')) {
        // Navigate to Event Hub page
        if (currentViewRef.current !== 'events') {
          setCurrentView('events')
        }
      } else if (path === '/event/create/template') {
        // Navigate to Template Selection page - switch to dashboard view
        // DashboardLayout will handle showing the TemplateSelectionPage
        if (currentViewRef.current !== 'dashboard') {
          setCurrentView('dashboard')
        }
      } else if (path === '/dashboard' || path.startsWith('/dashboard/')) {
        // Navigate to Dashboard (including sub-routes like /dashboard/team)
        if (currentViewRef.current !== 'dashboard') {
          setCurrentView('dashboard')
        }
      } else if (path.startsWith('/event/website/preview/') || path.startsWith('/event/website')) {
        // If navigating to preview or website management, switch to dashboard view
        // DashboardLayout will handle showing the correct page
        if (currentViewRef.current !== 'dashboard') {
          setCurrentView('dashboard')
        }
      }

      // If nothing matched and the path didn't change, do nothing else.
      // (All handled routes above already enforce view consistency.)
      void pathUnchanged
    }

    // Check on mount
    checkRoute()

    // Listen for navigation events (popstate + programmatic pushState/replaceState)
    const handleLocationChange = () => {
      checkRoute()
    }

    window.addEventListener('locationchange', handleLocationChange)

    return () => {
      window.removeEventListener('locationchange', handleLocationChange)
    }
  }, [isAuthenticated])

  // Listen for navigation to schedule page
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    
    const handleNavigateToScheduleEvent = () => {
      setCurrentView('schedule')
    }

    window.addEventListener('navigate-to-schedule', handleNavigateToScheduleEvent)
    
    return () => {
      window.removeEventListener('navigate-to-schedule', handleNavigateToScheduleEvent)
    }
  }, [isAuthenticated])

  // Public routes (event list, /events/:uuid) are handled by PublicApp in main.tsx – never reach here for public URLs

  // Show organization picker (orgs from token) when authenticated, no org selected
  if (isAuthenticated && !hasOrganization() && showOrganizationSelect && !showCreatePassword && !showEmailVerification && !showRegistration) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <OrganizationSelectPage
          onSelect={handleOrganizationSelect}
          onNeedToCreateOrg={handleNeedToCreateOrg}
          onLogout={handleLogout}
        />
      </Suspense>
    )
  }

  // Show eventspace setup (create org) during registration or when no orgs from token
  if (showEventspaceSetup && (!isAuthenticated || !hasOrganization())) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <EventspaceSetupPage
          onSubmit={handleEventspaceSetup}
          isLoading={isCreatingOrganization}
          error={organizationCreationError}
          onNameChange={() => setOrganizationCreationError(null)}
        />
      </Suspense>
    )
  }

  // Show login, registration, email verification, password creation pages if not authenticated
  if (!isAuthenticated) {
    // Canonical path for login page: /login (email, password, login button)
    const isLoginPath = window.location.pathname === '/login'

    if (showCreatePassword && !isLoginPath) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <CreatePasswordPage
            onSubmit={handlePasswordCreation}
            isLoading={isCreatingPassword}
            error={passwordCreationError}
            onPasswordChange={() => setPasswordCreationError(null)}
          />
        </Suspense>
      )
    }
    
    if (showEmailVerification && !isLoginPath) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <EmailVerificationPage
            email={registrationEmail}
            onVerify={handleEmailVerification}
            onResendCode={handleResendCode}
            isLoading={isVerifyingOtp}
            error={otpVerificationError}
            onCodeChange={() => setOtpVerificationError(null)}
          />
        </Suspense>
      )
    }
    
    if (showRegistration && !isLoginPath) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <RegistrationPage
            onSubmit={handleRegistration}
            onTermsClick={() => {}}
            onAlreadyHaveAccount={() => setShowRegistration(false)}
            onClose={() => setShowRegistration(false)}
          />
        </Suspense>
      )
    }
    
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginPage
          onSubmit={handleLogin}
          onGoogleSignIn={handleGoogleSignIn}
          onMicrosoftSignIn={handleMicrosoftSignIn}
          onMagicLinkSignIn={handleMagicLinkSignIn}
          onForgotPassword={() => {}}
          onNavigateToRegistration={() => setShowRegistration(true)}
        />
      </Suspense>
    )
  }

  // Route protection: Check if user has organization before accessing protected routes
  if (isAuthenticated && !hasOrganization()) {
    // User is authenticated but doesn't have organization - show eventspace setup
    return (
      <Suspense fallback={<LoadingFallback />}>
        <EventspaceSetupPage
          onSubmit={handleEventspaceSetup}
          isLoading={isCreatingOrganization}
          error={organizationCreationError}
          onNameChange={() => setOrganizationCreationError(null)}
        />
      </Suspense>
    )
  }

  // Render Dashboard
  // NOTE: EventFormProvider is already in main.tsx, so we don't need to wrap here
  // Having two providers creates separate context instances, causing event context to be lost
  if (currentView === 'dashboard') {
    const organizationName = localStorage.getItem('organizationName') || 'Web Summit'
    const userEmail = localStorage.getItem('userEmail') || ''
    
    return (
      <Suspense fallback={<LoadingFallback />}>
        <DashboardLayout
          organizationName={organizationName}
          title="Web Submit Events"
          userAvatarUrl=""
          userEmail={userEmail}
          // Dashboard sidebar navigation is handled inside DashboardLayout via /dashboard routes.
          // Do not switch App-level views here (currentView "events" is the Event Hub view).
          onSidebarItemClick={() => {}}
          onSearchClick={() => {}}
          onNotificationClick={() => {}}
          onProfileClick={handleProfileClick}
          onLogout={handleLogout}
          onNewEventClick={() => {}}
          onEditEvent={(_eventId) => {}}
          onSortEvents={(_column) => {}}
        />
      </Suspense>
    )
  }

  // Render Events Page (Event Hub)
  if (currentView === 'events') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <EventHubPage
          eventName="Highly important conference of 2025"
          isDraft={true}
          onBackClick={handleBackToDashboard}
          userAvatarUrl="" // Add user avatar URL here if available
          onCardClick={handleEventHubCardClick}
        />
      </Suspense>
    )
  }

  // Render Schedule Page
  if (currentView === 'schedule') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <SchedulePage
          eventName="Highly important conference of 2025"
          isDraft={true}
          onBackClick={handleBackToDashboard}
          userAvatarUrl=""
          scheduleName="Schedule 1"
          onCardClick={handleEventHubCardClick}
        />
      </Suspense>
    )
  }

  // Render Communication Page
  if (currentView === 'communication') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <CommunicationPage
          eventName="Highly important conference of 2025"
          isDraft={true}
          onBackClick={handleBackToDashboard}
          userAvatarUrl=""
          onCardClick={handleEventHubCardClick}
        />
      </Suspense>
    )
  }

  // Render Resource Management Page
  if (currentView === 'resource-management') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ResourceManagementPage
          eventName="Highly important conference of 2025"
          isDraft={true}
          onBackClick={handleBackToDashboard}
          userAvatarUrl=""
          onCardClick={handleEventHubCardClick}
        />
      </Suspense>
    )
  }

  // Render Editor Page
  return (
    <EditorViewWithNavbar
      currentData={currentData}
      currentPage={currentPage}
      currentPageName={currentPageName}
      pages={pages}
      puckUi={puckUi}
      showPreview={showPreview}
      showLeftSidebar={showLeftSidebar}
      showRightSidebar={showRightSidebar}
      showPageManager={showPageManager}
      showPageNameDialog={showPageNameDialog}
      showPageCreationModal={showPageCreationModal}
      onPublish={handlePublish}
      onDataChange={handleDataChange}
      setCurrentData={setCurrentData}
      loadPage={loadPage}
      setShowPageManager={setShowPageManager}
      setShowPageNameDialog={setShowPageNameDialog}
      setCurrentPageName={setCurrentPageName}
      confirmNewPage={confirmNewPage}
      setShowPageCreationModal={setShowPageCreationModal}
      handlePageCreationSelect={handlePageCreationSelect}
      handleNavigateToEditor={handleNavigateToEditor}
      handleAddComponent={handleAddComponent}
      setShowPreview={setShowPreview}
      handleBackToEditor={handleBackToEditor}
      handleBackToDashboard={handleBackToDashboard}
      createPageFromTemplate={createPageFromTemplate}
      createNewPage={createNewPage}
      handleProfileClick={handleProfileClick}
    />
  )
}

// Wrapper component to access EventFormContext
const EditorViewWithNavbar: React.FC<{
  currentData: any
  currentPage: string
  currentPageName: string
  pages: any[]
  puckUi: any
  showPreview: boolean
  showLeftSidebar: boolean
  showRightSidebar: boolean
  showPageManager: boolean
  showPageNameDialog: boolean
  showPageCreationModal: boolean
  onPublish: (data: any) => void
  onDataChange: (data: any) => void
  setCurrentData: (data: any) => void
  loadPage: (filename: string) => Promise<any>
  setShowPageManager: (show: boolean) => void
  setShowPageNameDialog: (show: boolean) => void
  setCurrentPageName: (name: string) => void
  confirmNewPage: (pageName: string) => void
  setShowPageCreationModal: (show: boolean) => void
  handlePageCreationSelect: (pageType: any) => void
  handleNavigateToEditor: () => void
  handleAddComponent: (componentType: string, props?: any) => void
  setShowPreview: (show: boolean) => void
  handleBackToEditor: () => void
  handleBackToDashboard: () => void
  createPageFromTemplate: (templateType: string) => Promise<any>
  createNewPage: () => void
  handleProfileClick: () => void
}> = (props) => {
  const { eventData, createdEvent } = useEventForm()
  const userAvatarUrl = localStorage.getItem('userAvatarUrl') || ''
  
  // Prioritize createdEvent from API (has correct UUID), fallback to eventData from form
  const displayEventName = createdEvent?.eventName || eventData?.eventName || 'Highly important conference of 2025'
  
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Global Navbar - EventHubNavbar */}
      <EventHubNavbar
        key={createdEvent?.uuid || 'no-event'} // Force re-render when event changes
        eventName={displayEventName}
        isDraft={true}
        onBackClick={props.handleBackToDashboard}
        onSearchClick={() => {}}
        onNotificationClick={() => {}}
        onProfileClick={props.handleProfileClick}
        userAvatarUrl={userAvatarUrl}
      />

      {/* Page Manager */}
      <PageManager
        pages={props.pages}
        currentPage={props.currentPage}
        onPageSelect={props.loadPage}
        isVisible={props.showPageManager}
      />

      {/* Page Name Dialog */}
      <PageNameDialog
        isVisible={props.showPageNameDialog}
        pageName={props.currentPageName}
        onPageNameChange={props.setCurrentPageName}
        onConfirm={props.confirmNewPage}
        onCancel={() => props.setShowPageNameDialog(false)}
      />

      {/* Page Creation Modal */}
      <PageCreationModal
        isVisible={props.showPageCreationModal}
        onClose={() => props.setShowPageCreationModal(false)}
        onSelect={props.handlePageCreationSelect}
      />

      {/* Main Content - Editor View */}
      <Suspense fallback={<LoadingFallback />}>
        <EditorView
        currentData={props.currentData}
        currentPage={props.currentPage}
        currentPageName={props.currentPageName}
        pages={props.pages}
        puckUi={props.puckUi}
        showPreview={props.showPreview}
        showLeftSidebar={props.showLeftSidebar}
        showRightSidebar={props.showRightSidebar}
        showPageManager={props.showPageManager}
        onPublish={props.onPublish}
        onChange={props.onDataChange}
        onDataChange={props.setCurrentData}
        onPageSelect={props.loadPage}
        onAddPage={() => props.setShowPageCreationModal(true)}
        onManagePages={() => props.setShowPageManager(!props.showPageManager)}
        onNavigateToEditor={props.handleNavigateToEditor}
        onAddComponent={props.handleAddComponent}
        onPreviewToggle={() => props.setShowPreview(!props.showPreview)}
        onBack={props.handleBackToEditor}
        onCreatePageFromTemplate={props.createPageFromTemplate}
        onCreateNewPage={props.createNewPage}
      />
      </Suspense>
    </div>
  )
}

export default App
