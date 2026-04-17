import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Send01, SearchSm, XClose } from '@untitled-ui/icons-react'
import PublicAuthTopbar from './PublicAuthTopbar'
import { API_ENDPOINTS } from '../../config/env'

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatRoom {
  room_uuid: string
  channel_name: string
  participant: {
    user_uuid: string
    name: string
    image: string | null
  }
  created_at: string
}

interface ChatMessage {
  id: string
  sender_uuid: string
  sender_name: string
  text: string
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pubHeaders(): HeadersInit {
  const token = localStorage.getItem('pub_accessToken')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data?.status === 'success' && Array.isArray(data.data)) return data.data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.results)) return data.results
  return []
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────────

const Avatar: React.FC<{ name: string; image: string | null; size?: 'sm' | 'md'; online?: boolean }> = ({
  name,
  image,
  size = 'md',
  online,
}) => {
  const dim = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm'
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="relative flex-shrink-0">
      {image ? (
        <img src={image} alt={name} className={`${dim} rounded-full object-cover`} />
      ) : (
        <div className={`${dim} rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary`}>
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-slate-300'}`}
        />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PublicMessagesPage: React.FC = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [filteredRooms, setFilteredRooms] = useState<ChatRoom[]>([])
  const [search, setSearch] = useState('')
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)

  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const myUuid = localStorage.getItem('pub_userUuid') ?? localStorage.getItem('pub_userId') ?? ''

  // ── Load rooms ──────────────────────────────────────────────────────────────

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(API_ENDPOINTS.PUBLIC.CHAT_ROOMS, { headers: pubHeaders() })
        const json = await res.json()
        const list: ChatRoom[] = extractArray(json)
        setRooms(list)
        setFilteredRooms(list)
      } catch {
        // keep empty
      } finally {
        setIsLoadingRooms(false)
      }
    })()
  }, [])

  // ── Search filter ───────────────────────────────────────────────────────────

  useEffect(() => {
    const q = search.trim().toLowerCase()
    setFilteredRooms(q ? rooms.filter((r) => r.participant.name.toLowerCase().includes(q)) : rooms)
  }, [search, rooms])

  // ── Load messages ───────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (roomUuid: string) => {
    try {
      const res = await fetch(API_ENDPOINTS.PUBLIC.CHAT_MESSAGES(roomUuid), { headers: pubHeaders() })
      const json = await res.json()
      const list: ChatMessage[] = extractArray(json)
      setMessages(list)
    } catch {
      // keep current
    }
  }, [])

  useEffect(() => {
    if (!selectedRoom) return
    setIsLoadingMessages(true)
    loadMessages(selectedRoom.room_uuid).finally(() => setIsLoadingMessages(false))

    // Poll for new messages every 5 seconds
    pollRef.current = setInterval(() => loadMessages(selectedRoom.room_uuid), 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [selectedRoom, loadMessages])

  // ── Scroll to bottom on new messages ────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = messageInput.trim()
    if (!text || !selectedRoom || isSending) return
    setIsSending(true)
    setMessageInput('')
    try {
      await fetch(API_ENDPOINTS.PUBLIC.CHAT_SEND(selectedRoom.room_uuid), {
        method: 'POST',
        headers: pubHeaders(),
        body: JSON.stringify({ text }),
      })
      await loadMessages(selectedRoom.room_uuid)
    } catch {
      setMessageInput(text)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicAuthTopbar
        menuTitle="Messages"
        menuItems={[{ label: 'Back to events', href: '/event-list' }]}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-full flex-1 flex-col">
          {/* Header row */}
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => (window.location.href = '/event-list')}
                className="flex items-center justify-center text-slate-500 hover:text-slate-700"
                aria-label="Back"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-slate-600">Messages</h1>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search connections"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-64 rounded-lg border border-slate-200 bg-white pl-4 pr-10 text-sm text-slate-700 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90"
                aria-label="Search"
              >
                <SearchSm className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 gap-4 px-6 pb-8 overflow-hidden">

            {/* Full-width empty state when no rooms */}
            {!isLoadingRooms && rooms.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                <p className="text-sm font-medium text-slate-700">No messages yet. Send your first message.</p>
                <p className="mt-1 text-xs text-slate-400">Connect with other participants to start chatting.</p>
              </div>
            )}

            {/* Loading full-width */}
            {isLoadingRooms && (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {/* Two-column layout when rooms exist */}
            {!isLoadingRooms && rooms.length > 0 && (<>
            {/* Left: room list */}
            <div className="flex w-[340px] flex-shrink-0 flex-col gap-2 overflow-y-auto">
              {filteredRooms.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                  No connections match your search
                </div>
              ) : (
                filteredRooms.map((room) => (
                  <button
                    key={room.room_uuid}
                    type="button"
                    onClick={() => setSelectedRoom(room)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-white ${
                      selectedRoom?.room_uuid === room.room_uuid
                        ? 'border-primary bg-white shadow-sm'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Avatar name={room.participant.name} image={room.participant.image} online />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{room.participant.name}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Right: chat panel */}
            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {selectedRoom ? (
                <>
                  {/* Chat header */}
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={selectedRoom.participant.name} image={selectedRoom.participant.image} size="sm" online />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{selectedRoom.participant.name}</p>
                        <p className="text-xs text-green-500">Online</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRoom(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Close"
                    >
                      <XClose className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4 gap-2">
                    {isLoadingMessages ? (
                      <div className="flex flex-1 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center">
                        <p className="text-sm text-slate-400">No messages yet. Say hi!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.sender_uuid === myUuid
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                                isMine
                                  ? 'bg-primary/10 text-slate-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              <p>{msg.text}</p>
                              <p className="mt-1 text-[10px] text-slate-400 text-right">{formatTime(msg.created_at)}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                      <input
                        type="text"
                        placeholder="Message"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!messageInput.trim() || isSending}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary/90 disabled:opacity-40"
                        aria-label="Send"
                      >
                        <Send01 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                  Select a conversation to start messaging
                </div>
              )}
            </div>
            </>)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicMessagesPage
