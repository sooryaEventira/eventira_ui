import React, { useEffect, useImperativeHandle, useRef, forwardRef, useCallback } from 'react'
import { XClose } from '@untitled-ui/icons-react'

export interface SlideoutProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  header?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  topOffset?: number
  panelWidthRatio?: number
  maxWidth?: number | string
  side?: 'left' | 'right'
  width?: number | string
}

export interface SlideoutHandle {
  /** Call before closing so focus is restored before aria-hidden is applied (avoids a11y warning). */
  returnFocus: () => void
}

const Slideout = forwardRef<SlideoutHandle, SlideoutProps>(function Slideout(props, ref) {
  const {
    isOpen,
    onClose,
    title,
    header,
    children,
    footer,
    topOffset = 64,
    panelWidthRatio = 0.4,
    maxWidth,
    side = 'right',
    width
  } = props
  const slideoutRef = useRef<HTMLElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  const returnFocus = useCallback(() => {
    if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
      previousActiveElement.current.focus()
    }
  }, [])

  useImperativeHandle(ref, () => ({ returnFocus }), [returnFocus])

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden')
      previousActiveElement.current = document.activeElement as HTMLElement
      setTimeout(() => {
        slideoutRef.current?.focus()
      }, 100)
    } else {
      document.body.classList.remove('overflow-hidden')
      returnFocus()
    }

    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen, returnFocus])

  const handleClose = useCallback(() => {
    returnFocus()
    onClose()
  }, [onClose, returnFocus])

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, handleClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    const slideout = slideoutRef.current
    if (!slideout) return

    const focusableElements = slideout.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    slideout.addEventListener('keydown', handleTabKey)
    return () => {
      slideout.removeEventListener('keydown', handleTabKey)
    }
  }, [isOpen])

  const containerStyle: React.CSSProperties = {
    top: `${topOffset}px`,
    right: 0,
    left: 0,
    bottom: 0
  }

  // Calculate responsive width
  // Prioritize responsive Tailwind classes, only use inline styles when width is explicitly provided
  const panelStyle: React.CSSProperties = {
    height: `calc(100vh - ${topOffset}px)`,
    ...(width && {
      width: typeof width === 'number' ? `${width}px` : width
    }),
    // Only apply maxWidth if explicitly provided (no default maxWidth)
    ...(maxWidth && {
      maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth
    })
    // Note: We don't set width in inline styles when using responsive classes
    // This allows Tailwind responsive classes to take precedence
  }

  // Get responsive width classes - always use these unless width prop is explicitly provided
  // Use wider responsive widths for better usability
  const getResponsiveWidthClasses = () => {
    if (width) return '' // Use inline style when width is explicitly provided
    
    // Responsive width classes - slightly reduced widths
    // Mobile (< 640px): full width
    // Tablet (640px+): 90% width
    // Desktop (768px+): 85% width
    // Large (1024px+): 75% width  
    // XL (1280px+): 65% width
    // Wide (1440px+): 55% width
    return 'w-full sm:w-[80%] md:w-[85%] lg:w-[75%] xl:w-[65%] 2xl:w-[55%]'
  }

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[1200] transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
      style={containerStyle}
    >
      <div
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        ref={slideoutRef}
        tabIndex={-1}
        className={`absolute ${side === 'right' ? 'right-0' : 'left-0'} top-0 flex min-h-0 transform flex-col bg-white shadow-2xl transition-transform duration-300 ${getResponsiveWidthClasses()} ${
          isOpen
            ? 'translate-x-0'
            : side === 'right'
            ? 'translate-x-full'
            : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'slideout-title' : undefined}
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {header && (
          <header className="flex-shrink-0">
            {header}
          </header>
        )}

        {title && !header && (
          <header className="flex-shrink-0 flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 id="slideout-title" className="text-lg font-semibold text-slate-900">{title}</h2>
            <button
              type="button"
              className="ml-auto rounded-full p-2 text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={handleClose}
              aria-label="Close"
            >
              <XClose className="h-5 w-5" />
            </button>
          </header>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  )
})

export default Slideout

