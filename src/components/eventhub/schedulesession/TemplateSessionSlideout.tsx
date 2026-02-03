import React, { useEffect, useRef, useState } from 'react'
import Slideout from '../../ui/untitled/Slideout'
import Input from '../../ui/untitled/Input'
import Select from '../../ui/untitled/Select'
import Button from '../../ui/untitled/Button'
import SectionPickerModal from './SectionPickerModal'
import { XClose, Plus, Upload01, Settings01, Trash01, Send01 } from '@untitled-ui/icons-react'
import { sectionOptions } from './sessionConfig'
import type { SessionSection } from './sessionTypes'

// Drag handle icon component (3x3 grid)
const DragHandleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="4" cy="4" r="1.5" fill="currentColor" />
    <circle cx="8" cy="4" r="1.5" fill="currentColor" />
    <circle cx="12" cy="4" r="1.5" fill="currentColor" />
    <circle cx="4" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="12" cy="8" r="1.5" fill="currentColor" />
    <circle cx="4" cy="12" r="1.5" fill="currentColor" />
    <circle cx="8" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
)

interface TemplateSessionData {
  title: string
  startTime: string
  endTime: string
  location: string
  sessionType: string
  tags: string[]
  childSession: boolean
  videoUrl?: string
  videoFile?: File | null
  speakers: Array<{ id: string; name: string; role: string }>
  description: string
  hyperlinks: string[]
  resources: File[]
  liveChatEnabled: boolean
  comment: string
  submitAnonymous: boolean
  sections: SessionSection[]
}

interface TemplateSessionSlideoutProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: TemplateSessionData) => void
  availableTags?: string[]
  availableLocations?: string[]
  topOffset?: number
  panelWidthRatio?: number
}


