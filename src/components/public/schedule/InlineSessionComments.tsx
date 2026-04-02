import React, { useCallback, useEffect, useRef, useState } from 'react'
import * as Ably from 'ably'
import { ThumbsUp, Bookmark, Flag01, Send01 } from '@untitled-ui/icons-react'
import toast from 'react-hot-toast'
import {
  fetchSessionComments,
  postSessionComment,
  fetchAblyToken,
  type SessionComment,
} from '../../../services/publicSessionCommentServices'

interface InlineSessionCommentsProps {
  eventUuid: string
  sessionUuid: string
  isPublicView?: boolean
  onLoginClick?: () => void
}

function getStoredFullName(): string {
  // Prefer name stored from profile API fetch
  const first = localStorage.getItem('pub_firstName') ?? ''
  const last = localStorage.getItem('pub_lastName') ?? ''
  if (first || last) return [first, last].filter(Boolean).join(' ')
  // Fall back to JWT payload
  try {
    const token = localStorage.getItem('pub_accessToken')
    if (!token) return ''
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    const jFirst = payload?.first_name ?? payload?.given_name ?? ''
    const jLast = payload?.last_name ?? payload?.family_name ?? ''
    return [jFirst, jLast].filter(Boolean).join(' ')
  } catch {
    return ''
  }
}

function resolveAuthorName(authorName: string): string {
  if (!authorName) return 'Anonymous'
  // Only replace with stored name if it matches the current user's email
  if (authorName.includes('@')) {
    const currentEmail = localStorage.getItem('pub_userEmail') ?? ''
    if (currentEmail && authorName === currentEmail) {
      const stored = getStoredFullName()
      return stored || authorName
    }
  }
  return authorName
}

function timeAgo(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return ''
  }
}

const InlineSessionComments: React.FC<InlineSessionCommentsProps> = ({
  eventUuid,
  sessionUuid,
  isPublicView = false,
  onLoginClick,
}) => {
  const [comments, setComments] = useState<SessionComment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [anonymous, setAnonymous] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const ablyClientRef = useRef<Ably.Realtime | null>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)

  const isAuthenticated = Boolean(localStorage.getItem('pub_accessToken'))

  const loadComments = useCallback(async () => {
    try {
      const data = await fetchSessionComments(eventUuid, sessionUuid)
      setComments(data)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [eventUuid, sessionUuid])

  useEffect(() => {
    loadComments()

    // Connect to Ably for real-time new comments
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

    const channel = client.channels.get(`session-${sessionUuid}`)
    channelRef.current = channel

    channel.subscribe((msg: Ably.Message) => {
      const raw = msg.data
      const incoming = (raw?.data ?? raw) as SessionComment
      if (!incoming?.uuid) return
      setComments((prev) => {
        if (prev.some((c) => c.uuid === incoming.uuid)) return prev
        return [...prev, incoming]
      })
    })

    return () => {
      channel.unsubscribe()
      channel.detach()
      client.close()
      channelRef.current = null
      ablyClientRef.current = null
    }
  }, [eventUuid, sessionUuid, loadComments])

  const handleCommentClick = () => {
    if (!isPublicView) return
    if (!isAuthenticated) {
      onLoginClick?.()
      return
    }
    setShowInput(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await postSessionComment(eventUuid, sessionUuid, trimmed, null, anonymous)
      setMessage('')
      setShowInput(false)
      await loadComments()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post comment')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4 border rounded-md  p-2">
      {/* Comment list */}
      {loading ? (
        <div className="py-4 text-center text-sm text-slate-400">Loading comments…</div>
      ) : comments.length === 0 ? (
        <div className="py-4 text-center text-sm text-slate-400">No comments yet. Be the first!</div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.uuid} className="flex items-start gap-3">
              {/* Avatar */}
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Name + time */}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-900">
                    {resolveAuthorName(comment.author_name)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {timeAgo(comment.created_date)}
                  </span>
                </div>

                {/* Comment text */}
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-sm text-slate-700 break-words">{comment.content}</p>
                </div>

                {/* Actions */}
                <div className="mt-2 flex items-center gap-4">
                  <button type="button" className="flex items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <ThumbsUp className="h-4 w-4" />
                    <span className="text-xs">0</span>
                  </button>
                  <button type="button" className="text-slate-400 hover:text-primary transition-colors" aria-label="Bookmark">
                    <Bookmark className="h-4 w-4" />
                  </button>
                  <button type="button" className="text-slate-400 hover:text-red-500 transition-colors" aria-label="Report">
                    <Flag01 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline input (shown after clicking Comment) */}
      {showInput && isAuthenticated && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a comment…"
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-slate-600">Submit as anonymous</span>
          </label>
          <div className="flex gap-2 justify-end -mt-4">
            <button
              type="button"
              onClick={() => { setShowInput(false); setMessage('') }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <Send01 className="h-4 w-4" />
              {sending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {/* Comment button */}
      {!showInput && (
        <button
          type="button"
          onClick={handleCommentClick}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
        >
          {isPublicView && !isAuthenticated ? 'Login to comment' : 'Comment'}
        </button>
      )}
    </div>
  )
}

export default InlineSessionComments
