import React from 'react'
import {
  DashboardLayout,
  EventHubPage,
  SchedulePage,
  CommunicationPage,
  ResourceManagementPage,
  AnalyticsPage,
  withSuspense
} from './lazyImports'
import { EditorViewWithNavbar, type EditorViewWithNavbarProps } from './EditorViewWithNavbar'
import type { AppView } from '../../hooks/useAppRouting'
import type { UseAuthReturn } from '../../hooks/useAuth'

interface MainScreensProps {
  currentView: AppView
  auth: UseAuthReturn
  onEventHubCardClick: (cardId: string) => void
  onBackToDashboard: () => void
  handleProfileClick: () => void
  editorProps: EditorViewWithNavbarProps
}

export function MainScreens({
  currentView,
  auth,
  onEventHubCardClick,
  onBackToDashboard,
  handleProfileClick,
  editorProps
}: MainScreensProps): React.ReactElement {
  const handleOrganizationChange = (org: { uuid: string; name: string; role?: string }) => {
    auth.handleOrganizationSelect(org)
    // Force a page reload to refresh data with the new organization context
    window.location.reload()
  }

  if (currentView === 'dashboard') {
    const organizationName = localStorage.getItem('organizationName') || 'Web Summit'
    const userEmail = localStorage.getItem('userEmail') || ''

    return withSuspense(
      <DashboardLayout
        organizationName={organizationName}
        title="Web Submit Events"
        userAvatarUrl=""
        userEmail={userEmail}
        onSidebarItemClick={() => {}}
        onSearchClick={() => {}}
        onNotificationClick={() => {}}
        onProfileClick={handleProfileClick}
        onLogout={auth.handleLogout}
        onNewEventClick={() => {}}
        onEditEvent={() => {}}
        onSortEvents={() => {}}
        onOrganizationChange={handleOrganizationChange}
      />
    )
  }

  if (currentView === 'events') {
    return withSuspense(
      <EventHubPage
        eventName="Highly important conference of 2025"
        isDraft={true}
        onBackClick={onBackToDashboard}
        userAvatarUrl=""
        onCardClick={onEventHubCardClick}
        onLogout={auth.handleLogout}
      />
    )
  }

  if (currentView === 'schedule') {
    return withSuspense(
      <SchedulePage
        eventName="Highly important conference of 2025"
        isDraft={true}
        onBackClick={onBackToDashboard}
        userAvatarUrl=""
        scheduleName="Schedule 1"
        onCardClick={onEventHubCardClick}
      />
    )
  }

  if (currentView === 'communication') {
    return withSuspense(
      <CommunicationPage
        eventName="Highly important conference of 2025"
        isDraft={true}
        onBackClick={onBackToDashboard}
        userAvatarUrl=""
        onCardClick={onEventHubCardClick}
      />
    )
  }

  if (currentView === 'resource-management') {
    return withSuspense(
      <ResourceManagementPage
        eventName="Highly important conference of 2025"
        isDraft={true}
        onBackClick={onBackToDashboard}
        userAvatarUrl=""
        onCardClick={onEventHubCardClick}
      />
    )
  }

  if (currentView === 'analytics') {
    return withSuspense(
      <AnalyticsPage
        eventName="Highly important conference of 2025"
        isDraft={true}
        onBackClick={onBackToDashboard}
        userAvatarUrl=""
        onCardClick={onEventHubCardClick}
      />
    )
  }

  return <EditorViewWithNavbar {...editorProps} />
}
