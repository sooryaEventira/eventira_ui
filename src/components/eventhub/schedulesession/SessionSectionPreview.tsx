import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Upload01, XClose, Plus, SearchLg, Folder} from '@untitled-ui/icons-react'
import type { SessionSection } from './sessionTypes'
import { fetchParticipants, type ParticipantData } from '../../../services/participantService'
import { env } from '../../../config/env'

/** Resolve relative/media paths to absolute URL so the video element can load them (avoids "No video with supported format" when backend returns e.g. /media/...). */
function toAbsoluteMediaUrl(url: string): string {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (raw.startsWith('blob:') || raw.startsWith('data:')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  const base = (env.AUTH_API_URL || '').replace(/\/$/, '')
  if (!base) return raw
  return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`
}

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=1200&auto=format&fit=crop&q=60'

function parseEmbedToSrc(input: string): string {
  const raw = String(input || '').trim()
  if (!raw) return ''
  const srcMatch = raw.match(/src\s*=\s*["']([^"']+)["']/i)
  if (srcMatch?.[1]) return srcMatch[1].trim()
  return raw
}

/** Get YouTube embed URL from watch URL, youtu.be, Shorts, or existing embed URL. */
function getYouTubeEmbedUrl(input: string): string {
  const raw = String(input || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./i, '').toLowerCase()
    let videoId = ''
    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] || ''
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v') || ''
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/')[2] || ''
      } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.split('/')[2] || ''
      }
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`
    }
  } catch {
    // ignore URL parse failures and fallback to regex parsing below
  }
  const watchMatch = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (watchMatch?.[1]) return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}?rel=0&modestbranding=1`
  const shortsMatch = raw.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
  if (shortsMatch?.[1]) return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}?rel=0&modestbranding=1`
  if (raw.includes('youtube.com/embed/')) return raw.replace('youtube.com/embed/', 'youtube-nocookie.com/embed/')
  return ''
}

export interface SessionSectionPreviewHandlers {
  onUpdateSection: (sectionId: string, patch: Partial<SessionSection>) => void
  galleryCurrentIndex: Record<string, number>
  onGalleryIndexChange: (sectionId: string, index: number) => void
  onOpenSectionImagePicker: (sectionId: string) => void
  /** Open file picker for slides sections — accepts images and documents (PDF/PPT). */
  onOpenSlidesFilePicker?: (sectionId: string) => void
  /** Remove a file from a slides section by index. */
  onRemoveSlidesFile?: (sectionId: string, index: number) => void
  onRemoveSectionImage: (sectionId: string) => void
  onOpenGalleryPicker: (sectionId: string) => void
  onRemoveGalleryImage: (sectionId: string, index: number) => void
  onOpenResourcesPicker: (sectionId: string) => void
  /** Open file picker to upload image(s) into the Resources section. */
  onOpenResourcesImagePicker?: (sectionId: string) => void
  onRemoveResourcesFile: (sectionId: string, index: number) => void
  /** Open file picker to upload a video file for video section. */
  onOpenVideoUploadPicker?: (sectionId: string) => void
  /** Open resource management picker to select a video for video section. */
  onOpenVideoResourcePicker?: (sectionId: string) => void
  /** Open resource management picker to select an image for image section. */
  onOpenImageResourcePicker?: (sectionId: string) => void
  /** When set, Speakers section can open search to add event speakers. */
  eventUuid?: string
  /** Add a speaker to a Speakers section. Required for "Add user" to work. */
  onAddSpeakerToSection?: (sectionId: string, speaker: { id: string; name: string; role?: string }) => void
}

export interface SessionSectionPreviewProps {
  section: SessionSection
  handlers: SessionSectionPreviewHandlers
}

function getSpeakerDisplayName(s: ParticipantData): string {
  if (s.name && String(s.name).trim()) return String(s.name).trim()
  const first = s.first_name ? String(s.first_name).trim() : ''
  const last = s.last_name ? String(s.last_name).trim() : ''
  return [first, last].filter(Boolean).join(' ') || 'Participant'
}


