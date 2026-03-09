import React, { useMemo, useState } from 'react'
import Button from '../../ui/untitled/Button'
import MobileView from '../../../assets/images/mobile_view.png'
import EventiraLogo from '../../../assets/images/Logo.png'
import { ChevronDown } from '@untitled-ui/icons-react'
import type { Macro } from './communicationTypes'

interface PushNotificationMakerPageProps {
  macros?: Macro[]
  initialTitle?: string
  initialMessage?: string
  onCancel: () => void
  onSave: (data: { title: string; message: string; tapBehaviour: string; tapTarget: string }) => void
}

const TITLE_LIMIT = 35
const MESSAGE_LIMIT = 80

const PushNotificationMakerPage: React.FC<PushNotificationMakerPageProps> = ({
  macros = [],
  initialTitle = '',
  initialMessage = '',
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'message' | 'settings'>('message')
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialMessage)

  const [tapBehaviour, setTapBehaviour] = useState<'open-session' | 'open-speaker-profile' | 'open-event-page' | 'external-link'>('open-session')
  const [tapTarget, setTapTarget] = useState('')

  const titleRemaining = Math.max(TITLE_LIMIT - title.length, 0)
  const bodyPlain = useMemo(() => String(body || '').replace(/\s+/g, ' ').trim(), [body])
  const bodyRemaining = Math.max(MESSAGE_LIMIT - bodyPlain.length, 0)

  const [macroOpen, setMacroOpen] = useState(false)

  const insertMacro = (macro: Macro) => {
    const next = `${body}${body ? ' ' : ''}${macro.macro}`
    setBody(next)
    setMacroOpen(false)
  }

  return (
    <div className="rounded-xl bg-white overflow-hidden">
      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 px-6">
        <button
          type="button"
          onClick={() => setActiveTab('message')}
          className={`pb-3 pt-4 text-sm font-semibold border-b-2 ${
            activeTab === 'message' ? 'text-primary border-b-primary' : 'text-slate-600 border-b-transparent hover:text-slate-900'
          }`}
        >
          Message
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
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
                <Button type="button" variant="secondary" size="md" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => onSave({ title: title.trim(), message: body, tapBehaviour, tapTarget })}
                >
                  Save changes
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Settings (recipients, scheduling, etc.) can be added here.
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
    </div>
  )
}

export default PushNotificationMakerPage

