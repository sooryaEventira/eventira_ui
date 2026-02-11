import React, { useState, useRef } from 'react'

export interface LocationFloorPlanProps {
  title?: string | React.ReactElement
  titleAlign?: 'left' | 'center' | 'right'
  subtitle?: string | React.ReactElement
  subtitleAlign?: 'left' | 'center' | 'right'
  pdfUrl?: string
  imageUrl?: string
  height?: number
  backgroundColor?: string
  textColor?: string
  cardBackgroundColor?: string
}

const LocationFloorPlan: React.FC<LocationFloorPlanProps> = ({
  title = 'Level 1: Conference Hall',
  titleAlign = 'left',
  subtitle = 'Overview of the venue layout',
  subtitleAlign = 'left',
  pdfUrl,
  imageUrl,
  height = 600,
  backgroundColor = '#ffffff',
  textColor = '#1f2937',
  cardBackgroundColor = '#ffffff',
}) => {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('')

  // Fixed styling values (no longer configurable via sidebar)
  const cardBorderColor = '#e5e7eb'
  const buttonColor = '#3b82f6'
  const buttonTextColor = '#ffffff'
  const padding = '4rem 2rem'
  const borderRadius = '12px'

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setUploadedImageUrl(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const getStringValue = (prop: any): string => {
    if (typeof prop === 'string') return prop;
    if (prop && typeof prop === 'object' && 'props' in prop && prop.props && 'value' in prop.props) {
      return prop.props.value || '';
    }
    return '';
  };

  const titleValue = getStringValue(title);
  const subtitleValue = getStringValue(subtitle);

  const resolvedHeight = (() => {
    const n = typeof height === 'number' ? height : Number.parseInt(String(height || ''), 10)
    return Number.isFinite(n) && n > 0 ? n : 600
  })()
  const heightPx = `${resolvedHeight}px`

  // Normalize and embed PDF URLs:
  // - Local paths like "a/event_resources/file.pdf" -> "/a/event_resources/file.pdf"
  // - External URLs often block iframes; use Google Docs viewer embed.
  const getPdfUrl = (raw: string) => {
    const s = (raw || '').trim()
    if (!s) return ''
    if (s.startsWith('http://') || s.startsWith('https://')) {
      // Avoid CSP mismatch: backend should be loaded over https
      if (s.startsWith('http://eventiracommon-event-api-dev-ci01-aaeddsh3hbdkcjfa.centralindia-01.azurewebsites.net')) {
        return s.replace(/^http:\/\//, 'https://')
      }
      return s
    }
    return s.startsWith('/') ? s : `/${s}`
  }

  const pdfUrlFinal = pdfUrl ? getPdfUrl(getStringValue(pdfUrl)) : ''
  const isExternalPdf = pdfUrlFinal.startsWith('http://') || pdfUrlFinal.startsWith('https://')
  const embedPdfUrl = pdfUrlFinal
    ? (isExternalPdf
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrlFinal)}&embedded=true`
        : pdfUrlFinal)
    : ''

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleFullscreen = () => {
    if (!isFullscreen) {
      const container = document.getElementById('floorplan-container')
      if (container) {
        if (container.requestFullscreen) {
          container.requestFullscreen()
        } else if ((container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen()
        } else if ((container as any).msRequestFullscreen) {
          (container as any).msRequestFullscreen()
        }
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handleDownload = () => {
    const url = pdfUrlFinal || uploadedImageUrl || imageUrl
    if (url) {
      // For same-origin resources, try to download directly
      // For cross-origin, open in new tab
      try {
        const link = document.createElement('a')
        link.href = url
        link.download = url.split('/').pop() || (pdfUrlFinal ? 'floor-plan.pdf' : 'floor-plan.jpg')
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        // Fallback: open in new tab if download fails
        window.open(url, '_blank')
      }
    }
  }

  return (
    <section
      className="w-full"
      style={{
        backgroundColor,
        padding
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex-1">
            {(titleValue || subtitleValue) && (
              <>
                {titleValue && (
                  <h2
                    className="text-2xl md:text-3xl font-bold mb-2"
                    style={{ color: textColor, textAlign: titleAlign }}
                  >
                    {title}
                  </h2>
                )}
                {subtitleValue && (
                  <p
                    className="text-lg opacity-80"
                    style={{ color: textColor, textAlign: subtitleAlign }}
                  >
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Viewer Container */}
        <div
          id="floorplan-container"
          className="relative rounded-lg border overflow-hidden"
          style={{
            backgroundColor: cardBackgroundColor,
            borderColor: cardBorderColor,
            borderRadius,
            minHeight: heightPx,
            height: heightPx,
            position: 'relative'
          }}
        >
          {/* Document Viewer */}
          <div className="relative w-full h-full" style={{ minHeight: heightPx, height: heightPx }}>
            {/* Hidden file input for image upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            {pdfUrlFinal ? (
              <iframe
                src={embedPdfUrl}
                className="w-full h-full"
                style={{
                  minHeight: heightPx,
                  height: heightPx,
                  border: 'none'
                }}
                title="Floor Plan PDF"
              />
            ) : (uploadedImageUrl || imageUrl) ? (
              <div
                className="w-full h-full flex items-center justify-center overflow-auto bg-gray-100 relative cursor-pointer"
                style={{
                  minHeight: heightPx,
                  height: heightPx,
                }}
                onClick={(e) => {
                  // Don't trigger if clicking on toolbar or download button
                  const target = e.target as HTMLElement
                  if (target.closest('.toolbar-controls') || target.closest('[data-download-button]') || target.closest('button')) {
                    return
                  }
                  e.preventDefault()
                  e.stopPropagation()
                  handleImageClick(e)
                }}
                onMouseDown={(e) => {
                  // Don't trigger if clicking on toolbar or download button
                  const target = e.target as HTMLElement
                  if (target.closest('.toolbar-controls') || target.closest('[data-download-button]') || target.closest('button')) {
                    return
                  }
                  e.preventDefault()
                  e.stopPropagation()
                  handleImageClick(e as any)
                }}
                title="Click to upload image"
              >
                {/* Image container with zoom transform */}
                <div
                  className="w-full h-full flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center'
                  }}
                >
                  <img
                    src={uploadedImageUrl || imageUrl}
                    alt={titleValue || 'Floor Plan'}
                    className="max-w-full h-auto"
                    style={{
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>
            ) : (
              <div 
                className="w-full h-full flex flex-col items-center justify-center relative cursor-pointer" 
                style={{ minHeight: heightPx, height: heightPx }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleImageClick(e)
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleImageClick(e as any)
                }}
                title="Click to upload image"
              >
                <div className="text-center p-8 pointer-events-none">
                  <div className="mb-4">
                    <span className="text-6xl">📄</span>
                  </div>
                  <h3
                    className="text-2xl font-bold mb-2"
                    style={{ color: textColor }}
                  >
                    Conference
                  </h3>
                  <div
                    className="px-4 py-2 rounded text-sm font-medium border inline-block"
                    style={{
                      backgroundColor: cardBackgroundColor,
                      borderColor: cardBorderColor,
                      color: textColor
                    }}
                  >
                    Click to Upload Image
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Download Button - Top Right Corner - Always visible */}
          <button
            onClick={handleDownload}
            disabled={!pdfUrl && !uploadedImageUrl && !imageUrl}
            data-download-button="true"
            className="absolute top-4 right-4 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all hover:opacity-90 hover:scale-105 z-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              backgroundColor: (pdfUrl || uploadedImageUrl || imageUrl) ? buttonColor : '#9ca3af',
              color: buttonTextColor,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 50,
              pointerEvents: 'auto'
            }}
            title={pdfUrlFinal || uploadedImageUrl || imageUrl ? `Download ${pdfUrlFinal ? 'PDF' : 'Image'}` : 'Add PDF or Image URL to enable download'}
          >
            <span>📥</span>
            <span>Download {pdfUrlFinal ? 'PDF' : imageUrl ? 'Image' : 'File'}</span>
          </button>

          {/* Viewer Controls (only for images) */}
          {(uploadedImageUrl || imageUrl) && !pdfUrl && (
            <>
              {/* Vertical Toolbar */}
              <div
                className="toolbar-controls absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-50"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  padding: '8px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  pointerEvents: 'auto'
                }}
              >
                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                  style={{ color: textColor }}
                  title="Download Image"
                >
                  <span className="text-lg">📥</span>
                </button>

                {/* Zoom In */}
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                  style={{ color: textColor }}
                  title="Zoom In"
                >
                  <span className="text-lg">🔍+</span>
                </button>

                {/* Zoom Out */}
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                  style={{ color: textColor }}
                  title="Zoom Out"
                >
                  <span className="text-lg">🔍-</span>
                </button>

                {/* Fullscreen */}
                <button
                  onClick={handleFullscreen}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                  style={{ color: textColor }}
                  title="Fullscreen"
                >
                  <span className="text-lg">⛶</span>
                </button>
              </div>

              {/* Zoom Level Indicator */}
              <div
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded text-sm font-medium"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: '#ffffff'
                }}
              >
                {Math.round(zoomLevel * 100)}%
              </div>
            </>
          )}

          {/* Click to Zoom overlay for images */}
          {(uploadedImageUrl || imageUrl) && !pdfUrl && (
            <button
              onClick={handleZoomIn}
              className="absolute bottom-4 left-4 px-4 py-2 rounded text-sm font-medium border transition-opacity hover:opacity-90"
              style={{
                backgroundColor: cardBackgroundColor,
                borderColor: cardBorderColor,
                color: textColor
              }}
            >
              Click to Zoom
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default LocationFloorPlan

