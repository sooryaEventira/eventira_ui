import React from 'react'

export interface ArticleLink {
  id?: string
  label: string
  url: string
  openInNewTab: boolean
  openInMobileApp?: boolean
}

export interface ArticleSection {
  id?: string
  type: 'heading' | 'paragraph' | 'image' | 'links'
  align?: 'left' | 'center' | 'right'
  // For heading section
  heading?: string | React.ReactElement
  headingColor?: string
  headingAlign?: 'left' | 'center' | 'right'
  headingSize?: string
  // For paragraph section
  paragraph?: string | React.ReactElement
  paragraphColor?: string
  // For image section
  imageUrl?: string
  imageHeight?: string
  imageText?: string | React.ReactElement
  imageTextPosition?: 'none' | 'left' | 'right' | 'below'
  imageTextColor?: string
  // For links section
  links?: ArticleLink[]
  linkDisplayStyle?: 'list' | 'buttons'
  linkColor?: string
  buttonColor?: string
  buttonTextColor?: string
}

export interface ArticleProps {
  sections?: ArticleSection[]
  backgroundColor?: string
  textColor?: string
  headingColor?: string
  linkColor?: string
  padding?: string
  maxWidth?: string
}

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const looksLikeHtml = (input: string) => /<[^>]+>/.test(input)

const toBasicParagraphHtml = (plainText: string) => {
  const chunks = plainText.split(/\n\n+/).map((c) => c.trim()).filter(Boolean)
  if (chunks.length === 0) return ''
  return chunks
    .map((c) => {
      const escaped = escapeHtml(c).replace(/\n/g, '<br />')
      return `<p>${escaped}</p>`
    })
    .join('')
}

const sanitizeHtml = (rawHtml: string) => {
  // Article content is user-authored. We still sanitize to prevent script injection.
  // This runs client-side only.
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return rawHtml
  }

  const allowedTags = new Set(['A', 'B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'UL', 'OL', 'LI', 'SPAN'])
  const allowedAttrs: Record<string, Set<string>> = {
    A: new Set(['href', 'target', 'rel']),
    SPAN: new Set([]),
  }

  const isSafeHref = (href: string) => {
    const h = (href || '').trim()
    if (!h) return false
    if (h.startsWith('#') || h.startsWith('/')) return true
    try {
      const u = new URL(h)
      return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol)
    } catch {
      // Relative URLs without leading slash are allowed (e.g. "page")
      return !h.toLowerCase().startsWith('javascript:')
    }
  }

  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')

  const walk = (node: Element) => {
    const children = Array.from(node.children)

    // Process children first so unwrapping works correctly.
    for (const child of children) {
      walk(child)
    }

    const tag = node.tagName
    if (!allowedTags.has(tag)) {
      // Unwrap node (keep its children)
      const parent = node.parentNode
      if (!parent) return
      while (node.firstChild) parent.insertBefore(node.firstChild, node)
      parent.removeChild(node)
      return
    }

    // Strip attributes
    const keep = allowedAttrs[tag] || new Set<string>()
    for (const attr of Array.from(node.attributes)) {
      if (!keep.has(attr.name)) {
        node.removeAttribute(attr.name)
      }
    }

    if (tag === 'A') {
      const href = node.getAttribute('href') || ''
      if (!isSafeHref(href)) {
        node.removeAttribute('href')
      }
      const target = node.getAttribute('target')
      if (target === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer')
      } else {
        node.removeAttribute('target')
        node.removeAttribute('rel')
      }
    }
  }

  // Remove script/style outright
  doc.querySelectorAll('script, style').forEach((el) => el.remove())
  Array.from(doc.body.children).forEach((child) => walk(child as Element))

  return doc.body.innerHTML
}

