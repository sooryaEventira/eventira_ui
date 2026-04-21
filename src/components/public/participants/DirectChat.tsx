import React, { useEffect, useRef, useState } from 'react'
import * as Ably from 'ably'
import { Send01 } from '@untitled-ui/icons-react'
import { API_ENDPOINTS } from '../../../config/env'
import { type DirectMessage, publishDirectMessage, saveDmMessage, loadDmHistory } from '../../../services/publicDirectMessageService'

interface DirectChatProps {
  peerId: string
  peerName: string
  peerAvatarUrl?: string
  isPeerOnline: boolean
  onClose: () => void
}

function getMyId(): string {
  return localStorage.getItem('pub_attendeeUuid') ?? ''
}

function getMyName(): string {
  const first = localStorage.getItem('pub_firstName') ?? ''
  const last = localStorage.getItem('pub_lastName') ?? ''
  return [first, last].filter(Boolean).join(' ') || 'Me'
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('pub_accessToken') ?? ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

const DirectChat: React.FC<DirectChatProps> = ({ peerId, peerName, peerAvatarUrl, isPeerOnline, onClose }) => {
  const myId = getMyId()
  const myName = getMyName()

  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [input, setInput] = useState('')
  const [ready, setReady] = useState(false)
  const [sending, setSending] = useState(false)

  const channelRef = useRef<Ably.RealtimeChannel | null>(null)
  const clientRef = useRef<Ably.Realtime | null>(null)
  const channelNameRef = useRef<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const r = await fetch(API_ENDPOINTS.PUBLIC.CHAT_ROOMS, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ participant_uuid: peerId }),
        })
        if (!r.ok || cancelled) return
        const json = await r.json()
        const d = json?.data ?? json
        const channelName = String(d?.channel_name ?? '')
        const ablyToken = d?.ably_token ?? null

        if (!channelName || !ablyToken || cancelled) return

        channelNameRef.current = channelName
        const history = loadDmHistory(channelName)
        if (!cancelled) setMessages(history)

        const client = new Ably.Realtime({ token: ablyToken })
        clientRef.current = client

        const channel = client.channels.get(channelName, { params: { rewind: '100' } })
        channelRef.current = channel

        channel.subscribe((msg: Ably.Message) => {
          const data = msg.data as DirectMessage
          if (!data?.id) return
          saveDmMessage(channelName, data)
          setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data])
        })

        channel.once('attached', async () => {
          try {
            const page = await channel.history({ limit: 100, direction: 'backwards', untilAttach: true })
            const historical = [...page.items].reverse()
            historical.forEach((msg) => {
              const data = msg.data as DirectMessage
              if (data?.id) {
                saveDmMessage(channelName, data)
                setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data])
              }
            })
          } catch { /* history unavailable */ }
          if (!cancelled) setReady(true)
        })

        channel.attach().catch(() => {})
      } catch { /* ignore */ }
    }

    init()

    return () => {
      cancelled = true
      channelRef.current?.unsubscribe()
      clientRef.current?.close()
      channelRef.current = null
      clientRef.current = null
    }
  }, [peerId])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending || !channelRef.current) return
    setSending(true)
    const msg: DirectMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      senderId: myId,
      senderName: myName,
      text,
      timestamp: Date.now(),
    }
    saveDmMessage(channelNameRef.current, msg)
    setMessages((prev) => [...prev, msg])
    setInput('')
    try {
      await publishDirectMessage(channelRef.current, msg)
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="relative shrink-0">
          {peerAvatarUrl ? (
            <img src={peerAvatarUrl} alt={peerName} className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 text-xs font-semibold text-slate-500">
              {String(peerName || 'P').split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
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
        {!ready && messages.length === 0 && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {!ready && messages.length > 0 && (
          <p className="text-center text-xs text-slate-400 pb-1">Connecting…</p>
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
          disabled={sending || !input.trim() || !ready}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-opacity"
          aria-label="Send"
        >
          <Send01 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default DirectChat
