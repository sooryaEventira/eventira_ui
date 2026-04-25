import React, { useState, useRef, useEffect, useMemo } from 'react'
import ReactQuill, { Quill } from 'react-quill'
import 'react-quill/dist/quill.snow.css'

// Quill 1.x registers both a CSS-class and an inline-style attributor for `color`.
// The class attributor can take precedence and silently fail when no matching
// `.ql-color-*` CSS rule exists. Force the style attributor so colors always
// render as `style="color: ..."` regardless of the project's CSS.
const ColorStyle = Quill.import('attributors/style/color')
Quill.register(ColorStyle, true)
import {
  Send01,
  Calendar,
  Plus,
  XClose,
  AlertCircle,
  ArrowLeft
} from '@untitled-ui/icons-react'
import Button from '../../ui/untitled/Button'
import type { Macro } from './communicationTypes'
import BroadcastPreviewModal from './BroadcastPreviewModal'
import { ScheduleBroadcastModal } from './ScheduleBroadcastModal'
import { useEventForm } from '../../../contexts/EventFormContext'
import { sendCommunication, sendCommunicationById, updateCommunicationRecipients, uploadAttachment, fetchUserTags } from '../../../services/communicationService'
import { showToast } from '../../../utils/toast'

interface BroadcastComposerProps {
  onCancel: () => void
  onSave: (data: { subject: string; message: string; templateType?: string }) => void
  onSend?: (data: { subject: string; message: string; communicationId?: number }) => void | Promise<void>
  macros?: Macro[]
  initialSubject?: string
  initialMessage?: string
  templateType?: string
  type?: 'email' | 'push-notification'
  broadcastTitle?: string
}

const MESSAGE_STATUS_OPTIONS = [
  { value: 'Opened', label: 'Opened' },
  { value: 'Clicked', label: 'Clicked' },
  { value: 'Bounced', label: 'Bounced' },
  { value: 'Not opened', label: 'Not opened' }
]

