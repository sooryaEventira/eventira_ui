import React, { useEffect, useRef, useState } from 'react'
import { Send01 } from '@untitled-ui/icons-react'
import {
  type DirectMessage as ChatMessage,
  createDmConnection,
  getDmChannelName,
  publishDirectMessage,
  type DmConnection,
} from '../../../services/publicDirectMessageService'

interface AblyDirectChatProps {
  peerId: string
  peerName: string
  peerAvatarUrl?: string
  isPeerOnline: boolean
  onClose: () => void
}

function getCurrentUserId(): string {
  try {
    const token = localStorage.getItem('pub_accessToken')
    if (!token) return ''
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    return String(payload?.user_id ?? payload?.sub ?? payload?.uuid ?? payload?.id ?? '')
  } catch { return '' }
}

function getCurrentUserName(): string {
  const first = localStorage.getItem('pub_firstName') ?? ''
  const last = localStorage.getItem('pub_lastName') ?? ''
  if (first || last) return [first, last].filter(Boolean).join(' ')
  try {
    const token = localStorage.getItem('pub_accessToken')
    if (!token) return 'Me'
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    const jFirst = payload?.first_name ?? payload?.given_name ?? ''
    const jLast = payload?.last_name ?? payload?.family_name ?? ''
    return [jFirst, jLast].filter(Boolean).join(' ') || 'Me'
  } catch { return 'Me' }
}

const AblyDirectChat: React.FC<AblyDirectChatProps> = ({ peerId, peerName, peerAvatarUrl, isPeerOnline, onClose }) => {
  const myId = getCurrentUserId()
  const myName = getCurrentUserName()
  const channelName = getDmChannelName(myId || 'guest', peerId)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [ready, setReady] = useState(false)
  const [sending, setSending] = useState(false)

  // Keep the connection for the full lifetime — never recreate it on re-renders
  const connRef = useRef<DmConnection | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Only create once per channelName — skip if already connected
    if (connRef.current) return

    connRef.current = createDmConnection(
      channelName,
      (msg) => setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]),
      () => setReady(true)
    )

    // Only destroy on true unmount (component removed), not StrictMode double-invoke
    return () => {
      // intentionally empty — destroy happens in the component's full unmount below
    }
  }, [channelName])

  // True cleanup only when component is fully removed
  useEffect(() => {
    return () => {
      connRef.current?.destroy()
      connRef.current = null
      setReady(false)
    }
  }, [])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending || !connRef.current) return
    setSending(true)
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      senderId: myId,
      senderName: myName,
      text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, msg])
    setInput('')
    try {
      await publishDirectMessage(connRef.current.channel, msg)
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id))
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="relative shrink-0">
          {peerAvatarUrl ? (
            <img src={peerAvatarUrl} alt={peerName} className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 text-xs font-semibold text-slate-500">
              {String(peerName || 'S').split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          )}
          {isPeerOnline && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{peerName}</div>
          <div className="text-xs text-slate-500">{isPeerOnline ? 'Online' : 'Offline'}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close chat"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 px-4 py-3">
        {!ready && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {ready && messages.length === 0 && (
          <p className="text-center text-xs text-slate-400 pt-6">Start the conversation</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === myId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={[
                'max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                isMe ? 'rounded-tr-sm bg-primary text-white' : 'rounded-tl-sm bg-slate-100 text-slate-800',
              ].join(' ')}>
                {msg.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
          aria-label="Send message"
        >
          <Send01 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default AblyDirectChat
