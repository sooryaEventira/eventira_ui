import React from 'react'
import { EventHubNavbar } from '../eventhub'
import { PageManager, PageNameDialog, PageCreationModal } from '../page'
import { EditorView, withSuspense } from './lazyImports'
import { useEventForm } from '../../contexts/EventFormContext'

export interface EditorViewWithNavbarProps {
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
}

export const EditorViewWithNavbar: React.FC<EditorViewWithNavbarProps> = (props) => {
  const { eventData, createdEvent } = useEventForm()
  const userAvatarUrl = localStorage.getItem('userAvatarUrl') || ''
  const displayEventName =
    createdEvent?.eventName || eventData?.eventName || 'Highly important conference of 2025'
  const eventStatus = (createdEvent as { status?: string } | null)?.status ?? (eventData as { status?: string } | null)?.status
  const eventLogoUrl = createdEvent?.logo ?? undefined

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <EventHubNavbar
        key={createdEvent?.uuid || 'no-event'}
        eventName={displayEventName}
        eventLogoUrl={eventLogoUrl}
        isDraft={true}
        eventStatus={eventStatus}
        onBackClick={props.handleBackToDashboard}
        onSearchClick={() => {}}
        onNotificationClick={() => {}}
        onProfileClick={props.handleProfileClick}
        userAvatarUrl={userAvatarUrl}
      />

      <PageManager
        pages={props.pages}
        currentPage={props.currentPage}
        onPageSelect={props.loadPage}
        isVisible={props.showPageManager}
      />

      <PageNameDialog
        isVisible={props.showPageNameDialog}
        pageName={props.currentPageName}
        onPageNameChange={props.setCurrentPageName}
        onConfirm={props.confirmNewPage}
        onCancel={() => props.setShowPageNameDialog(false)}
      />

      <PageCreationModal
        isVisible={props.showPageCreationModal}
        onClose={() => props.setShowPageCreationModal(false)}
        onSelect={props.handlePageCreationSelect}
      />

      {withSuspense(
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
      )}
    </div>
  )
}
