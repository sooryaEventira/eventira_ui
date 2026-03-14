import React, { useEffect, useState, useRef } from 'react'
import { Send01 } from '@untitled-ui/icons-react'
import toast from 'react-hot-toast'
import { fetchSessionComments, postSessionComment, type SessionComment } from '../../../services/publicSessionCommentServices'

interface PublicSessionCommentsProps {
  eventUuid: string
  sessionUuid: string
  sessionTitle?: string
  height?: number
}

const PublicSessionComments: React.FC<PublicSessionCommentsProps> = ({
  eventUuid,
  sessionUuid,
  sessionTitle,
  height = 360
}) => {
  const [comments, setComments] = useState<SessionComment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
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
    } catch (error) {
      console.error('Failed to load comments:', error)
      // Don't show error toast on initial load to avoid spamming
      if (comments.length > 0) {
        toast.error('Failed to load comments')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComments()
    // Poll for new comments every 10 seconds
    const interval = setInterval(loadComments, 10000)
    return () => clearInterval(interval)
  }, [eventUuid, sessionUuid])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage || sending) return

    try {
      setSending(true)
      await postSessionComment(eventUuid, sessionUuid, trimmedMessage)
      setMessage('')
      await loadComments()
      toast.success('Comment posted successfully')
    } catch (error) {
      console.error('Failed to send comment:', error)
      toast.error('Failed to send comment')
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
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden" style={{ height: `${height}px` }}>
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">
          {sessionTitle ? `${sessionTitle} - Live Chat` : 'Live Chat'}
        </h3>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && comments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-slate-500">Loading comments...</div>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-slate-500">No comments yet</p>
              <p className="text-xs text-slate-400 mt-1">Be the first to comment!</p>
            </div>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <div key={comment.uuid} className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center text-white text-xs font-semibold">
                    {(comment.author_name || 'A').charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {comment.author_name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(comment.created_date)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5 break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white p-3">
        {localStorage.getItem('pub_accessToken') ? (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send01 className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        ) : (
          <p className="text-center text-sm text-slate-500">
            <a href="/login" className="font-semibold text-primary hover:underline">Log in</a> to join the chat
          </p>
        )}
      </div>
    </div>
  )
}

export default PublicSessionComments
