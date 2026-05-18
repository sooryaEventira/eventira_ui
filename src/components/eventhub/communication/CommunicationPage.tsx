import React, { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { XClose } from '@untitled-ui/icons-react'
import { useEventForm } from '../../../contexts/EventFormContext'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import CommunicationsTable from './CommunicationsTable'
import BroadcastTypeModal from './BroadcastTypeModal'
import BroadcastComposer from './BroadcastComposer'
import PushNotificationMakerPage from './PushNotificationMakerPage'
import CreateMacroModal from './CreateMacroModal'
import ConfirmDeleteModal from '../../ui/ConfirmDeleteModal'
import RecipientsSlideout from './RecipientsSlideout'
import { defaultCards, ContentCard } from '../EventHubContent'
import { CodeBrowser, Globe01, InfoCircle } from '@untitled-ui/icons-react'
import { useCommunications } from './useCommunications'
import { useMacros } from './useMacros'
import { useComposerState } from './useComposerState'
import {
  fetchCommunicationRecipients,
  fetchRecipientsPage,
  resendCommunicationRecipient,
  type RecipientItem,
} from '../../../services/communicationService'
import { showToast } from '../../../utils/toast'

interface CommunicationPageProps {
  eventName?: string
  isDraft?: boolean
  onBackClick?: () => void
  userAvatarUrl?: string
  onCardClick?: (cardId: string) => void
  hideNavbarAndSidebar?: boolean
}

const CommunicationPage: React.FC<CommunicationPageProps> = ({
  eventName: propEventName,
  isDraft: propIsDraft,
  onBackClick,
  userAvatarUrl,
  onCardClick,
  hideNavbarAndSidebar = false,
}) => {
  const { eventData, createdEvent } = useEventForm()
  const eventUuid = createdEvent?.uuid
  const eventName = createdEvent?.eventName || eventData?.eventName || propEventName || 'Highly important conference of 2025'
  const isDraft = propIsDraft !== undefined ? propIsDraft : true
  const eventStatus = (createdEvent as { status?: string } | null)?.status ?? (eventData as { status?: string } | null)?.status

  // ── data ──────────────────────────────────────────────────────────────────
  const {
    communications,
    setCommunications,
    isLoadingCommunications,
    setOptimisticSentIds,
    loadCommunications,
  } = useCommunications(eventUuid)

  const { macros, setMacros, isLoadingMacros } = useMacros(eventUuid)

  // ── composer / modals state ───────────────────────────────────────────────
  const composer = useComposerState({
    communications,
    setCommunications,
    setOptimisticSentIds,
    loadCommunications,
    eventUuid,
  })

  const [isCreateMacroModalOpen, setIsCreateMacroModalOpen] = React.useState(false)

  // ── recipients slideout ───────────────────────────────────────────────────
  const [recipientsSlideout, setRecipientsSlideout] = React.useState<{
    open: boolean
    communicationId: string
    communicationTitle: string
    tab: 'received' | 'not_received'
  }>({ open: false, communicationId: '', communicationTitle: '', tab: 'received' })

  const handleRecipientsClick = (
    communicationId: string,
    communicationTitle: string,
    tab: 'received' | 'not_received'
  ) => {
    setRecipientsSlideout({ open: true, communicationId, communicationTitle, tab })
  }

  const [resendingCommunicationIds, setResendingCommunicationIds] = React.useState<Set<string>>(
    new Set()
  )

  const fetchAllFailedRecipients = React.useCallback(
    async (communicationId: string): Promise<RecipientItem[]> => {
      if (!eventUuid) return []
      const collected: RecipientItem[] = []
      let page = await fetchCommunicationRecipients(communicationId, eventUuid, 'not_received')
      collected.push(...page.data)
      let safety = 0
      while (page.next && safety < 100) {
        safety += 1
        page = await fetchRecipientsPage(page.next)
        collected.push(...page.data)
      }
      return collected
    },
    [eventUuid]
  )

  const resendFailedRecipients = React.useCallback(
    async (communicationId: string, recipients: RecipientItem[]) => {
      const failed = recipients.filter((r) => {
        const status = (r.status || '').toLowerCase()
        return status === 'fail' || status === 'failed' || status === 'failure'
      })
      if (failed.length === 0) return { success: 0, failure: 0 }

      let success = 0
      let failure = 0
      for (const r of failed) {
        try {
          await resendCommunicationRecipient(communicationId, r.id)
          success += 1
        } catch {
          failure += 1
        }
      }
      return { success, failure }
    },
    []
  )

  const handleResendCommunication = React.useCallback(
    async (communicationId: string, communicationTitle: string) => {
      if (!eventUuid) {
        showToast.error('Event UUID is required.')
        return
      }
      if (resendingCommunicationIds.has(communicationId)) return

      setResendingCommunicationIds((prev) => {
        const next = new Set(prev)
        next.add(communicationId)
        return next
      })

      try {
        const recipients = await fetchAllFailedRecipients(communicationId)
        const result = await resendFailedRecipients(communicationId, recipients)

        if (result.success === 0 && result.failure === 0) {
          showToast.info(`No failed recipients to resend for "${communicationTitle}".`)
        } else if (result.failure === 0) {
          showToast.success(`Resent ${result.success} failed message${result.success === 1 ? '' : 's'}.`)
        } else if (result.success === 0) {
          showToast.error(`Failed to resend ${result.failure} message${result.failure === 1 ? '' : 's'}.`)
        } else {
          showToast.success(
            `Resent ${result.success} message${result.success === 1 ? '' : 's'}; ${result.failure} still failing.`
          )
        }
        loadCommunications()
      } catch (e) {
        showToast.error(e instanceof Error ? e.message : 'Failed to resend messages.')
      } finally {
        setResendingCommunicationIds((prev) => {
          const next = new Set(prev)
          next.delete(communicationId)
          return next
        })
      }
    },
    [eventUuid, resendingCommunicationIds, fetchAllFailedRecipients, resendFailedRecipients, loadCommunications]
  )

  const handleRetryAllInSlideout = React.useCallback(async () => {
    if (!recipientsSlideout.communicationId) return
    await handleResendCommunication(
      recipientsSlideout.communicationId,
      recipientsSlideout.communicationTitle
    )
  }, [handleResendCommunication, recipientsSlideout.communicationId, recipientsSlideout.communicationTitle])

  const handleCreateMacroConfirm = (data: { name: string; source: string }) => {
    setMacros((prev) => [
      ...prev,
      { id: Date.now().toString(), macro: `{{${data.name.toLowerCase()}}}`, column: data.name },
    ])
    setIsCreateMacroModalOpen(false)
  }

  // ── sidebar ───────────────────────────────────────────────────────────────
  const sidebarItems = useMemo(() => {
    const eventHubSubItems = defaultCards.map((card: ContentCard) => ({
      id: card.id,
      label: card.title,
      icon: card.icon,
    }))
    return [
      { id: 'event-website', label: 'Event website',  icon: <CodeBrowser className="h-5 w-5" /> },
      { id: 'event-hub',     label: 'Event Hub',      icon: <Globe01 className="h-5 w-5" />, subItems: eventHubSubItems },
    ]
  }, [])

  const handleSidebarItemClick = (itemId: string) => {
    if (itemId === 'event-hub' && onBackClick) {
      composer.runOrConfirmExit(() => onBackClick())
      return
    }
    if (itemId !== 'communications' && onCardClick) {
      composer.runOrConfirmExit(() => onCardClick(itemId))
    }
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className={hideNavbarAndSidebar ? '' : 'min-h-screen overflow-x-hidden bg-white'}>
      {!hideNavbarAndSidebar && (
        <>
          <EventHubNavbar
            eventName={eventName}
            isDraft={isDraft}
            eventStatus={eventStatus}
            onBackClick={onBackClick ? () => composer.runOrConfirmExit(() => onBackClick()) : undefined}
            onSearchClick={() => {}}
            onNotificationClick={() => {}}
            onProfileClick={() => {}}
            userAvatarUrl={userAvatarUrl}
          />
          <EventHubSidebar
            items={sidebarItems}
            activeItemId="communications"
            onItemClick={handleSidebarItemClick}
          />
        </>
      )}

      <div className={hideNavbarAndSidebar ? '' : 'md:pl-[250px]'}>
        {composer.showComposer ? (
          composer.selectedBroadcastType === 'push-notification' ? (
            <PushNotificationMakerPage
              macros={macros}
              broadcastTitle={composer.initialBroadcastTitle}
              initialTitle={composer.initialComposerSubject}
              initialMessage={composer.initialComposerMessage}
              communicationId={composer.currentDraftId}
              startInSavedView={composer.composerOpenInSavedView}
              onCancel={composer.handleComposerCancel}
              onSave={(data) => composer.handleComposerSave({ subject: data.title, message: data.message })}
              onSend={composer.handlePushSend}
              onDirtyChange={composer.setComposerHasUnsavedChanges}
              registerSaveHandler={(handler) => { composer.composerSaveHandlerRef.current = handler }}
            />
          ) : (
            <BroadcastComposer
              onCancel={() => composer.runOrConfirmExit(composer.handleComposerCancel)}
              onDiscard={composer.handleComposerCancel}
              onSave={composer.handleComposerSave}
              onDirtyChange={composer.setComposerHasUnsavedChanges}
              registerSaveHandler={(handler) => { composer.composerSaveHandlerRef.current = handler }}
              onSend={composer.handleEmailSend}
              macros={macros}
              templateType="late-message"
              type={composer.selectedBroadcastType || 'email'}
              broadcastTitle={composer.initialBroadcastTitle}
              initialSubject={composer.initialComposerSubject}
              initialMessage={composer.initialComposerMessage}
              initialUploadedAttachments={composer.initialComposerAttachments}
              startInSavedView={composer.composerOpenInSavedView}
              communicationId={composer.currentDraftId}
            />
          )
        ) : (
          <CommunicationsTable
            communications={communications}
            macros={macros}
            onCreateBroadcast={composer.handleCreateBroadcast}
            onCreateMacro={() => setIsCreateMacroModalOpen(true)}
            onEditCommunication={composer.handleEditCommunication}
            onDeleteCommunication={composer.handleDeleteCommunicationRequest}
            onRecipientsClick={handleRecipientsClick}
            onResendCommunication={handleResendCommunication}
            resendingCommunicationIds={resendingCommunicationIds}
            isLoading={isLoadingCommunications}
            isLoadingMacros={isLoadingMacros}
            onEditMacro={() => {}}
            onDeleteMacro={(macroId) => setMacros((prev) => prev.filter((m) => m.id !== macroId))}
          />
        )}
      </div>

      {/* Create broadcast modal */}
      <BroadcastTypeModal
        isOpen={composer.isBroadcastModalOpen}
        onClose={() => composer.setIsBroadcastModalOpen(false)}
        onSelect={composer.handleBroadcastTypeSelect}
        onSubmit={composer.handleBroadcastSubmit}
      />

      {/* Edit broadcast modal */}
      <BroadcastTypeModal
        isOpen={composer.editModalOpen}
        onClose={() => { if (!composer.isEditSubmitting) composer.setEditModalOpen(false) }}
        mode="edit"
        initialTitle={composer.editModalTitle}
        initialType={composer.editModalType}
        onSubmit={composer.handleEditModalConfirm}
        isSubmitting={composer.isEditSubmitting}
      />

      <CreateMacroModal
        isOpen={isCreateMacroModalOpen}
        onClose={() => setIsCreateMacroModalOpen(false)}
        onConfirm={handleCreateMacroConfirm}
      />

      <ConfirmDeleteModal
        isOpen={!!composer.deleteCandidate}
        title="Delete communication?"
        itemName={composer.deleteCandidate?.title}
        isLoading={composer.isDeletingCommunication}
        onCancel={() => { if (!composer.isDeletingCommunication) composer.setDeleteCandidate(null) }}
        onConfirm={composer.handleConfirmDeleteCommunication}
      />

      {/* Unsaved changes exit guard */}
      {composer.showUnsavedExitModal && createPortal(
        <div className="fixed inset-0" style={{ zIndex: 10000 }}>
          <div className="fixed top-[64px] right-0 bottom-0 left-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ top: 64 }}>
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl pointer-events-auto">
            <button
              type="button"
              onClick={() => composer.setShowUnsavedExitModal(false)}
              className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Close"
            >
              <XClose className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <InfoCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">You have unsaved message changes</h3>
                <p className="mt-1.5 text-sm text-slate-600">Save your message before leaving this page?</p>
              </div>
              <div className="mt-3 grid w-full grid-cols-2 gap-2">
                <button
                  type="button"
                  className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={composer.handleUnsavedContinue}
                >
                  Continue without saving
                </button>
                <button
                  type="button"
                  className="w-full rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                  onClick={composer.handleUnsavedSave}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>,
        document.body
      )}

      <RecipientsSlideout
        isOpen={recipientsSlideout.open}
        onClose={() => setRecipientsSlideout((s) => ({ ...s, open: false }))}
        communicationId={recipientsSlideout.communicationId}
        communicationTitle={recipientsSlideout.communicationTitle}
        initialTab={recipientsSlideout.tab}
        eventUuid={eventUuid ?? ''}
        onRetryAll={handleRetryAllInSlideout}
        isRetryingAll={resendingCommunicationIds.has(recipientsSlideout.communicationId)}
      />
    </div>
  )
}

export default CommunicationPage
