import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Bold01,
  Italic01,
  Underline01,
  AlignLeft,
  AlignCenter,
  Attachment01,
  Image01,
  List,
  Send01,
  Calendar,
  Plus,
  XClose,
  AlertCircle
} from '@untitled-ui/icons-react'
import Button from '../../ui/untitled/Button'
import type { Macro } from './communicationTypes'
import BroadcastPreviewModal from './BroadcastPreviewModal'
import { ScheduleBroadcastModal } from './ScheduleBroadcastModal'
import { useEventForm } from '../../../contexts/EventFormContext'
import { fetchTags } from '../../../services/attendeeService'
import { sendCommunication } from '../../../services/communicationService'
import { showToast } from '../../../utils/toast'

interface BroadcastComposerProps {
  onCancel: () => void
  onSave: (data: { subject: string; message: string; templateType?: string }) => void
  onSend?: (data: { subject: string; message: string }) => void
  macros?: Macro[]
  initialSubject?: string
  initialMessage?: string
  templateType?: string
  type?: 'email' | 'push-notification'
}

// Filter value options by field type (image1 = Message status, image2 = Users)
const MESSAGE_STATUS_OPTIONS = [
  { value: 'Opened', label: 'Opened' },
  { value: 'Clicked', label: 'Clicked' },
  { value: 'Bounced', label: 'Bounced' },
  { value: 'Not opened', label: 'Not opened' }
]
const USER_STATUS_OPTIONS = [
  { value: 'Logged In', label: 'Logged In' },
  { value: 'Not logged in', label: 'Not logged in' }
]

