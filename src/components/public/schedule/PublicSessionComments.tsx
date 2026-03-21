import React, { useEffect, useState, useRef } from 'react'
import { Send01, XClose, DotsVertical } from '@untitled-ui/icons-react'
import toast from 'react-hot-toast'
import { fetchSessionComments, postSessionComment, type SessionComment } from '../../../services/publicSessionCommentServices'

interface PublicSessionCommentsProps {
  eventUuid: string
  sessionUuid: string
  onClose?: () => void
}

const PublicSessionComments: React.FC<PublicSessionCommentsProps> = ({
  eventUuid,
  sessionUuid,
  onClose
}) => {
  const [comments, setComments] = useState<SessionComment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [anonymous, setAnonymous] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadComments = async () => {
    try {
      setLoading(true)
      const data = await fetchSessionComments(eventUuid, sessionUuid)
      setComments(data)
      setTimeout(scrollToBottom, 100)
    } catch {
      // silently ignore load errors
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComments()
    const interval = setInterval(loadComments, 10000)
    return () => clearInterval(interval)
  }, [eventUuid, sessionUuid])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage || sending) return
    try {
      setSending(true)
      await postSessionComment(eventUuid, sessionUuid, trimmedMessage, null, anonymous)
      setMessage('')
      await loadComments()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send comment')
    } finally {
      setSending(false)
    }
  }

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
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

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '320px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900">Live Chat</h2>
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
            <span className="text-sm text-slate-500">Loading...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-1">
            <p className="text-sm text-slate-500">No comments yet</p>
            <p className="text-xs text-slate-400">Be the first to comment!</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <div key={comment.uuid} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                    <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  {/* Content */}
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
                      <button type="button" className="shrink-0 p-0.5 text-slate-400 hover:text-slate-600 transition-colors" aria-label="More options">
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

      {/* Input */}
      <div className="border-t border-slate-200 px-4 py-3">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Comment"
            disabled={sending}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="shrink-0 text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
            aria-label="Send comment"
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
