import React, { useRef, useEffect } from 'react'
import { registerOverlayPortal } from '@measured/puck'
import { HeroSectionProps, HeroButton } from '../../types'

const HeroSection = ({ 
  title, 
  subtitle = '', 
  startDate = '',
  endDate = '',
  buttons = [
    {
      text: 'Register Now',
      link: '#',
      color: '#8b5cf6',
      textColor: 'white',
      size: 'large' as const
    }
  ],
  backgroundColor = '#1a1a1a', 
  textColor = '#FFFFFF',
  backgroundImage = '',
  showContent = true,
  height = '500px',
  alignment = 'center',
  overlayOpacity = 0.4,
  buttonSpacing = '12px'
}: HeroSectionProps) => {
  const buttonRefs = useRef<(HTMLAnchorElement | null)[]>([])

  // Puck sometimes wraps text fields as React elements with a `value` prop.
  const getStringValue = (prop: any): string => {
    if (typeof prop === 'string') return prop
    if (prop && typeof prop === 'object' && 'props' in prop && prop.props && 'value' in prop.props) {
      return prop.props.value || ''
    }
    return ''
  }

  // Register all buttons as overlay portals to keep them interactive
  useEffect(() => {
    buttonRefs.current.forEach((buttonRef) => {
      if (buttonRef) {
        registerOverlayPortal(buttonRef)
      }
    })
  }, [buttons])

  // NOTE: Inline editing is disabled for HeroSection.
  // This component should be edited from the property sidebar only (editor + preview/public).
  const DEFAULT_BANNER_IMAGE =
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80'

  // Banner image precedence:
  // 1) event-form-banner from localStorage (uploaded by user)
  // 2) backgroundImage prop (from editor)
  // 3) default banner image
  const currentBackgroundImage = (() => {
    try {
      const stored = typeof window !== 'undefined' ? (localStorage.getItem('event-form-banner') || '').trim() : ''
      if (stored) return stored
    } catch {
      // ignore
    }
    const fromProps = (backgroundImage || '').trim()
    return fromProps || DEFAULT_BANNER_IMAGE
  })()
  const safeHeight = (height || '500px').toString().trim() || '500px'

  const readEventMetaFromStorage = () => {
    const out = { location: '', startDate: '', endDate: '' }
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('event-form-data') : null
      const parsed = raw ? JSON.parse(raw) : null
      out.location = (parsed?.location || parsed?.eventLocation || parsed?.venue || '').toString().trim()
      out.startDate = (parsed?.startDate || parsed?.start_date || '').toString().trim()
      out.endDate = (parsed?.endDate || parsed?.end_date || '').toString().trim()
    } catch {
      // ignore
    }
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('created-event') : null
      const parsed = raw ? JSON.parse(raw) : null
      if (!out.location) out.location = (parsed?.location || parsed?.eventLocation || parsed?.venue || '').toString().trim()
      if (!out.startDate) out.startDate = (parsed?.startDate || parsed?.start_date || parsed?.event_date || '').toString().trim()
      if (!out.endDate) out.endDate = (parsed?.endDate || parsed?.end_date || '').toString().trim()
    } catch {
      // ignore
    }
    return out
  }

  const formatDateText = () => {
    let sRaw = getStringValue(startDate).trim()
    let eRaw = getStringValue(endDate).trim()

    // If component props are missing/incomplete, fall back to event creation data
    // so dragging the component immediately shows the event date range.
    if (!sRaw || !eRaw) {
      const stored = readEventMetaFromStorage()
      if (!sRaw && stored.startDate) sRaw = stored.startDate
      if (!eRaw && stored.endDate) eRaw = stored.endDate
    }

    if (!sRaw && !eRaw) return ''

    const parseDate = (raw: string): Date | null => {
      const r = (raw || '').trim()
      if (!r) return null
      // Support YYYY-MM-DD (treat as local date at midnight to avoid timezone shift)
      if (/^\d{4}-\d{2}-\d{2}$/.test(r)) {
        const d = new Date(`${r}T00:00:00`)
        return Number.isNaN(d.getTime()) ? null : d
      }
      const d = new Date(r)
      return Number.isNaN(d.getTime()) ? null : d
    }

    const s = parseDate(sRaw)
    const e = parseDate(eRaw)

    // If parsing fails, fall back to raw text.
    if (!s && !e) {
      if (sRaw && eRaw) return `${sRaw} - ${eRaw}`
      return sRaw || eRaw
    }
    // If only one side parses, still return a compact date when possible
    if (s && !e) return `${s.getDate()}, ${s.getFullYear()}`
    if (!s && e) return `${e.getDate()}, ${e.getFullYear()}`

    const sDay = s!.getDate()
    const eDay = e!.getDate()
    const sMonth = s!.getMonth()
    const eMonth = e!.getMonth()
    const sYear = s!.getFullYear()
    const eYear = e!.getFullYear()

    // Desired compact format (example): "12-15, 2026"
    if (sYear === eYear) {
      if (sMonth === eMonth) {
        if (sDay === eDay) return `${sDay}, ${sYear}`
        return `${sDay}-${eDay}, ${sYear}`
      }
      // Different months but same year: include month numbers for clarity.
      const sm = sMonth + 1
      const em = eMonth + 1
      return `${sm}/${sDay}-${em}/${eDay}, ${sYear}`
    }

    // Different years: include both years.
    const sm = sMonth + 1
    const em = eMonth + 1
    return `${sm}/${sDay}, ${sYear} - ${em}/${eDay}, ${eYear}`
  }

  const dateText = formatDateText()
  const subtitleText = (() => {
    const rawSubtitle = getStringValue(subtitle).trim()
    // Backward-compat: older saved pages store "Location | Date" inside `subtitle`.
    // We only want Location here; date should come from start/end date fields.
    const parts = rawSubtitle.split(/[|｜]/).map((p) => p.trim()).filter(Boolean)
    let loc = parts[0] || ''
    if (!loc) {
      // Refresh-safe fallback: event creation form saves location in localStorage.
      try {
        const maybe = readEventMetaFromStorage().location
        if (maybe) loc = maybe
      } catch {
        // ignore
      }
      if (!loc) {
        try {
          const maybe = readEventMetaFromStorage().location
          if (maybe) loc = maybe
        } catch {
          // ignore
        }
      }
    }
    if (!loc && !dateText) return ''
    if (loc && dateText) return `${loc} | ${dateText}`
    return loc || dateText
  })()
  
  // Container style - fixed height, full width
  const heroStyle: React.CSSProperties = {
    backgroundColor: currentBackgroundImage ? '#ffffff' : (backgroundColor || '#1a1a1a'),
    color: textColor,
    // Fix: previously forced 500px minHeight when background image exists,
    // which made Small/Medium heights not work.
    minHeight: safeHeight,
    height: safeHeight,
    justifyContent: alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center',
    padding: 'clamp(40px, 8vw, 80px) clamp(20px, 4vw, 40px)',
    width: '100%',
    maxWidth: '100%',
    display: 'flex',
    position: 'relative',
    boxSizing: 'border-box',
    overflow: 'hidden',
    margin: 0
  }
  
  // Debug: Log what backgroundImage prop we received and what style is being applied
  useEffect(() => {
    const bgString = typeof heroStyle.background === 'string' ? heroStyle.background : ''
    console.log('🖼️ HeroSection render:', {
      backgroundImageProp: backgroundImage ? backgroundImage.substring(0, 50) + '...' : 'EMPTY',
      currentBackgroundImage: currentBackgroundImage ? currentBackgroundImage.substring(0, 50) + '...' : 'EMPTY',
      heroStyleBackground: bgString ? bgString.substring(0, 80) + '...' : '',
      title,
      subtitle: subtitleText,
      startDate,
      endDate,
      height: safeHeight
    })
  }, [backgroundImage, currentBackgroundImage, heroStyle.background, title, subtitleText, startDate, endDate, safeHeight])

  const heroClassName = 'w-full flex items-center m-0 relative overflow-hidden block'

  const toBoolean = (value: unknown, fallback: boolean) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase()
      if (v === 'true') return true
      if (v === 'false') return false
    }
    return fallback
  }

  const shouldShowContent = toBoolean(showContent, true)

  const overlayStyle: React.CSSProperties = {
    backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`
  }

  const contentStyle: React.CSSProperties = {
    textAlign: alignment,
    maxWidth: '800px',
    padding: '0 clamp(10px, 2vw, 20px)'
  }

  const getButtonPadding = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return 'clamp(6px, 1.5vw, 8px) clamp(12px, 2vw, 16px)'
      case 'medium': return 'clamp(10px, 2vw, 12px) clamp(18px, 3vw, 24px)'
      case 'large': return 'clamp(12px, 2.5vw, 16px) clamp(24px, 4vw, 32px)'
      default: return 'clamp(12px, 2.5vw, 16px) clamp(24px, 4vw, 32px)'
    }
  }

  const getButtonFontSize = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return 'clamp(12px, 2vw, 14px)'
      case 'medium': return 'clamp(14px, 2.5vw, 16px)'
      case 'large': return 'clamp(14px, 3vw, 18px)'
      default: return 'clamp(14px, 3vw, 18px)'
    }
  }

  const getButtonStyle = (button: HeroButton): React.CSSProperties => ({
    backgroundColor: button.color || '#6938EF',
    color: button.textColor || 'white',
    padding: getButtonPadding(button.size || 'large'),
    border: (button.color || '#6938EF') === 'transparent' ? `2px solid ${button.textColor || 'white'}` : 'none',
    fontSize: getButtonFontSize(button.size || 'large'),
    boxShadow: (button.color || '#6938EF') === 'transparent' ? 'none' : '0 4px 12px rgba(0,0,0,0.3)',
    marginRight: buttonSpacing
  })

  const handleButtonHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.classList.add('-translate-y-0.5')
    const isTransparent = e.currentTarget.style.backgroundColor === 'transparent'
    if (isTransparent) {
      e.currentTarget.style.backgroundColor = e.currentTarget.style.color
      e.currentTarget.style.color = 'white'
    } else {
      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)'
    }
  }

  const handleButtonLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.classList.remove('-translate-y-0.5')
    const isTransparent = e.currentTarget.style.backgroundColor === 'transparent'
    if (isTransparent) {
      e.currentTarget.style.backgroundColor = 'transparent'
      e.currentTarget.style.color = e.currentTarget.dataset.originalColor || 'white'
    } else {
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
    }
  }

  const handleButtonClick = (e: React.MouseEvent<HTMLAnchorElement>, button: HeroButton) => {
    // Prevent default behavior for empty links or hash-only links
    if (!button.link || button.link === '#' || button.link.startsWith('#')) {
      e.preventDefault()
      console.log('Button clicked:', button.text, 'Link:', button.link)
      // You can add custom logic here for button clicks
    }
  }

  return (
    <div 
      style={heroStyle}
      className={heroClassName}
    >
      {/* Banner Image - using img tag with object-fit: cover to fill width and height */}
      {currentBackgroundImage && (
        <img
          src={currentBackgroundImage}
          alt="Hero banner"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover' as const,
            objectPosition: 'center center',
            zIndex: 0,
            display: 'block',
            margin: 0,
            padding: 0
          }}
          onError={(e) => {
            console.error('Error loading banner image')
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      {/* Overlay for text readability */}
      {currentBackgroundImage && shouldShowContent && (
        <div style={overlayStyle} className="absolute inset-0 z-[1]" />
      )}
      
      {shouldShowContent && (
        <div
          style={contentStyle}
          className="z-[2] relative w-full"
        >
          <h1
            className="m-0 mb-4 text-[clamp(1.75rem,4vw,3.5rem)] font-bold leading-tight text-white drop-shadow-[2px_2px_4px_rgba(0,0,0,0.5)]"
          >
            {title}
          </h1>
          {subtitleText && (
            <p
              className="m-0 mb-5 text-[clamp(0.875rem,2vw,1.25rem)] opacity-95 text-white drop-shadow-[1px_1px_2px_rgba(0,0,0,0.5)] leading-snug"
            >
              {subtitleText}
            </p>
          )}
          {buttons && buttons.length > 0 && (
            <div
              className="mt-[clamp(20px,4vw,30px)] flex flex-wrap"
              style={{
                gap: buttonSpacing,
                justifyContent: alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center'
              }}
            >
              {buttons.map((button, index) => (
                <a
                  key={index}
                  ref={(el) => {
                    buttonRefs.current[index] = el
                  }}
                  href={button.link || '#'}
                  style={getButtonStyle(button)}
                  className="rounded-lg cursor-pointer font-bold no-underline inline-block transition-all duration-300 uppercase tracking-wider"
                  data-original-color={button.textColor}
                  onMouseEnter={handleButtonHover}
                  onMouseLeave={handleButtonLeave}
                  onClick={(e) => handleButtonClick(e, button)}
                >
                  {button.text}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default HeroSection
