import React, { useEffect, useState, useRef, useCallback } from 'react'
import * as Ably from 'ably'
import { Send01, XClose, DotsVertical } from '@untitled-ui/icons-react'
import toast from 'react-hot-toast'
import { fetchSessionComments, postSessionComment, fetchAblyToken, type SessionComment } from '../../../services/publicSessionCommentServices'

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'failed'

interface PublicSessionCommentsProps {
  eventUuid: string
  sessionUuid: string
  onClose?: () => void
}

const PublicSessionComments: React.FC<PublicSessionCommentsProps> = ({
  eventUuid,
  sessionUuid,
  onClose,
}) => {
  const [comments, setComments] = useState<SessionComment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [anonymous, setAnonymous] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)
  const ablyClientRef = useRef<Ably.Realtime | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load existing comments from REST (history)
  const loadComments = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchSessionComments(eventUuid, sessionUuid)
      setComments(data)
      setTimeout(scrollToBottom, 100)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [eventUuid, sessionUuid, scrollToBottom])

  useEffect(() => {
    // 1. Load comment history
    loadComments()

    // 2. Initialize Ably with authCallback
    const client = new Ably.Realtime({
      disconnectedRetryTimeout: 5000,
      suspendedRetryTimeout: 10000,
      authCallback: (_tokenParams, callback) => {
        fetchAblyToken()
          .then((token) => callback(null, token as unknown as Ably.TokenDetails | Ably.TokenRequest | string))
          .catch((err) => {
            console.error('[Ably] Auth token fetch failed:', err)
            callback(String((err as Error)?.message ?? err), null as unknown as string)
          })
      },
    })

    ablyClientRef.current = client

    // 3. Handle connection state changes
    client.connection.on((stateChange: Ably.ConnectionStateChange) => {
      switch (stateChange.current) {
        case 'connected':
          setConnectionState('connected')
          break
        case 'failed':
          setConnectionState('failed')
          break
        case 'disconnected':
        case 'suspended':
          setConnectionState('disconnected')
          // Ably will auto-retry per disconnectedRetryTimeout / suspendedRetryTimeout
          break
        default:
          setConnectionState('connecting')
      }
    })

    // 4. Create / join the session channel
    const channelName = `session-${sessionUuid}`
    const channel = client.channels.get(channelName)
    channelRef.current = channel

    // 5. Subscribe to incoming messages
    channel.subscribe((msg: Ably.Message) => {
      const raw = msg.data
      const incoming = (raw?.data ?? raw) as SessionComment
      if (!incoming?.uuid) {
        console.warn('[Ably] Received message with no uuid — check backend channel publish format:', raw)
        return
      }
      setComments((prev) => {
        // Deduplicate — message may already exist from REST load
        if (prev.some((c) => c.uuid === incoming.uuid)) return prev
        const next = [...prev, incoming]
        setTimeout(scrollToBottom, 50)
        return next
      })
    })

    // 6. Cleanup: unsubscribe and close connection on unmount
    return () => {
      channel.unsubscribe()
      channel.detach()
      client.close()
      channelRef.current = null
      ablyClientRef.current = null
    }
  }, [eventUuid, sessionUuid, loadComments, scrollToBottom])

  // 7. Send message via REST — backend persists and publishes to Ably channel.
  //    We also reload from REST after posting so the sender sees their message
  //    immediately (fallback until the backend broadcasts via Ably).
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || sending) return
    try {
      setSending(true)
      await postSessionComment(eventUuid, sessionUuid, trimmed, null, anonymous)
      setMessage('')
      // Reload from REST so the sender sees their message even if Ably doesn't deliver it
      await loadComments()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      const diffDays = Math.floor(diffHours / 24)
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    } catch {
      return ''
    }
  }

  // Connection status indicator
  const connectionBadge: Record<ConnectionState, { dot: string; label: string }> = {
    connecting:   { dot: 'bg-yellow-400', label: 'Connecting…' },
    connected:    { dot: 'bg-green-500',  label: 'Live'        },
    disconnected: { dot: 'bg-yellow-400', label: 'Reconnecting…' },
    failed:       { dot: 'bg-red-500',    label: 'Connection failed' },
  }
  const badge = connectionBadge[connectionState]

  return (
    <div
      className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden"
      style={{ height: 'calc(100vh - 200px)', minHeight: '320px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-900">Live Chat</h2>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`h-2 w-2 rounded-full ${badge.dot} shrink-0`} />
            {badge.label}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close chat"
          >
            <XClose className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading && comments.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-sm text-slate-500">Loading…</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-1">
            <p className="text-sm text-slate-500">No messages yet</p>
            <p className="text-xs text-slate-400">Be the first to say something!</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <div key={comment.uuid} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                    <svg
                      className="h-5 w-5 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {comment.author_name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-slate-400 shrink-0">
                          {formatTimestamp(comment.created_date)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="More options"
                      >
                        <DotsVertical className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-1.5 rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-sm text-slate-700 break-words">{comment.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Connection failed banner */}
      {connectionState === 'failed' && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600 flex items-center justify-between gap-2">
          <span>Real-time connection failed.</span>
          <button
            type="button"
            onClick={() => {
              setConnectionState('connecting')
              ablyClientRef.current?.connect()
            }}
            className="underline font-semibold whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 px-4 py-3">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message…"
            disabled={sending || connectionState === 'failed'}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={!message.trim() || sending || connectionState === 'failed'}
            className="shrink-0 text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
            aria-label="Send message"
          >
            <Send01 className="h-5 w-5" />
          </button>
        </form>
        <label className="mt-2 flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="rounded border-slate-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-slate-600">Submit as anonymous</span>
        </label>
      </div>
    </div>
  )
}

export default PublicSessionComments
