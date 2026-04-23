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
  AlertCircle
} from '@untitled-ui/icons-react'
import Button from '../../ui/untitled/Button'
import type { Macro } from './communicationTypes'
import BroadcastPreviewModal from './BroadcastPreviewModal'
import { ScheduleBroadcastModal } from './ScheduleBroadcastModal'
import { useEventForm } from '../../../contexts/EventFormContext'
import { fetchTags } from '../../../services/attendeeService'
import { sendCommunication } from '../../../services/communicationService'
import { showToast } from '../../../utils/toast'

interface BroadcastComposerProps {
  onCancel: () => void
  onSave: (data: { subject: string; message: string; templateType?: string }) => void
  onSend?: (data: { subject: string; message: string }) => void
  macros?: Macro[]
  initialSubject?: string
  initialMessage?: string
  templateType?: string
  type?: 'email' | 'push-notification'
}

const MESSAGE_STATUS_OPTIONS = [
  { value: 'Opened', label: 'Opened' },
  { value: 'Clicked', label: 'Clicked' },
  { value: 'Bounced', label: 'Bounced' },
  { value: 'Not opened', label: 'Not opened' }
]
const USER_STATUS_OPTIONS = [
  { value: 'Logged In', label: 'Logged In' },
  { value: 'Not logged in', label: 'Not logged in' }
]

