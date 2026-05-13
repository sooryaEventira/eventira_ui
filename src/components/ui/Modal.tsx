import React, { ReactNode } from 'react'
import { XClose } from '@untitled-ui/icons-react'

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

export interface ModalProps {
  /** Whether the modal is visible */
  isVisible: boolean
  /** Function to call when modal should be closed */
  onClose: () => void
  /** Modal title */
  title: string
  /** Modal subtitle/description */
  subtitle?: string
  /** Content to render inside the modal body */
  children: ReactNode
  /** Footer content (buttons, etc.) */
  footer?: ReactNode
  /** Width of the modal (in pixels or CSS value) */
  width?: number | string
  /** Height of the modal (in pixels or CSS value) */
  height?: number | string
  /** Maximum width of the modal */
  maxWidth?: number | string
  /** Maximum height of the modal */
  maxHeight?: number | string
  /** Z-index of the modal overlay */
  zIndex?: number
  /** Custom padding for modal content */
  padding?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
  /** Border radius */
  borderRadius?: number
  /** Whether to show the close button */
  showCloseButton?: boolean
  /** Custom header content (overrides title/subtitle) */
  customHeader?: ReactNode
  /** Whether to show border at the bottom of the header */
  showHeaderBorder?: boolean
  /** Custom styles for the modal container */
  containerStyle?: React.CSSProperties
  /** Custom styles for the modal content */
  contentStyle?: React.CSSProperties
}

const Modal: React.FC<ModalProps> = ({
  isVisible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width,
  height,
  maxWidth,
  maxHeight,
  zIndex = 10000,
  padding,
  borderRadius = 16,
  showCloseButton = true,
  customHeader,
  showHeaderBorder,
  containerStyle,
  contentStyle
}) => {
  if (!isVisible) return null

  // Default padding values
  const paddingTop = padding?.top ?? 24
  const paddingRight = padding?.right ?? 16
  const paddingBottom = padding?.bottom ?? 24
  const paddingLeft = padding?.left ?? 16
  const headerBottomPadding = subtitle || customHeader ? 16 : 0

  const overlayStyle: React.CSSProperties = {
    zIndex,
    ...containerStyle
  }

  const contentDimensions: React.CSSProperties = {
    ...(typeof width !== 'undefined'
      ? { width: typeof width === 'number' ? `${width}px` : width }
      : {}),
    ...(typeof height !== 'undefined'
      ? { height: typeof height === 'number' ? `${height}px` : height }
      : {}),
    ...(typeof maxWidth !== 'undefined'
      ? { maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }
      : {}),
    ...(typeof maxHeight !== 'undefined'
      ? {
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight
        }
      : {})
  }

  const contentStyleWithVars: React.CSSProperties = {
    ...contentDimensions,
    borderRadius:
      typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
    '--modal-padding-top': `${paddingTop}px`,
    '--modal-padding-right': `${paddingRight}px`,
    '--modal-padding-bottom': `${paddingBottom}px`,
    '--modal-padding-left': `${paddingLeft}px`,
    '--modal-header-bottom': `${headerBottomPadding}px`,
    ...contentStyle
  } as React.CSSProperties

  const hasExplicitWidth = typeof width !== 'undefined'

  return (
    <div
      className="fixed top-0 right-0 bottom-0 left-0 flex items-center justify-center overflow-auto bg-black/50 p-4"
      style={overlayStyle}
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className={cn(
          'relative m-auto flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh] max-w-[90vw]',
          hasExplicitWidth ? 'w-auto' : 'w-full'
        )}
        style={contentStyleWithVars}
        onClick={(e) => e.stopPropagation()}
      >
        {(customHeader || title) && (
          <div
            className={cn(
              'flex flex-col border-slate-200',
              'pl-[var(--modal-padding-left)]',
              'pr-[var(--modal-padding-right)]',
              'pt-[var(--modal-padding-top)]',
              'pb-[var(--modal-header-bottom)]',
              showHeaderBorder !== undefined
                ? showHeaderBorder
                  ? 'border-b'
                  : ''
                : subtitle || customHeader
                ? 'border-b'
                : ''
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {customHeader ? (
                  customHeader
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="text-sm text-slate-500">{subtitle}</p>
                    )}
                  </>
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <XClose className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden',
            'pl-[var(--modal-padding-left)] pr-[var(--modal-padding-right)]',
            footer ? 'pb-0' : 'pb-[var(--modal-padding-bottom)]',
            customHeader || title ? 'pt-0' : 'pt-[var(--modal-padding-top)]'
          )}
        >
          {children}
        </div>

        {footer && (
          <div className="flex w-full flex-shrink-0 flex-col border-t border-slate-200 bg-white px-[var(--modal-padding-left)] pb-0 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal

