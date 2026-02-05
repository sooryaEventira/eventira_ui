import React from 'react'
import { SessionDraft } from './sessionTypes'
import SessionChat, { type CometChatUser } from './SessionChat'

interface SessionSummaryViewProps {
  session: SessionDraft
  /** When viewing a saved session, pass its id so the Chat section can scope the group. */
  sessionId?: string
  /** Event id – used with sessionId to scope the chat group. */
  eventId?: string
  /** Current user (attendee/speaker) for CometChat – when provided, chat is interactive. */
  cometChatUser?: CometChatUser | null
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

const formatTime = (time: string, period: 'AM' | 'PM') => {
  if (!time) return ''

  const [hourPart, minutePart = '00'] = time.split(':')
  const hourValue = Number.parseInt(hourPart, 10)

  if (Number.isNaN(hourValue)) {
    return `${time} ${period}`
  }

  const normalizedHour = ((hourValue % 12) + 12) % 12 || 12
  const formattedMinutes = minutePart.padStart(2, '0')

  return `${normalizedHour}:${formattedMinutes} ${period}`
}

const SessionSummaryView: React.FC<SessionSummaryViewProps> = ({
  session,
  sessionId: sessionIdProp,
  eventId,
  cometChatUser
}) => {
  if (!session) {
    return (
      <div className="px-6 py-4 text-sm text-slate-500">
        No session data to display.
      </div>
    )
  }

  const sessionId = sessionIdProp ?? (session as { id?: string }).id
  const startLabel = formatTime(session.startTime ?? '', session.startPeriod ?? 'AM')
  const endLabel = formatTime(session.endTime ?? '', session.endPeriod ?? 'AM')
  const timeRange =
    startLabel && endLabel ? `${startLabel} - ${endLabel}` : startLabel || endLabel

  const tags = Array.isArray(session.tags) ? session.tags : []
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
    ...tags.map((tag) => ({
      id: `tag-${tag}`,
      label: tag,
      intent: 'tag'
    }))
  ].filter(Boolean) as Array<{ id: string; label: string; intent?: 'tag' }>

  return (
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
                    ? 'bg-rose-100 text-rose-700'
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
                {section.type === 'text' ? 'Description' : section.title}
              </p>
              {section.type === 'live-chat' ? (
                <SessionChat
                  sessionId={sessionId ?? section.id}
                  eventId={eventId}
                  cometChatUser={cometChatUser}
                  sessionTitle={session.title || undefined}
                  height={360}
                />
              ) : section.type === 'video' && (section.data?.videoUrl || section.data?.video_url) ? (
                (() => {
                  const videoUrl = String(section.data?.videoUrl ?? section.data?.video_url ?? '').trim()
                  const ytEmbed = getYouTubeEmbedUrl(videoUrl)
                  if (ytEmbed) {
                    return (
                      <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-900" style={{ paddingBottom: '56.25%', position: 'relative' }}>
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
                    <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                      <video
                        src={videoUrl}
                        controls
                        playsInline
                        className="w-full max-h-80 object-contain"
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
                      <span className="font-medium text-slate-800">{s.name}</span>
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
                const imgSrc = (typeof previewUrl === 'string' && previewUrl ? previewUrl : null) || (url?.trim() || '') || null
                return imgSrc ? (
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
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
                const images = (section.data?.images as Array<{ file?: File; previewUrl: string }>) ?? []
                if (images.length === 0) {
                  return (
                    <p className="text-sm leading-6 text-slate-600">
                      {section.description || 'No images in gallery yet.'}
                    </p>
                  )
                }
                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {images.slice(0, 6).map((img, i) => (
                        <div key={i} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          <img
                            src={img.previewUrl}
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
                      <p className="text-xs text-slate-500">+{images.length - 6} more image(s)</p>
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
  )
}

export default SessionSummaryView