const BroadcastComposer: React.FC<BroadcastComposerProps> = ({
  onCancel,
  onSave,
  onSend,
  macros = [],
  initialSubject = '',
  initialMessage = '',
  type = 'email'
}) => {
  const [activeTab, setActiveTab] = useState<'late-message' | 'settings'>('late-message')
  const [subject, setSubject] = useState(initialSubject || '')
  const [message, setMessage] = useState(initialMessage)
  const [isEditing, setIsEditing] = useState(true)
  const [selectedMacro, setSelectedMacro] = useState<string>('')
  const [showMacroDropdown, setShowMacroDropdown] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [showContextualToolbar, setShowContextualToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 })
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  // Settings Tab State
  const [matchLogic, setMatchLogic] = useState<'ANY' | 'ALL'>('ANY')
  const [filters, setFilters] = useState([
    { id: '1', field: 'Group', operator: 'is', value: 'Speakers' }
  ])
  const [tags, setTags] = useState<Array<{ uuid: string; name: string }>>([])
  
  // Get event context for fetching tags
  const { createdEvent } = useEventForm()

  const colorPickerButtonRef = useRef<HTMLButtonElement>(null)
  const colorPickerPopupRef = useRef<HTMLDivElement>(null)
  const contextualToolbarRef = useRef<HTMLDivElement>(null)
  const savedSelectionRef = useRef<Range | null>(null)
  const macroDropdownRef = useRef<HTMLDivElement>(null)

  const editorRef = useRef<HTMLDivElement>(null)

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && initialMessage && editorRef.current.innerHTML !== initialMessage) {
      editorRef.current.innerHTML = initialMessage
    }
  }, []) // Only run once on mount

  // Load tags from API
  useEffect(() => {
    const loadTags = async () => {
      const eventUuid = createdEvent?.uuid
      
      if (!eventUuid) {
        setTags([])
        return
      }

      try {
        const tagsData = await fetchTags(eventUuid)
        // Map tags to include only active ones
        const activeTags = tagsData
          .filter((tag) => tag.is_active !== false)
          .map((tag) => ({
            uuid: tag.uuid,
            name: tag.name
          }))
        setTags(activeTags)
      } catch (error) {
        // Error is already handled in fetchTags with toast
        // Set empty array on error to prevent UI issues
        setTags([])
      }
    }

    loadTags()
  }, [createdEvent?.uuid])

  // Extract selected recipients (tag names) from filters
  const selectedRecipients = useMemo(() => {
    const recipientNames: string[] = []
    filters.forEach((filter) => {
      if (filter.field === 'Group' && filter.operator === 'is' && filter.value) {
        // Avoid duplicates
        if (!recipientNames.includes(filter.value)) {
          recipientNames.push(filter.value)
        }
      }
    })
    return recipientNames
  }, [filters])

  const colors = [
    ['#000000', '#1E3A8A', '#166534', '#374151', '#6B7280', '#9CA3AF', '#FFFFFF'],
    ['#10B981', '#3B82F6', '#7F56D9', '#EC4899', '#EF4444', '#F59E0B']
  ]

  const handleInsertMacro = (macroValue?: string) => {
    const macroToInsert = macroValue || selectedMacro
    if (macroToInsert && editorRef.current) {
      const macroText = `{{${macroToInsert}}}`
      
      editorRef.current.focus()
      
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        
        // Ensure selection is inside the editor
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          range.deleteContents()
          const textNode = document.createTextNode(macroText)
          range.insertNode(textNode)
          
          // Move cursor after inserted text
          range.setStartAfter(textNode)
          range.setEndAfter(textNode)
          selection.removeAllRanges()
          selection.addRange(range)
        } else {
          // If selection is outside, append to end
          editorRef.current.innerHTML += macroText
        }
      } else {
        // No selection, append to end
        editorRef.current.innerHTML += macroText
      }

      setMessage(editorRef.current.innerHTML)
      setSelectedMacro('')
      setShowMacroDropdown(false)
    }
  }

  const handleFormat = (command: string, value?: string) => {
    if (!editorRef.current) return

    // Focus the editor first if it's not active
    if (document.activeElement !== editorRef.current) {
        editorRef.current.focus()
    }

    // Get current selection
    const selection = window.getSelection()
    
    // For foreColor command, if no selection, we need to handle it differently
    if (command === 'foreColor' && (!selection || selection.rangeCount === 0 || selection.toString().length === 0)) {
      // If no text is selected, create a span at cursor position or wrap next typed text
      // For now, we'll apply it to the current position and it will affect next typed text
      const range = document.createRange()
      const sel = window.getSelection()
      
      if (sel && editorRef.current) {
        // Try to find cursor position
        if (sel.anchorNode) {
          const node = sel.anchorNode.nodeType === Node.TEXT_NODE 
            ? sel.anchorNode 
            : editorRef.current
        
          if (node) {
            const offset = sel.anchorOffset || 0
            try {
              range.setStart(node, Math.min(offset, node.textContent?.length || 0))
              range.setEnd(node, Math.min(offset, node.textContent?.length || 0))
              sel.removeAllRanges()
              sel.addRange(range)
            } catch (e) {
              // Fallback: select end of editor
              range.selectNodeContents(editorRef.current)
              range.collapse(false)
              sel.removeAllRanges()
              sel.addRange(range)
            }
          }
        } else {
          // No anchor node, select end of editor
          range.selectNodeContents(editorRef.current)
          range.collapse(false)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
    }
    
    // For alignment commands, if no selection, select the current paragraph/line
    if ((command === 'justifyLeft' || command === 'justifyCenter' || command === 'justifyRight' || command === 'justifyFull') && 
        (!selection || selection.rangeCount === 0 || selection.toString().length === 0)) {
      // Select the current line/paragraph
      const range = document.createRange()
      const sel = window.getSelection()
      if (sel && editorRef.current) {
        // Try to find the current block element
        let node: HTMLElement | null = editorRef.current
        if (sel.anchorNode) {
          node = sel.anchorNode.nodeType === Node.TEXT_NODE 
            ? (sel.anchorNode.parentElement as HTMLElement) || editorRef.current
            : (sel.anchorNode as HTMLElement)
        }
        
        // Find the block element (p, div, etc.) or use the editor itself
        while (node && node !== editorRef.current && !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(node.tagName)) {
          node = (node.parentElement as HTMLElement) || editorRef.current
        }
        
        if (node) {
          range.selectNodeContents(node)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
    }

    // Execute the command
    try {
      const success = document.execCommand(command, false, value)
      if (success) {
        // Update message content
        if (editorRef.current) {
          setMessage(editorRef.current.innerHTML)
        }
        // Update format state
        setTimeout(() => {
          updateFormatState()
        }, 10)
      } else {
        console.warn(`Command ${command} failed to execute`)
      }
    } catch (error) {
      console.error('Format command failed:', error)
    }
  }

  const updateFormatState = () => {
    if (editorRef.current) {
      // Check if subject input is focused - if so, don't interfere
      const activeElement = document.activeElement
      if (activeElement && activeElement.id === 'subject') {
        // Subject input is focused, don't update format state or steal focus
        return
      }
      
      // Ensure editor is focused before checking command state
      const wasFocused = document.activeElement === editorRef.current
      if (!wasFocused) {
        // Only focus editor if we're not trying to focus something else
        // Check if user is trying to focus the subject input
        const subjectInput = document.getElementById('subject')
        if (subjectInput && (subjectInput === activeElement || subjectInput.contains(activeElement as Node))) {
          // User is trying to focus subject input, don't interfere
          return
        }
        editorRef.current.focus()
      }
      
      try {
        setIsBold(document.queryCommandState('bold'))
        setIsItalic(document.queryCommandState('italic'))
        setIsUnderline(document.queryCommandState('underline'))
      } catch (error) {
        console.error('Error updating format state:', error)
      }
      
      // If editor wasn't focused, don't change focus (selection might be lost)
      // But we need to restore selection if there was one
      if (!wasFocused) {
        // Try to restore selection
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          // Selection should be preserved, but if not, we'll let the user continue
        }
      }
    }
  }

  const handleTextSelection = () => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      // Don't update if subject input is focused
      const activeElement = document.activeElement
      if (activeElement && activeElement.id === 'subject') {
        return
      }
      
      const selection = window.getSelection()
      const editor = editorRef.current
      if (!editor) return
      
      // Always update format state when selection changes (even if empty)
      // This ensures buttons reflect the format at cursor position
      // But only if editor is focused
      if (document.activeElement === editor) {
        updateFormatState()
      }
      
      if (selection && selection.toString().length > 0) {
        const anchorNode = selection.anchorNode
        const focusNode = selection.focusNode
        
        // Check if selection is within the editor
        if (editor && (
          editor.contains(anchorNode) || 
          editor.contains(focusNode) ||
          anchorNode === editor ||
          focusNode === editor
        )) {
          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          const editorRect = editor.getBoundingClientRect()
          
          setToolbarPosition({
            top: rect.top - editorRect.top - 40,
            left: rect.left - editorRect.left + rect.width / 2
          })
          setShowContextualToolbar(true)
        } else {
          // Only hide if we're not interacting with the toolbar
          // This check is handled by the click outside listener mostly, 
          // but we need to be careful not to hide it aggressively here if selection is still valid but maybe lost focus momentarily
          // For now, we'll rely on the selection check. If selection is gone, toolbar should go.
          // But clicking the toolbar might cause temporary selection loss? No, mousedown preventDefault handles that.
        }
      } else {
        setShowContextualToolbar(false)
      }
    }, 10)
  }

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    editor.addEventListener('mouseup', handleTextSelection)
    editor.addEventListener('keyup', handleTextSelection)
    editor.addEventListener('selectionchange', handleTextSelection)

    return () => {
      editor.removeEventListener('mouseup', handleTextSelection)
      editor.removeEventListener('keyup', handleTextSelection)
      editor.removeEventListener('selectionchange', handleTextSelection)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // Don't interfere with subject input
      const subjectInput = document.getElementById('subject')
      if (subjectInput && (subjectInput === target || subjectInput.contains(target))) {
        return
      }
      
      if (showColorPicker) {
        if (
          colorPickerButtonRef.current && 
          !colorPickerButtonRef.current.contains(target) &&
          colorPickerPopupRef.current &&
          !colorPickerPopupRef.current.contains(target)
        ) {
          setShowColorPicker(false)
          savedSelectionRef.current = null
        }
      }
      
      // Fix: Don't close if clicking inside the contextual toolbar
      if (showContextualToolbar && 
          !editorRef.current?.contains(target) && 
          !contextualToolbarRef.current?.contains(target)) {
        setShowContextualToolbar(false)
      }

      // Close macro dropdown if clicking outside
      if (showMacroDropdown && 
          macroDropdownRef.current &&
          !macroDropdownRef.current.contains(target)) {
        setShowMacroDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorPicker, showContextualToolbar, showMacroDropdown])

  const handleColorSelect = (color: string, e?: React.MouseEvent) => {
    console.log('🎨 handleColorSelect called with color:', color)
    
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    setSelectedColor(color)
    setShowColorPicker(false)
    
    if (!editorRef.current) {
      console.warn('⚠️ No editor ref')
      savedSelectionRef.current = null
      return
    }

    console.log('✅ Editor ref exists, savedSelection:', savedSelectionRef.current ? 'exists' : 'null')

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      console.log('🔄 requestAnimationFrame callback executing')
      const editor = editorRef.current
      if (!editor) {
        savedSelectionRef.current = null
        return
      }

      // Restore focus to editor
      editor.focus()
      
      const selection = window.getSelection()
      let range: Range | null = null
      
      // Try to restore saved selection first
      if (savedSelectionRef.current) {
        try {
          // Check if the saved range is still valid
          const testRange = savedSelectionRef.current.cloneRange()
          if (editor.contains(testRange.commonAncestorContainer)) {
            range = testRange
          } else {
            savedSelectionRef.current = null
          }
        } catch (error) {
          savedSelectionRef.current = null
        }
      }
      
      // If no saved selection, try to get current selection
      if (!range && selection && selection.rangeCount > 0) {
        const currentRange = selection.getRangeAt(0)
        if (currentRange && editor.contains(currentRange.commonAncestorContainer)) {
          range = currentRange
        }
      }
      
      // If still no range, create one at cursor position
      if (!range) {
        range = document.createRange()
        const sel = window.getSelection()
        
        if (sel && sel.anchorNode && editor.contains(sel.anchorNode)) {
          try {
            if (sel.anchorNode.nodeType === Node.TEXT_NODE) {
              const offset = Math.min(sel.anchorOffset || 0, sel.anchorNode.textContent?.length || 0)
              range.setStart(sel.anchorNode, offset)
              range.setEnd(sel.anchorNode, offset)
            } else {
              // Find nearest text node
              const walker = document.createTreeWalker(
                editor,
                NodeFilter.SHOW_TEXT,
                null
              )
              let textNode = walker.nextNode()
              if (textNode) {
                range.setStart(textNode, 0)
                range.setEnd(textNode, 0)
              } else {
                range.selectNodeContents(editor)
                range.collapse(false)
              }
            }
          } catch (error) {
            range.selectNodeContents(editor)
            range.collapse(false)
          }
        } else {
          range.selectNodeContents(editor)
          range.collapse(false)
        }
      }
      
      // Verify range is valid
      if (!range || !editor.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = null
        return
      }

      // Set the selection
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }

      // Apply color using manual DOM manipulation (more reliable than execCommand)
      console.log('🎨 Attempting to apply color:', color, 'to range:', range.toString() || '(empty)')
      
      try {
        const selectedText = range.toString()
        console.log('Selected text:', selectedText || '(empty)')
        
        if (selectedText.trim().length > 0) {
          console.log('📝 Wrapping selected text in span')
          // There's selected text - wrap it in a span
          const span = document.createElement('span')
          span.style.color = color
          span.style.setProperty('color', color, 'important') // Use !important to override any CSS
          
          // Extract and wrap the contents
          const contents = range.extractContents()
          
          // Handle DocumentFragment
          if (contents.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            while (contents.firstChild) {
              span.appendChild(contents.firstChild)
            }
          } else if (contents) {
            span.appendChild(contents)
          }
          
          range.insertNode(span)
          
          // Verify the span was inserted correctly
          console.log('🔍 Span created:', span.outerHTML)
          console.log('🔍 Span style:', span.style.color)
          
          // Add data attributes to identify and preserve this span's color
          span.setAttribute('data-color-applied', color)
          span.setAttribute('data-preserve-color', 'true') // Prevent forcePurpleText from changing it
          
          // Protect the span's color from being changed
          const expectedRgb = `rgb(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)})`
          
          const protectColor = () => {
            const currentColor = span.style.color || window.getComputedStyle(span).color
            // Check if color was changed to black or something else
            if (currentColor === 'rgb(0, 0, 0)' || (currentColor !== expectedRgb && currentColor !== color && currentColor !== `rgb(${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5, 7), 16)})`)) {
              console.log('🛡️ Protecting span color from:', currentColor, 'to:', color)
              // Force the color with !important
              span.style.setProperty('color', color, 'important')
              // Also set it directly as a fallback
              span.style.color = color
            }
          }
          
          // Set up a MutationObserver to protect the color continuously
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                protectColor()
              }
            })
            // Also check on any child changes
            protectColor()
          })
          
          observer.observe(span, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            childList: true,
            subtree: true
          })
          
          // Also observe the editor for changes that might affect our span
          const editorObserver = new MutationObserver(() => {
            if (editor.contains(span)) {
              protectColor()
            }
          })
          
          editorObserver.observe(editor, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
          })
          
          // Protect immediately and at intervals
          protectColor()
          const protectionInterval = setInterval(() => {
            if (editor.contains(span)) {
              protectColor()
            } else {
              clearInterval(protectionInterval)
              observer.disconnect()
              editorObserver.disconnect()
            }
          }, 100)
          
          // Also protect on input events
          const inputHandler = () => {
            if (editor.contains(span)) {
              protectColor()
            }
          }
          editor.addEventListener('input', inputHandler)
          
          // Select the newly inserted span
          const newRange = document.createRange()
          newRange.selectNodeContents(span)
          if (selection) {
            selection.removeAllRanges()
            selection.addRange(newRange)
          }
          
          // Verify the span is in the DOM
          const spanInDOM = editor.contains(span)
          console.log('🔍 Span in DOM:', spanInDOM)
          console.log('🔍 Span computed color:', window.getComputedStyle(span).color)
          
          // Update message content after a brief delay to allow any normalization to happen first
          setTimeout(() => {
            // Protect color one more time before updating
            protectColor()
            
            // Check the HTML
            const updatedHTML = editor.innerHTML
            console.log('🔍 Updated HTML after delay:', updatedHTML.substring(0, 200))
            
            // Verify span color is still correct
            const finalColor = window.getComputedStyle(span).color
            console.log('🔍 Final span color:', finalColor)
            
            // Update message content
            setMessage(editor.innerHTML)
            console.log('✅ Color applied to selected text')
            
            // Don't clean up observers - keep them running to protect the color
            // They'll be cleaned up when the component unmounts or span is removed
          }, 100)
        } else {
          console.log('📍 No text selected, applying to cursor position')
          // No text selected - check if we're in a text node
          const container = range.commonAncestorContainer
          
          if (container.nodeType === Node.TEXT_NODE && container.textContent) {
            // We're in a text node - split it and insert colored span
            const textNode = container as Text
            const offset = range.startOffset
            const text = textNode.textContent || ''
            
            // Split the text node at the cursor
            const beforeText = text.substring(0, offset)
            const afterText = text.substring(offset)
            
            // Create new text nodes
            const beforeNode = document.createTextNode(beforeText)
            const afterNode = document.createTextNode(afterText)
            
            // Create span for future text
            const span = document.createElement('span')
            span.style.color = color
            span.textContent = '\u200B' // Zero-width space
            
            // Replace the text node with: beforeNode, span, afterNode
            const parent = textNode.parentNode
            if (parent) {
              if (beforeText) {
                parent.insertBefore(beforeNode, textNode)
              }
              parent.insertBefore(span, textNode)
              if (afterText) {
                parent.insertBefore(afterNode, textNode)
              }
              parent.removeChild(textNode)
              
              // Move cursor after the span
              const newRange = document.createRange()
              newRange.setStartAfter(span)
              newRange.collapse(true)
              if (selection) {
                selection.removeAllRanges()
                selection.addRange(newRange)
              }
            }
          } else {
            // Not in a text node - insert span at cursor
            const span = document.createElement('span')
            span.style.color = color
            span.textContent = '\u200B' // Zero-width space
            
            range.insertNode(span)
            
            // Move cursor after the span
            const newRange = document.createRange()
            newRange.setStartAfter(span)
            newRange.collapse(true)
            if (selection) {
              selection.removeAllRanges()
              selection.addRange(newRange)
            }
          }
          
          // Update message content
          setMessage(editor.innerHTML)
          console.log('✅ Color applied to cursor position')
        }
      } catch (error) {
        console.error('❌ Error applying color:', error)
        // Last resort: try execCommand
        try {
          document.execCommand('foreColor', false, color)
          setMessage(editor.innerHTML)
          console.log('✅ Color applied with execCommand fallback')
        } catch (e) {
          console.error('❌ execCommand also failed:', e)
        }
      }
      
      savedSelectionRef.current = null
      console.log('🏁 handleColorSelect completed')
    })
  }

  const handleSave = () => {
    onSave({
      subject,
      message,
      templateType: activeTab === 'late-message' ? 'late-message' : undefined
    })
    setIsEditing(false)
  }

  const handleToolbarAction = (e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault() // Prevent focus loss
    handleFormat(command, value)
  }

  return (
    <div className="space-y-6 px-4 pb-12 pt-28 md:px-10 lg:px-16 -mt-24 min-h-screen flex flex-col">
      <style>{`
        .broadcast-editor-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
        .broadcast-editor-content ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
        .broadcast-editor-content b, .broadcast-editor-content strong { font-weight: bold; }
        .broadcast-editor-content i, .broadcast-editor-content em { font-style: italic; }
        .broadcast-editor-content u { text-decoration: underline; }
        .broadcast-editor-content p { margin-bottom: 0.5em; }
        .composer-container { max-height: calc(100vh - 200px); }
        @media (max-height: 1080px) {
          .composer-container { max-height: calc(100vh - 300px); }
        }
        .composer-editor { min-height: 400px; max-height: none; }
        @media (max-height: 1080px) {
          .composer-editor { min-height: 200px; max-height: 250px; }
        }
      `}</style>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ">
        <h1 className="text-[26px] font-semibold  text-primary-dark mb-4 ">Communication</h1>
        {activeTab === 'settings' && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setShowPreviewModal(true)}
              iconTrailing={<Send01 className="h-4 w-4" />}
            >
              Send
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setShowScheduleModal(true)}
              iconTrailing={<Calendar className="h-4 w-4" />}
            >
              Schedule
            </Button>
          </div>
        )}
      </div>
      {/* Tabs and Content Container */}
      <div className="rounded-xl bg-white overflow-hidden flex flex-col composer-container">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-200 flex-shrink-0">
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={() => setActiveTab('late-message')}
            className={`pb-3 px-1 h-auto rounded-none border-b-2 transition-colors relative whitespace-nowrap ${
              activeTab === 'late-message'
                ? 'text-primary border-b-primary'
                : 'text-slate-600 hover:text-slate-900 border-b-transparent'
            }`}
          >
             Message
          </Button>
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 h-auto rounded-none border-b-2 transition-colors relative whitespace-nowrap ${
              activeTab === 'settings'
                ? 'text-primary border-b-primary'
                : 'text-slate-600 hover:text-slate-900 border-b-transparent'
            }`}
          >
            Settings
          </Button>
        </div>

        {/* Content Area */}
        <div className="p-6 border border-slate-200 flex-1 flex flex-col overflow-y-auto min-h-0">
        {activeTab === 'late-message' ? (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            {isEditing ? (
              <>
                {/* Subject Line */}
                <div 
                  className={`group relative flex flex-col w-full rounded-md border ${
                    type === 'email' && subject.length > 60 ? 'border-orange-300' : 'border-slate-300'
                  } bg-slate-50 transition-all`}
                  onClick={(e) => {
                    // Only focus if clicking on the container or label, not on the input itself
                    const target = e.target as HTMLElement
                    if (target.tagName === 'LABEL' || (target === e.currentTarget && target.tagName !== 'INPUT')) {
                      const subjectInput = document.getElementById('subject') as HTMLInputElement
                      if (subjectInput && document.activeElement !== subjectInput) {
                        setTimeout(() => {
                          subjectInput.focus()
                        }, 0)
                      }
                    }
                  }}
                >
                  <div className="flex items-center px-3 pt-2.5">
                    <label htmlFor="subject" className="text-sm font-semibold text-slate-700 mr-2 cursor-text shrink-0">
                      {type === 'push-notification' ? 'Title:' : 'Subject:'}
                    </label>
                    <input
                      id="subject"
                      type="text"
                      placeholder="Title of your message"
                      value={subject}
                      onChange={(e) => {
                        const limit = type === 'push-notification' ? 50 : 120
                        if (e.target.value.length <= limit) {
                          setSubject(e.target.value)
                        }
                      }}
                      onMouseDown={(e) => {
                        // Stop propagation and ensure focus
                        e.stopPropagation()
                        // Capture the element reference before setTimeout
                        const target = e.currentTarget
                        // Use setTimeout to ensure focus happens after any other handlers
                        setTimeout(() => {
                          if (target) {
                            target.focus()
                          }
                        }, 0)
                      }}
                      onClick={(e) => {
                        // Stop propagation and ensure focus
                        e.stopPropagation()
                        const target = e.currentTarget
                        if (target) {
                          target.focus()
                        }
                      }}
                      onFocus={(e) => {
                        // Ensure input maintains focus
                        const target = e.target as HTMLInputElement
                        if (target && document.activeElement !== target) {
                          target.focus()
                        }
                      }}
                      tabIndex={0}
                      className="flex-1 bg-transparent border-none p-0 text-sm text-slate-900 focus:ring-0 focus:outline-none placeholder-slate-400"
                      autoComplete="off"
                    />
                  </div>
                  
                  {/* Warning and Counter */}
                  <div className="px-3 pb-1.5 flex items-center gap-2 min-h-[20px]">
                    {type === 'email' && subject.length > 60 && (
                      <div className="group/warning relative flex items-center">
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                        <div className="absolute bottom-full left-0 mb-2 hidden w-max rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-lg group-hover/warning:block z-10">
                          May be truncated on mobile
                          <div className="absolute -bottom-1 left-1 h-2 w-2 rotate-45 bg-slate-900"></div>
                        </div>
                      </div>
                    )}
                    <span className={`text-[10px] ${
                      (type === 'email' && subject.length > 60) || (type === 'push-notification' && subject.length >= 50)
                        ? 'text-orange-500 font-medium' 
                        : 'text-slate-400'
                    }`}>
                      {type === 'push-notification' 
                        ? `${50 - subject.length} characters left`
                        : `${120 - subject.length} characters left`
                      }
                    </span>
                  </div>
                </div>

                {/* Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5  border-slate-200 pb-3">
                  {/* Insert Macro Dropdown */}
                  <div className="relative" ref={macroDropdownRef}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowMacroDropdown(!showMacroDropdown)}
                      iconTrailing={
                        <svg className={`h-4 w-4 transition-transform ${showMacroDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      }
                    >
                      {'{ }'} Insert
                    </Button>
                    
                    {/* Dropdown Menu */}
                    {showMacroDropdown && macros.length > 0 && (
                      <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-50 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                        {macros.map((macro) => {
                          const macroValue = macro.macro.replace(/[{}]/g, '')
                          return (
                            <button
                              key={macro.id}
                              type="button"
                              onClick={() => handleInsertMacro(macroValue)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition-colors"
                            >
                              {/* <div className="font-medium">{macro.column}</div> */}
                              <div className="text-xs text-slate-500">{macro.macro}</div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Font Selection */}
                  <select
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    defaultValue="Inter"
                  >
                    <option value="Inter">T Inter</option>
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times">Times New Roman</option>
                  </select>

                  <div className="h-5 w-px bg-slate-300" />

                  {/* Text Formatting */}
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onMouseDown={(e) => handleToolbarAction(e, 'bold')}
                    className={`h-8 w-8 p-0 ${isBold ? 'bg-slate-200 text-slate-900' : ''}`}
                    title="Bold"
                    iconLeading={<Bold01 className="h-4 w-4" />}
                  />
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onMouseDown={(e) => handleToolbarAction(e, 'italic')}
                    className={`h-8 w-8 p-0 ${isItalic ? 'bg-slate-200 text-slate-900' : ''}`}
                    title="Italic"
                    iconLeading={<Italic01 className="h-4 w-4" />}
                  />
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onMouseDown={(e) => handleToolbarAction(e, 'underline')}
                    className={`h-8 w-8 p-0 ${isUnderline ? 'bg-slate-200 text-slate-900' : ''}`}
                    title="Underline"
                    iconLeading={<Underline01 className="h-4 w-4" />}
                  />

                  <div className="h-5 w-px bg-slate-300" />

                  {/* Text Color - Black Circle */}
                  <div className="relative">
                    <button
                      ref={colorPickerButtonRef}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        // Save current selection before opening color picker
                        if (editorRef.current) {
                          editorRef.current.focus()
                          const selection = window.getSelection()
                          if (selection && selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0)
                            // Only save if selection is within editor
                            if (editorRef.current.contains(range.commonAncestorContainer)) {
                              savedSelectionRef.current = range.cloneRange()
                            }
                          }
                        }
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        // Ensure editor has focus before opening color picker
                        if (editorRef.current) {
                          editorRef.current.focus()
                          // Save selection again on click (in case it changed)
                          const selection = window.getSelection()
                          if (selection && selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0)
                            if (editorRef.current.contains(range.commonAncestorContainer)) {
                              savedSelectionRef.current = range.cloneRange()
                            }
                          } else if (!savedSelectionRef.current) {
                            // If no selection, create one at cursor position
                            const range = document.createRange()
                            const sel = window.getSelection()
                            if (sel && sel.anchorNode && editorRef.current.contains(sel.anchorNode)) {
                              try {
                                const node = sel.anchorNode.nodeType === Node.TEXT_NODE 
                                  ? sel.anchorNode 
                                  : editorRef.current
                                const offset = sel.anchorOffset || 0
                                const textLength = node.textContent?.length || 0
                                range.setStart(node, Math.min(offset, textLength))
                                range.setEnd(node, Math.min(offset, textLength))
                                savedSelectionRef.current = range
                              } catch (error) {
                                // Fallback: select end of editor
                                range.selectNodeContents(editorRef.current)
                                range.collapse(false)
                                savedSelectionRef.current = range
                              }
                            } else {
                              // No anchor node in editor, create selection at end
                              range.selectNodeContents(editorRef.current)
                              range.collapse(false)
                              savedSelectionRef.current = range
                            }
                          }
                        }
                        setShowColorPicker(!showColorPicker)
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100"
                      title="Text Color"
                    >
                      <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: selectedColor }} />
                    </button>
                    {showColorPicker && (
                      <div 
                        ref={colorPickerPopupRef}
                        className="color-picker-popup absolute left-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
                        onMouseDown={(e) => {
                          // Prevent losing selection when clicking inside popup
                          e.preventDefault()
                        }}
                      >
                        <div className="grid grid-cols-7 gap-2">
                          {colors[0].map((color, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('🖱️ Color button mousedown:', color)
                                handleColorSelect(color, e)
                              }}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('🖱️ Color button click:', color)
                                handleColorSelect(color, e)
                              }}
                              className={`h-8 w-8 rounded border-2 transition ${
                                selectedColor === color ? 'border-primary ring-2 ring-primary/20' : 'border-slate-300'
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                        <div className="mt-2 grid grid-cols-6 gap-2">
                          {colors[1].map((color, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('🖱️ Color button mousedown:', color)
                                handleColorSelect(color, e)
                              }}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('🖱️ Color button click:', color)
                                handleColorSelect(color, e)
                              }}
                              className={`h-8 w-8 rounded border-2 transition ${
                                selectedColor === color ? 'border-primary ring-2 ring-primary/20' : 'border-slate-300'
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            Custom
                          </button>
                          <input
                            type="text"
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleColorSelect(selectedColor, e as any)
                              }
                            }}
                            onBlur={() => {
                              // Validate color format before applying
                              const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
                              if (colorRegex.test(selectedColor)) {
                                handleColorSelect(selectedColor)
                              }
                            }}
                            className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="#7F56D9"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-5 w-px bg-slate-300" />

                  {/* Alignment */}
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onMouseDown={(e) => handleToolbarAction(e, 'justifyLeft')}
                    className="h-8 w-8 p-0"
                    title="Align Left"
                    iconLeading={<AlignLeft className="h-4 w-4" />}
                  />
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onMouseDown={(e) => handleToolbarAction(e, 'justifyCenter')}
                    className="h-8 w-8 p-0"
                    title="Align Center"
                    iconLeading={<AlignCenter className="h-4 w-4" />}
                  />
                  <div className="h-5 w-px bg-slate-300" />

                  {/* Lists */}
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onMouseDown={(e) => handleToolbarAction(e, 'insertUnorderedList')}
                    className="h-8 w-8 p-0"
                    title="Bullet List"
                    iconLeading={<List className="h-4 w-4"/>}
                  />


                  <div className="h-5 w-px bg-slate-300" />

                  {/* Link (Attachment) and Image */}
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onMouseDown={(e) => {
                        e.preventDefault()
                        const url = prompt('Enter URL:')
                        if (url) handleFormat('createLink', url)
                    }}
                    className="h-8 w-8 p-0"
                    title="Insert Link"
                    iconLeading={<Attachment01 className="h-4 w-4" />}
                  />
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onMouseDown={(e) => {
                        e.preventDefault()
                        const url = prompt('Enter image URL:')
                        if (url) handleFormat('insertImage', url)
                    }}
                    className="h-8 w-8 p-0"
                    title="Insert Image"
                    iconLeading={<Image01 className="h-4 w-4" />}
                  />
                </div>

                {/* Message Body */}
                <div className="relative mt-2">
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={(e) => {
                      const html = e.currentTarget.innerHTML
                      setMessage(html)
                      // Update format state after input to reflect current formatting
                      setTimeout(() => updateFormatState(), 10)
                    }}
                    onKeyUp={() => {
                      // Update format state on key up to catch cursor movements
                      updateFormatState()
                    }}
                    onBlur={(e) => {
                      // Update format state when editor loses focus
                      // Only update if focus is not moving to the subject input
                      const relatedTarget = (e.nativeEvent as FocusEvent).relatedTarget as HTMLElement
                      if (relatedTarget && relatedTarget.id === 'subject') {
                        // Focus is moving to subject input, don't interfere
                        return
                      }
                      updateFormatState()
                    }}
                    onFocus={() => {
                      // Update format state when editor gains focus
                      updateFormatState()
                    }}
                    className="broadcast-editor-content composer-editor w-full -mt-2 rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 overflow-y-auto"
                    style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}
                    data-placeholder=""
                    suppressContentEditableWarning
                  />
                  
                  {/* Contextual Toolbar */}
                  {showContextualToolbar && (
                    <div
                      ref={contextualToolbarRef}
                      className="absolute z-50 flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-900 p-1.5 shadow-lg"
                      style={{
                        top: `${toolbarPosition.top}px`,
                        left: `${toolbarPosition.left}px`,
                        transform: 'translateX(-50%)'
                      }}
                      onMouseDown={(e) => e.preventDefault()} // Prevent focus loss when clicking toolbar background
                    >
                      <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        onMouseDown={(e) => handleToolbarAction(e, 'bold')}
                        className={`h-7 w-7 p-0 bg-slate-900 text-white hover:bg-slate-700 ${isBold ? 'bg-slate-700' : ''}`}
                        title="Bold"
                        iconLeading={<Bold01 className="h-3.5 w-3.5" />}
                      />
                      <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        onMouseDown={(e) => handleToolbarAction(e, 'italic')}
                        className={`h-7 w-7 p-0 bg-slate-900 text-white hover:bg-slate-700 ${isItalic ? 'bg-slate-700' : ''}`}
                        title="Italic"
                        iconLeading={<Italic01 className="h-3.5 w-3.5" />}
                      />
                      <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        onMouseDown={(e) => handleToolbarAction(e, 'underline')}
                        className={`h-7 w-7 p-0 bg-slate-900 text-white hover:bg-slate-700 ${isUnderline ? 'bg-slate-700' : ''}`}
                        title="Underline"
                        iconLeading={<Underline01 className="h-3.5 w-3.5" />}
                      />
                      <div className="h-5 w-px bg-slate-600" />
                      <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        onMouseDown={(e) => handleToolbarAction(e, 'justifyLeft')}
                        className="h-7 w-7 p-0 bg-slate-900 text-white hover:bg-slate-700"
                        title="Align Left"
                        iconLeading={<AlignLeft className="h-3.5 w-3.5" />}
                      />
                      <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        onMouseDown={(e) => handleToolbarAction(e, 'justifyCenter')}
                        className="h-7 w-7 p-0 bg-slate-900 text-white hover:bg-slate-700"
                        title="Align Center"
                        iconLeading={<AlignCenter className="h-3.5 w-3.5" />}
                      />
                      <div className="h-5 w-px bg-slate-600" />
                      <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        onMouseDown={(e) => handleToolbarAction(e, 'insertUnorderedList')}
                        className="h-7 w-7 p-0 bg-slate-900 text-white hover:bg-slate-700"
                        title="Bullet List"
                        iconLeading={<List className="h-3.5 w-3.5" />}
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-auto pt-6 flex justify-end gap-3 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleSave}
                  >
                    Save changes
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className='border-b border-slate-200 pb-2 flex items-center justify-between'>
                  <div>
                    <span className="font-bold text-slate-900">{type === 'push-notification' ? 'Title: ' : 'Subject: '}</span>
                    <span className="font-medium text-slate-900">{subject}</span>
                  </div>
                  {type === 'email' && subject.length > 60 && (
                    <div className="group relative flex items-center cursor-help">
                      <div className="flex items-center gap-1 rounded bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 border border-orange-200">
                        May be truncated on mobile
                        <AlertCircle className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                </div>
                <div 
                  className="broadcast-editor-content text-slate-600"
                  dangerouslySetInnerHTML={{ __html: message }}
                />
                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 h-[calc(100vh-200px)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="text-base font-semibold text-slate-900">Recipients</h2>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                iconLeading={<Plus className="h-4 w-4" />}
                onClick={() => {
                  // First click → Message status (image1); second click → Users (image2); then alternate
                  const addMessageStatusFirst = filters.length % 2 === 1
                  const newFilter = addMessageStatusFirst
                    ? { id: Date.now().toString(), field: 'Message status', operator: 'is not', value: 'Opened' }
                    : { id: Date.now().toString(), field: 'Users', operator: 'is not', value: 'Logged In' }
                  setFilters([...filters, newFilter])
                }}
              >
                New filter
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <span>Matching</span>
                  <select
                    value={matchLogic}
                    onChange={(e) => setMatchLogic(e.target.value as 'ANY' | 'ALL')}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {/* <option value="ANY">ANY</option> */}
                    <option value="ALL">ALL</option>
                  </select>
                  <span>of the following filters</span>
                </div>
                <div className="text-sm font-medium text-primary self-end sm:self-auto">
                  400/500
                </div>
              </div>

              <div className="space-y-3">
                {filters.map((filter, index) => (
                  <div key={filter.id} className="flex flex-row items-center gap-2 flex-wrap">
                    <select
                      value={filter.field}
                      onChange={(e) => {
                        const newFilters = [...filters]
                        const nextField = e.target.value as 'Message status' | 'Users' | 'Group'
                        newFilters[index].field = nextField
                        newFilters[index].value = nextField === 'Message status' ? 'Opened' : nextField === 'Users' ? 'Logged In' : (tags[0]?.name ?? '')
                        setFilters(newFilters)
                      }}
                      className="min-w-[140px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Message status">Message status</option>
                      <option value="Users">Users</option>
                      <option value="Group">Group</option>
                    </select>

                    <select
                      value={filter.operator}
                      onChange={(e) => {
                        const newFilters = [...filters]
                        newFilters[index].operator = e.target.value
                        setFilters(newFilters)
                      }}
                      className="w-[80px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="is">is</option>
                      <option value="is not">is not</option>
                    </select>

                    <select
                      value={filter.value}
                      onChange={(e) => {
                        const newFilters = [...filters]
                        newFilters[index].value = e.target.value
                        setFilters(newFilters)
                      }}
                      className="w-[500px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {filter.field === 'Message status' && (
                        <>
                          <option value="">Select status...</option>
                          {MESSAGE_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </>
                      )}
                      {filter.field === 'Users' && (
                        <>
                          <option value="">Select status...</option>
                          {USER_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </>
                      )}
                      {filter.field === 'Group' && (
                        tags.length === 0 ? (
                          <option value="">No groups available</option>
                        ) : (
                          <>
                            <option value="">Select a group...</option>
                            {tags
                              .filter((tag) => {
                                const selectedInOtherFilters = filters
                                  .filter((f, i) => i !== index && f.field === 'Group' && f.value?.trim())
                                  .map((f) => f.value)
                                return tag.name === filter.value || !selectedInOtherFilters.includes(tag.name)
                              })
                              .map((tag) => (
                                <option key={tag.uuid} value={tag.name}>{tag.name}</option>
                              ))}
                          </>
                        )
                      )}
                    </select>

                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => {
                        const newFilters = filters.filter(f => f.id !== filter.id)
                        setFilters(newFilters)
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
                      iconLeading={<XClose className="h-4 w-4" />}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      
      <BroadcastPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onSend={async () => {
          if (!createdEvent?.uuid) {
            showToast.error('Event UUID is required. Please select an event first.')
            return
          }

          if (!subject.trim()) {
            showToast.error('Subject is required.')
            return
          }

          // Get message from editor if available, otherwise use state
          const messageContent = editorRef.current?.innerHTML || message
          if (!messageContent.trim()) {
            showToast.error('Message is required.')
            return
          }

          // Get tag UUIDs from selected filters in Settings tab
          // Only include filters where field is 'Group' and operator is 'is' (not 'is_not')
          const tagUuids: string[] = []
          filters.forEach((filter) => {
            if (filter.field === 'Group' && filter.operator === 'is' && filter.value) {
              // Find the tag UUID by matching the tag name
              const tag = tags.find((t) => t.name === filter.value)
              if (tag) {
                // Avoid duplicates
                if (!tagUuids.includes(tag.uuid)) {
                  tagUuids.push(tag.uuid)
                }
              }
            }
          })

          if (tagUuids.length === 0) {
            showToast.error('Please select at least one group/tag for recipients in the Settings tab.')
            return
          }

          setIsSending(true)
          try {
            await sendCommunication({
              event_uuid: createdEvent.uuid,
              subject: subject.trim(),
              message: messageContent.trim(),
              channel: type === 'email' ? 'email' : 'push-notification',
              tag_uuids: tagUuids,
            })

            // Call the onSend callback if provided (for parent component handling)
            if (onSend) {
              onSend({ subject, message: messageContent })
            }

            setShowPreviewModal(false)
          } catch (error) {
            // Error is already handled by sendCommunication with toast
            // Don't close modal on error so user can retry
          } finally {
            setIsSending(false)
          }
        }}
        subject={subject}
        message={message}
        isSending={isSending}
        recipients={selectedRecipients}
      />

      <ScheduleBroadcastModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={(date) => {
          console.log('Scheduled for:', date)
          setShowScheduleModal(false)
          // In a real app, you would probably call an onSchedule prop here
        }}
      />
    </div>
  )
}
export default BroadcastComposer