const TOOLBAR_CONTAINER = [
  [{ font: [] }],
  ['bold', 'italic', 'underline'],
  [{ color: [] }, { background: [] }],
  [{ align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image'],
  ['clean'],
]

const quillFormats = [
  'font', 'bold', 'italic', 'underline',
  'color', 'background',
  'align', 'list',
  'link', 'image'
]

const BroadcastComposer: React.FC<BroadcastComposerProps> = ({
  onCancel,
  onSave,
  onSend,
  macros = [],
  initialSubject = '',
  initialMessage = '',
  type = 'email'
}) => {
  const [activeTab, setActiveTab] = useState<'late-message' | 'settings'>('late-message')
  const [subject, setSubject] = useState(initialSubject || '')
  // savedMessage is used for read-only view and preview; live editing uses editorContentRef
  const [savedMessage, setSavedMessage] = useState(initialMessage)
  const editorContentRef = useRef(initialMessage)
  const [isEditing, setIsEditing] = useState(true)
  const [selectedMacro, setSelectedMacro] = useState<string>('')
  const [showMacroDropdown, setShowMacroDropdown] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Settings Tab State
  const [matchLogic, setMatchLogic] = useState<'ANY' | 'ALL'>('ANY')
  const [filters, setFilters] = useState([
    { id: '1', field: 'Group', operator: 'is', value: 'Speakers' }
  ])
  const [tags, setTags] = useState<Array<{ uuid: string; name: string }>>([])

  const { createdEvent } = useEventForm()
  const quillRef = useRef<ReactQuill>(null)
  const macroDropdownRef = useRef<HTMLDivElement>(null)

  // Build modules once. Custom color handler uses quillRef so we can call
  // getSelection(true) which re-focuses the editor before reading the range,
  // avoiding the selection-loss issue that makes the default handler a no-op.
  const quillModules = useMemo(() => ({
    toolbar: {
      container: TOOLBAR_CONTAINER,
      handlers: {
        color(value: string) {
          const editor = quillRef.current?.getEditor()
          if (!editor) return
          const range = editor.getSelection(true)
          if (range && range.length > 0) {
            editor.formatText(range.index, range.length, 'color', value || false, 'user')
          } else {
            editor.format('color', value || false, 'user')
          }
        }
      }
    }
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

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
        const tagsData = await fetchTags(eventUuid)
        setTags(
          tagsData
            .filter((tag) => tag.is_active !== false)
            .map((tag) => ({ uuid: tag.uuid, name: tag.name }))
        )
      } catch {
        setTags([])
      }
    }
    loadTags()
  }, [createdEvent?.uuid])

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

  const handleSave = () => {
    const current = editorContentRef.current
    setSavedMessage(current)
    onSave({ subject, message: current, templateType: activeTab === 'late-message' ? 'late-message' : undefined })
    setIsEditing(false)
  }

  const handleOpenPreview = () => {
    setSavedMessage(editorContentRef.current)
    setShowPreviewModal(true)
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
        <h1 className="text-[26px] font-semibold text-primary-dark mb-4">Communication</h1>
        {!isEditing && (
          <div className="flex items-center gap-3">
            <Button type="button" variant="primary" size="md" onClick={handleOpenPreview} iconTrailing={<Send01 className="h-4 w-4" />}>
              Send
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
            onClick={() => setActiveTab('late-message')}
            className={`pb-3 px-1 h-auto rounded-none border-b-2 transition-colors whitespace-nowrap ${activeTab === 'late-message' ? 'text-primary border-b-primary' : 'text-slate-600 hover:text-slate-900 border-b-transparent'}`}
          >
            Message
          </Button>
          <Button
            type="button" variant="tertiary" size="sm"
            onClick={() => setActiveTab('settings')}
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

                  {/* Action Buttons */}
                  <div className="mt-auto pt-6 flex justify-end gap-3 border-t border-slate-200">
                    <Button type="button" variant="secondary" size="md" onClick={onCancel}>Cancel</Button>
                    <Button type="button" variant="primary" size="md" onClick={handleSave}>Save changes</Button>
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
                    const addMessageStatusFirst = filters.length % 2 === 1
                    const newFilter = addMessageStatusFirst
                      ? { id: Date.now().toString(), field: 'Message status', operator: 'is not', value: 'Opened' }
                      : { id: Date.now().toString(), field: 'Users', operator: 'is not', value: 'Logged In' }
                    setFilters([...filters, newFilter])
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
                          const nextField = e.target.value as 'Message status' | 'Users' | 'Group'
                          newFilters[index].field = nextField
                          newFilters[index].value = nextField === 'Message status' ? 'Opened' : nextField === 'Users' ? 'Logged In' : (tags[0]?.name ?? '')
                          setFilters(newFilters)
                        }}
                        className="min-w-[140px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="Message status">Message status</option>
                        <option value="Users">Users</option>
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
                        {filter.field === 'Users' && (
                          <>
                            <option value="">Select status...</option>
                            {USER_STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
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

          const fieldTypeMap: Record<string, 'group' | 'message_status' | 'user_status'> = {
            'Group': 'group',
            'Message status': 'message_status',
            'Users': 'user_status',
          }
          const valueMap: Record<string, string> = {
            'Opened': 'opened', 'Clicked': 'clicked', 'Bounced': 'bounced', 'Not opened': 'not_opened',
            'Logged In': 'logged_in', 'Not logged in': 'not_logged_in',
          }
          const operatorMap: Record<string, 'is' | 'is_not'> = { 'is': 'is', 'is not': 'is_not' }

          const recipientFilters = filters
            .filter((f) => f.field && f.value)
            .map((f) => {
              let value = f.value
              if (f.field === 'Group') {
                const tag = tags.find((t) => t.name === f.value)
                value = tag?.uuid ?? f.value
              } else {
                value = valueMap[f.value] ?? f.value.toLowerCase().replace(/\s+/g, '_')
              }
              return {
                type: fieldTypeMap[f.field] ?? 'group',
                operator: operatorMap[f.operator] ?? 'is',
                value,
              }
            })

          if (recipientFilters.length === 0) { showToast.error('Please add at least one filter in the Settings tab.'); return }

          setIsSending(true)
          try {
            await sendCommunication({
              event_uuid: createdEvent.uuid,
              channel: type === 'email' ? 'email' : 'push-notification',
              subject: subject.trim(),
              message: savedMessage.trim(),
              recipient_match: matchLogic.toLowerCase() as 'all' | 'any',
              recipient_filters: recipientFilters,
              save_as_draft: false,
            })
            if (onSend) onSend({ subject, message: savedMessage })
            setShowPreviewModal(false)
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
      />

      <ScheduleBroadcastModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={(date) => {
          console.log('Scheduled for:', date)
          setShowScheduleModal(false)
        }}
      />
    </div>
  )
}

export default BroadcastComposer
