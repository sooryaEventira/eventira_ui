import { useState, useRef } from 'react'
import type { Communication } from './communicationTypes'
import type { BroadcastType } from './BroadcastTypeModal'
import { fetchCommunicationById, deleteCommunicationById } from '../../../services/communicationService'
import { showToast } from '../../../utils/toast'
import { DEFAULT_EMAIL_SUBJECT, DEFAULT_EMAIL_TEMPLATE } from './communicationConstants'

interface Options {
  communications: Communication[]
  setCommunications: React.Dispatch<React.SetStateAction<Communication[]>>
  setOptimisticSentIds: React.Dispatch<React.SetStateAction<Set<string>>>
  loadCommunications: () => Promise<void>
  eventUuid: string | undefined
}

export function useComposerState({
  communications,
  setCommunications,
  setOptimisticSentIds,
  loadCommunications,
  eventUuid,
}: Options) {
  // Broadcast modal (create)
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false)

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editModalCommId, setEditModalCommId] = useState<string | null>(null)
  const [editModalTitle, setEditModalTitle] = useState('')
  const [editModalType, setEditModalType] = useState<BroadcastType>('email')
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

  // Composer
  const [showComposer, setShowComposer] = useState(false)
  const [selectedBroadcastType, setSelectedBroadcastType] = useState<BroadcastType | null>(null)
  const [initialBroadcastTitle, setInitialBroadcastTitle] = useState('')
  const [initialComposerSubject, setInitialComposerSubject] = useState('')
  const [initialComposerMessage, setInitialComposerMessage] = useState('')
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [composerHasUnsavedChanges, setComposerHasUnsavedChanges] = useState(false)

  // Unsaved exit guard
  const [showUnsavedExitModal, setShowUnsavedExitModal] = useState(false)
  const pendingExitActionRef = useRef<(() => void) | null>(null)
  const composerSaveHandlerRef = useRef<(() => Promise<boolean>) | null>(null)

  // Delete
  const [deleteCandidate, setDeleteCandidate] = useState<Communication | null>(null)
  const [isDeletingCommunication, setIsDeletingCommunication] = useState(false)

  // ── helpers ──────────────────────────────────────────────────────────────

  const runOrConfirmExit = (action: () => void) => {
    if (showComposer && composerHasUnsavedChanges) {
      pendingExitActionRef.current = action
      setShowUnsavedExitModal(true)
      return
    }
    action()
  }

  const resetComposer = () => {
    setShowComposer(false)
    setSelectedBroadcastType(null)
    setInitialBroadcastTitle('')
    setInitialComposerSubject('')
    setInitialComposerMessage('')
    setCurrentDraftId(null)
    setComposerHasUnsavedChanges(false)
  }

  // ── broadcast modal ───────────────────────────────────────────────────────

  const handleCreateBroadcast = () => setIsBroadcastModalOpen(true)

  const handleBroadcastTypeSelect = (type: BroadcastType) => {
    setSelectedBroadcastType(type)
    setInitialBroadcastTitle('')
    setInitialComposerSubject('')
    setInitialComposerMessage('')
    setIsBroadcastModalOpen(false)
    setShowComposer(true)
    setCurrentDraftId(null)
  }

  const handleBroadcastSubmit = (data: { title: string; type: BroadcastType }) => {
    setSelectedBroadcastType(data.type)
    setInitialBroadcastTitle(data.title)
    setInitialComposerSubject(data.type === 'email' ? DEFAULT_EMAIL_SUBJECT : '')
    setInitialComposerMessage(data.type === 'email' ? DEFAULT_EMAIL_TEMPLATE : '')
    setIsBroadcastModalOpen(false)
    setShowComposer(true)
    setCurrentDraftId(null)
  }

  // ── composer ──────────────────────────────────────────────────────────────

  const handleComposerCancel = () => {
    resetComposer()
    loadCommunications()
  }

  const handleComposerSave = (data: { subject: string; message: string }) => {
    if (currentDraftId) {
      setCommunications((prev) =>
        prev.map((c) => (c.id === currentDraftId ? { ...c, title: data.subject } : c))
      )
    } else {
      const newId = Date.now().toString()
      setCommunications((prev) => [
        ...prev,
        {
          id: newId,
          title: data.subject,
          userGroups: [],
          status: 'draft',
          type: selectedBroadcastType === 'email' ? 'email' : 'notification',
          recipients: { sent: 0, total: 0 },
        },
      ])
      setCurrentDraftId(newId)
    }
    loadCommunications()
  }

  const handleEmailSend = async (data: { communicationId?: number }) => {
    const sentId = data.communicationId != null ? String(data.communicationId) : null
    if (sentId) {
      setOptimisticSentIds((prev) => { const n = new Set(prev); n.add(sentId); return n })
    }
    setCommunications((prev) => {
      let next = [...prev]
      if (currentDraftId) next = next.filter((c) => c.id !== currentDraftId)
      if (sentId) next = next.map((c) => c.id === sentId ? { ...c, status: 'sent', type: 'email' } : c)
      return next
    })
    setShowComposer(false)
    setSelectedBroadcastType(null)
    setCurrentDraftId(null)
    setComposerHasUnsavedChanges(false)
    loadCommunications()
  }

  const handlePushSend = async (data: { communicationId?: number }) => {
    const sentId = data.communicationId != null ? String(data.communicationId) : null
    if (sentId) {
      setOptimisticSentIds((prev) => { const n = new Set(prev); n.add(sentId); return n })
      setCommunications((prev) =>
        prev.map((c) => c.id === sentId ? { ...c, status: 'sent', type: 'notification' } : c)
      )
    }
    setShowComposer(false)
    setSelectedBroadcastType(null)
    setCurrentDraftId(null)
    loadCommunications()
  }

  // ── edit modal ────────────────────────────────────────────────────────────

  const handleEditCommunication = (communicationId: string) => {
    const comm = communications.find((c) => c.id === communicationId)
    if (!comm) return
    setEditModalCommId(communicationId)
    setEditModalTitle(comm.title)
    setEditModalType(comm.type === 'email' ? 'email' : 'push-notification')
    setEditModalOpen(true)
  }

  const handleEditModalConfirm = async ({ title }: { title: string; type: BroadcastType }) => {
    if (!eventUuid || !editModalCommId) return
    setIsEditSubmitting(true)
    try {
      const detail = await fetchCommunicationById(editModalCommId, eventUuid)
      const normalizedChannel = String(detail.channel || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
      const editorType: BroadcastType = normalizedChannel === 'email' ? 'email' : 'push-notification'
      setSelectedBroadcastType(editorType)
      setInitialBroadcastTitle(title || detail.title || '')
      setInitialComposerSubject(detail.subject || '')
      setInitialComposerMessage(detail.message || '')
      setCurrentDraftId(String(detail.id))
      setEditModalOpen(false)
      setShowComposer(true)
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to load communication details.')
    } finally {
      setIsEditSubmitting(false)
    }
  }

  // ── delete ────────────────────────────────────────────────────────────────

  const handleDeleteCommunicationRequest = (communicationId: string) => {
    const target = communications.find((c) => c.id === communicationId)
    if (!target) return
    if (target.status !== 'draft') {
      showToast.error('Only draft communications can be deleted.')
      return
    }
    setDeleteCandidate(target)
  }

  const handleConfirmDeleteCommunication = async () => {
    if (!deleteCandidate || isDeletingCommunication || !eventUuid) return
    setIsDeletingCommunication(true)
    try {
      await deleteCommunicationById(deleteCandidate.id, eventUuid)
      setCommunications((prev) => prev.filter((c) => c.id !== deleteCandidate.id))
      setDeleteCandidate(null)
      showToast.success('Draft deleted successfully.')
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to delete communication.')
    } finally {
      setIsDeletingCommunication(false)
    }
  }

  // ── unsaved exit ──────────────────────────────────────────────────────────

  const handleUnsavedContinue = () => {
    setShowUnsavedExitModal(false)
    const action = pendingExitActionRef.current
    pendingExitActionRef.current = null
    action?.()
  }

  const handleUnsavedSave = async () => {
    const save = composerSaveHandlerRef.current
    if (!save) return
    const ok = await save()
    if (!ok) return
    setShowUnsavedExitModal(false)
    const action = pendingExitActionRef.current
    pendingExitActionRef.current = null
    action?.()
  }

  return {
    // create modal
    isBroadcastModalOpen, setIsBroadcastModalOpen,
    handleCreateBroadcast, handleBroadcastTypeSelect, handleBroadcastSubmit,
    // edit modal
    editModalOpen, setEditModalOpen,
    editModalTitle, editModalType, isEditSubmitting,
    handleEditCommunication, handleEditModalConfirm,
    // composer
    showComposer, selectedBroadcastType,
    initialBroadcastTitle, initialComposerSubject, initialComposerMessage,
    currentDraftId, composerHasUnsavedChanges, setComposerHasUnsavedChanges,
    composerSaveHandlerRef,
    handleComposerCancel, handleComposerSave, handleEmailSend, handlePushSend,
    runOrConfirmExit,
    // unsaved exit
    showUnsavedExitModal, handleUnsavedContinue, handleUnsavedSave,
    // delete
    deleteCandidate, setDeleteCandidate,
    isDeletingCommunication,
    handleDeleteCommunicationRequest, handleConfirmDeleteCommunication,
  }
}
