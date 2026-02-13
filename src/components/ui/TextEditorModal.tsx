import React, { useState, useEffect } from 'react'
import Modal from './Modal'

interface TextEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (text: string) => void
  initialValue?: string
  title?: string
  subtitle?: string
  placeholder?: string
}

const TextEditorModal: React.FC<TextEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialValue = '',
  title = 'Edit Text',
  subtitle = 'Supports HTML paste for bold/italic formatting',
  placeholder = 'Type or paste text here...'
}) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue, isOpen])

  const handleSave = () => {
    onSave(value)
    onClose()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData?.getData('text/html')
    if (!html) return

    e.preventDefault()
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const bodyHtml = (doc.body?.innerHTML || '').trim()
      const target = e.currentTarget
      const start = target.selectionStart ?? value.length
      const end = target.selectionEnd ?? start
      const next = value.slice(0, start) + bodyHtml + value.slice(end)
      setValue(next)
    } catch {
      // Fallback to plain paste
    }
  }

  const footer = (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      <button
        type="button"
        onClick={onClose}
        style={{
          padding: '8px 16px',
          borderRadius: 6,
          border: '1px solid #d1d5db',
          backgroundColor: '#ffffff',
          color: '#111827',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSave}
        style={{
          padding: '8px 16px',
          borderRadius: 6,
          border: 'none',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
      >
        Save
      </button>
    </div>
  )

  return (
    <Modal
      isVisible={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={footer}
      width="80%"
      maxWidth={900}
      height={600}
      maxHeight="90vh"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: '100%',
          padding: 12,
          borderRadius: 6,
          border: '1px solid #d1d5db',
          fontSize: 14,
          fontFamily: 'monospace',
          resize: 'none',
          boxSizing: 'border-box'
        }}
      />
    </Modal>
  )
}

export default TextEditorModal
