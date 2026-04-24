import React, { useEffect, useMemo, useState } from 'react'
import Button from '../../ui/untitled/Button'
import MobileView from '../../../assets/images/mobile_view.png'
import EventiraLogo from '../../../assets/images/Logo.png'
import { AlertCircle, ArrowLeft, ChevronDown, Plus, XClose } from '@untitled-ui/icons-react'
import type { Macro } from './communicationTypes'
import { fetchUserTags, sendCommunication, sendCommunicationById } from '../../../services/communicationService'
import { useEventForm } from '../../../contexts/EventFormContext'
import BroadcastPreviewModal from './BroadcastPreviewModal'
import { ScheduleBroadcastModal } from './ScheduleBroadcastModal'
import { showToast } from '../../../utils/toast'

interface PushNotificationMakerPageProps {
  macros?: Macro[]
  broadcastTitle?: string
  initialTitle?: string
  initialMessage?: string
  onCancel: () => void
  onSave: (data: { title: string; message: string; tapBehaviour: string; tapTarget: string }) => void
  onSend?: (data: { title: string; message: string; communicationId?: number }) => void | Promise<void>
}

const TITLE_LIMIT = 35
const MESSAGE_LIMIT = 80
const MESSAGE_STATUS_OPTIONS = [
  { value: 'Opened', label: 'Opened' },
  { value: 'Clicked', label: 'Clicked' },
  { value: 'Bounced', label: 'Bounced' },
  { value: 'Not opened', label: 'Not opened' }
]

