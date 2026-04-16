import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react'
import { useEventForm } from '../../contexts/EventFormContext'
import EventHubNavbar from './EventHubNavbar'
import EventHubSidebar from './EventHubSidebar'
import { defaultCards, ContentCard } from './EventHubContent'
import { InfoCircle, CodeBrowser, Globe01 } from '@untitled-ui/icons-react'

// Lazy-load section components so only the active section loads
const CommunicationPage = lazy(() => import('./communication/CommunicationPage').then((m) => ({ default: m.default })))
const ResourceManagementPage = lazy(() => import('./resourcemanagement/ResourceManagementPage').then((m) => ({ default: m.default })))
const SchedulePage = lazy(() => import('./schedulesession/SchedulePage').then((m) => ({ default: m.default })))
const EventWebsitePage = lazy(() => import('./Eventwebsite/EventWebsitePage').then((m) => ({ default: m.default })))
const UserManagementPage = lazy(() => import('./usermanagement/UserManagementPage').then((m) => ({ default: m.default })))
const OrganizationManagementPage = lazy(() => import('./organizationmanagement/OrganizationManagementPage').then((m) => ({ default: m.default })))
const WebsiteSettingsPage = lazy(() => import('./websitesettings/WebsiteSettingsPage').then((m) => ({ default: m.default })))
const EventHubOverviewPage = lazy(() => import('./overview/EventHubOverviewPage').then((m) => ({ default: m.default })))
const RegistrationFormPage = lazy(() => import('./registrationform/RegistrationFormPage').then((m) => ({ default: m.default })))

const SectionFallback = () => (
  <div className="flex h-full min-h-[200px] items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
)

interface EventHubPageProps {
  eventName?: string
  isDraft?: boolean
  onBackClick?: () => void
  userAvatarUrl?: string
  onCardClick?: (cardId: string) => void
}

