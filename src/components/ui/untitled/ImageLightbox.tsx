import React, { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { XClose, ChevronLeft, ChevronRight } from '@untitled-ui/icons-react'

interface ImageLightboxProps {
  images: string[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, currentIndex, onClose, onNavigate }) => {
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < images.length - 1

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
    if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
  }, [onClose, onNavigate, currentIndex, hasPrev, hasNext])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <XClose className="h-5 w-5" />
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Previous"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Image */}
      <div
        className="flex max-h-[90vh] max-w-[90vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[currentIndex]}
          alt=""
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />
      </div>

      {/* Next */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>,
    document.body
  )
}

export default ImageLightbox