const PushNotificationMakerPage: React.FC<PushNotificationMakerPageProps> = ({
  macros = [],
  broadcastTitle = '',
  initialTitle = '',
  initialMessage = '',
  onCancel,
  onSave,
  onSend
}) => {
  const { createdEvent } = useEventForm()
  const [activeTab, setActiveTab] = useState<'message' | 'settings'>('message')
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialMessage)
  const [savedTitle, setSavedTitle] = useState(initialTitle)
  const [savedBody, setSavedBody] = useState(initialMessage)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showUnsavedMessageModal, setShowUnsavedMessageModal] = useState(false)
  const [pendingTab, setPendingTab] = useState<'message' | 'settings' | null>(null)
  const [draftCommunicationId, setDraftCommunicationId] = useState<number | null>(null)
  const [hasSavedDraft, setHasSavedDraft] = useState(false)
  const [matchLogic, setMatchLogic] = useState<'ANY' | 'ALL'>('ALL')
  const [filters, setFilters] = useState([{ id: '1', field: 'Group', operator: 'is', value: '' }])
  const [tags, setTags] = useState<Array<{ uuid: string; name: string }>>([])

  const [tapBehaviour, setTapBehaviour] = useState<'open-session' | 'open-speaker-profile' | 'open-event-page' | 'external-link'>('open-session')
  const [tapTarget, setTapTarget] = useState('')

  const titleRemaining = Math.max(TITLE_LIMIT - title.length, 0)
  const bodyPlain = useMemo(() => String(body || '').replace(/\s+/g, ' ').trim(), [body])
  const bodyRemaining = Math.max(MESSAGE_LIMIT - bodyPlain.length, 0)

  const [macroOpen, setMacroOpen] = useState(false)
  const selectedRecipients = useMemo(() => {
    const names: string[] = []
    filters.forEach((f) => {
      if (f.field === 'Group' && f.operator === 'is' && f.value && !names.includes(f.value)) {
        names.push(f.value)
      }
    })
    return names
  }, [filters])

  useEffect(() => {
    const loadTags = async () => {
      const eventUuid = createdEvent?.uuid
      if (!eventUuid) {
        setTags([])
        return
      }
      try {
        const tagsData = await fetchUserTags(eventUuid)
        setTags(tagsData)
      } catch {
        setTags([])
      }
    }
    loadTags()
  }, [createdEvent?.uuid])

  useEffect(() => {
    if (!tags.length) return
    setFilters((prev) =>
      prev.map((f) => {
        if (f.field === 'Group' && !f.value) {
          return { ...f, value: tags[0].name }
        }
        return f
      })
    )
  }, [tags])

  const buildRecipientFilters = () => {
    const fieldTypeMap: Record<string, 'group' | 'message_status'> = {
      'Group': 'group',
      'Message status': 'message_status',
    }
    const valueMap: Record<string, string> = {
      'Opened': 'opened', 'Clicked': 'clicked', 'Bounced': 'bounced', 'Not opened': 'not_opened',
    }
    const operatorMap: Record<string, 'is' | 'is_not'> = { 'is': 'is', 'is not': 'is_not' }
    return filters
      .filter((f) => f.field && f.value)
      .reduce<Array<{ type: 'group' | 'message_status'; operator: 'is' | 'is_not'; value: string }>>((acc, f) => {
        let value = f.value
        if (f.field === 'Group') {
          const tag = tags.find((t) => t.name === f.value || t.uuid === f.value)
          if (!tag?.uuid) return acc
          value = tag.uuid
        } else {
          value = valueMap[f.value] ?? f.value.toLowerCase().replace(/\s+/g, '_')
        }
        acc.push({
          type: fieldTypeMap[f.field] ?? 'group',
          operator: operatorMap[f.operator] ?? 'is',
          value,
        })
        return acc
      }, [])
  }

  const insertMacro = (macro: Macro) => {
    const next = `${body}${body ? ' ' : ''}${macro.macro}`
    setBody(next)
    setMacroOpen(false)
  }

  const handleSave = async () => {
    if (!createdEvent?.uuid) {
      showToast.error('Event UUID is required. Please select an event first.')
      return
    }
    if (!title.trim()) {
      showToast.error('Title is required.')
      return
    }
    if (!body.trim()) {
      showToast.error('Message is required.')
      return
    }
    const recipientFilters = buildRecipientFilters()
    if (recipientFilters.length === 0) {
      showToast.error('Please add at least one filter in the Settings tab.')
      return
    }
    let draftSaved = false
    setIsSaving(true)
    try {
      const draft = await sendCommunication({
        event_uuid: createdEvent.uuid,
        ...(broadcastTitle ? { title: broadcastTitle } : {}),
        channel: 'notification',
        subject: title.trim(),
        message: body.trim(),
        recipient_match: matchLogic.toLowerCase() as 'all' | 'any',
        recipient_filters: recipientFilters,
        save_as_draft: true,
        attachment_uuids: [],
      })
      setDraftCommunicationId(draft.id)
      draftSaved = true
      setHasSavedDraft(true)
      setSavedTitle(title)
      setSavedBody(body)
    } catch {
      setHasSavedDraft(false)
    } finally {
      setIsSaving(false)
    }
    onSave({ title: title.trim(), message: body, tapBehaviour, tapTarget })
    // Required flow:
    // Save -> draft API success -> show Send/Schedule.
    // Preview should open only when user clicks Send.
    if (!draftSaved) return
  }

  const hasUnsavedMessageChanges =
    title.trim() !== savedTitle.trim() || body.trim() !== savedBody.trim()

  const handleTabSwitch = (nextTab: 'message' | 'settings') => {
    if (nextTab === activeTab) return
    if (activeTab === 'message' && nextTab === 'settings' && hasUnsavedMessageChanges) {
      setPendingTab(nextTab)
      setShowUnsavedMessageModal(true)
      return
    }
    setActiveTab(nextTab)
  }

  return (
    <div className="rounded-xl bg-white overflow-hidden">
      <div className="px-6 pt-5 pb-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={onCancel}
            iconLeading={<ArrowLeft className="h-4 w-4" />}
          >
       
          </Button>
          <h2 className="text-lg font-semibold text-slate-900">{broadcastTitle || 'Communication'}</h2>
        </div>
        {hasSavedDraft && (
          <div className="flex items-center gap-3">
            <Button type="button" variant="primary" size="md" onClick={() => setShowPreviewModal(true)}>
              Send
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => setShowScheduleModal(true)}>
              Schedule
            </Button>
          </div>
        )}
      </div>
      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 px-6">
        <button
          type="button"
          onClick={() => handleTabSwitch('message')}
          className={`pb-3 pt-4 text-sm font-semibold border-b-2 ${
            activeTab === 'message' ? 'text-primary border-b-primary' : 'text-slate-600 border-b-transparent hover:text-slate-900'
          }`}
        >
          Message
        </button>
        <button
          type="button"
          onClick={() => handleTabSwitch('settings')}
          className={`pb-3 pt-4 text-sm font-semibold border-b-2 ${
            activeTab === 'settings' ? 'text-primary border-b-primary' : 'text-slate-600 border-b-transparent hover:text-slate-900'
          }`}
        >
          Settings
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left: maker */}
        <div className="space-y-5">
          {activeTab === 'message' ? (
            <>
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v.length <= TITLE_LIMIT) setTitle(v)
                  }}
                  placeholder="Short summary of your message"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="mt-2 text-xs text-slate-500">{titleRemaining} characters left</div>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Message</label>
                  {/* Insert dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMacroOpen((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {'{ }'} Insert
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${macroOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {macroOpen && (
                      <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        {macros.length ? (
                          macros.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => insertMacro(m)}
                              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                            >
                              <div className="text-xs text-slate-500">{m.macro}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-slate-500">No macros</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="This is the body of your message."
                  rows={6}
                  className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="mt-2 text-xs text-slate-500">{bodyRemaining} characters left</div>
              </div>

              {/* Tap behaviour */}
              <div>
                <div className="text-sm font-semibold text-slate-700">Tap behaviour</div>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={tapBehaviour}
                    onChange={(e) => setTapBehaviour(e.target.value as any)}
                    className="h-10 w-full rounded-md border border-primary bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="open-session">Open Session</option>
                    <option value="open-speaker-profile">Open Speaker Profile</option>
                    <option value="open-event-page">Open Event Page</option>
                    <option value="external-link">Add external link</option>
                  </select>
                  <select
                    value={tapTarget}
                    onChange={(e) => setTapTarget(e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select session</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" size="md" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-6 h-[calc(100vh-200px)] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h2 className="text-base font-semibold text-slate-900">Recipients</h2>
                <Button
                  type="button" variant="secondary" size="sm"
                  iconLeading={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    setFilters([...filters, { id: Date.now().toString(), field: 'Message status', operator: 'is not', value: 'Opened' }])
                  }}
                >
                  New filter
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <span>Matching</span>
                    <select
                      value={matchLogic}
                      onChange={(e) => setMatchLogic(e.target.value as 'ANY' | 'ALL')}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="ANY">ANY</option>
                      <option value="ALL">ALL</option>
                    </select>
                    <span>of the following filters</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {filters.map((filter, index) => (
                    <div key={filter.id} className="flex flex-row items-center gap-2 flex-wrap">
                      <select
                        value={filter.field}
                        onChange={(e) => {
                          const newFilters = [...filters]
                          const nextField = e.target.value as 'Message status' | 'Group'
                          newFilters[index].field = nextField
                          newFilters[index].value = nextField === 'Message status' ? 'Opened' : (tags[0]?.name ?? '')
                          setFilters(newFilters)
                        }}
                        className="min-w-[140px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="Message status">Message status</option>
                        <option value="Group">Group</option>
                      </select>

                      <select
                        value={filter.operator}
                        onChange={(e) => {
                          const newFilters = [...filters]
                          newFilters[index].operator = e.target.value
                          setFilters(newFilters)
                        }}
                        className="w-[80px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="is">is</option>
                        <option value="is not">is not</option>
                      </select>

                      <select
                        value={filter.value}
                        onChange={(e) => {
                          const newFilters = [...filters]
                          newFilters[index].value = e.target.value
                          setFilters(newFilters)
                        }}
                        className="w-[500px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {filter.field === 'Message status' && (
                          <>
                            <option value="">Select status...</option>
                            {MESSAGE_STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </>
                        )}
                        {filter.field === 'Group' && (
                          tags.length === 0 ? (
                            <option value="">No groups available</option>
                          ) : (
                            <>
                              <option value="">Select a group...</option>
                              {tags
                                .filter((tag) => {
                                  const selectedInOtherFilters = filters
                                    .filter((f, i) => i !== index && f.field === 'Group' && f.value?.trim())
                                    .map((f) => f.value)
                                  return tag.name === filter.value || !selectedInOtherFilters.includes(tag.name)
                                })
                                .map((tag) => <option key={tag.uuid} value={tag.name}>{tag.name}</option>)}
                            </>
                          )
                        )}
                      </select>

                      <Button
                        type="button" variant="tertiary" size="sm"
                        onClick={() => setFilters(filters.filter(f => f.id !== filter.id))}
                        className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
                        iconLeading={<XClose className="h-4 w-4" />}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: phone preview */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative w-fit lg:sticky lg:top-6">
            {/* Device frame / border */}
            <div className="max-h-[calc(100vh-220px)] max-w-[320px] rounded-[56px] bg-slate-900 p-3 shadow-2xl ring-1 ring-black/10">
              <div className="relative max-h-[calc(100vh-244px)] overflow-hidden rounded-[44px] bg-black ring-1 ring-white/10">
                <img
                  src={MobileView}
                  alt="Mobile preview"
                  className="block h-auto max-h-[calc(100vh-268px)] w-auto max-w-full object-contain"
                />

                {/* Notification overlay */}
                <div className="absolute left-4 right-4 top-[36%] rounded-xl bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur">
                  <div className="flex items-start gap-3">
                    {/* <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-white">
                      VA
                    </div> */}
                    <img src={EventiraLogo} alt="Eventira Logo" className="h-9 w-9 object-contain" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold text-slate-700">Eventira</div>
                        <span className="text-[11px] text-slate-400">×</span>
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-900 truncate">
                        {title.trim() ? title.trim() : 'Short summary of your message'}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-snug text-slate-600 line-clamp-2">
                        {bodyPlain || 'This is the body of your message.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BroadcastPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onSend={async () => {
          if (!createdEvent?.uuid) { showToast.error('Event UUID is required. Please select an event first.'); return }
          if (!title.trim()) { showToast.error('Title is required.'); return }
          if (!body.trim()) { showToast.error('Message is required.'); return }

          const recipientFilters = buildRecipientFilters()
          if (recipientFilters.length === 0) { showToast.error('Please add at least one filter in the Settings tab.'); return }

          setIsSending(true)
          try {
            let communicationId = draftCommunicationId
            if (!communicationId) {
              const draft = await sendCommunication({
                event_uuid: createdEvent.uuid,
                ...(broadcastTitle ? { title: broadcastTitle } : {}),
                channel: 'notification',
                subject: title.trim(),
                message: body.trim(),
                recipient_match: matchLogic.toLowerCase() as 'all' | 'any',
                recipient_filters: recipientFilters,
                save_as_draft: true,
                attachment_uuids: [],
              })
              communicationId = draft.id
              setDraftCommunicationId(draft.id)
            }
            await sendCommunicationById(communicationId, createdEvent.uuid)
            await new Promise((resolve) => setTimeout(resolve, 1200))
            setShowPreviewModal(false)
            if (onSend) {
              await Promise.resolve(onSend({ title, message: body, communicationId }))
            }
          } catch {
            // service shows error
          } finally {
            setIsSending(false)
          }
        }}
        subject={title}
        message={body}
        isSending={isSending}
        recipients={selectedRecipients}
      />

      <ScheduleBroadcastModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={(date) => {
          console.log('Scheduled notification for:', date)
          setShowScheduleModal(false)
        }}
      />

      {showUnsavedMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">You have unsaved message changes</h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  Save your message before moving to Settings?
                </p>
              </div>
              <div className="mt-3 grid w-full grid-cols-2 gap-2">
                <button
                  type="button"
                  className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setShowUnsavedMessageModal(false)
                    if (pendingTab) setActiveTab(pendingTab)
                    setPendingTab(null)
                  }}
                >
                  Continue without saving
                </button>
                <button
                  type="button"
                  className="w-full rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                  onClick={async () => {
                    await handleSave()
                    setShowUnsavedMessageModal(false)
                    if (pendingTab) setActiveTab(pendingTab)
                    setPendingTab(null)
                  }}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PushNotificationMakerPage