const TemplateSessionSlideout: React.FC<TemplateSessionSlideoutProps> = ({
  isOpen,
  onClose,
  onSave,
  availableTags = [],
  availableLocations = [],
  topOffset = 64,
  panelWidthRatio = 0.8
}) => {
  const [formData, setFormData] = useState<TemplateSessionData>({
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    sessionType: '',
    tags: [],
    childSession: false,
    videoUrl: '',
    videoFile: null,
    speakers: [],
    description: '',
    hyperlinks: [],
    resources: [],
    liveChatEnabled: false,
    comment: '',
    submitAnonymous: false,
    sections: []
  })

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sectionOptions[0]?.id ?? 'slides')

  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('')
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const imageUploadSectionIdRef = useRef<string | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const galleryUploadSectionIdRef = useRef<string | null>(null)
  const [galleryCurrentIndex, setGalleryCurrentIndex] = useState<Record<string, number>>({})
  const resourcesInputRef = useRef<HTMLInputElement | null>(null)
  const resourcesUploadSectionIdRef = useRef<string | null>(null)
  const topLevelResourcesInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(videoPreviewUrl)
        } catch {
          // ignore
        }
      }
    }
  }, [videoPreviewUrl])

  const openVideoPicker = () => {
    videoInputRef.current?.click()
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type || !file.type.startsWith('video/')) {
      // reset input so user can pick again
      e.target.value = ''
      return
    }

    // Revoke previous preview url
    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(videoPreviewUrl)
      } catch {
        // ignore
      }
    }

    const url = URL.createObjectURL(file)
    setVideoPreviewUrl(url)
    setFormData((prev) => ({ ...prev, videoFile: file, videoUrl: url }))
  }

  const handleRemoveVideo = () => {
    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(videoPreviewUrl)
      } catch {
        // ignore
      }
    }
    setVideoPreviewUrl('')
    setIsVideoPlaying(false)
    setFormData((prev) => ({ ...prev, videoFile: null, videoUrl: '' }))
    if (videoInputRef.current) videoInputRef.current.value = ''
  }


  const handleRemoveSpeaker = (speakerId: string) => {
    setFormData(prev => ({
      ...prev,
      speakers: prev.speakers.filter(s => s.id !== speakerId)
    }))
  }

  const handleAddSpeaker = () => {
    const newSpeaker = {
      id: `speaker-${Date.now()}`,
      name: 'Speaker Name',
      role: 'Chairman'
    }
    setFormData(prev => ({
      ...prev,
      speakers: [...prev.speakers, newSpeaker]
    }))
  }

  const handleAddSection = () => {
    setIsSectionModalOpen(true)
    setSelectedSectionId(sectionOptions[0]?.id ?? 'slides')
  }

  const handleCloseSectionModal = () => {
    setIsSectionModalOpen(false)
  }

  const handleConfirmSection = () => {
    const selectedSection = sectionOptions.find(opt => opt.id === selectedSectionId)
    if (selectedSection) {
      const newSection: SessionSection = {
        id: `${selectedSection.id}-${Date.now()}`,
        type: selectedSection.id,
        title: selectedSection.label,
        data:
          selectedSection.id === 'location'
            ? { embed: '' } // user can paste iframe or URL
            : selectedSection.id === 'slides' || selectedSection.id === 'image'
              ? { url: '' } // user can paste slide/poster image URL
              : selectedSection.id === 'photo-gallery'
                ? { images: [] } // user can upload multiple images
                : selectedSection.id === 'resources'
                  ? { files: [] } // user can upload docs
                  : undefined
      }
      setFormData((prev) => ({ ...prev, sections: [...(prev.sections || []), newSection] }))
    }
    setIsSectionModalOpen(false)
  }

  const handleRemoveSection = (sectionId: string) => {
    const section = formData.sections.find((s) => s.id === sectionId)
    const previewUrl = section?.data?.previewUrl
    if (typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewUrl)
      } catch {
        // ignore
      }
    }
    setFormData((prev) => ({ ...prev, sections: (prev.sections || []).filter((s) => s.id !== sectionId) }))
  }

  const openSectionImagePicker = (sectionId: string) => {
    imageUploadSectionIdRef.current = sectionId
    imageInputRef.current?.click()
  }

  const handleSectionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectionId = imageUploadSectionIdRef.current
    const file = e.target.files?.[0]
    e.target.value = ''
    imageUploadSectionIdRef.current = null
    if (!file || !sectionId) return
    if (!file.type || !file.type.startsWith('image/')) return

    const section = formData.sections.find((s) => s.id === sectionId)
    const prevPreviewUrl = section?.data?.previewUrl
    if (typeof prevPreviewUrl === 'string' && prevPreviewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(prevPreviewUrl)
      } catch {
        // ignore
      }
    }

    const previewUrl = URL.createObjectURL(file)
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, data: { ...(s.data || {}), file, previewUrl, url: '' } }
          : s
      )
    }))
  }

  const handleRemoveSectionImage = (sectionId: string) => {
    const section = formData.sections.find((s) => s.id === sectionId)
    const previewUrl = section?.data?.previewUrl
    if (typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewUrl)
      } catch {
        // ignore
      }
    }
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, data: { ...(s.data || {}), file: undefined, previewUrl: undefined } } : s
      )
    }))
  }

  const openGalleryPicker = (sectionId: string) => {
    galleryUploadSectionIdRef.current = sectionId
    galleryInputRef.current?.click()
  }

  const handleGalleryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectionId = galleryUploadSectionIdRef.current
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    galleryUploadSectionIdRef.current = null
    if (!files.length || !sectionId) return

    const section = formData.sections.find((s) => s.id === sectionId)
    const existingImages = (section?.data?.images as Array<{ file: File; previewUrl: string }>) ?? []

    const newEntries = files
      .filter((file) => file.type?.startsWith('image/'))
      .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))

    if (newEntries.length === 0) return

    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, data: { ...(s.data || {}), images: [...existingImages, ...newEntries] } }
          : s
      )
    }))
  }

  const handleRemoveGalleryImage = (sectionId: string, index: number) => {
    const section = formData.sections.find((s) => s.id === sectionId)
    const images = (section?.data?.images as Array<{ file: File; previewUrl: string }>) ?? []
    const item = images[index]
    if (item?.previewUrl && item.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(item.previewUrl)
      } catch {
        // ignore
      }
    }
    const nextImages = images.filter((_, i) => i !== index)
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, data: { ...(s.data || {}), images: nextImages } } : s
      )
    }))
    setGalleryCurrentIndex((prev) => {
      const current = prev[sectionId] ?? 0
      const next = Math.min(current, Math.max(0, nextImages.length - 1))
      return { ...prev, [sectionId]: next }
    })
  }

  const openResourcesPicker = (sectionId: string) => {
    resourcesUploadSectionIdRef.current = sectionId
    resourcesInputRef.current?.click()
  }

  const handleResourcesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectionId = resourcesUploadSectionIdRef.current
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    resourcesUploadSectionIdRef.current = null
    if (!files.length || !sectionId) return

    const section = formData.sections.find((s) => s.id === sectionId)
    const existingFiles = (section?.data?.files as File[]) ?? []

    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, data: { ...(s.data || {}), files: [...existingFiles, ...files] } }
          : s
      )
    }))
  }

  const handleRemoveResourcesFile = (sectionId: string, index: number) => {
    const section = formData.sections.find((s) => s.id === sectionId)
    const files = (section?.data?.files as File[]) ?? []
    const nextFiles = files.filter((_, i) => i !== index)
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, data: { ...(s.data || {}), files: nextFiles } } : s
      )
    }))
  }

  const openTopLevelResourcesPicker = () => {
    topLevelResourcesInputRef.current?.click()
  }

  const handleTopLevelResourcesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (!files.length) return
    setFormData((prev) => ({ ...prev, resources: [...(prev.resources || []), ...files] }))
  }

  const removeTopLevelResource = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      resources: (prev.resources || []).filter((_, i) => i !== index)
    }))
  }

  const updateSection = (sectionId: string, patch: Partial<SessionSection>) => {
    setFormData((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) => (s.id === sectionId ? { ...s, ...patch } : s))
    }))
  }

  const parseEmbedToSrc = (input: string): string => {
    const raw = String(input || '').trim()
    if (!raw) return ''

    // If user pasted full iframe code, extract src="..."
    const srcMatch = raw.match(/src\s*=\s*["']([^"']+)["']/i)
    if (srcMatch?.[1]) return srcMatch[1].trim()

    // If user pasted a plain URL, accept it as-is (embed URLs preferred).
    return raw
  }

  const renderSectionPreview = (section: SessionSection) => {
    // Simple placeholders to match the requested look in the slideout.
    const placeholderImg =
      'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=1200&auto=format&fit=crop&q=60'

    if (section.type === 'photo-gallery') {
      const images = (section.data?.images as Array<{ file: File; previewUrl: string }>) ?? []
      const currentIdx = galleryCurrentIndex[section.id] ?? 0
      const safeIdx = images.length ? Math.min(currentIdx, images.length - 1) : 0
      const currentImage = images[safeIdx]
      const displaySrc = currentImage?.previewUrl ?? placeholderImg
      return (
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openGalleryPicker(section.id)}
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
                  (e.target as HTMLImageElement).src = placeholderImg
                }}
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setGalleryCurrentIndex((prev) => ({
                        ...prev,
                        [section.id]: Math.max(0, (prev[section.id] ?? 0) - 1)
                      }))
                    }
                    disabled={safeIdx <= 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow disabled:opacity-50"
                    aria-label="Previous"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGalleryCurrentIndex((prev) => ({
                        ...prev,
                        [section.id]: Math.min(images.length - 1, (prev[section.id] ?? 0) + 1)
                      }))
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
                      (e.target as HTMLImageElement).src = placeholderImg
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryImage(section.id, i)}
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
      const hasFile = section.data?.file != null
      const urlValue = String(section.data?.url ?? '').trim()
      const previewUrl = section.data?.previewUrl
      const imgSrc =
        (typeof previewUrl === 'string' && previewUrl.startsWith('blob:') ? previewUrl : null) ||
        urlValue ||
        placeholderImg
      const hasImage = hasFile || urlValue || (typeof previewUrl === 'string' && previewUrl.startsWith('blob:'))
      const label = section.type === 'slides' ? 'Slides/Poster' : 'Image'
      return (
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openSectionImagePicker(section.id)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Upload01 className="h-4 w-4" />
              Upload image
            </button>
            {hasImage && (
              <button
                type="button"
                onClick={() => handleRemoveSectionImage(section.id)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                Remove
              </button>
            )}
          </div>
          {/* <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Or paste image URL</label>
            <input
              type="url"
              value={urlValue}
              onChange={(e) => {
                const prevPreviewUrl = section.data?.previewUrl
                if (typeof prevPreviewUrl === 'string' && prevPreviewUrl.startsWith('blob:')) {
                  try {
                    URL.revokeObjectURL(prevPreviewUrl)
                  } catch {
                    // ignore
                  }
                }
                updateSection(section.id, {
                  data: { ...(section.data || {}), url: e.target.value, file: undefined, previewUrl: undefined }
                })
              }}
              placeholder="https://..."
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div> */}
          <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <img
              src={imgSrc}
              alt={label}
              className="h-32 w-48 rounded-md object-cover object-center shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = placeholderImg
              }}
            />
          </div>
        </div>
      )
    }

    if (section.type === 'button') {
      return (
        <div className="p-4">
          <button type="button" className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm">
            Add to my schedule
          </button>
        </div>
      )
    }

    if (section.type === 'location') {
      const embedValue = String(section.data?.embed ?? section.description ?? '').trim()
      const embedSrc = parseEmbedToSrc(embedValue) || 'https://www.google.com/maps?q=Melbourne&output=embed'
      return (
        <div className="p-4">
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Embed map</label>
            <textarea
              value={embedValue}
              onChange={(e) =>
                updateSection(section.id, { data: { ...(section.data || {}), embed: e.target.value } })
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
              onClick={() => openResourcesPicker(section.id)}
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
                    onClick={() => handleRemoveResourcesFile(section.id, i)}
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
              No documents uploaded. Click &quot;Upload docs&quot; to add PDF, Word, Excel, or other files.
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="p-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Preview coming soon.
        </div>
      </div>
    )
  }


  const handleSave = () => {
    if (onSave) {
      onSave(formData)
    }
    onClose()
  }

  // Section Component
  const SectionHeader: React.FC<{
    title: string
    onRemove?: () => void
  }> = ({ title, onRemove }) => (
    <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-t-lg border-b border-slate-200">
      <div className="flex items-center gap-3">
        <DragHandleIcon className="h-4 w-4 text-slate-400 cursor-move" />
        <span className="text-sm font-semibold text-slate-900">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Settings"
        >
          <Settings01 className="h-4 w-4" />
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
            aria-label={`Remove ${title} section`}
          >
            <Trash01 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )

  const footerContent = (
    <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={onClose}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleSave}
        className="bg-primary hover:bg-primary/90"
      >
        Save
      </Button>
    </div>
  )

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSectionImageChange}
        aria-hidden
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGalleryImageChange}
        aria-hidden
      />
      <input
        ref={resourcesInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
        multiple
        className="hidden"
        onChange={handleResourcesFileChange}
        aria-hidden
      />
      <input
        ref={topLevelResourcesInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
        multiple
        className="hidden"
        onChange={handleTopLevelResourcesChange}
        aria-hidden
      />
      <Slideout
        isOpen={isOpen}
        onClose={onClose}
        topOffset={topOffset}
        panelWidthRatio={panelWidthRatio}
        footer={footerContent}
      >
      {/* Scrollable Content */}
      <div className="px-6 py-6 space-y-4">
        {/* Title Section */}
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <label className="block mb-2">
              <span className="text-sm font-medium text-slate-700">Title <span className="text-red-500">*</span></span>
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter session title"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-7 p-2 text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <XClose className="h-5 w-5" />
          </button>
        </div>
          {/* Session Meta Row */}
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_1.5fr_1.5fr_1.5fr] gap-4">
              <Input
                label="Start time"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
              <Input
                label="End time"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
              <Select
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                options={[
                  { value: '', label: 'Select location' },
                  ...availableLocations.map(loc => ({ value: loc, label: loc }))
                ]}
              />
              <Select
                label="Session type"
                value={formData.sessionType}
                onChange={(e) => setFormData(prev => ({ ...prev, sessionType: e.target.value }))}
                options={[
                  { value: '', label: 'Select session type' },
                  { value: 'online', label: 'Online' },
                  { value: 'in-person', label: 'In person' }
                ]}
              />
              <Select
                label="Tags"
                value={formData.tags[0] || ''}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData(prev => ({
                    ...prev,
                    tags: value ? [value] : []
                  }))
                }}
                options={[
                  { value: '', label: 'Select tags' },
                  ...availableTags.map(tag => ({ value: tag, label: tag }))
                ]}
              />
            </div>

            {/* Child Session Checkbox and Add Section Button */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.childSession}
                  onChange={(e) => setFormData(prev => ({ ...prev, childSession: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-slate-700">Child session</span>
              </label>
              <Button
                type="button"
                variant="primary"
                size="md"
                iconLeading={<Plus className="h-4 w-4" />}
                className="bg-primary hover:bg-primary/90"
                onClick={handleAddSection}
              >
                Add section
              </Button>
            </div>
          </div>

          {/* Sections added from the "Add section" modal */}
          {(formData.sections || []).map((section) => (
            <div key={section.id} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
              <SectionHeader title={section.title} onRemove={() => handleRemoveSection(section.id)} />
              {renderSectionPreview(section)}
            </div>
          ))}

          {/* Section 1: Video */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <SectionHeader
              title="Video"
              onRemove={() => {}}
            />
            <div className="p-4">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoFileChange}
              />

              <div
                role={!formData.videoUrl && !videoPreviewUrl ? 'button' : undefined}
                tabIndex={!formData.videoUrl && !videoPreviewUrl ? 0 : -1}
                onClick={
                  !formData.videoUrl && !videoPreviewUrl
                    ? openVideoPicker
                    : undefined
                }
                onKeyDown={
                  !formData.videoUrl && !videoPreviewUrl
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') openVideoPicker()
                      }
                    : undefined
                }
                className="group relative w-full h-64 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
                aria-label="Upload video"
              >
                {(formData.videoUrl || videoPreviewUrl) ? (
                  <>
                    <video
                      ref={videoElRef}
                      src={videoPreviewUrl || formData.videoUrl}
                      className="h-full w-full object-contain bg-black"
                      controls
                      playsInline
                      onPlay={() => setIsVideoPlaying(true)}
                      onPause={() => setIsVideoPlaying(false)}
                      onEnded={() => setIsVideoPlaying(false)}
                    />
                    {/* Visual hover overlay; must not block video controls */}
                    <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

                    {/* Play overlay (click to play) */}
                    {!isVideoPlaying ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          const el = videoElRef.current
                          if (!el) return
                          el.play().catch(() => {
                            // ignore autoplay restrictions (user gesture should allow)
                          })
                        }}
                        className="absolute inset-0 flex items-center justify-center"
                        aria-label="Play video"
                      >
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/20">
                          <svg className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </span>
                      </button>
                    ) : null}

                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openVideoPicker()
                        }}
                        className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/15"
                      >
                        <Upload01 className="h-4 w-4" />
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveVideo()
                        }}
                        className="inline-flex items-center gap-2 rounded-md bg-rose-500/20 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-rose-500/30"
                      >
                        <Trash01 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-white/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </div>
                    <div className="text-slate-200 text-sm font-semibold">Upload video</div>
                    <div className="mt-1 text-slate-400 text-xs">Click to choose a video file</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Speakers */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <SectionHeader
              title="Speakers"
              onRemove={() => {}}
            />
            <div className="bg-white p-4 space-y-3">
              {/* Speakers Label */}
              <label className="block">
                <span className="text-sm font-semibold text-slate-900">Speakers</span>
              </label>

              {/* Speakers Cards Row */}
              <div className="flex flex-wrap items-start gap-3">
                {formData.speakers.map((speaker) => (
                  <div
                    key={speaker.id}
                    className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 min-w-[160px]"
                  >
                    {/* Top Row: Avatar, Name, Close */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <span className="text-sm font-medium text-amber-700">{speaker.name.charAt(0)}</span>
                      </div>
                      <span className="flex-1 text-sm text-slate-700 font-medium">{speaker.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpeaker(speaker.id)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={`Remove ${speaker.name}`}
                      >
                        <XClose className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Role Dropdown */}
                    <select
                      value={speaker.role}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          speakers: prev.speakers.map(s =>
                            s.id === speaker.id ? { ...s, role: e.target.value } : s
                          )
                        }))
                      }}
                      className="w-full rounded-md border border-primary/10 bg-primary/5 px-2 py-1 text-xs text-primary font-medium focus:border-primary/10 focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="Chairman">Chairman</option>
                      <option value="Speaker">Speaker</option>
                      <option value="Panelist">Panelist</option>
                      <option value="Moderator">Moderator</option>
                    </select>
                  </div>
                ))}

                {/* Add User Button */}
                <button
                  type="button"
                  onClick={handleAddSpeaker}
                  className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors self-center"
                >
                  <Plus className="h-4 w-4" />
                  Add user
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Text */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <SectionHeader
              title="Description"
              onRemove={() => {}}
            />
            <div className="p-4">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description..."
                rows={6}
                className="w-full min-h-[150px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>

          {/* Section 4: Hyperlink */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <SectionHeader
              title="Hyperlink"
              onRemove={() => {}}
            />
            <div className="bg-white p-4">
              <label className="block mb-2">
                <span className="text-sm font-semibold text-slate-900">Links</span>
              </label>
              <Input
                type="text"
                value={formData.hyperlinks[0] || ''}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData(prev => ({
                    ...prev,
                    hyperlinks: value ? [value] : []
                  }))
                }}
                placeholder="Paste link here"
                className="w-full"
              />
            </div>
          </div>

          {/* Section 5: Resources */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <SectionHeader
              title="Resources"
              onRemove={() => {}}
            />
            <div className="p-4">
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full bg-primary hover:bg-primary/90"
                iconLeading={<Upload01 className="h-4 w-4" />}
                onClick={openTopLevelResourcesPicker}
              >
                Upload docs
              </Button>
              {(formData.resources?.length ?? 0) > 0 && (
                <ul className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                  {formData.resources.map((file, i) => (
                    <li
                      key={`${file.name}-${i}`}
                      className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    >
                      <span className="min-w-0 truncate" title={file.name}>
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTopLevelResource(i)}
                        className="shrink-0 p-1 text-slate-400 hover:text-red-600"
                        aria-label={`Remove ${file.name}`}
                      >
                        <XClose className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Section 6: Live Chat */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <SectionHeader
              title="Live Chat"
              onRemove={() => {}}
            />
            <div className="bg-white p-4 space-y-4">
              {/* Live Chat Label */}
              <label className="block">
                <span className="text-sm font-semibold text-slate-900">Live Chat</span>
              </label>

              {/* Chat Messages Area */}
              <div className="w-full min-h-[200px] rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center">
                <span className="text-slate-500 text-sm">Live chat will appear here</span>
              </div>

              {/* Comment Input Area */}
              <div className="space-y-3">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={formData.comment}
                    onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Comment"
                    className="flex-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    className="absolute right-2 p-1.5 text-slate-400 hover:text-primary transition-colors"
                    aria-label="Send comment"
                  >
                    <Send01 className="h-5 w-5" />
                  </button>
                </div>

                {/* Anonymous Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.submitAnonymous}
                    onChange={(e) => setFormData(prev => ({ ...prev, submitAnonymous: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-slate-700">Submit as anonymous</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </Slideout>

      <SectionPickerModal
        isOpen={isSectionModalOpen}
        selectedSectionId={selectedSectionId}
        onClose={handleCloseSectionModal}
        onSelect={(sectionId) => setSelectedSectionId(sectionId)}
        onConfirm={handleConfirmSection}
        options={sectionOptions}
      />
    </>
  )
}

export default TemplateSessionSlideout
