import React, { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  text: string
  timestamp: Date
  sender: 'user' | 'agent'
}

interface LiveChatProps {
  title?: string
  height?: string
  backgroundColor?: string
  headerColor?: string
  headerTextColor?: string
  messageUserBg?: string
  messageAgentBg?: string
  inputBorderColor?: string
  buttonColor?: string
  buttonTextColor?: string
  placeholderText?: string
}

const LiveChat: React.FC<LiveChatProps> = ({
  title = 'Live Chat',
  height = '500px',
  backgroundColor = '#ffffff',
  headerColor = '#8b5cf6',
  headerTextColor = '#ffffff',
  messageUserBg = '#3b82f6',
  messageAgentBg = '#e5e7eb',
  inputBorderColor = '#d1d5db',
  buttonColor = '#3b82f6',
  buttonTextColor = '#ffffff',
  placeholderText = 'Type your message...'
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const STORAGE_KEY = 'livechat_messages'

  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const storedMessages = localStorage.getItem(STORAGE_KEY)
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages)
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(messagesWithDates)
      }
    } catch (error) {
      console.error('Error loading messages from localStorage:', error)
    }
  }, [])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch (error) {
      console.error('Error saving messages to localStorage:', error)
    }
  }, [messages])

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (inputValue.trim() === '') return

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      timestamp: new Date(),
      sender: 'user'
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue('')
  }

  const handleClearChat = () => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const handleAgentReply = () => {
    const agentResponses = [
      "Hello! How can I help you today?",
      "I'm here to assist you with any questions.",
      "Thank you for your message. Let me help you with that.",
      "That's a great question! Let me provide some information.",
      "I understand. Is there anything specific you'd like to know?",
      "Thanks for reaching out! I'm happy to help."
    ]
    
    const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)]
    
    const agentMessage: Message = {
      id: Date.now().toString(),
      text: randomResponse,
      timestamp: new Date(),
      sender: 'agent'
    }

    setMessages(prev => [...prev, agentMessage])
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Dynamic styles that need to remain inline
  const containerStyle: React.CSSProperties = {
    height: height,
    backgroundColor: backgroundColor
  }

  const headerStyle: React.CSSProperties = {
    backgroundColor: headerColor,
    color: headerTextColor
  }

  const headerButtonStyle: React.CSSProperties = {
    color: headerTextColor,
    border: `1px solid ${headerTextColor}`
  }

  const messageBubbleStyle = (sender: 'user' | 'agent'): React.CSSProperties => ({
    backgroundColor: sender === 'user' ? messageUserBg : messageAgentBg,
    color: sender === 'user' ? '#ffffff' : '#1f2937'
  })

  const inputAreaStyle: React.CSSProperties = {
    backgroundColor: backgroundColor,
    borderTop: `1px solid ${inputBorderColor}`
  }

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${inputBorderColor}`
  }

  const sendIconButtonStyle: React.CSSProperties = {
    backgroundColor: buttonColor,
    color: buttonTextColor
  }

  return (
    <div style={containerStyle} className="flex flex-col rounded-xl shadow-md overflow-hidden font-sans my-4">
      {/* Header */}
      <div style={headerStyle} className="px-5 py-4 flex justify-between items-center border-b border-black/10">
        <h3 className="text-lg font-semibold m-0">{title}</h3>
        <div className="flex gap-2">
          <button
            style={headerButtonStyle}
            onClick={handleAgentReply}
            className="bg-transparent rounded-md py-1.5 px-3 text-xs cursor-pointer transition-all duration-200 font-medium hover:bg-white/20"
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Agent Reply
          </button>
          <button
            style={headerButtonStyle}
            onClick={handleClearChat}
            className="bg-transparent rounded-md py-1.5 px-3 text-xs cursor-pointer transition-all duration-200 font-medium hover:bg-white/20"
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-10 px-5">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex flex-col max-w-[70%] ${message.sender === 'user' ? 'items-end self-end' : 'items-start self-start'}`}>
              <div 
                style={messageBubbleStyle(message.sender)}
                className={`px-3.5 py-2.5 ${message.sender === 'user' ? 'rounded-t-xl rounded-br-none rounded-bl-xl' : 'rounded-t-xl rounded-bl-none rounded-br-xl'} break-words text-sm leading-relaxed`}
              >
                {message.text}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 px-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} style={inputAreaStyle} className="p-4 relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholderText}
            style={inputStyle}
            className="flex-1 py-3 pr-12 pl-3.5 rounded-full text-sm outline-none transition-colors duration-200 bg-gray-50"
            onFocus={(e) => {
              e.currentTarget.style.borderColor = buttonColor
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = inputBorderColor
            }}
          />
          <button
            type="submit"
            disabled={inputValue.trim() === ''}
            style={sendIconButtonStyle}
            className={`absolute right-2 border-none rounded-full w-9 h-9 flex items-center justify-center cursor-pointer transition-all duration-200 p-0 ${inputValue.trim() === '' ? 'opacity-40 cursor-not-allowed' : 'opacity-100'}`}
            onMouseEnter={(e) => {
              if (inputValue.trim() !== '') {
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}

export default LiveChat