const Article: React.FC<ArticleProps> = ({
  sections = [],
  backgroundColor = '#ffffff',
  textColor = '#1f2937',
  headingColor = '#1f2937',
  linkColor = '#3b82f6',
  padding = '3rem 2rem',
  maxWidth = '800px'
}) => {
  // Extract string values from React elements (for Puck editor compatibility)
  const getStringValue = (prop: any): string => {
    if (typeof prop === 'string') return prop
    if (prop && typeof prop === 'object' && 'props' in prop && prop.props && 'value' in prop.props) {
      return prop.props.value || ''
    }
    return ''
  }

  // Handle link click
  const handleLinkClick = (e: React.MouseEvent, link: ArticleLink) => {
    if (!link.url || link.url === '#') {
      e.preventDefault()
      return
    }
    if (link.openInMobileApp) {
      e.preventDefault()
      // Attempt to open in mobile app via deep link; fall back to normal navigation if not installed
      window.location.href = `eventira://open?url=${encodeURIComponent(link.url)}`
      return
    }
    if (link.openInNewTab) {
      e.preventDefault()
      window.open(link.url, '_blank', 'noopener,noreferrer')
    }
  }

  // Normalize common non-direct image URLs (e.g. Unsplash photo page URLs) into an image src.
  const normalizeImageSrc = (raw: string): string => {
    const url = raw?.trim()
    if (!url) return ''

    try {
      const u = new URL(url)

      // Unsplash photo page URLs are HTML. Convert them to a direct image source URL.
      // Example: https://unsplash.com/photos/mailbox-and-sign-for-strawberry-hill-farm-TQSvFz7NHuo
      if (u.hostname.endsWith('unsplash.com')) {
        const match = u.pathname.match(/\/photos\/([^/?#]+)/)
        if (match) {
          const slug = match[1]
          const photoId = slug.split('-').pop()
          if (photoId) {
            // Source endpoint serves the image via redirect and works well in <img src="...">
            return `https://source.unsplash.com/${photoId}/1600x900`
          }
        }
      }

      return url
    } catch {
      // If it's not a valid URL (or relative), leave it unchanged
      return url
    }
  }

  // Render a section based on its type
  const renderSection = (section: ArticleSection, index: number) => {
    const sectionAlign = section.align ?? section.headingAlign ?? 'left'
    let imageTextValue: string = ''

    switch (section.type) {
      case 'heading': {
        const headingValue = getStringValue(section.heading)
        if (!headingValue) return null

        const fontSize = section.headingSize || '1.25rem'
        const align = section.headingAlign ?? sectionAlign ?? 'left'
        const color = section.headingColor || headingColor
        
        return (
          <h1
            key={section.id || `heading-${index}`}
            className="font-bold mb-6 leading-tight"
            style={{ color, textAlign: align, fontSize }}
          >
            {section.heading}
          </h1>
        )
      }

      case 'paragraph': {
        const paragraphValue = getStringValue(section.paragraph)
        if (!paragraphValue) return null

        const raw = paragraphValue
        const html = looksLikeHtml(raw) ? sanitizeHtml(raw) : toBasicParagraphHtml(raw)
        if (!html) return null
        const color = section.paragraphColor || textColor

        return (
          <div
            key={section.id || `paragraph-${index}`}
            className="prose prose-lg max-w-none mb-6"
            style={{ color, textAlign: sectionAlign }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      }

      case 'image': {
        const imageUrlValue = getStringValue(section.imageUrl)
        const normalizedSrc = normalizeImageSrc(imageUrlValue)
        if (!normalizedSrc) return null
        
        const imageHeight: string = section.imageHeight ?? '400px'

        const textPosition = section.imageTextPosition || 'none'
        const imageTextValue = section.imageText
                 ? getStringValue(section.imageText)
                 : ''

        const hasText = textPosition !== 'none' && imageTextValue
        const imageTextColor = section.imageTextColor || textColor
        
        const justify =
          sectionAlign === 'center'
            ? 'center'
            : sectionAlign === 'right'
              ? 'flex-end'
              : 'flex-start'
        
        // Render image with text if text position is set
        if (hasText && (textPosition === 'left' || textPosition === 'right')) {
          return (
            <div
              key={section.id || `image-${index}`}
              className="w-full mb-8"
              style={{ 
                display: 'flex', 
                flexDirection: textPosition === 'left' ? 'row-reverse' : 'row',
                gap: '1.5rem',
                alignItems: 'flex-start'
              }}
            >
              <div 
                className="rounded-lg overflow-hidden" 
                style={{ 
                  height: imageHeight, 
                  width: '50%',
                  flexShrink: 0
                }}
              >
                <img
                  src={normalizedSrc}
                  alt="Article image"
                  className="w-full h-full object-cover"
                  onLoad={(e) => {
                    e.currentTarget.style.display = ''
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <div 
                className="prose prose-lg flex-1" 
                style={{ color: imageTextColor }}
                dangerouslySetInnerHTML={{ __html: looksLikeHtml(imageTextValue) ? sanitizeHtml(imageTextValue) : toBasicParagraphHtml(imageTextValue) }}
              />
            </div>
          )
        }
        
        // Render image with text below
        if (hasText && textPosition === 'below') {
          return (
            <div key={section.id || `image-${index}`} className="w-full mb-8">
              <div
                className="w-full mb-4"
                style={{ display: 'flex', justifyContent: justify }}
              >
                <div className="w-full rounded-lg overflow-hidden" style={{ height: imageHeight, maxWidth: '100%' }}>
                  <img
                    src={normalizedSrc}
                    alt="Article image"
                    className="w-full h-full object-cover"
                    onLoad={(e) => {
                      e.currentTarget.style.display = ''
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              </div>
              <div 
                className="prose prose-lg max-w-none" 
                style={{ color: imageTextColor, textAlign: sectionAlign }}
                dangerouslySetInnerHTML={{ __html: looksLikeHtml(imageTextValue) ? sanitizeHtml(imageTextValue) : toBasicParagraphHtml(imageTextValue) }}
              />
            </div>
          )
        }
        
        // Render image without text (default)
        return (
          <div
            key={section.id || `image-${index}`}
            className="w-full mb-8"
            style={{ display: 'flex', justifyContent: justify }}
          >
            <div className="w-full rounded-lg overflow-hidden" style={{ height: imageHeight, maxWidth: '100%' }}>
              <img
                src={normalizedSrc}
                alt="Article image"
                className="w-full h-full object-cover"
                onLoad={(e) => {
                  e.currentTarget.style.display = ''
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          </div>
        )
      }

      case 'links': {
        const links = section.links || []
        if (links.length === 0) return null
        
        const displayStyle = section.linkDisplayStyle || 'list'
        const listLinkColor = section.linkColor || linkColor
        const buttonBg = section.buttonColor || linkColor
        const buttonText = section.buttonTextColor || '#ffffff'
        const justifyClass =
          sectionAlign === 'center'
            ? 'justify-center'
            : sectionAlign === 'right'
              ? 'justify-end'
              : 'justify-start'
        
        return (
          <div key={section.id || `links-${index}`} className="mb-1" style={{ textAlign: sectionAlign }}>
            {displayStyle === 'list' ? (
              // Vertical list style
              <ul className="space-y-3">
                {links.map((link, linkIndex) => (
                  <li key={link.id || `link-${linkIndex}`}>
                    <a
                      href={link.url}
                      onClick={(e) => handleLinkClick(e, link)}
                      className="inline-flex items-center gap-2 font-semibold transition-opacity hover:opacity-80 underline"
                      style={{ color: listLinkColor }}
                      {...(link.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
                    >
                      {link.label}
                      {link.openInNewTab && (
                        <span className="text-xs">↗</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              // Inline buttons style
              <div className={`flex flex-wrap gap-3 ${justifyClass}`}>
                {links.map((link, linkIndex) => (
                  <a
                    key={link.id || `link-${linkIndex}`}
                    href={link.url}
                    onClick={(e) => handleLinkClick(e, link)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
                    style={{
                      backgroundColor: buttonBg,
                      color: buttonText
                    }}
                    {...(link.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
                  >
                    {link.label}
                    {link.openInNewTab && (
                      <span className="text-xs">↗</span>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        )
      }

      default: return null
    }
  }

  return (
    <article
      className="w-full"
      style={{
        backgroundColor,
        padding
      }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth }}
      >
        {sections.length > 0 ? (
          sections.map((section, index) => renderSection(section, index))
        ) : (
          <div className="text-center py-12">
            <p style={{ color: textColor, opacity: 0.5 }}>
              No sections added yet. Add sections in the property sidebar.
            </p>
          </div>
        )}
      </div>
    </article>
  )
}

export default Article
