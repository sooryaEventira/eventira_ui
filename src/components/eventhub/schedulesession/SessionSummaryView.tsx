import React, { useState } from 'react'
import { SessionDraft } from './sessionTypes'
import { sectionOptions } from './sessionConfig'
import { type CometChatUser } from './SessionChat'
import InlineSessionComments from '../../public/schedule/InlineSessionComments'
import { env } from '../../../config/env'
import ImageLightbox from '../../ui/untitled/ImageLightbox'

function toAbsoluteMediaUrl(url: string): string {
  const raw = String(url || '').trim()
  if (!raw || raw.startsWith('http://') || raw.startsWith('https://')) return raw
  const base = (env.AUTH_API_URL || '').replace(/\/$/, '')
  return base && raw.startsWith('/') ? `${base}${raw}` : raw
}

interface SessionSummaryViewProps {
  session: SessionDraft
  /** When viewing a saved session, pass its id so the Chat section can scope the group. */
  sessionId?: string
  /** Event id – used with sessionId to scope the chat group. */
  eventId?: string
  /** Current user (attendee/speaker) for CometChat – when provided, chat is interactive. */
  cometChatUser?: CometChatUser | null
  /** Optional tag options (uuid + name) so we can display friendly tag names instead of UUIDs. */
  tagOptions?: Array<{ uuid: string; name: string }>
  /** Whether this is being rendered on a public page (uses public comment service instead of CometChat). */
  isPublic?: boolean
  /** When true, renders the live-chat section with auth-aware button for public attendees. */
  isPublicView?: boolean
  /** Called when unauthenticated user clicks "Login to open chat" — navigation handled by caller. */
  onLoginClick?: () => void
  /** Called when authenticated user clicks "Open chat". */
  onChatOpen?: () => void
  /** When true, disables the "Open chat" button (chat is already open). */
  chatOpen?: boolean
  /** Called when a speaker name is clicked — receives the speaker uuid. Only used on public pages. */
  onSpeakerClick?: (speakerUuid: string) => void
}

/** Get YouTube embed URL from watch URL, youtu.be, Shorts, or existing embed URL. */
function getYouTubeEmbedUrl(input: string): string {
  const raw = String(input || '').trim()
  if (!raw) return ''
  const watchMatch = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (watchMatch?.[1]) return `https://www.youtube.com/embed/${watchMatch[1]}`
  const shortsMatch = raw.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
  if (shortsMatch?.[1]) return `https://www.youtube.com/embed/${shortsMatch[1]}`
  if (raw.includes('youtube.com/embed/')) return raw
  return ''
}

// Display time in 24-hour format (to match grid and edit form),
// while underlying data is stored as 12-hour time + period.
const formatTime = (time: string, period: 'AM' | 'PM') => {
  const rawTime = (time || '').trim()
  if (!rawTime) return ''

  const [hourPart, minutePart = '00'] = rawTime.split(':')
  const hourValue = Number.parseInt(hourPart, 10)
  const minuteValue = Number.parseInt(minutePart, 10)

  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
    return rawTime
  }

  const p = (period || 'AM').toUpperCase() as 'AM' | 'PM'
  let hours24 = hourValue % 12
  if (p === 'PM') hours24 += 12
  if (p === 'AM' && hourValue === 12) hours24 = 0

  const hh = String(hours24).padStart(2, '0')
  const mm = String(minuteValue).padStart(2, '0')
  return `${hh}:${mm}`
}

