import React from 'react'
import { Upload01, XClose } from '@untitled-ui/icons-react'
import type { SessionSection } from './sessionTypes'

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=1200&auto=format&fit=crop&q=60'

function parseEmbedToSrc(input: string): string {
  const raw = String(input || '').trim()
  if (!raw) return ''
  const srcMatch = raw.match(/src\s*=\s*["']([^"']+)["']/i)
  if (srcMatch?.[1]) return srcMatch[1].trim()
  return raw
}

export interface SessionSectionPreviewHandlers {
  onUpdateSection: (sectionId: string, patch: Partial<SessionSection>) => void
  galleryCurrentIndex: Record<string, number>
  onGalleryIndexChange: (sectionId: string, index: number) => void
  onOpenSectionImagePicker: (sectionId: string) => void
  onRemoveSectionImage: (sectionId: string) => void
  onOpenGalleryPicker: (sectionId: string) => void
  onRemoveGalleryImage: (sectionId: string, index: number) => void
  onOpenResourcesPicker: (sectionId: string) => void
  onRemoveResourcesFile: (sectionId: string, index: number) => void
}

export interface SessionSectionPreviewProps {
  section: SessionSection
  handlers: SessionSectionPreviewHandlers
}

const SessionSectionPreview: React.FC<SessionSectionPreviewProps> = ({ section, handlers }) => {
  const {
    onUpdateSection,
    galleryCurrentIndex,
    onGalleryIndexChange,
    onOpenSectionImagePicker,
    onRemoveSectionImage,
    onOpenGalleryPicker,
    onRemoveGalleryImage,
    onOpenResourcesPicker,
    onRemoveResourcesFile
  } = handlers

  if (section.type === 'photo-gallery') {
    const images = (section.data?.images as Array<{ file: File; previewUrl: string }>) ?? []
    const currentIdx = galleryCurrentIndex[section.id] ?? 0
    const safeIdx = images.length ? Math.min(currentIdx, images.length - 1) : 0
    const currentImage = images[safeIdx]
    const displaySrc = currentImage?.previewUrl ?? PLACEHOLDER_IMG
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
                  src={img.previewUrl}
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
    const urlValue = String(section.data?.url ?? '').trim()
    const previewUrl = section.data?.previewUrl
    const imgSrc =
      (typeof previewUrl === 'string' && previewUrl.startsWith('blob:') ? previewUrl : null) ||
      urlValue ||
      PLACEHOLDER_IMG
    const hasImage =
      section.data?.file != null ||
      !!urlValue ||
      (typeof previewUrl === 'string' && previewUrl.startsWith('blob:'))
    const label = section.type === 'slides' ? 'Slides/Poster' : 'Image'
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
            src={imgSrc}
            alt={label}
            className="h-32 w-48 rounded-md object-cover object-center shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMG
            }}
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
    const files = (section.data?.files as File[]) ?? []
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
        </div>
        {files.length > 0 ? (
          <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                <span className="min-w-0 truncate" title={file.name}>
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveResourcesFile(section.id, i)}
                  className="shrink-0 p-1 text-slate-400 hover:text-red-600"
                  aria-label={`Remove ${file.name}`}
                >
                  <XClose className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
            No documents uploaded. Click &quot;Upload docs&quot; to add PDF, Word, Excel, or other
            files.
          </div>
        )}
      </div>
    )
  }

  if (section.type === 'live-chat') {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-700">Live Chat</p>
          <p className="mt-1 text-xs text-slate-500">
            Attendees and speakers can chat here when this section is shown on the session page.
          </p>
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
