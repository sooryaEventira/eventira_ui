import React, { useMemo } from 'react'

export interface YouTubeVideoProps {
  videoUrl?: string
  autoplay?: boolean
  controls?: boolean
  startTime?: number
  height?: string
  heading?: string
  headingSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  headingAlignment?: 'left' | 'center' | 'right'
  headingColor?: string
  subheading?: string
  subheadingSize?: 'sm' | 'md' | 'lg'
  subheadingAlignment?: 'left' | 'center' | 'right'
  subheadingColor?: string
  containerWidth?: string
}

const isValidYouTubeId = (id: string) => /^[A-Za-z0-9_-]{11}$/.test(id)

// Extracts YouTube video ID from supported URL formats:
// - https://www.youtube.com/watch?v=VIDEO_ID
// - https://youtu.be/VIDEO_ID
// Also supports /embed/VIDEO_ID and /shorts/VIDEO_ID as a safe bonus.
export function extractYouTubeVideoId(input: string): string | null {
  const raw = (input || '').trim()
  if (!raw) return null

  try {
    const u = new URL(raw)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0] || ''
      return isValidYouTubeId(id) ? id : null
    }

    // youtube.com/watch?v=VIDEO_ID
    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v') || ''
        return isValidYouTubeId(id) ? id : null
      }

      // youtube.com/embed/VIDEO_ID
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts[0] === 'embed' && parts[1]) {
        return isValidYouTubeId(parts[1]) ? parts[1] : null
      }

      // youtube.com/shorts/VIDEO_ID
      if (parts[0] === 'shorts' && parts[1]) {
        return isValidYouTubeId(parts[1]) ? parts[1] : null
      }
    }

    return null
  } catch {
    return null
  }
}

const YouTubeVideo: React.FC<YouTubeVideoProps> = ({
  videoUrl = '',
  autoplay = false,
  controls = true,
  startTime,
  height = '',
  heading = '',
  headingSize = 'xl',
  headingAlignment = 'center',
  headingColor = '#000000',
  subheading = '',
  subheadingSize = 'md',
  subheadingAlignment = 'center',
  subheadingColor = '#666666',
  containerWidth = '100%',
}) => {
  const trimmedUrl = (videoUrl || '').trim()
  const normalizedHeight = (height || '').trim()
  const useFixedHeight = !!normalizedHeight && normalizedHeight.toLowerCase() !== 'auto'

  const headingSizeMap: Record<string, string> = {
    sm: '1.25rem',
    md: '1.5rem',
    lg: '1.875rem',
    xl: '2.25rem',
    '2xl': '3rem'
  }
  // Use mapped size, or treat as raw CSS (e.g. 2rem, 24px) for backwards compatibility
  const headingFontSize =
    headingSize && headingSizeMap[headingSize]
      ? headingSizeMap[headingSize]
      : headingSize && /^\d+(\.\d+)?(rem|px|em)$/.test(String(headingSize).trim())
        ? String(headingSize).trim()
        : headingSizeMap['xl']

  const subheadingSizeMap = {
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem'
  }

  const alignmentMap = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end'
  }

  const containerStyle = {
    width: containerWidth,
    margin: '0 auto',
  }

  const videoId = useMemo(() => {
    if (!trimmedUrl) return null
    return extractYouTubeVideoId(trimmedUrl)
  }, [trimmedUrl])

  const startSeconds = typeof startTime === 'number' && Number.isFinite(startTime) ? Math.max(0, Math.floor(startTime)) : 0

  const embedSrc = useMemo(() => {
    if (!videoId) return ''
    const params = new URLSearchParams()
    params.set('autoplay', autoplay ? '1' : '0')
    params.set('controls', controls ? '1' : '0')
    if (startSeconds > 0) params.set('start', String(startSeconds))

    // Optional: make autoplay more reliable
    if (autoplay) params.set('mute', '1')

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
  }, [autoplay, controls, startSeconds, videoId])

  if (!trimmedUrl) {
    return (
      <div style={containerStyle}>
        {heading && (
          <h2
            style={{
              fontSize: headingFontSize,
              textAlign: headingAlignment as any,
              color: headingColor,
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}
          >
            {heading}
          </h2>
        )}
        {subheading && (
          <p
            style={{
              fontSize: subheadingSizeMap[subheadingSize],
              textAlign: subheadingAlignment as any,
              color: subheadingColor,
              marginBottom: '1rem'
            }}
          >
            {subheading}
          </p>
        )}
        <div
          className={[
            useFixedHeight ? '' : 'aspect-video',
            'w-full rounded-xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center text-sm text-slate-500',
          ].join(' ')}
          style={useFixedHeight ? { height: normalizedHeight } : undefined}
        >
          Add a YouTube video URL
        </div>
      </div>
    )
  }

  if (!videoId) {
    return (
      <div style={containerStyle}>
        {heading && (
          <h2
            style={{
              fontSize: headingFontSize,
              textAlign: headingAlignment as any,
              color: headingColor,
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}
          >
            {heading}
          </h2>
        )}
        {subheading && (
          <p
            style={{
              fontSize: subheadingSizeMap[subheadingSize],
              textAlign: subheadingAlignment as any,
              color: subheadingColor,
              marginBottom: '1rem'
            }}
          >
            {subheading}
          </p>
        )}
        <div
          className={[useFixedHeight ? '' : 'aspect-video', 'w-[800px] pb-2 rounded-xl border border-slate-200 bg-white'].join(' ')}
          style={useFixedHeight ? { height: normalizedHeight } : undefined}
        />
        <div className="text-xs text-rose-600">Invalid YouTube URL. Please paste a full YouTube link.</div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {heading && (
        <h2
          style={{
            fontSize: headingFontSize,
            textAlign: headingAlignment as any,
            color: headingColor,
            marginBottom: '0.5rem',
            fontWeight: 'bold'
          }}
        >
          {heading}
        </h2>
      )}
      {subheading && (
        <p
          style={{
            fontSize: subheadingSizeMap[subheadingSize],
            textAlign: subheadingAlignment as any,
            color: subheadingColor,
            marginBottom: '1rem'
          }}
        >
          {subheading}
        </p>
      )}
      <div
        className={[
          useFixedHeight ? '' : 'aspect-video',
          'w-full overflow-hidden rounded-xl border border-slate-200 bg-black',
        ].join(' ')}
        style={useFixedHeight ? { height: normalizedHeight } : undefined}
      >
        <iframe
          title="YouTube video"
          src={embedSrc}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}

export default YouTubeVideo