const EventHubPage: React.FC<EventHubPageProps> = ({
  eventName: propEventName,
  isDraft: propIsDraft,
  onBackClick,
  userAvatarUrl
}) => {
  // Get eventData and createdEvent from context to maintain consistency across all pages
  const { eventData, createdEvent } = useEventForm()
  
  // Prioritize createdEvent data from API (set when clicking event from dashboard), 
  // fallback to eventData from form, then props
  // Use useMemo to ensure we always get the latest value and prevent stale reads
  const eventName = useMemo(() => {
    const name = createdEvent?.eventName || eventData?.eventName || propEventName || 'Highly important conference of 2025'
    return name
  }, [createdEvent?.eventName, createdEvent?.uuid, eventData?.eventName, propEventName])
  const isDraft = propIsDraft !== undefined ? propIsDraft : true
  const eventStatus = (createdEvent as { status?: string } | null)?.status ?? (eventData as { status?: string } | null)?.status
  const eventLogoUrl = createdEvent?.logo ?? undefined
  const [activeSection, setActiveSection] = useState('event-website')

  // Read section from URL only on initial mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const section = urlParams.get('section')
    if (section) {
      setActiveSection(section)
    } else {
      // If no section in URL, default to event-website instead of empty event-hub page
      setActiveSection('event-website')
    }
  }, []) // Only run on mount

  const handleSearchClick = () => {
    // TODO: Implement search functionality
  }

  const handleNotificationClick = () => {
    // TODO: Implement notification functionality
  }

  const handleProfileClick = () => {
    // TODO: Implement profile functionality
  }

  // Convert cards to sidebar sub-items
  const sidebarItems = useMemo(() => {
    const eventHubSubItems = defaultCards.map((card: ContentCard) => ({
      id: card.id,
      label: card.title,
      icon: card.icon
    }))

    return [
      { id: 'summary', label: 'Summary', icon: <InfoCircle className="h-5 w-5" /> },
      { id: 'event-website', label: 'Event website', icon: <CodeBrowser className="h-5 w-5" /> },
      {
        id: 'event-hub',
        label: 'Event Hub',
        icon: <Globe01 className="h-5 w-5" />,
        subItems: eventHubSubItems
      }
    ]
  }, [])

  const handleBackClick = useCallback(() => {
    // Always go directly to dashboard when clicking back from Event Hub or any sub-section
    onBackClick?.()
  }, [onBackClick])

  const handleSidebarItemClick = useCallback((itemId: string) => {
    // Handle top-level menu items
    if (itemId === 'event-hub' || itemId === 'event-website' || itemId === 'summary') {
      setActiveSection(itemId)
      // Update URL to reflect the change
      const newUrl = itemId === 'event-hub' ? '/event/hub' : `/event/hub?section=${itemId}`
      window.history.pushState({ section: itemId }, '', newUrl)
      return
    }
    
    // Check if this is a card ID and set it as active section
    const isCardId = defaultCards.some((card) => card.id === itemId)
    if (isCardId) {
      setActiveSection(itemId)
      // Update URL to reflect the change
      window.history.pushState({ section: itemId }, '', `/event/hub?section=${itemId}`)
    }
  }, [])

  const renderContent = () => {
    switch (activeSection) {
      case 'summary':
        return (
          <EventHubOverviewPage
            onNavigateSection={(sectionId) => {
              setActiveSection(sectionId)
              window.history.pushState({ section: sectionId }, '', `/event/hub?section=${sectionId}`)
            }}
          />
        )
      case 'communications':
        return (
          <CommunicationPage
            eventName={eventName}
            isDraft={isDraft}
            onBackClick={onBackClick}
            userAvatarUrl={userAvatarUrl}
            hideNavbarAndSidebar={true}
          />
        )
      case 'resource-management':
        return (
          <ResourceManagementPage
            eventName={eventName}
            isDraft={isDraft}
            onBackClick={onBackClick}
            userAvatarUrl={userAvatarUrl}
            hideNavbarAndSidebar={true}
          />
        )
      case 'schedule-session':
        return (
          <SchedulePage
            eventName={eventName}
            isDraft={isDraft}
            onBackClick={onBackClick}
            userAvatarUrl={userAvatarUrl}
            scheduleName="Schedule 1"
            hideNavbarAndSidebar={true}
          />
        )
      case 'event-website':
        return (
          <EventWebsitePage
            onBackClick={onBackClick}
            userAvatarUrl={userAvatarUrl}
            hideNavbarAndSidebar={true}
          />
        )
      case 'user-management':
        return (
          <UserManagementPage
            eventName={eventName}
            isDraft={isDraft}
            onBackClick={onBackClick}
            userAvatarUrl={userAvatarUrl}
            hideNavbarAndSidebar={true}
          />
        )
      case 'organization-management':
        return (
          <OrganizationManagementPage
            eventName={eventName}
            isDraft={isDraft}
            onBackClick={onBackClick}
            userAvatarUrl={userAvatarUrl}
            hideNavbarAndSidebar={true}
          />
        )
      case 'analytics':
        // Placeholder for pages that haven't been implemented yet
        return (
          <div className="min-h-screen flex items-center justify-center p-8 ">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-700 mb-4">
                {defaultCards.find(card => card.id === activeSection)?.title || 'Coming Soon'}
              </h2>
              <p className="text-slate-500">
                This feature is coming soon.
              </p>
            </div>
          </div>
        )
      case 'website-settings':
        return (
          <WebsiteSettingsPage
            hideNavbarAndSidebar={true}
          />
        )
      case 'registration-form':
        return <RegistrationFormPage hideNavbarAndSidebar={true} />
      case 'event-hub':
      default:
        // Redirect to event-website instead of showing empty Event Hub page
        return (
          <EventWebsitePage
            onBackClick={onBackClick}
            userAvatarUrl={userAvatarUrl}
            hideNavbarAndSidebar={true}
          />
        )
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-white">
      {/* Navbar - Uses eventData from context for consistency */}
      <EventHubNavbar
        key={createdEvent?.uuid || 'no-event'} // Force re-render when event changes
        eventName={eventName}
        eventLogoUrl={eventLogoUrl}
        isDraft={isDraft}
        eventStatus={eventStatus}
        onBackClick={handleBackClick}
        onSearchClick={handleSearchClick}
        onNotificationClick={handleNotificationClick}
        onProfileClick={handleProfileClick}
        userAvatarUrl={userAvatarUrl}
      />

      {/* Sidebar */}
      <EventHubSidebar
        items={sidebarItems}
        activeItemId={activeSection}
        onItemClick={handleSidebarItemClick}
      />

      {/* Content Area */}
      <div key={activeSection} className="md:pl-[250px] pt-16 h-[calc(100vh-6px)] overflow-y-auto">
        <Suspense fallback={<SectionFallback />}>
          {renderContent()}
        </Suspense>
      </div>
    </div>
  )
}

export default EventHubPage

