import React, { useState, useRef, useEffect } from 'react'

export interface CometChatUser {
  uid: string
  authToken: string
  name: string
}

export interface SessionChatProps {
  /** Session id – used as group identifier for this session's chat */
  sessionId: string
  /** Optional event id – can be used to scope the group */
  eventId?: string
  /** Current user (attendee or speaker) – name shown on messages you send */
  cometChatUser?: CometChatUser | null
  /** Optional session title – shown in chat description */
  sessionTitle?: string
  /** Height for the chat container (default 360px) */
  height?: string | number
}

export interface ChatMessage {
  id: string
  name: string
  isSpeaker: boolean
  timeAgo: string
  sentAt: number
  body: string
  linkPreview?: { title: string; url: string; description: string }
}

function formatTimeAgo(sentAt: number): string {
  const sec = Math.floor((Date.now() - sentAt) / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day === 1 ? '' : 's'} ago`
}

function extractLinkPreview(body: string): ChatMessage['linkPreview'] | undefined {
  const match = body.match(/https?:\/\/[^\s]+/i)
  if (!match) return undefined
  const url = match[0].replace(/[.,;:!?)]+$/, '')
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return {
      title: host,
      url,
      description: 'Open link'
    }
  } catch {
    return undefined
  }
}

const Avatar: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600 ${className}`}
      title={name}
    >
      {initials}
    </div>
  )
}

/**
 * Session live chat – real UI with local state.
 * User can send messages; they appear in the list. For cross-user real-time chat,
 * integrate CometChat or a backend (WebSocket/REST) and replace message state with API.
 */
const SessionChat: React.FC<SessionChatProps> = ({
  sessionId: _sessionId,
  eventId: _eventId,
  cometChatUser,
  sessionTitle,
  height = 360
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [])
  const [inputValue, setInputValue] = useState('')
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const heightStyle = typeof height === 'number' ? `${height}px` : height
  const currentUserName = cometChatUser?.name?.trim() || 'You'
  const description = sessionTitle?.trim() || 'Session'
  const chatDescription = `Chat live with other attendees and speakers. Please keep the discussion focused on ${description}.`

  const participantCount = (() => {
    const names = new Set(messages.map((m) => m.name))
    if (cometChatUser?.name) names.add(cometChatUser.name)
    return Math.max(1, names.size)
  })()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = inputValue.trim()
    if (!text) return
    const sentAt = Date.now()
    const linkPreview = extractLinkPreview(text)
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${sentAt}`,
        name: currentUserName,
        isSpeaker: false,
        timeAgo: 'Just now',
        sentAt,
        body: text,
        linkPreview
      }
    ])
    setInputValue('')
    setTypingUser(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm"
      style={{ height: heightStyle, minHeight: heightStyle }}
    >
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Session Chat</h3>
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>{participantCount}</span>
          </div>
        </div>
        <p className="mt-1.5 text-sm text-slate-600">{chatDescription}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">No messages yet. Send the first message below.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            <Avatar name={msg.name} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{msg.name}</span>
                {msg.isSpeaker && (
                  <span className="inline-flex rounded px-1.5 py-0.5 text-xs font-medium bg-primary text-white">
                    Speaker
                  </span>
                )}
                <span className="text-xs text-slate-400">{formatTimeAgo(msg.sentAt)}</span>
              </div>
              <div className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">
                {msg.body}
              </div>
              {msg.linkPreview && (
                <a
                  href={msg.linkPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-left hover:bg-slate-100 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-sky-100 text-sky-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{msg.linkPreview.title}</p>
                    <p className="text-xs text-slate-500 truncate">{msg.linkPreview.url}</p>
                    {msg.linkPreview.description && (
                      <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{msg.linkPreview.description}</p>
                    )}
                  </div>
                </a>
              )}
            </div>
          </div>
        ))}
        {typingUser && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
            <span>{typingUser} is typing</span>
            <span className="flex gap-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-600"
            aria-label="Emoji"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setTypingUser(currentUserName)
            }}
            onBlur={() => setTypingUser(null)}
            onKeyDown={handleKeyDown}
            placeholder="Write your message..."
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
          <button
            type="button"
            onClick={handleSend}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-600 disabled:opacity-50"
            aria-label="Send"
            disabled={!inputValue.trim()}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionChat
