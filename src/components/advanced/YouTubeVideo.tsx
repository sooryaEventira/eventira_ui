import React, { useMemo } from 'react'

export interface YouTubeVideoProps {
  videoUrl?: string
  autoplay?: boolean
  controls?: boolean
  startTime?: number
  /**
   * Optional fixed height for the player container (e.g. "360px").
   * If empty/undefined/"auto", the component stays responsive with a 16:9 aspect ratio.
   */
  height?: string
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
}) => {
  const trimmedUrl = (videoUrl || '').trim()
  const normalizedHeight = (height || '').trim()
  const useFixedHeight = !!normalizedHeight && normalizedHeight.toLowerCase() !== 'auto'

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
      <div className="w-full">
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
      <div className="w-full space-y-2">
        <div
          className={[useFixedHeight ? '' : 'aspect-video', 'w-full rounded-xl border border-slate-200 bg-white'].join(' ')}
          style={useFixedHeight ? { height: normalizedHeight } : undefined}
        />
        <div className="text-xs text-rose-600">Invalid YouTube URL. Please paste a full YouTube link.</div>
      </div>
    )
  }

  return (
    <div className="w-full">
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