const SessionSummaryView: React.FC<SessionSummaryViewProps> = ({
  session,
  sessionId,
  eventId,
  cometChatUser: _cometChatUser,
  tagOptions,
  isPublicView = false,
  onLoginClick,
  onChatOpen,
  chatOpen = false,
  onSpeakerClick,
}) => {
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)

  if (!session) {
    return (
      <div className="px-6 py-4 text-sm text-slate-500">
        No session data to display.
      </div>
    )
  }

  const startLabel = formatTime(session.startTime ?? '', session.startPeriod ?? 'AM')
  const endLabel = formatTime(session.endTime ?? '', session.endPeriod ?? 'AM')
  const timeRange =
    startLabel && endLabel ? `${startLabel} - ${endLabel}` : startLabel || endLabel

  const tags = Array.isArray(session.tags) ? session.tags : []
  const displayTags = tags.map((tag) => {
    if (typeof tag !== 'string') return String(tag)
    const fromOptions = tagOptions?.find((opt) => opt.uuid === tag || opt.name === tag)
    return fromOptions?.name ?? tag
  })
  const metadataChips = [
    timeRange && {
      id: 'time-range',
      label: timeRange
    },
    session.location && {
      id: 'location',
      label: session.location
    },
    session.sessionType && {
      id: 'type',
      label: session.sessionType
    },
    ...displayTags.map((tag) => ({
      id: `tag-${tag}`,
      label: tag,
      intent: 'tag'
    }))
  ].filter(Boolean) as Array<{ id: string; label: string; intent?: 'tag' }>

  return (
    <>
    <div className="flex flex-col gap-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">
          {session.title || 'Session title'}
        </h2>

        {metadataChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {metadataChips.map((chip) => (
              <span
                key={chip.id}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  chip.intent === 'tag'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {(session.sections ?? []).length > 0 ? (
          (session.sections ?? []).map((section) => (
            <section key={section.id} className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {section.type === 'text' ? 'Description' : (sectionOptions.find(o => o.id === section.type)?.label ?? section.title)}
              </p>
              {section.type === 'comments' ? (
                isPublicView && eventId && sessionId ? (
                  <InlineSessionComments
                    eventUuid={eventId}
                    sessionUuid={sessionId}
                    isPublicView={isPublicView}
                    onLoginClick={onLoginClick}
                  />
                ) : (
                  /* CMS preview */
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex flex-col gap-3 px-4 py-4">
                      <p className="text-center text-sm text-slate-400">Session comments</p>
                      <button type="button" disabled className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm">
                        Comment
                      </button>
                    </div>
                  </div>
                )
              ) : section.type === 'live-chat' ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
                    <p className="text-sm text-slate-500">
                      Join the conversation to interact with panelists and others watching this livestream.
                    </p>
                    {isPublicView ? (
                      (() => {
                        const isAuthenticated = Boolean(localStorage.getItem('pub_accessToken'))
                        return (
                          <button
                            type="button"
                            disabled={isAuthenticated && chatOpen}
                            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={isAuthenticated ? onChatOpen : onLoginClick}
                          >
                            {isAuthenticated ? 'Open chat' : 'Login to open chat'}
                          </button>
                        )
                      })()
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                      >
                        Open chat
                      </button>
                    )}
                  </div>
                </div>
              ) : section.type === 'video' && (section.data?.videoUrl || section.data?.video_url) ? (
                (() => {
                  const videoUrl = String(section.data?.videoUrl ?? section.data?.video_url ?? '').trim()
                  const ytEmbed = getYouTubeEmbedUrl(videoUrl)
                  if (ytEmbed) {
                    return (
                      <div
                        className="rounded-lg overflow-hidden border border-slate-200 bg-slate-900 max-w-3xl mx-auto"
                        style={{ paddingBottom: '56.25%', position: 'relative' }}
                      >
                        <iframe
                          title="YouTube video"
                          className="absolute inset-0 h-full w-full"
                          src={ytEmbed}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )
                  }
                  return (
                    <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-900 max-w-3xl mx-auto">
                      <video
                        src={toAbsoluteMediaUrl(videoUrl)}
                        controls
                        playsInline
                        className="w-full h-auto max-h-80 object-contain"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )
                })()
              ) : section.type === 'video' ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {section.description || 'Video added'}
                </div>
              ) : section.type === 'resources' ? (() => {
                const rawFiles = section.data?.files
                const fileNames = Array.isArray(section.data?.fileNames) && section.data.fileNames.length > 0
                  ? section.data.fileNames as string[]
                  : []
                const fileItems: { name: string; url?: string }[] = []
                if (Array.isArray(rawFiles) && rawFiles.length > 0) {
                  rawFiles.forEach((f: File | string | { name?: string; url?: string }) => {
                    if (f instanceof File) {
                      fileItems.push({ name: f.name })
                    } else if (typeof f === 'string') {
                      fileItems.push({ name: f.split('/').pop() ?? f, url: f })
                    } else if (f && typeof f === 'object' && (f.name || f.url)) {
                      fileItems.push({ name: f.name ?? f.url?.split('/').pop() ?? 'File', url: f.url })
                    }
                  })
                }
                if (fileItems.length === 0 && fileNames.length > 0) {
                  fileNames.forEach((n) => fileItems.push({ name: n }))
                }
                return fileItems.length > 0 ? (
                  <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                    {fileItems.map((item, i) => (
                      <li
                        key={`${item.name}-${i}`}
                        className="flex items-center gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-primary hover:underline" title={item.name}>
                            {item.name}
                          </a>
                        ) : (
                          <span className="min-w-0 truncate" title={item.name}>{item.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-slate-600">
                    {section.description || 'No files added yet.'}
                  </p>
                )
              })() : (section.type === 'speakers' || section.type === 'speaker') && Array.isArray(section.data?.speakers) && section.data.speakers.length > 0 ? (
                <ul className="space-y-2">
                  {section.data.speakers.map((s: { id: string; name: string; role: string }, i: number) => (
                    <li key={s.id || i} className="text-sm text-slate-600">
                      {onSpeakerClick && s.id ? (
                        <button
                          type="button"
                          onClick={() => onSpeakerClick(s.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {s.name}
                        </button>
                      ) : (
                        <span className="font-medium text-slate-800">{s.name}</span>
                      )}
                      {s.role ? <span className="text-slate-500"> – {s.role}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : section.type === 'hyperlink' && Array.isArray(section.data?.hyperlinks) && section.data.hyperlinks.length > 0 ? (
                <ul className="space-y-1">
                  {section.data.hyperlinks.map((href: string, i: number) => (
                    <li key={i}>
                      <a
                        href={href.startsWith('http') ? href : `https://${href}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {href}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : section.type === 'slides' || section.type === 'image' ? (() => {
                const url = section.data?.url as string | undefined
                const previewUrl = section.data?.previewUrl as string | undefined
                const imgSrc = toAbsoluteMediaUrl(
                  (typeof previewUrl === 'string' && previewUrl ? previewUrl : null) ||
                  (url?.trim() || '') ||
                  ''
                ) || null
                return imgSrc ? (
                  <div
                    className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 cursor-zoom-in"
                    onClick={() => setLightbox({ images: [imgSrc], index: 0 })}
                  >
                    <img
                      src={imgSrc}
                      alt={section.type === 'slides' ? 'Slides/Poster' : 'Image'}
                      className="h-48 w-full object-contain object-center"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-600">
                    {section.description || (section.type === 'slides' ? 'No slide/poster added yet.' : 'No image added yet.')}
                  </p>
                )
              })() : section.type === 'photo-gallery' ? (() => {
                const images = (section.data?.images as Array<{ file?: File; previewUrl?: string; url?: string }>) ?? []
                if (images.length === 0) {
                  return (
                    <p className="text-sm leading-6 text-slate-600">
                      {section.description || 'No images in gallery yet.'}
                    </p>
                  )
                }
                const galleryUrls = images.map((img) => toAbsoluteMediaUrl(img.previewUrl || img.url || '')).filter(Boolean)
                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {images.slice(0, 6).map((img, i) => (
                        <div
                          key={i}
                          className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 cursor-zoom-in"
                          onClick={() => setLightbox({ images: galleryUrls, index: i })}
                        >
                          <img
                            src={toAbsoluteMediaUrl(img.previewUrl || img.url || '')}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    {images.length > 6 && (
                      <p className="text-xs text-slate-500 cursor-zoom-in" onClick={() => setLightbox({ images: galleryUrls, index: 6 })}>
                        +{images.length - 6} more image(s)
                      </p>
                    )}
                  </div>
                )
              })() : section.type === 'button' ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">
                    {section.description?.trim() || 'Add to my schedule'}
                  </button>
                </div>
              ) : section.type === 'location' ? (() => {
                const embedRaw = String(section.data?.embed ?? section.description ?? '').trim()
                const embedSrc = embedRaw
                  ? (embedRaw.match(/src\s*=\s*["']([^"']+)["']/i)?.[1]?.trim() || (embedRaw.startsWith('http') ? embedRaw : ''))
                  : ''
                return embedSrc ? (
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="h-44 w-full">
                      <iframe
                        title="Location map"
                        className="h-full w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={embedSrc}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-600">
                    {section.description || 'No map added yet.'}
                  </p>
                )
              })() : (
                <p className="text-sm leading-6 text-slate-600">
                  {section.description || 'No additional details for this section yet.'}
                </p>
              )}
            </section>
          ))
        ) : (
          <p className="text-sm text-slate-500">No sections have been added yet.</p>
        )}
      </div>
    </div>

    {lightbox && (
      <ImageLightbox
        images={lightbox.images}
        currentIndex={lightbox.index}
        onClose={() => setLightbox(null)}
        onNavigate={(index) => setLightbox((prev) => prev ? { images: prev.images, index } : null)}
      />
    )}
    </>
  )
}

export default SessionSummaryView