const SessionSectionPreview: React.FC<SessionSectionPreviewProps> = ({ section, handlers }) => {
  const {
    onUpdateSection,
    galleryCurrentIndex,
    onGalleryIndexChange,
    onOpenSectionImagePicker,
    onOpenSlidesFilePicker,
    onRemoveSlidesFile,
    onRemoveSectionImage,
    onOpenGalleryPicker,
    onRemoveGalleryImage,
    onOpenResourcesPicker,
    onOpenResourcesImagePicker,
    onRemoveResourcesFile,
    onOpenVideoUploadPicker,
    onOpenVideoResourcePicker,
    onOpenImageResourcePicker,
    eventUuid,
    onAddSpeakerToSection
  } = handlers

  const [showSpeakerSearch, setShowSpeakerSearch] = useState(false)
  const [speakerSearchSectionId, setSpeakerSearchSectionId] = useState<string | null>(null)
  const [speakerSearchQuery, setSpeakerSearchQuery] = useState('')
  const [speakerSearchRole, setSpeakerSearchRole] = useState<'Chairman' | 'Panelist' | 'Speaker'>('Chairman')
  const [speakersList, setSpeakersList] = useState<ParticipantData[]>([])
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false)
  const [speakerSearchPosition, setSpeakerSearchPosition] = useState<{ top: number; left: number; openUpward?: boolean } | null>(null)
  const speakerSearchAnchorRef = useRef<HTMLButtonElement | null>(null)
  const speakerSearchInputRef = useRef<HTMLInputElement | null>(null)

  const loadSpeakers = useCallback(async () => {
    if (!eventUuid) return
    setIsLoadingSpeakers(true)
    try {
      const result = await fetchParticipants(eventUuid, 1, undefined, undefined, 1000)
      setSpeakersList(Array.isArray(result.data) ? result.data : [])
    } catch {
      setSpeakersList([])
    } finally {
      setIsLoadingSpeakers(false)
    }
  }, [eventUuid])

  const openSpeakerSearch = (sectionId: string) => {
    setSpeakerSearchSectionId(sectionId)
    setShowSpeakerSearch(true)
    setSpeakerSearchQuery('')
    if (eventUuid && speakersList.length === 0) {
      loadSpeakers()
    }
    setTimeout(() => speakerSearchInputRef.current?.focus(), 100)
  }

  useEffect(() => {
    if (
      (section.type === 'speakers' || section.type === 'speaker') &&
      eventUuid &&
      Array.isArray(section.data?.speaker_uuids) &&
      section.data.speaker_uuids.length > 0 &&
      speakersList.length === 0 &&
      !isLoadingSpeakers
    ) {
      loadSpeakers()
    }
  }, [section.type, section.data?.speaker_uuids, eventUuid, speakersList.length, isLoadingSpeakers, loadSpeakers])

  useLayoutEffect(() => {
    if (!showSpeakerSearch || !speakerSearchAnchorRef.current) return
    const el = speakerSearchAnchorRef.current
    const rect = el.getBoundingClientRect()
    const listMaxHeight = Math.min(400, window.innerHeight * 0.6)
    const dropdownHeight = 56 + listMaxHeight + 16
    const spaceBelow = window.innerHeight - (rect.bottom + 4)
    const openUpward = spaceBelow < Math.min(dropdownHeight, 280)
    setSpeakerSearchPosition({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      openUpward
    })
  }, [showSpeakerSearch])

  const closeSpeakerSearch = () => {
    setShowSpeakerSearch(false)
    setSpeakerSearchSectionId(null)
    setSpeakerSearchQuery('')
    setSpeakerSearchPosition(null)
  }

  const handleAddSpeakerFromSearch = (speaker: ParticipantData) => {
    const sectionId = speakerSearchSectionId
    if (!sectionId || !onAddSpeakerToSection) return
    const id = String(speaker.uuid ?? speaker.id ?? `participant-${Date.now()}`)
    const name = getSpeakerDisplayName(speaker)
    onAddSpeakerToSection(sectionId, { id, name, role: speakerSearchRole })
    closeSpeakerSearch()
  }

  const handleAddPlaceholderSpeaker = (sectionId: string) => {
    if (!onAddSpeakerToSection) return
    onAddSpeakerToSection(sectionId, {
      id: `speaker-${Date.now()}`,
      name: 'Speaker Name',
      role: 'Chairman'
    })
  }

  if (section.type === 'photo-gallery') {
    const images = (section.data?.images as Array<{ file?: File; previewUrl?: string; url?: string }>) ?? []
    const currentIdx = galleryCurrentIndex[section.id] ?? 0
    const safeIdx = images.length ? Math.min(currentIdx, images.length - 1) : 0
    const currentImage = images[safeIdx]
    const displaySrc = toAbsoluteMediaUrl(currentImage?.previewUrl || currentImage?.url || '') || PLACEHOLDER_IMG
    return (
      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenGalleryPicker(section.id)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Upload01 className="h-4 w-4" />
            Upload images
          </button>
        </div>
        <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="relative h-40 w-full bg-slate-100">
            <img
              src={displaySrc}
              alt="Photo gallery"
              className="h-full w-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER_IMG
              }}
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onGalleryIndexChange(section.id, Math.max(0, safeIdx - 1))}
                  disabled={safeIdx <= 0}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow disabled:opacity-50"
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onGalleryIndexChange(section.id, Math.min(images.length - 1, safeIdx + 1))
                  }
                  disabled={safeIdx >= images.length - 1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow disabled:opacity-50"
                  aria-label="Next"
                >
                  ›
                </button>
              </>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700 shadow">
              <span className="inline-flex items-center gap-1">
                {images.length
                  ? images.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${i === safeIdx ? 'bg-primary' : 'bg-slate-300'}`}
                      />
                    ))
                  : [
                      <span key="0" className="h-1.5 w-1.5 rounded-full bg-slate-300" />,
                      <span key="1" className="h-1.5 w-1.5 rounded-full bg-slate-300" />,
                      <span key="2" className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    ]}
              </span>
            </div>
          </div>
        </div>
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img
                  src={toAbsoluteMediaUrl(img.previewUrl || img.url || '') || PLACEHOLDER_IMG}
                  alt=""
                  className="h-14 w-14 rounded border border-slate-200 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PLACEHOLDER_IMG
                  }}
                />
                <button
                  type="button"
                  onClick={() => onRemoveGalleryImage(section.id, i)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  aria-label="Remove image"
                >
                  <XClose className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (section.type === 'slides' || section.type === 'image') {
    const isSlides = section.type === 'slides'

    if (isSlides) {
      const files = (section.data?.files as Array<File | { url?: string; name: string; resourceId?: string }>) ?? []
      return (
        <div className="p-4">
          <div className="mb-3">
            <button
              type="button"
              onClick={() => (onOpenSlidesFilePicker ?? onOpenSectionImagePicker)(section.id)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Upload01 className="h-4 w-4" />
              Upload file
            </button>
          </div>
          {files.length === 0 ? (
            <p className="text-sm text-slate-400">No files added yet.</p>
          ) : (
            <ul className="space-y-2">
              {files.map((f, i) => {
                const name = f instanceof File ? f.name : (f.name || f.url?.split('/').pop() || 'File')
                return (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate text-sm text-slate-700">{name}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveSlidesFile?.(section.id, i)}
                      className="shrink-0 text-slate-400 hover:text-red-500"
                      aria-label="Remove file"
                    >
                      <XClose className="h-4 w-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )
    }

    // image section (single image)
    const urlValue = String(section.data?.url ?? '').trim()
    const previewUrl = section.data?.previewUrl
    const imgSrc = toAbsoluteMediaUrl(
      (typeof previewUrl === 'string' && previewUrl ? previewUrl : null) || urlValue || ''
    ) || PLACEHOLDER_IMG
    const hasImage = section.data?.file != null || !!urlValue || (typeof previewUrl === 'string' && !!previewUrl)
    return (
      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenSectionImagePicker(section.id)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Upload01 className="h-4 w-4" />
            Upload image
          </button>
          {onOpenImageResourcePicker && eventUuid && (
            <button
              type="button"
              onClick={() => onOpenImageResourcePicker(section.id)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Folder className="h-4 w-4" />
              From Resource Management
            </button>
          )}
          {hasImage && (
            <button
              type="button"
              onClick={() => onRemoveSectionImage(section.id)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Remove
            </button>
          )}
        </div>
        <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          <img
            key={imgSrc}
            src={imgSrc}
            alt="Image"
            className="h-32 w-48 rounded-md object-cover object-center shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG }}
          />
        </div>
      </div>
    )
  }

  if (section.type === 'button') {
    return (
      <div className="p-4">
        <button
          type="button"
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm"
        >
          Add to my schedule
        </button>
      </div>
    )
  }

  if (section.type === 'location') {
    const embedValue = String(section.data?.embed ?? section.description ?? '').trim()
    const embedSrc =
      parseEmbedToSrc(embedValue) || 'https://www.google.com/maps?q=Melbourne&output=embed'
    return (
      <div className="p-4">
        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-slate-700">Embed map</label>
          <textarea
            value={embedValue}
            onChange={(e) =>
              onUpdateSection(section.id, { data: { ...(section.data || {}), embed: e.target.value } })
            }
            rows={3}
            placeholder='Paste Google Maps embed iframe or embed URL (src="...")'
            className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="h-44 w-full">
            <iframe
              title="Map"
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={embedSrc}
            />
          </div>
        </div>
      </div>
    )
  }

  if (section.type === 'resources') {
    const rawFiles = section.data?.files
    const rawFileNames = section.data?.fileNames as string[] | undefined
    const rawFile = section.data?.file as string | undefined
    const fileItems: { name: string; url?: string; isFile: boolean; index: number }[] = []
    if (Array.isArray(rawFiles) && rawFiles.length > 0) {
      rawFiles.forEach((f: File | string | { name?: string; url?: string }, i: number) => {
        if (f instanceof File) {
          fileItems.push({ name: f.name, isFile: true, index: i })
        } else if (typeof f === 'string') {
          const name = f.split('/').pop() ?? f
          fileItems.push({ name, url: f, isFile: false, index: i })
        } else if (f && typeof f === 'object' && (f.name || f.url)) {
          fileItems.push({ name: (f as { name?: string }).name ?? (f as { url?: string }).url?.split('/').pop() ?? 'File', url: (f as { url?: string }).url, isFile: false, index: i })
        }
      })
    }
    if (Array.isArray(rawFileNames) && rawFileNames.length > 0 && fileItems.length === 0) {
      rawFileNames.forEach((name, i) => fileItems.push({ name, isFile: false, index: i }))
    }
    if (rawFile && typeof rawFile === 'string' && fileItems.length === 0) {
      fileItems.push({ name: rawFile.split('/').pop() ?? rawFile, url: rawFile, isFile: false, index: 0 })
    }
    return (
      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenResourcesPicker(section.id)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Upload01 className="h-4 w-4" />
            Upload docs
          </button>
          {onOpenResourcesImagePicker && (
            <button
              type="button"
              onClick={() => onOpenResourcesImagePicker(section.id)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Upload01 className="h-4 w-4" />
              Upload image
            </button>
          )}
        </div>
        {fileItems.length > 0 ? (
          <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
            {fileItems.map((item) => (
              <li
                key={`${item.name}-${item.index}`}
                className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-primary hover:underline" title={item.name}>
                    {item.name}
                  </a>
                ) : (
                  <span className="min-w-0 truncate" title={item.name}>
                    {item.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveResourcesFile(section.id, item.index)}
                  className="shrink-0 p-1 text-slate-400 hover:text-red-600"
                  aria-label={`Remove ${item.name}`}
                >
                  <XClose className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
            No files uploaded. Use &quot;Upload docs&quot; for PDF, Word, Excel, etc., or &quot;Upload image&quot; for images.
          </div>
        )}
      </div>
    )
  }

  if (section.type === 'live-chat') {
    const chatTitle = String(section.data?.title ?? section.data?.name ?? '').trim() || 'Live Chat'
    return (
      <div className="p-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-900">{chatTitle}</span>
          </div>

          {/* Body */}
          <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">
              Join the conversation to interact with panelists and others watching this livestream.
            </p>
            <button
              type="button"
              disabled
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
            >
              Open chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (section.type === 'video') {
    const videoUrl = String(section.data?.videoUrl ?? section.data?.video_url ?? '').trim()
    const videoFile = section.data?.videoFile as File | null | undefined
    const embedUrl = getYouTubeEmbedUrl(videoUrl)
    const isDirectUrl = Boolean(videoUrl && !embedUrl)
    const isUploadedFile = Boolean(videoFile)

    const videoPreviewUrl = isUploadedFile ? (section.data?.videoPreviewUrl as string) ?? '' : ''

    return (
      <div className="p-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Video source</label>
          <div className="flex flex-wrap gap-2 mb-2">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) =>
                onUpdateSection(section.id, {
                  data: { ...(section.data || {}), videoUrl: e.target.value, videoFile: undefined, videoPreviewUrl: undefined }
                })
              }
              placeholder="YouTube URL or direct video URL"
              className="flex-1 min-w-[200px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {onOpenVideoUploadPicker && (
              <button
                type="button"
                onClick={() => onOpenVideoUploadPicker(section.id)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <Upload01 className="h-4 w-4" />
                Upload video
              </button>
            )}
            {onOpenVideoResourcePicker && eventUuid && (
              <button
                type="button"
                onClick={() => onOpenVideoResourcePicker(section.id)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <Folder className="h-4 w-4" />
                From Resource Management
              </button>
            )}
          </div>
        </div>
        {isUploadedFile && (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-sm text-slate-700 truncate">{videoFile?.name}</span>
            <button
              type="button"
              onClick={() =>
                onUpdateSection(section.id, {
                  data: { ...(section.data || {}), videoFile: undefined, videoPreviewUrl: undefined }
                })
              }
              className="shrink-0 p-1 text-slate-400 hover:text-red-600"
              aria-label="Remove video file"
            >
              <XClose className="h-4 w-4" />
            </button>
          </div>
        )}
        {embedUrl ? (
          <div
            className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-900"
            style={{ paddingBottom: '56.25%' }}
          >
            <iframe
              title="YouTube video"
              className="absolute inset-0 h-full w-full"
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        ) : isDirectUrl ? (
          <div
            className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-900"
            style={{ paddingBottom: '56.25%' }}
          >
            <video
              src={toAbsoluteMediaUrl(videoUrl)}
              controls
              className="absolute inset-0 h-full w-full"
            />
          </div>
        ) : isUploadedFile && videoPreviewUrl ? (
          <div
            className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-900"
            style={{ paddingBottom: '56.25%' }}
          >
            <video
              src={videoPreviewUrl}
              controls
              className="absolute inset-0 h-full w-full"
            />
          </div>
        ) : isUploadedFile ? (
          <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
            <p className="text-sm text-slate-500">{videoFile?.name ?? 'Video file selected'}</p>
          </div>
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
            <p className="text-sm text-slate-500">
              Paste a YouTube URL, upload a video file, or select from Resource Management.
            </p>
          </div>
        )}
      </div>
    )
  }

  if (section.type === 'text') {
    const body = String(section.description ?? section.data?.body ?? '')
    return (
      <div className="p-4">
        <div className="space-y-3">

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Content</label>
            <textarea
              value={body}
              onChange={(e) =>
                onUpdateSection(section.id, {
                  description: e.target.value,
                  data: { ...(section.data || {}), body: e.target.value }
                })
              }
              rows={6}
              placeholder="Enter text"
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
    )
  }

  if (section.type === 'speakers' || section.type === 'speaker') {
    const speakersRaw = section.data?.speakers as Array<{ id: string; name: string; role?: string }> | undefined
    const speakerUuids = Array.isArray(section.data?.speaker_uuids) ? section.data.speaker_uuids as string[] : []
    const resolveName = (uuid: string): string => {
      const found = speakersList.find((s) => String(s.uuid ?? s.id) === String(uuid))
      return found ? getSpeakerDisplayName(found) : 'Participant'
    }
    const speakers = speakersRaw && speakersRaw.length > 0
      ? speakersRaw
      : speakerUuids.map((uuid) => ({ id: uuid, name: resolveName(uuid), role: '' as string | undefined }))
    const alreadyAddedIds = new Set(speakers.map((s) => s.id))
    const filteredSpeakers = speakersList.filter((s) => {
      const id = s.uuid ?? s.id
      if (id != null && alreadyAddedIds.has(String(id))) return false
      const name = getSpeakerDisplayName(s)
      const q = speakerSearchQuery.trim().toLowerCase()
      if (!q) return true
      return name.toLowerCase().includes(q)
    })
    const canAddSpeaker = Boolean(onAddSpeakerToSection)
    const isSearchOpenForThis = showSpeakerSearch && speakerSearchSectionId === section.id

    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">

        <div className="space-y-3 bg-white p-4">


          {speakers.length > 0 ? (
          <div className="flex flex-wrap items-start gap-3">
            {speakers.map((s) => (
              <div
                key={s.id}
                className="flex min-w-[160px] flex-col rounded-lg border border-slate-200 bg-white p-2"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-100">
                    <span className="text-sm font-medium text-amber-700">
                      {(s.name || ' ').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                    {s.name || 'Speaker'}
                  </span>
                  {canAddSpeaker && (
                    <button
                      type="button"
                      onClick={() =>
                        (() => {
                          const next = ((section.data?.speakers || []) as Array<{ id: string; name: string; role?: string }>).filter((sp) => sp.id !== s.id)
                          onUpdateSection(section.id, {
                            data: { ...(section.data || {}), speakers: next, speaker_uuids: next.map((sp) => sp.id) }
                          })
                        })()
                      }
                      className="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
                      aria-label={`Remove ${s.name}`}
                    >
                      <XClose className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <select
                  id={`speaker-role-select-${section.id}-${s.id}`}
                  value={s.role || 'Chairman'}
                  onChange={(e) => {
                    const nextRole = e.target.value as 'Chairman' | 'Panelist' | 'Speaker'
                    const next = ((section.data?.speakers || []) as Array<{ id: string; name: string; role?: string }>).map((sp) =>
                      sp.id === s.id ? { ...sp, role: nextRole } : sp
                    )
                    onUpdateSection(section.id, {
                      data: { ...(section.data || {}), speakers: next, speaker_uuids: next.map((sp) => sp.id) }
                    })
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Chairman">Chairman</option>
                  <option value="Panelist">Panelist</option>
                  <option value="Speaker">Speaker</option>
                </select>
              </div>
            ))}

            {canAddSpeaker && (
              <div className="relative self-center">
                <button
                  ref={isSearchOpenForThis ? speakerSearchAnchorRef : null}
                  type="button"
                  onClick={() =>
                    eventUuid ? openSpeakerSearch(section.id) : handleAddPlaceholderSpeaker(section.id)
                  }
                  className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  <Plus className="h-4 w-4" />
                  Add user
                </button>
                {isSearchOpenForThis &&
                  speakerSearchPosition != null &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <>
                      <div
                        className="fixed inset-0 z-[9998]"
                        aria-hidden
                        onClick={closeSpeakerSearch}
                      />
                      <div
                        className="fixed z-[9999] w-[min(320px,calc(100vw-24px))] rounded-xl border-2 border-slate-200 bg-white shadow-xl flex flex-col max-h-[min(400px,70vh)]"
                        style={{
                          ...(speakerSearchPosition.openUpward
                            ? { bottom: window.innerHeight - speakerSearchPosition.top, left: speakerSearchPosition.left }
                            : { top: speakerSearchPosition.top, left: speakerSearchPosition.left }
                          )
                        }}
                      >
                        <div className="border-b border-slate-100 p-3 shrink-0 space-y-3">
                          <div>
                            <label className="sr-only">Search speakers by name</label>
                            <div className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                              <SearchLg className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                              <input
                                ref={speakerSearchInputRef}
                                type="text"
                                value={speakerSearchQuery}
                                onChange={(e) => setSpeakerSearchQuery(e.target.value)}
                                placeholder="Search by name..."
                                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
                                autoComplete="off"
                              />
                            </div>
                          </div>
                          <div>
                            <label htmlFor="speaker-role-select-preview-1" className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                            <select
                              id="speaker-role-select-preview-1"
                              value={speakerSearchRole}
                              onChange={(e) => setSpeakerSearchRole(e.target.value as 'Chairman' | 'Panelist' | 'Speaker')}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                              <option value="Chairman">Chairman</option>
                              <option value="Panelist">Panelist</option>
                              <option value="Speaker">Speaker</option>
                            </select>
                          </div>
                        </div>
                        <div className="max-h-[min(320px,50vh)] overflow-y-auto p-2 min-h-0">
                          {isLoadingSpeakers ? (
                            <div className="py-6 text-center text-sm text-slate-500">
                              Loading participants...
                            </div>
                          ) : filteredSpeakers.length === 0 ? (
                            <div className="py-6 text-center text-sm text-slate-500">
                              {speakerSearchQuery.trim()
                                ? 'No matching participants'
                                : 'No participants in this event'}
                            </div>
                          ) : (
                            filteredSpeakers.map((s) => {
                              const id = s.uuid ?? s.id
                              const name = getSpeakerDisplayName(s)
                              return (
                                <button
                                  key={id ?? name}
                                  type="button"
                                  onClick={() => handleAddSpeakerFromSearch(s)}
                                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-primary/10 focus:bg-primary/10 focus:outline-none"
                                >
                                  {name}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    </>,
                    document.body
                  )}
              </div>
            )}
          </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6 text-center">
              <p className="mb-3 text-sm text-slate-500">No participants added yet.</p>
              {canAddSpeaker && (
                <div className="relative inline-block">
                  <button
                    ref={isSearchOpenForThis ? speakerSearchAnchorRef : null}
                    type="button"
                    onClick={() =>
                      eventUuid ? openSpeakerSearch(section.id) : handleAddPlaceholderSpeaker(section.id)
                    }
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    <Plus className="h-4 w-4" />
                    Add user
                  </button>
                  {isSearchOpenForThis &&
                    speakerSearchPosition != null &&
                    typeof document !== 'undefined' &&
                    createPortal(
                      <>
                        <div
                          className="fixed inset-0 z-[9998]"
                          aria-hidden
                          onClick={closeSpeakerSearch}
                        />
                        <div
                          className="fixed z-[9999] w-[min(320px,calc(100vw-24px))] rounded-xl border-2 border-slate-200 bg-white shadow-xl flex flex-col max-h-[min(400px,70vh)]"
                          style={{
                            ...(speakerSearchPosition.openUpward
                              ? { bottom: window.innerHeight - speakerSearchPosition.top, left: speakerSearchPosition.left }
                              : { top: speakerSearchPosition.top, left: speakerSearchPosition.left }
                            )
                          }}
                        >
                          <div className="border-b border-slate-100 p-3 shrink-0 space-y-3">
                            <div>
                              <label className="sr-only">Search speakers by name</label>
                              <div className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                <SearchLg className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                                <input
                                  ref={speakerSearchInputRef}
                                  type="text"
                                  value={speakerSearchQuery}
                                  onChange={(e) => setSpeakerSearchQuery(e.target.value)}
                                  placeholder="Search by name..."
                                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
                                  autoComplete="off"
                                />
                              </div>
                            </div>
                            <div>
                              <label htmlFor="speaker-role-select-preview-2" className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                              <select
                                id="speaker-role-select-preview-2"
                                value={speakerSearchRole}
                                onChange={(e) => setSpeakerSearchRole(e.target.value as 'Chairman' | 'Panelist' | 'Speaker')}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              >
                                <option value="Chairman">Chairman</option>
                                <option value="Panelist">Panelist</option>
                                <option value="Speaker">Speaker</option>
                              </select>
                            </div>
                          </div>
                          <div className="max-h-[min(320px,50vh)] overflow-y-auto p-2 min-h-0">
                            {isLoadingSpeakers ? (
                              <div className="py-6 text-center text-sm text-slate-500">
                                Loading participants...
                              </div>
                            ) : filteredSpeakers.length === 0 ? (
                              <div className="py-6 text-center text-sm text-slate-500">
                                {speakerSearchQuery.trim()
                                  ? 'No matching participants'
                                  : 'No participants in this event'}
                              </div>
                            ) : (
                              filteredSpeakers.map((s) => {
                                const id = s.uuid ?? s.id
                                const name = getSpeakerDisplayName(s)
                                return (
                                  <button
                                    key={id ?? name}
                                    type="button"
                                    onClick={() => handleAddSpeakerFromSearch(s)}
                                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-primary/10 focus:bg-primary/10 focus:outline-none"
                                  >
                                    {name}
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </>,
                      document.body
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (section.type === 'comments') {
    const placeholder = String(section.data?.placeholder ?? 'Session comments').trim()
    return (
      <div className="p-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">Comments</span>
          </div>
          <div className="flex flex-col gap-3 px-4 py-4">
            <textarea
              rows={3}
              value={placeholder}
              onChange={(e) =>
                onUpdateSection(section.id, {
                  data: { ...(section.data || {}), placeholder: e.target.value }
                })
              }
              placeholder="Session comments"
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              disabled
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Comment
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {section.description ? (
          <p className="leading-6">{section.description}</p>
        ) : (
          <>Preview coming soon.</>
        )}
      </div>
    </div>
  )
}

export default SessionSectionPreview