const TOOLBAR_CONTAINER = [
  ['bold', 'italic', 'underline'],
  [{ background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image'],
  ['clean'],
]

const quillFormats = [
  'bold', 'italic', 'underline',
  'background',
  'list',
  'link', 'image'
]

const BroadcastComposer: React.FC<BroadcastComposerProps> = ({
  onCancel,
  onSave,
  onSend,
  macros = [],
  initialSubject = '',
  initialMessage = '',
  type = 'email',
  broadcastTitle = ''
}) => {
  const [activeTab, setActiveTab] = useState<'late-message' | 'settings'>('late-message')
  const [subject, setSubject] = useState(initialSubject || '')
  const [savedSubject, setSavedSubject] = useState(initialSubject || '')
  // savedMessage is used for read-only view and preview; live editing uses editorContentRef
  const [savedMessage, setSavedMessage] = useState(initialMessage)
  const editorContentRef = useRef(initialMessage)
  const [isEditing, setIsEditing] = useState(true)
  const [selectedMacro, setSelectedMacro] = useState<string>('')
  const [showMacroDropdown, setShowMacroDropdown] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [isPreparingPreview, setIsPreparingPreview] = useState(false)
  const [showUnsavedMessageModal, setShowUnsavedMessageModal] = useState(false)
  const [pendingTab, setPendingTab] = useState<'late-message' | 'settings' | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isSavingAttachments, setIsSavingAttachments] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ id: string; file: File; name: string; sizeLabel: string }>>([])
  const [uploadedAttachments, setUploadedAttachments] = useState<Array<{ uuid: string; name: string; sizeLabel: string }>>([])
  const [draftCommunicationId, setDraftCommunicationId] = useState<number | null>(null)

  const attachmentUuids = uploadedAttachments.map(a => a.uuid)

  // Settings Tab State
  const [matchLogic, setMatchLogic] = useState<'ANY' | 'ALL'>('ALL')
  const [filters, setFilters] = useState([
    { id: '1', field: 'Group', operator: 'is', value: '' }
  ])
  const [tags, setTags] = useState<Array<{ uuid: string; name: string }>>([])

  const { createdEvent } = useEventForm()
  const quillRef = useRef<ReactQuill>(null)
  const macroDropdownRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pendingLinkRangeRef = useRef<{ index: number; length: number } | null>(null)

  // Build modules once. Handlers close over refs (always current) so useMemo
  // with empty deps is safe — no stale captures.
  const quillModules = useMemo(() => ({
    toolbar: {
      container: TOOLBAR_CONTAINER,
      handlers: {
        link() {
          const editor = quillRef.current?.getEditor()
          if (!editor) return
          const range = editor.getSelection(true)
          pendingLinkRangeRef.current = range ? { index: range.index, length: range.length } : null
          const selectedText = range && range.length > 0 ? editor.getText(range.index, range.length).trim() : ''
          setLinkText(selectedText)
          setLinkUrl('')
          setShowLinkModal(true)
        },
        image() {
          imageInputRef.current?.click()
        }
      }
    }
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}K`
    return `${(bytes / (1024 * 1024)).toFixed(1)}M`
  }

  const handleAttachmentAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    const newItems = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      sizeLabel: formatBytes(file.size),
    }))
    setPendingAttachments(prev => [...prev, ...newItems])
  }

  const removeAttachment = (id: string) =>
    setPendingAttachments(prev => prev.filter(a => a.id !== id))

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
          if (!tag?.uuid) return acc  // skip filters where tag UUID could not be resolved
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

  // Initialize editor with initial content once on mount — no value prop so
  // react-quill never compares props vs live editor content and resets the editor.
  useEffect(() => {
    const quill = quillRef.current?.getEditor()
    if (quill && initialMessage) {
      quill.clipboard.dangerouslyPasteHTML(initialMessage)
      editorContentRef.current = initialMessage
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadTags = async () => {
      const eventUuid = createdEvent?.uuid
      if (!eventUuid) { setTags([]); return }
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

  useEffect(() => {
    if (!showMacroDropdown) return
    const handle = (e: MouseEvent) => {
      if (macroDropdownRef.current && !macroDropdownRef.current.contains(e.target as Node)) {
        setShowMacroDropdown(false)
      }
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handle), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handle) }
  }, [showMacroDropdown])

  useEffect(() => {
    if (activeTab !== 'late-message' || !isEditing) return
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    const desiredHtml = editorContentRef.current || savedMessage || initialMessage || ''
    if (!desiredHtml) return
    const currentHtml = quill.root?.innerHTML || ''
    if (currentHtml.trim() === desiredHtml.trim()) return
    quill.clipboard.dangerouslyPasteHTML(desiredHtml)
    editorContentRef.current = desiredHtml
  }, [activeTab, isEditing, savedMessage, initialMessage])

  const selectedRecipients = useMemo(() => {
    const names: string[] = []
    filters.forEach((f) => {
      if (f.field === 'Group' && f.operator === 'is' && f.value && !names.includes(f.value)) {
        names.push(f.value)
      }
    })
    return names
  }, [filters])

  const handleInsertMacro = (macroValue?: string) => {
    const macroToInsert = macroValue || selectedMacro
    if (!macroToInsert) return
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    const macroText = `{{${macroToInsert}}}`
    const range = quill.getSelection(true)
    quill.insertText(range.index, macroText)
    quill.setSelection(range.index + macroText.length, 0)
    setSelectedMacro('')
    setShowMacroDropdown(false)
  }

  const handleCloseLinkModal = () => {
    setShowLinkModal(false)
    setLinkText('')
    setLinkUrl('')
    pendingLinkRangeRef.current = null
  }

  const normalizeUrl = (rawUrl: string) => {
    if (/^(https?:\/\/|mailto:|tel:)/i.test(rawUrl)) return rawUrl
    return `https://${rawUrl}`
  }

  const handleInsertLink = () => {
    const quill = quillRef.current?.getEditor()
    const text = linkText.trim()
    const rawUrl = linkUrl.trim()
    if (!quill || !text || !rawUrl) return

    const href = normalizeUrl(rawUrl)
    const range = pendingLinkRangeRef.current ?? quill.getSelection(true)
    const insertIndex = range ? range.index : quill.getLength()
    const replaceLength = range ? range.length : 0

    if (replaceLength > 0) {
      quill.deleteText(insertIndex, replaceLength, 'user')
    }

    quill.insertText(insertIndex, text, 'user')
    quill.formatText(insertIndex, text.length, 'link', href, 'user')
    quill.setSelection(insertIndex + text.length, 0, 'user')
    editorContentRef.current = quill.root.innerHTML
    handleCloseLinkModal()
  }

  const handleSave = async () => {
    const current = editorContentRef.current
    const trimmedSubject = subject.trim()
    const trimmedMessage = current.trim()

    if (!createdEvent?.uuid) {
      showToast.error('Event UUID is required. Please select an event first.')
      return false
    }
    if (!trimmedSubject) {
      showToast.error('Subject is required.')
      return false
    }
    if (!trimmedMessage || trimmedMessage === '<p><br></p>') {
      showToast.error('Message is required.')
      return false
    }

    let newlyUploaded: typeof uploadedAttachments = []
    if (pendingAttachments.length > 0) {
      setIsSavingAttachments(true)
      for (const att of pendingAttachments) {
        try {
          const uuid = await uploadAttachment(att.file)
          newlyUploaded.push({ uuid, name: att.name, sizeLabel: att.sizeLabel })
        } catch {
          showToast.error(`Failed to upload "${att.name}". Please try again.`)
          setIsSavingAttachments(false)
          return false
        }
      }
      setUploadedAttachments(prev => [...prev, ...newlyUploaded])
      setPendingAttachments([])
      setIsSavingAttachments(false)
    }

    const allAttachmentUuids = [...attachmentUuids, ...newlyUploaded.map(a => a.uuid)]
    try {
      const draft = await sendCommunication({
        event_uuid: createdEvent.uuid,
        ...(broadcastTitle ? { title: broadcastTitle } : {}),
        channel: type === 'email' ? 'email' : 'notification',
        subject: trimmedSubject,
        message: trimmedMessage,
        attachment_uuids: allAttachmentUuids,
      })
      setDraftCommunicationId(draft.id)
    } catch {
      // draft save failed — service shows toast
      return false
    }

    setSavedMessage(current)
    setSavedSubject(subject)
    onSave({ subject, message: current, templateType: activeTab === 'late-message' ? 'late-message' : undefined })
    setIsEditing(false)
    return true
  }

  const hasUnsavedMessageChanges =
    isEditing &&
    (
      subject.trim() !== savedSubject.trim() ||
      editorContentRef.current.trim() !== savedMessage.trim() ||
      pendingAttachments.length > 0
    )

  const handleTabSwitch = (nextTab: 'late-message' | 'settings') => {
    if (nextTab === activeTab) return
    if (activeTab === 'late-message' && nextTab === 'settings' && hasUnsavedMessageChanges) {
      setPendingTab(nextTab)
      setShowUnsavedMessageModal(true)
      return
    }
    setActiveTab(nextTab)
  }

  const handleOpenPreview = async () => {
    if (!createdEvent?.uuid) { showToast.error('Event UUID is required. Please select an event first.'); return }
    if (!draftCommunicationId) { showToast.error('Please save changes first.'); return }

    const recipientFilters = buildRecipientFilters()
    if (recipientFilters.length === 0) { showToast.error('Please add at least one filter in the Settings tab.'); return }

    setIsPreparingPreview(true)
    try {
      await updateCommunicationRecipients(draftCommunicationId, createdEvent.uuid, {
        recipient_match: matchLogic.toLowerCase() as 'all' | 'any',
        recipient_filters: recipientFilters,
      })
      setSavedMessage(editorContentRef.current)
      setShowPreviewModal(true)
    } catch {
      // error toast handled in service helper
    } finally {
      setIsPreparingPreview(false)
    }
  }

  return (
    <div className="space-y-6 px-4 pb-12 pt-28 md:px-10 lg:px-16 -mt-24 min-h-screen flex flex-col">
      <style>{`
        .ql-editor { min-height: 300px; font-size: 14px; font-family: inherit; }
        .ql-container { border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; }
        .ql-toolbar { border-top-left-radius: 6px; border-top-right-radius: 6px; background: #f8fafc; }
        .broadcast-editor-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
        .broadcast-editor-content ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
        .broadcast-editor-content b, .broadcast-editor-content strong { font-weight: bold; }
        .broadcast-editor-content i, .broadcast-editor-content em { font-style: italic; }
        .broadcast-editor-content u { text-decoration: underline; }
        .broadcast-editor-content p { margin-bottom: 0.5em; }
      `}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={onCancel}
            iconLeading={<ArrowLeft className="h-4 w-4" />}
          >
          </Button>
          <h1 className="text-[22px] font-semibold text-primary-dark mb-0">
            {broadcastTitle || 'Communication'}
          </h1>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-3">
            <Button type="button" variant="primary" size="md" onClick={handleOpenPreview} disabled={isPreparingPreview} iconTrailing={<Send01 className="h-4 w-4" />}>
              {isPreparingPreview ? 'Preparing...' : 'Send'}
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => setShowScheduleModal(true)} iconTrailing={<Calendar className="h-4 w-4" />}>
              Schedule
            </Button>
          </div>
        )}
      </div>

      {/* Tabs and Content Container */}
      <div className="rounded-xl bg-white overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-200 flex-shrink-0">
          <Button
            type="button" variant="tertiary" size="sm"
            onClick={() => handleTabSwitch('late-message')}
            className={`pb-3 px-1 h-auto rounded-none border-b-2 transition-colors whitespace-nowrap ${activeTab === 'late-message' ? 'text-primary border-b-primary' : 'text-slate-600 hover:text-slate-900 border-b-transparent'}`}
          >
            Message
          </Button>
          <Button
            type="button" variant="tertiary" size="sm"
            onClick={() => handleTabSwitch('settings')}
            className={`pb-3 px-1 h-auto rounded-none border-b-2 transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'text-primary border-b-primary' : 'text-slate-600 hover:text-slate-900 border-b-transparent'}`}
          >
            Settings
          </Button>
        </div>

        {/* Content Area */}
        <div className="p-6 border border-slate-200 flex-1 flex flex-col overflow-y-auto min-h-0">
          {activeTab === 'late-message' ? (
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              {isEditing ? (
                <>
                  {/* Subject Line */}
                  <div className={`group relative flex flex-col w-full rounded-md border ${type === 'email' && subject.length > 60 ? 'border-orange-300' : 'border-slate-300'} bg-slate-50 transition-all`}>
                    <div className="flex items-center px-3 pt-2.5">
                      <label htmlFor="subject" className="text-sm font-semibold text-slate-700 mr-2 shrink-0">
                        {type === 'push-notification' ? 'Title:' : 'Subject:'}
                      </label>
                      <input
                        id="subject"
                        type="text"
                        placeholder="Title of your message"
                        value={subject}
                        onChange={(e) => {
                          const limit = type === 'push-notification' ? 50 : 120
                          if (e.target.value.length <= limit) setSubject(e.target.value)
                        }}
                        className="flex-1 bg-transparent border-none p-0 text-sm text-slate-900 focus:ring-0 focus:outline-none placeholder-slate-400"
                        autoComplete="off"
                      />
                    </div>
                    <div className="px-3 pb-1.5 flex items-center gap-2 min-h-[20px]">
                      {type === 'email' && subject.length > 60 && (
                        <div className="group/warning relative flex items-center">
                          <AlertCircle className="h-3 w-3 text-orange-500" />
                          <div className="absolute bottom-full left-0 mb-2 hidden w-max rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-lg group-hover/warning:block z-10">
                            May be truncated on mobile
                            <div className="absolute -bottom-1 left-1 h-2 w-2 rotate-45 bg-slate-900" />
                          </div>
                        </div>
                      )}
                      <span className={`text-[10px] ${(type === 'email' && subject.length > 60) || (type === 'push-notification' && subject.length >= 50) ? 'text-orange-500 font-medium' : 'text-slate-400'}`}>
                        {type === 'push-notification' ? `${50 - subject.length} characters left` : `${120 - subject.length} characters left`}
                      </span>
                    </div>
                  </div>

                  {/* Macro Insert */}
                  <div className="relative" ref={macroDropdownRef}>
                    <Button
                      type="button" variant="secondary" size="sm"
                      onClick={() => setShowMacroDropdown(!showMacroDropdown)}
                      iconTrailing={
                        <svg className={`h-4 w-4 transition-transform ${showMacroDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      }
                    >
                      {'{ }'} Insert
                    </Button>
                    {showMacroDropdown && macros.length > 0 && (
                      <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-50 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                        {macros.map((macro) => {
                          const macroValue = macro.macro.replace(/[{}]/g, '')
                          return (
                            <button
                              key={macro.id}
                              type="button"
                              onClick={() => handleInsertMacro(macroValue)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition-colors"
                            >
                              <div className="text-xs text-slate-500">{macro.macro}</div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Quill Editor — uncontrolled: stable value ref avoids re-render reset loop */}
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"

                    onChange={(val) => { editorContentRef.current = val }}
                    modules={quillModules}
                    formats={quillFormats}
                    className="flex-1"
                  />

                  {/* Attachment chips */}
                  {(pendingAttachments.length > 0 || uploadedAttachments.length > 0) && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                      {uploadedAttachments.map(att => (
                        <div key={att.uuid} className="flex items-center gap-1.5 rounded bg-slate-100 px-2.5 py-1.5 text-sm max-w-xs">
                          <span className="truncate font-medium text-blue-600">{att.name}</span>
                          <span className="shrink-0 text-slate-400">({att.sizeLabel})</span>
                        </div>
                      ))}
                      {pendingAttachments.map(att => (
                        <div key={att.id} className="flex items-center gap-1.5 rounded bg-slate-100 px-2.5 py-1.5 text-sm max-w-xs">
                          <span className="truncate font-medium text-blue-600">{att.name}</span>
                          <span className="shrink-0 text-slate-400">({att.sizeLabel})</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="ml-0.5 shrink-0 text-slate-400 hover:text-slate-600"
                          >
                            <XClose className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-auto pt-6 flex justify-end gap-3 border-t border-slate-200">
                    <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={isSavingAttachments}>Cancel</Button>
                    <Button type="button" variant="primary" size="md" onClick={handleSave} disabled={isSavingAttachments}>
                      {isSavingAttachments ? 'Uploading...' : 'Save changes'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{type === 'push-notification' ? 'Title: ' : 'Subject: '}</span>
                      <span className="font-medium text-slate-900">{subject}</span>
                    </div>
                    {type === 'email' && subject.length > 60 && (
                      <div className="flex items-center gap-1 rounded bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 border border-orange-200">
                        May be truncated on mobile
                        <AlertCircle className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <div className="broadcast-editor-content text-slate-600" dangerouslySetInnerHTML={{ __html: savedMessage }} />
                  {uploadedAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                      {uploadedAttachments.map(att => (
                        <div key={att.uuid} className="flex items-center gap-1.5 rounded bg-slate-100 px-2.5 py-1.5 text-sm max-w-xs">
                          <span className="truncate font-medium text-blue-600">{att.name}</span>
                          <span className="shrink-0 text-slate-400">({att.sizeLabel})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end pt-4">
                    <Button type="button" variant="primary" size="md" onClick={() => setIsEditing(true)}>Edit</Button>
                  </div>
                </div>
              )}
            </div>
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
                  <div className="text-sm font-medium text-primary self-end sm:self-auto">400/500</div>
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
      </div>

      <BroadcastPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onSend={async () => {
          if (!createdEvent?.uuid) { showToast.error('Event UUID is required. Please select an event first.'); return }
          if (!subject.trim()) { showToast.error('Subject is required.'); return }
          if (!savedMessage.trim() || savedMessage === '<p><br></p>') { showToast.error('Message is required.'); return }

          const recipientFilters = buildRecipientFilters()
          if (recipientFilters.length === 0) { showToast.error('Please add at least one filter in the Settings tab.'); return }

          setIsSending(true)
          try {
            let communicationId = draftCommunicationId
            // If no draft id exists yet, create draft first, then trigger send-by-id.
            if (!communicationId) {
              const draft = await sendCommunication({
                event_uuid: createdEvent.uuid,
                ...(broadcastTitle ? { title: broadcastTitle } : {}),
                channel: type === 'email' ? 'email' : 'notification',
                subject: subject.trim(),
                message: savedMessage.trim(),
                attachment_uuids: attachmentUuids,
              })
              await updateCommunicationRecipients(draft.id, createdEvent.uuid, {
                recipient_match: matchLogic.toLowerCase() as 'all' | 'any',
                recipient_filters: recipientFilters,
              })
              communicationId = draft.id
              setDraftCommunicationId(draft.id)
            }
            await sendCommunicationById(communicationId, createdEvent.uuid)
            // Keep modal briefly so backend status can settle before list refresh.
            await new Promise((resolve) => setTimeout(resolve, 1200))
            setShowPreviewModal(false)
            if (onSend) {
              await Promise.resolve(onSend({ subject, message: savedMessage, communicationId }))
            }
            return
          } catch {
            // error toast handled in service
          } finally {
            setIsSending(false)
          }
        }}
        subject={subject}
        message={savedMessage}
        isSending={isSending}
        recipients={selectedRecipients}
        attachments={uploadedAttachments}
      />

      <ScheduleBroadcastModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={(date) => {
          console.log('Scheduled for:', date)
          setShowScheduleModal(false)
        }}
      />

      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Insert link</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Text to display</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Enter link text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Link URL</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseLinkModal}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkText.trim() || !linkUrl.trim()}
                className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

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
                    const saved = await handleSave()
                    if (!saved) return
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

      {/* Hidden file input for attachments */}
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
        className="hidden"
        onChange={handleAttachmentAdd}
      />
    </div>
  )
}

export default BroadcastComposer
