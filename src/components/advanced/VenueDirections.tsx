import React, { useMemo, useState } from 'react'

export interface DirectionItem {
  id?: string
  title: string | React.ReactElement
  description: string | React.ReactElement
  icon?: string
  iconColor?: string
}

export interface ButtonItem {
  text: string | React.ReactElement
  url: string
  color?: string
  textColor?: string
}

export interface VenueDirectionsProps {
  title?: string | React.ReactElement
  titleColor?: string
  titleSize?: 1 | 2 | 3
  mapUrl?: string | React.ReactElement
  mapEmbedUrl?: string
  mapImageUrl?: string
  mapPlaceholder?: string | React.ReactElement
  entranceTitle?: string | React.ReactElement
  entranceTitleColor?: string
  entranceDescription?: string | React.ReactElement
  entranceLinkText?: string | React.ReactElement
  entranceLinkUrl?: string
  directions?: DirectionItem[]
  directionTitleColor?: string
  directionTextColor?: string
  backgroundColor?: string
  textColor?: string
  buttons?: ButtonItem[]
  buttonColor?: string
  buttonTextColor?: string
  openMapsUrl?: string
  openMapsText?: string | React.ReactElement
  openMapsButtonColor?: string
  openMapsButtonTextColor?: string
}

const VenueDirections: React.FC<VenueDirectionsProps> = ({
  title = 'How to Get Here',
  titleColor,
  titleSize = 2,
  mapUrl,
  mapEmbedUrl,
  mapImageUrl,
  mapPlaceholder,
  entranceTitle,
  entranceTitleColor,
  entranceDescription,
  entranceLinkText,
  entranceLinkUrl,
  directions = [],
  directionTitleColor,
  directionTextColor,
  backgroundColor = '#f9fafb',
  textColor = '#1f2937',
  buttons = [],
  buttonColor = '#3b82f6',
  buttonTextColor = '#ffffff',
  openMapsUrl,
  openMapsText = 'Open in Maps',
  openMapsButtonColor,
  openMapsButtonTextColor,
}) => {
  const [imageError, setImageError] = useState(false)

  // Fixed layout/styling values (no longer user-configurable via props)
  const cardBackgroundColor = '#ffffff'
  const cardBorderColor = '#e5e7eb'
  const iconBackgroundColor = '#f3f4f6'
  const sectionPadding = '4rem 2rem'
  const layoutGap = '3rem'

  const getStringValue = (prop: any): string => {
    if (typeof prop === 'string') return prop

    // Some Puck fields can pass ReactElements instead of strings.
    if (prop && typeof prop === 'object' && 'props' in prop && prop.props) {
      if (typeof prop.props.value === 'string') return prop.props.value
      if (typeof prop.props.defaultValue === 'string') return prop.props.defaultValue
      if (typeof prop.props.children === 'string') return prop.props.children
    }

    return ''
  }

  const titleValue = getStringValue(title)
  const mapUrlInput = getStringValue(mapUrl as any)
  const mapEmbedInput = getStringValue(mapEmbedUrl as any)
  const mapImageInput = getStringValue(mapImageUrl as any)
  const resolvedTitleColor = titleColor || textColor
  const resolvedEntranceTitleColor = entranceTitleColor || textColor
  const resolvedDirectionTitleColor = directionTitleColor || textColor
  const resolvedDirectionTextColor = directionTextColor || textColor

  const titleSizeClass =
    titleSize === 1 ? 'text-2xl md:text-3xl' : titleSize === 3 ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl'

  const decodeHtmlEntities = (input: string) =>
    input.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')

  const normalizeMapEmbedSrc = (input?: string) => {
    const raw0 = (input || '').trim()
    if (!raw0) return ''
    const firstQuoteIndex = raw0.indexOf('"')
    const cleanedInput =
      firstQuoteIndex !== -1 ? raw0.slice(0, firstQuoteIndex) : raw0
    const raw = decodeHtmlEntities(cleanedInput)

    const embedFromQuery = (q: string) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`

    // If user pasted a full iframe embed snippet, extract src.
    if (raw.toLowerCase().includes('<iframe')) {
      const match = raw.match(/src\s*=\s*["']([^"']+)["']/i)
      return match?.[1] ? decodeHtmlEntities(match[1]) : ''
    }

    // If user already pasted a proper embed URL, use it.
    if (raw.includes('/maps/embed') || raw.includes('output=embed')) return raw

    // If user pasted a normal Google Maps URL, try to convert to an embeddable URL.
    try {
      const u = new URL(raw)
      const host = u.hostname.toLowerCase()
      const path = u.pathname

      // Short/share links generally cannot be embedded due to X-Frame-Options/CSP.
      // Ask for the proper "Embed a map" URL instead.
      const isShortLink =
        host === 'maps.app.goo.gl' ||
        host.endsWith('goo.gl') ||
        host === 'g.co' ||
        host === 'g.page'
      if (isShortLink) {
        return ''
      }

      // If user pasted a maps query URL, embed via q=...&output=embed
      const q = u.searchParams.get('q') || u.searchParams.get('query')
      if (q) {
        return embedFromQuery(q)
      }

      // If URL contains "@lat,lng" coordinates (common in share URLs)
      const atMatch = raw.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
      if (atMatch) {
        return embedFromQuery(`${atMatch[1]},${atMatch[2]}`)
      }

      // Google Maps "place" URLs often do not embed correctly just by adding output=embed.
      // Convert them into a query-based embed which is more reliable.
      if (host.includes('google.') && path.toLowerCase().startsWith('/maps')) {
        const placeMatch = path.match(/\/maps\/place\/([^/]+)/i)
        if (placeMatch?.[1]) {
          const place = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
          if (place.trim()) return embedFromQuery(place.trim())
        }

        const searchMatch = path.match(/\/maps\/search\/([^/]+)/i)
        if (searchMatch?.[1]) {
          const term = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '))
          if (term.trim()) return embedFromQuery(term.trim())
        }

        // As a fallback, try Google's output=embed on the original URL.
        u.searchParams.set('output', 'embed')
        return u.toString()
      }

      return embedFromQuery(u.toString())
    } catch {
      // Treat non-URL input as an address/query string.
      return embedFromQuery(raw)
    }
  }

  const embedSrc = useMemo(() => {
    try {
      // Prefer explicit embed field, otherwise derive from mapUrl.
      const source =
  normalizeMapEmbedSrc(mapEmbedInput) ||
  normalizeMapEmbedSrc(mapUrlInput)

      return normalizeMapEmbedSrc(source)
    } catch {
      return ''
    }
  }, [mapEmbedInput, mapUrlInput])

  const hasMapEmbedInput = Boolean((mapEmbedInput || '').trim())
  const hasMapUrlInput = Boolean((mapUrlInput || '').trim())
  const embedLooksValid = Boolean(embedSrc && (embedSrc.startsWith('https://www.google.com/maps')))

  const effectiveMapImageSrc = useMemo(() => {
    if (imageError) return ''
    const fromProps = (mapImageInput || '').trim()
    return fromProps
  }, [imageError, mapImageInput])

  const mapImageHint = useMemo(() => {
    const raw = (mapImageInput || '').trim()
    if (!raw) return ''
    try {
      const u = new URL(raw)
      const host = u.hostname.toLowerCase()
      const isMapsShare =
        host === 'maps.app.goo.gl' ||
        host.endsWith('goo.gl') ||
        host.includes('google.') && u.pathname.toLowerCase().startsWith('/maps')
      if (isMapsShare) {
        return 'This is a Google Maps page link, not a direct image. Use a direct .png/.jpg URL (or upload an image to Resource Manager and paste that URL).'
      }
      return ''
    } catch {
      return ''
    }
  }, [mapImageInput])
  console.log('[VenueDirections] mapEmbedInput:', mapEmbedInput)
  console.log('[VenueDirections] mapUrlInput:', mapUrlInput)
  console.log('[VenueDirections] embedSrc:', embedSrc)
  console.log('[VenueDirections] embedLooksValid:', embedLooksValid)
  
  const openMapsHref = useMemo(() => {
    if ((openMapsUrl || '').trim()) return openMapsUrl as string
    const raw = (mapUrlInput || '').trim()
    if (raw) {
      // If user pasted any maps link, just open that; otherwise treat it as an address/query.
      try {
        // If it's a valid URL, use it as-is for "Open in Maps"
        // (including maps.app.goo.gl short links)
        // eslint-disable-next-line no-new
        new URL(raw)
        return raw
      } catch {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`
      }
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('The Moscone Center, San Francisco')}`
  }, [mapUrlInput, openMapsUrl])
  const openMapsButtonBg = openMapsButtonColor || buttonColor
  const openMapsButtonFg = openMapsButtonTextColor || buttonTextColor

  // Use buttons array if provided, otherwise fall back to individual properties
  const renderButtons = buttons && buttons.length > 0 ? buttons : [
    {
      text: entranceLinkText || 'Get Directions',
      url: entranceLinkUrl || '',
      color: buttonColor,
      textColor: buttonTextColor
    },
    {
      text: openMapsText,
      url: openMapsHref,
      color: openMapsButtonBg,
      textColor: openMapsButtonFg
    }
  ]

  const defaultDirections: DirectionItem[] = [
    {
      id: '1',
      title: 'By Air',
      description: 'Fly into SFO (San Francisco International). The venue is a 20-minute drive or 30-minute BART ride from the airport.',
      icon: '✈️',
      iconColor: '#3b82f6'
    },
    {
      id: '2',
      title: 'Public Transit (BART)',
      description: 'Take the Yellow Line to Powell Street Station. The Moscone Center is a short 5-minute walk down 4th Street.',
      icon: '🚇',
      iconColor: '#10b981'
    },
    {
      id: '3',
      title: 'Parking',
      description: 'Underground parking is available at the venue garage (Entrance on 3rd St). Daily max rate is $35. Valet available for VIPs.',
      icon: '🚗',
      iconColor: '#6b7280'
    }
  ];

  const displayDirections = directions.length > 0 ? directions : defaultDirections

  return (
    <section
      className="w-full"
      style={{
        backgroundColor,
        padding: sectionPadding
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"
          style={{ gap: layoutGap }}
        >
          {/* Left: Map */}
          <div className="flex flex-col gap-6">
            {/* Map */}
            <div
              className="relative w-full rounded-xl overflow-hidden border"
              style={{
                backgroundColor: cardBackgroundColor,
                borderColor: cardBorderColor,
                aspectRatio: '16/9',
                minHeight: '400px',
              }}
            >
              {effectiveMapImageSrc ? (
                <img
                  src={effectiveMapImageSrc}
                  alt="Venue Map"
                  className="w-full h-full object-cover"
                  style={{ zIndex: 0 }}
                  onError={(e) => {
                    setImageError(true)
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : embedLooksValid ? (
                <iframe
                src={embedSrc}
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 pointer-events-none" style={{ zIndex: 0 }}>
                  {mapPlaceholder ? (
                    <div style={{ color: textColor, opacity: 0.6 }}>
                      {mapPlaceholder}
                    </div>
                  ) : (
                    <>
                      <span className="text-6xl mb-4">📍</span>
                      <p style={{ color: textColor, opacity: 0.6, textAlign: 'center' }}>
                        Interactive Map Component
                      </p>
                      {mapImageHint ? (
                        <p className="text-sm mt-2" style={{ color: textColor, opacity: 0.6, textAlign: 'center' }}>
                          {mapImageHint}
                        </p>
                      ) : null}
                      {(hasMapEmbedInput || hasMapUrlInput) && !embedLooksValid ? (
                        <p className="text-sm mt-2" style={{ color: textColor, opacity: 0.6, textAlign: 'center' }}>
                          This URL can’t be embedded. Use Google Maps → Share → “Embed a map” and paste the iframe <span style={{ fontWeight: 700 }}>src</span> (or the full iframe code).
                        </p>
                      ) : (
                      <p className="text-sm mt-2" style={{ color: textColor, opacity: 0.4 }}>
                        Add a Map URL/Location, a Google Maps embed URL, or a direct map image URL.
                      </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Entrance Info Card */}
            {(entranceTitle || entranceDescription) && (
              <div
                className="rounded-xl p-6 border-l-4"
                style={{
                  backgroundColor: cardBackgroundColor,
                  borderLeftColor: buttonColor,
                  borderTopColor: cardBorderColor,
                  borderRightColor: cardBorderColor,
                  borderBottomColor: cardBorderColor,
                  borderTopWidth: '1px',
                  borderRightWidth: '1px',
                  borderBottomWidth: '1px',
                }}
              >
                {entranceTitle && (
                  <h3
                    className="text-lg font-bold mb-2"
                    style={{ color: resolvedEntranceTitleColor }}
                  >
                    {entranceTitle}
                  </h3>
                )}
                {entranceDescription && (
                  <p
                    className="text-sm mb-4 opacity-80"
                    style={{ color: textColor }}
                  >
                    {entranceDescription}
                  </p>
                )}
                {entranceLinkUrl && entranceLinkText && (
                  <a
                    href={entranceLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold"
                    style={{ color: buttonColor }}
                  >
                    {entranceLinkText}
                    <span>→</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Right: Directions */}
          <div>
            {titleValue && (
              <h2
                className={`${titleSizeClass} font-bold mb-8`}
                style={{ color: resolvedTitleColor }}
              >
                {title}
              </h2>
            )}

            <div className="space-y-6">
              {displayDirections.map((direction, idx) => {
                const titleValue = getStringValue(direction.title);
                const descriptionValue = getStringValue(direction.description);

                return (
                  <div key={direction.id || `direction-${idx}`} className="flex gap-4">
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{
                        backgroundColor: iconBackgroundColor,
                      }}
                    >
                      {direction.icon || '📍'}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      {titleValue && (
                        <h3
                          className="text-lg font-bold mb-2"
                          style={{ color: resolvedDirectionTitleColor }}
                        >
                          {direction.title}
                        </h3>
                      )}
                      {descriptionValue && (
                        <p
                          className="text-base leading-relaxed opacity-80"
                          style={{ color: resolvedDirectionTextColor }}
                        >
                          {direction.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4 flex-wrap">
              {renderButtons.map((btn, idx) => {
                const btnText = typeof btn.text === 'string' ? btn.text : btn.text?.props?.value || 'Button'
                const btnUrl = btn.url || '#'
                const btnColor = btn.color || buttonColor
                const btnTextColor = btn.textColor || buttonTextColor

                return (
                  <a
                    key={idx}
                    href={btnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: btnColor,
                      color: btnTextColor,
                    }}
                  >
                    {btn.text}
                    <span>→</span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default VenueDirections

