import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as Ably from 'ably'
import { Send01, SearchSm, XClose } from '@untitled-ui/icons-react'
import PublicAuthTopbar from './PublicAuthTopbar'
import { API_ENDPOINTS } from '../../config/env'
import { type DirectMessage, publishDirectMessage, saveDmMessage, loadDmHistory } from '../../services/publicDirectMessageService'

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

interface PublicMessagesPageProps {
  showTopbar?: boolean
  onBack?: () => void
}

function pubHeaders(): Record<string, string> {
  const token = localStorage.getItem('pub_accessToken')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data?.status === 'success' && Array.isArray(data.data)) return data.data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.results)) return data.results
  return []
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const Avatar: React.FC<{ name: string; image: string | null; size?: 'sm' | 'md'; online?: boolean }> = ({ name, image, size = 'md', online }) => {
  const [imgFailed, setImgFailed] = React.useState(false)
  const dim = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm'
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
  const showImage = image && !imgFailed
  return (
    <div className="relative flex-shrink-0">
      {showImage ? (
        <img src={image} alt={name} className={`${dim} rounded-full object-cover`} onError={() => setImgFailed(true)} />
      ) : (
        <div className={`${dim} rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary`}>
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-slate-300'}`} />
      )}
    </div>
  )
}

const PublicMessagesPage: React.FC<PublicMessagesPageProps> = ({
  showTopbar = true,
  onBack,
}) => {
  const myId = localStorage.getItem('pub_attendeeUuid') ?? localStorage.getItem('pub_userUuid') ?? ''
  const myName = [localStorage.getItem('pub_firstName'), localStorage.getItem('pub_lastName')].filter(Boolean).join(' ') || 'Me'

  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [filteredRooms, setFilteredRooms] = useState<ChatRoom[]>([])
  const [search, setSearch] = useState('')
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)
  const clientRef = useRef<Ably.Realtime | null>(null)

  // Load rooms
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(API_ENDPOINTS.PUBLIC.CHAT_ROOMS, { headers: pubHeaders() })
        const json = await res.json()
        const list: ChatRoom[] = extractArray(json)
        setRooms(list)
        setFilteredRooms(list)
      } catch { /* keep empty */ } finally {
        setIsLoadingRooms(false)
      }
    })()
  }, [])

  // Search filter
  useEffect(() => {
    const q = search.trim().toLowerCase()
    setFilteredRooms(q ? rooms.filter((r) => r.participant.name.toLowerCase().includes(q)) : rooms)
  }, [search, rooms])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Connect to Ably when a room is selected
  const connectRoom = useCallback(async (room: ChatRoom) => {
    // Teardown previous connection
    channelRef.current?.unsubscribe()
    clientRef.current?.close()
    channelRef.current = null
    clientRef.current = null
    setMessages([])
    setIsReady(false)
    setIsConnecting(true)

    try {
      // Fetch Ably token for this room
      const res = await fetch(API_ENDPOINTS.PUBLIC.CHAT_ROOM_TOKEN(room.room_uuid), { headers: pubHeaders() })
      if (!res.ok) { setIsConnecting(false); return }
      const json = await res.json()
      const d = json?.data ?? json
      const ablyToken = d?.ably_token ?? d?.token ?? null
      const channelName = room.channel_name || String(d?.channel_name ?? '')
      if (!ablyToken || !channelName) { setIsConnecting(false); return }

      // Load local history immediately
      const history = loadDmHistory(channelName)
      setMessages(history)

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
        setIsReady(true)
        setIsConnecting(false)
      })

      channel.attach().catch(() => { setIsConnecting(false) })
    } catch {
      setIsConnecting(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedRoom) return
    connectRoom(selectedRoom)
    return () => {
      channelRef.current?.unsubscribe()
      clientRef.current?.close()
      channelRef.current = null
      clientRef.current = null
    }
  }, [selectedRoom, connectRoom])

  const handleSend = async () => {
    const text = messageInput.trim()
    if (!text || !channelRef.current || isSending) return
    setIsSending(true)
    const msg: DirectMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      senderId: myId,
      senderName: myName,
      text,
      timestamp: Date.now(),
    }
    const channelName = selectedRoom?.channel_name ?? ''
    if (channelName) saveDmMessage(channelName, msg)
    setMessages((prev) => [...prev, msg])
    setMessageInput('')
    try {
      await publishDirectMessage(channelRef.current, msg)
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id))
      setMessageInput(text)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className={`flex ${showTopbar ? 'min-h-screen' : 'h-[calc(100vh-4rem)]'} flex-col bg-slate-50`}>
      {showTopbar && (
        <PublicAuthTopbar menuTitle="Messages" menuItems={[{ label: 'Back to events', href: '/event-list' }]} />
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-full flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onBack) onBack()
                  else window.location.href = '/event-list'
                }}
                className="flex items-center justify-center text-slate-500 hover:text-slate-700"
                aria-label="Back"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <h1 className="text-xl font-bold text-slate-600">Messages</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input type="text" placeholder="Search connections" value={search} onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-64 rounded-lg border border-slate-200 bg-white pl-4 pr-10 text-sm text-slate-700 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90" aria-label="Search">
                <SearchSm className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 gap-4 px-6 pb-8 overflow-hidden">
            {!isLoadingRooms && rooms.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                <p className="text-sm font-medium text-slate-700">No messages yet. Send your first message.</p>
                <p className="mt-1 text-xs text-slate-400">Connect with other participants to start chatting.</p>
              </div>
            )}
            {isLoadingRooms && (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {!isLoadingRooms && rooms.length > 0 && (<>
              {/* Room list */}
              <div className="flex w-[340px] flex-shrink-0 flex-col gap-2 overflow-y-auto">
                {filteredRooms.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-sm text-slate-400">No connections match your search</div>
                ) : filteredRooms.map((room) => (
                  <button key={room.room_uuid} type="button" onClick={() => setSelectedRoom(room)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-white ${selectedRoom?.room_uuid === room.room_uuid ? 'border-primary bg-white shadow-sm' : 'border-slate-200 bg-white'}`}
                  >
                    <Avatar name={room.participant.name} image={room.participant.image} online />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{room.participant.name}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Chat panel */}
              <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {selectedRoom ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={selectedRoom.participant.name} image={selectedRoom.participant.image} size="sm" online />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{selectedRoom.participant.name}</p>
                          <p className="text-xs text-green-500">Online</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedRoom(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                        <XClose className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4 gap-2">
                      {isConnecting ? (
                        <div className="flex flex-1 items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center">
                          <p className="text-sm text-slate-400">No messages yet. Say hi!</p>
                        </div>
                      ) : messages.map((msg) => {
                        const isMine = msg.senderId === myId
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${isMine ? 'bg-primary/10 text-slate-800' : 'bg-slate-100 text-slate-800'}`}>
                              <p>{msg.text}</p>
                              <p className="mt-1 text-[10px] text-slate-400 text-right">{formatTime(msg.timestamp)}</p>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="border-t border-slate-100 px-4 py-3">
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                        <input type="text" placeholder="Message" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={handleKeyDown}
                          className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                        />
                        <button type="button" onClick={handleSend} disabled={!messageInput.trim() || isSending || !isReady}
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
