import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Slideout, { type SlideoutHandle } from '../../ui/untitled/Slideout'
import Input from '../../ui/untitled/Input'
import Select from '../../ui/untitled/Select'
import Button from '../../ui/untitled/Button'
import CreatableMultiSelect, { type CreatableMultiSelectOption } from '../../ui/untitled/CreatableMultiSelect'
import type { MultiValue, ActionMeta } from 'react-select'
import SectionPickerModal from './SectionPickerModal'
import SessionSectionPreview from './SessionSectionPreview'
import type { SessionSectionPreviewHandlers } from './SessionSectionPreview'
import SessionSummaryView from './SessionSummaryView'
import { XClose, Plus, Settings01, Trash01, Pencil01 } from '@untitled-ui/icons-react'
import { defaultSessionDraft, sectionOptions } from './sessionConfig'
import type { SessionSection } from './sessionTypes'
import ResourceVideoPickerModal from './ResourceVideoPickerModal'
import ConfirmDeleteModal from '../../ui/ConfirmDeleteModal'
import { fetchSpeakers, type SpeakerData } from '../../../services/speakerService'
import { createSessionTag, fetchSessionTags } from '../../../services/sessionService'

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

export interface TemplateSessionData {
  title: string
  startTime: string
  endTime: string
  location: string
  sessionType: string
  tags: string[]
  childSession: boolean
  videoUrl?: string
  videoFile?: File | null
  videoPreviewUrl?: string
  speakers: Array<{ id: string; name: string; role: string }>
  description: string
  hyperlinks: string[]
  resources: File[]
  liveChatEnabled: boolean
  comment: string
  submitAnonymous: boolean
  sections: SessionSection[]
}

function getSpeakerDisplayName(s: SpeakerData): string {
  if (s.name && String(s.name).trim()) return String(s.name).trim()
  const first = s.first_name ? String(s.first_name).trim() : ''
  const last = s.last_name ? String(s.last_name).trim() : ''
  return [first, last].filter(Boolean).join(' ') || 'Speaker'
}

interface TemplateSessionSlideoutProps {
  isOpen: boolean
  onClose: () => void
  /** Called with (data, sessionId?). When sessionId is set, parent should call updateSession; otherwise createSession + createSessionSections. */
  onSave?: (data: TemplateSessionData, sessionId?: string) => void | Promise<void>
  /** Optional initial data when editing an existing session. */
  initialData?: TemplateSessionData | null
  /** When set, we are editing this session; Save will call onSave(data, sessionId). */
  sessionId?: string | null
  availableTags?: string[]
  /** Tag options with uuid so we send tag_uuids to backend. */
  sessionTagOptions?: Array<{ uuid: string; name: string }>
  availableLocations?: string[]
  eventUuid?: string
  topOffset?: number
  panelWidthRatio?: number
  /** When a section with backend sectionId is removed, call before updating state (e.g. DELETE session section API). */
  onBeforeRemoveSection?: (section: SessionSection) => void | Promise<void>
  /** When a resource file with resourceId is removed, call before updating state (e.g. DELETE session resource API). */
  onBeforeRemoveResourceFile?: (sectionId: string, file: { url?: string; name: string; resourceId?: string }, index: number) => void | Promise<void>
}


const TemplateSessionSlideout: React.FC<TemplateSessionSlideoutProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  sessionId = null,
  availableTags = [],
  sessionTagOptions,
  availableLocations = [],
  eventUuid = '',
  topOffset = 64,
  panelWidthRatio = 0.55,
  onBeforeRemoveSection,
  onBeforeRemoveResourceFile
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
    videoPreviewUrl: '',
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
  const [isEditing, setIsEditing] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingRemoveSection, setPendingRemoveSection] = useState<{ sectionId: string; title: string } | null>(null)
  const [isRemovingSection, setIsRemovingSection] = useState(false)

  const [showSpeakerSearch, setShowSpeakerSearch] = useState(false)
  const [speakerSearchQuery, setSpeakerSearchQuery] = useState('')
  const [speakerSearchRole, setSpeakerSearchRole] = useState<'Chairman' | 'Panelist' | 'Speaker'>('Chairman')
  const [speakersList, setSpeakersList] = useState<SpeakerData[]>([])
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false)
  const [speakerSearchPosition, setSpeakerSearchPosition] = useState<{ top: number; left: number; openUpward?: boolean } | null>(null)
  const speakerSearchAnchorRef = useRef<HTMLButtonElement | null>(null)
  const speakerSearchInputRef = useRef<HTMLInputElement | null>(null)
  const slideoutRef = useRef<SlideoutHandle>(null)

  const [localSessionTagOptions, setLocalSessionTagOptions] = useState<Array<{ uuid: string; name: string }>>([])

  useEffect(() => {
    setLocalSessionTagOptions(sessionTagOptions ?? [])
  }, [sessionTagOptions])

  const handleClose = useCallback(() => {
    slideoutRef.current?.returnFocus()
    setPendingRemoveSection(null)
    onClose()
  }, [onClose])

  // Tag options — mirror SessionSlideout: local list updates when user creates a tag via API
  const tagOptions: CreatableMultiSelectOption[] = useMemo(() => {
    if (localSessionTagOptions.length > 0) {
      return localSessionTagOptions.map((t) => ({ value: t.uuid, label: t.name }))
    }
    return availableTags.map((tag) => ({ value: tag, label: tag }))
  }, [localSessionTagOptions, availableTags])

  const locationOptions: CreatableMultiSelectOption[] = useMemo(
    () => availableLocations.map((value) => ({ value, label: value })),
    [availableLocations]
  )

  const selectedLocationOptions: CreatableMultiSelectOption[] = useMemo(() => {
    const location = (formData.location || '').trim()
    if (!location) return []
    const fromOptions = locationOptions.find((opt) => opt.value === location || opt.label === location)
    if (fromOptions) return [fromOptions]
    return [{ value: location.toLowerCase().replace(/\s+/g, '-'), label: location }]
  }, [formData.location, locationOptions])

  const handleLocationMultiChange = (
    newValue: MultiValue<CreatableMultiSelectOption>,
    _actionMeta: ActionMeta<CreatableMultiSelectOption>
  ) => {
    const selected = Array.from(newValue)
    const latest = selected[selected.length - 1]
    setFormData((prev) => ({ ...prev, location: latest?.label ?? '' }))
  }

  const selectedTagOptions: CreatableMultiSelectOption[] = useMemo(() => {
    return formData.tags.map((tag) => {
      const fromOptions = tagOptions.find((opt) => opt.value === tag || opt.label === tag)
      if (fromOptions) return fromOptions
      return { value: tag.toLowerCase().replace(/\s+/g, '-'), label: tag }
    })
  }, [formData.tags, tagOptions])

  const handleTagsChange = (
    newValue: MultiValue<CreatableMultiSelectOption>,
    _actionMeta: ActionMeta<CreatableMultiSelectOption>
  ) => {
    const tagValues = Array.from(newValue).map((option) => {
      const fromSessionTag = localSessionTagOptions.find(
        (opt) => opt.uuid === option.value || opt.name === option.label
      )
      if (fromSessionTag) return fromSessionTag.uuid
      return option.label
    })
    setFormData((prev) => ({ ...prev, tags: tagValues }))
  }

  const handleCreateTagOption = useCallback(
    async (inputValue: string) => {
      if (!eventUuid) return
      try {
        const newTag = await createSessionTag(eventUuid, inputValue)
        if (newTag) {
          setLocalSessionTagOptions((prev) => {
            if (prev.some((t) => t.uuid === newTag.uuid)) return prev
            return [...prev, newTag]
          })
          setFormData((prev) => ({
            ...prev,
            tags: prev.tags.map((t) =>
              t === inputValue || t === inputValue.toLowerCase().replace(/\s+/g, '-') ? newTag.uuid : t
            ),
          }))
        } else {
          const refreshed = await fetchSessionTags(eventUuid)
          if (refreshed.length > 0) {
            setLocalSessionTagOptions(refreshed)
            const found = refreshed.find((t) => t.name.toLowerCase() === inputValue.toLowerCase())
            if (found) {
              setFormData((prev) => ({
                ...prev,
                tags: prev.tags.map((t) =>
                  t === inputValue || t === inputValue.toLowerCase().replace(/\s+/g, '-') ? found.uuid : t
                ),
              }))
            }
          }
        }
      } catch {
        // Tag creation failed — label remains in tags
      }
    },
    [eventUuid]
  )

  useEffect(() => {
    if (isOpen && initialData != null) {
      setFormData({
        title: initialData.title ?? '',
        startTime: initialData.startTime ?? '',
        endTime: initialData.endTime ?? '',
        location: initialData.location ?? '',
        sessionType: initialData.sessionType ?? '',
        tags: initialData.tags ?? [],
        childSession: initialData.childSession ?? false,
        videoUrl: initialData.videoUrl ?? '',
        videoFile: initialData.videoFile ?? null,
        videoPreviewUrl: initialData.videoPreviewUrl ?? '',
        speakers: initialData.speakers ?? [],
        description: initialData.description ?? '',
        hyperlinks: initialData.hyperlinks ?? [],
        resources: initialData.resources ?? [],
        liveChatEnabled: initialData.liveChatEnabled ?? false,
        comment: initialData.comment ?? '',
        submitAnonymous: initialData.submitAnonymous ?? false,
        sections: initialData.sections ?? []
      })
    }
  }, [isOpen, initialData])

  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const imageUploadSectionIdRef = useRef<string | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const galleryUploadSectionIdRef = useRef<string | null>(null)
  const [galleryCurrentIndex, setGalleryCurrentIndex] = useState<Record<string, number>>({})
  const resourcesInputRef = useRef<HTMLInputElement | null>(null)
  const resourcesImageInputRef = useRef<HTMLInputElement | null>(null)
  const resourcesUploadSectionIdRef = useRef<string | null>(null)
  const sectionVideoInputRef = useRef<HTMLInputElement | null>(null)
  const sectionVideoUploadSectionIdRef = useRef<string | null>(null)
  const [resourcePickerTarget, setResourcePickerTarget] = useState<{
    sectionId: string
    media: 'video' | 'image'
  } | null>(null)

  // Reset to edit mode when slideout opens
  useEffect(() => {
    if (isOpen) {
      setIsEditing(true)
    }
  }, [isOpen])

  const handleRemoveSpeaker = (speakerId: string) => {
    setFormData(prev => ({
      ...prev,
      speakers: prev.speakers.filter(s => s.id !== speakerId)
    }))
  }

  const loadSpeakers = useCallback(async () => {
    if (!eventUuid) return
    setIsLoadingSpeakers(true)
    try {
      const list = await fetchSpeakers(eventUuid)
      setSpeakersList(Array.isArray(list) ? list : [])
    } catch {
      setSpeakersList([])
    } finally {
      setIsLoadingSpeakers(false)
    }
  }, [eventUuid])

  const openSpeakerSearch = () => {
    setSpeakerSearchPosition(null)
    setShowSpeakerSearch(true)
    setSpeakerSearchQuery('')
    if (eventUuid && speakersList.length === 0) {
      loadSpeakers()
    }
    setTimeout(() => speakerSearchInputRef.current?.focus(), 100)
  }

  useLayoutEffect(() => {
    if (!showSpeakerSearch || !speakerSearchAnchorRef.current) return
    const el = speakerSearchAnchorRef.current
    const rect = el.getBoundingClientRect()
    const listMaxHeight = Math.min(400, window.innerHeight * 0.6)
    const dropdownHeight = 56 + listMaxHeight + 16 // search row + list + padding
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
    setSpeakerSearchQuery('')
    setSpeakerSearchPosition(null)
  }

  const alreadyAddedIds = new Set(formData.speakers.map((s) => s.id))
  const filteredSpeakers = speakersList.filter((s) => {
    const id = s.uuid ?? s.id
    if (id != null && alreadyAddedIds.has(String(id))) return false
    const name = getSpeakerDisplayName(s)
    const q = speakerSearchQuery.trim().toLowerCase()
    if (!q) return true
    return name.toLowerCase().includes(q)
  })

  const handleAddSpeaker = (speaker?: SpeakerData, role?: 'Chairman' | 'Panelist' | 'Speaker') => {
    if (speaker) {
      const id = String(speaker.uuid ?? speaker.id ?? `speaker-${Date.now()}`)
      const name = getSpeakerDisplayName(speaker)
      const assignedRole = role ?? speakerSearchRole
      setFormData(prev => ({
        ...prev,
        speakers: [...prev.speakers, { id, name, role: assignedRole }]
      }))
      closeSpeakerSearch()
      return
    }
    if (eventUuid) {
      openSpeakerSearch()
      return
    }
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

  const handleSelectSpeakerFromSearch = (speaker: SpeakerData) => {
    handleAddSpeaker(speaker, speakerSearchRole)
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
                  : selectedSection.id === 'video'
                    ? { videoUrl: '' } // YouTube URL
                    : selectedSection.id === 'speakers'
                      ? { speakers: [] } // list of { id, name, role }
                      : undefined
      }
      setFormData((prev) => ({ ...prev, sections: [newSection, ...(prev.sections || [])] }))
    }
    setIsSectionModalOpen(false)
  }

  const executeRemoveSection = useCallback(
    async (sectionId: string) => {
      const section = formData.sections.find((s) => s.id === sectionId)
      if (!section) return

      const previewUrl = section?.data?.previewUrl
      if (typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(previewUrl)
        } catch {
          // ignore
        }
      }
      const videoPreviewUrl = section?.data?.videoPreviewUrl
      if (typeof videoPreviewUrl === 'string' && videoPreviewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(videoPreviewUrl)
        } catch {
          // ignore
        }
      }
      const galleryImages = section?.data?.images as Array<{ previewUrl?: string }> | undefined
      if (Array.isArray(galleryImages)) {
        galleryImages.forEach((item) => {
          const url = item?.previewUrl
          if (typeof url === 'string' && url.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(url)
            } catch {
              // ignore
            }
          }
        })
      }
      if (section.type === 'resources' && onBeforeRemoveResourceFile) {
        const files = (section.data?.files as Array<{ url?: string; name: string; resourceId?: string } | File>) ?? []
        for (let i = 0; i < files.length; i++) {
          const item = files[i]
          if (item && typeof item === 'object' && !(item instanceof File) && item.resourceId) {
            try {
              await Promise.resolve(onBeforeRemoveResourceFile(sectionId, item, i))
            } catch {
              // continue
            }
          }
        }
      }
      if (section.sectionId && onBeforeRemoveSection) {
        try {
          await Promise.resolve(onBeforeRemoveSection(section))
        } catch {
          // caller may toast; still remove from state
        }
      }
      setFormData((prev) => ({ ...prev, sections: (prev.sections || []).filter((s) => s.id !== sectionId) }))
    },
    [formData.sections, onBeforeRemoveSection, onBeforeRemoveResourceFile]
  )

  const handleRemoveSection = (sectionId: string) => {
    const section = formData.sections.find((s) => s.id === sectionId)
    if (!section) return
    setPendingRemoveSection({ sectionId, title: section.title || 'Section' })
  }

  const handleConfirmRemoveSection = useCallback(async () => {
    if (!pendingRemoveSection) return
    setIsRemovingSection(true)
    try {
      await executeRemoveSection(pendingRemoveSection.sectionId)
      setPendingRemoveSection(null)
    } finally {
      setIsRemovingSection(false)
    }
  }, [pendingRemoveSection, executeRemoveSection])

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
        s.id === sectionId ? { ...s, data: { ...(s.data || {}), file: undefined, previewUrl: undefined, url: '' } } : s
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

  const openResourcesImagePicker = (sectionId: string) => {
    resourcesUploadSectionIdRef.current = sectionId
    resourcesImageInputRef.current?.click()
  }

  const openVideoUploadPicker = (sectionId: string) => {
    sectionVideoUploadSectionIdRef.current = sectionId
    sectionVideoInputRef.current?.click()
  }

  const handleSectionVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectionId = sectionVideoUploadSectionIdRef.current
    const file = e.target.files?.[0]
    e.target.value = ''
    sectionVideoUploadSectionIdRef.current = null
    if (!file || !sectionId) return
    const previewUrl = URL.createObjectURL(file)
    if (sectionId === 'template-video') {
      setFormData((prev) => ({
        ...prev,
        videoFile: file,
        videoPreviewUrl: previewUrl,
        videoUrl: ''
      }))
      return
    }
    const section = formData.sections.find((s) => s.id === sectionId)
    updateSection(sectionId, {
      data: {
        ...(section?.data || {}),
        videoFile: file,
        videoPreviewUrl: previewUrl,
        videoUrl: '',
        video_url: ''
      }
    })
  }

  const openVideoResourcePicker = (sectionId: string) => {
    setResourcePickerTarget({ sectionId, media: 'video' })
  }

  const openImageResourcePicker = (sectionId: string) => {
    setResourcePickerTarget({ sectionId, media: 'image' })
  }

  const handleResourcePickerSelect = (url: string, _name: string) => {
    const pick = resourcePickerTarget
    setResourcePickerTarget(null)
    if (!pick?.sectionId) return
    if (pick.media === 'video') {
      if (pick.sectionId === 'template-video') {
        setFormData((prev) => ({
          ...prev,
          videoUrl: url,
          videoFile: null,
          videoPreviewUrl: ''
        }))
        return
      }
      const section = formData.sections.find((s) => s.id === pick.sectionId)
      updateSection(pick.sectionId, {
        data: {
          ...(section?.data || {}),
          videoUrl: url,
          video_url: url,
          videoFile: undefined,
          videoPreviewUrl: undefined
        }
      })
      return
    }
    const section = formData.sections.find((s) => s.id === pick.sectionId)
    const prevBlob = section?.data?.previewUrl
    if (typeof prevBlob === 'string' && prevBlob.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(prevBlob)
      } catch {
        // ignore
      }
    }
    updateSection(pick.sectionId, {
      data: { ...(section?.data || {}), url, file: undefined, previewUrl: undefined }
    })
  }

  const handleResourcesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectionId = resourcesUploadSectionIdRef.current
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    resourcesUploadSectionIdRef.current = null
    if (!files.length || !sectionId) return

    if (sectionId === 'template-resources') {
      setFormData((prev) => ({ ...prev, resources: [...(prev.resources || []), ...files] }))
      return
    }

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

  const handleResourcesImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectionId = resourcesUploadSectionIdRef.current
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    resourcesUploadSectionIdRef.current = null
    if (!files.length || !sectionId) return

    if (sectionId === 'template-resources') {
      setFormData((prev) => ({ ...prev, resources: [...(prev.resources || []), ...files] }))
      return
    }

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

  const handleRemoveResourcesFile = async (sectionId: string, index: number) => {
    if (sectionId === 'template-resources') {
      setFormData((prev) => ({
        ...prev,
        resources: (prev.resources || []).filter((_, i) => i !== index)
      }))
      return
    }
    const section = formData.sections.find((s) => s.id === sectionId)
    const files = (section?.data?.files as Array<File | { url?: string; name: string; resourceId?: string }>) ?? []
    const fileAt = files[index]
    if (onBeforeRemoveResourceFile && fileAt && typeof fileAt === 'object' && !(fileAt instanceof File) && (fileAt as { resourceId?: string }).resourceId) {
      try {
        await Promise.resolve(onBeforeRemoveResourceFile(sectionId, fileAt as { url?: string; name: string; resourceId?: string }, index))
      } catch {
        // continue to remove from state
      }
    }
    const nextFiles = files.filter((_, i) => i !== index)
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, data: { ...(s.data || {}), files: nextFiles } } : s
      )
    }))
  }

  const updateSection = (sectionId: string, patch: Partial<SessionSection>) => {
    setFormData((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) => (s.id === sectionId ? { ...s, ...patch } : s))
    }))
  }

  const templateVideoSection: SessionSection = React.useMemo(
    () => ({
      id: 'template-video',
      type: 'video',
      title: 'Video',
      description: '',
      data: {
        videoUrl: formData.videoUrl ?? '',
        video_url: formData.videoUrl ?? '',
        videoFile: formData.videoFile ?? undefined,
        videoPreviewUrl: formData.videoPreviewUrl ?? ''
      }
    }),
    [formData.videoUrl, formData.videoFile, formData.videoPreviewUrl]
  )

  const templateSpeakersSection: SessionSection = React.useMemo(
    () => ({
      id: 'template-speakers',
      type: 'speakers',
      title: 'Speakers',
      description: '',
      data: { speakers: formData.speakers }
    }),
    [formData.speakers]
  )

  const templateDescriptionSection: SessionSection = React.useMemo(
    () => ({
      id: 'template-description',
      type: 'text',
      title: 'Text',
      description: formData.description ?? '',
      data: { body: formData.description ?? '', title: 'Text' }
    }),
    [formData.description]
  )

  const templateResourcesSection: SessionSection = React.useMemo(
    () => ({
      id: 'template-resources',
      type: 'resources',
      title: 'Resources',
      description: '',
      data: { files: formData.resources ?? [] }
    }),
    [formData.resources]
  )

  /** Unified handlers so both dynamic sections and template blocks use the same SessionSectionPreview component (same as SessionSlideout). */
  const sectionPreviewHandlers: SessionSectionPreviewHandlers = React.useMemo(
    () => ({
      onUpdateSection: (sectionId: string, patch: Partial<SessionSection>) => {
        if (sectionId === 'template-video') {
          const data = patch.data as { videoUrl?: string; videoFile?: File | null; videoPreviewUrl?: string } | undefined
          if (data) {
            setFormData((prev) => ({
              ...prev,
              videoUrl: data.videoUrl !== undefined ? data.videoUrl : prev.videoUrl,
              videoFile: data.videoFile !== undefined ? data.videoFile : prev.videoFile,
              videoPreviewUrl: data.videoPreviewUrl !== undefined ? data.videoPreviewUrl : prev.videoPreviewUrl
            }))
          }
          return
        }
        if (sectionId === 'template-speakers') {
          const data = patch.data as { speakers?: Array<{ id: string; name: string; role?: string }> } | undefined
          if (data?.speakers && Array.isArray(data.speakers)) {
            setFormData((prev) => ({
              ...prev,
              speakers: data.speakers!.map((s) => ({ id: s.id, name: s.name, role: s.role || 'Chairman' }))
            }))
          }
          return
        }
        if (sectionId === 'template-description') {
          const value =
            (patch.description !== undefined ? String(patch.description) : null) ??
            (patch.data && typeof (patch.data as { body?: string }).body === 'string'
              ? (patch.data as { body: string }).body
              : null)
          if (value !== null) setFormData((prev) => ({ ...prev, description: value }))
          return
        }
        updateSection(sectionId, patch)
      },
      galleryCurrentIndex,
      onGalleryIndexChange: (sectionId: string, index: number) => {
        setGalleryCurrentIndex((prev) => ({ ...prev, [sectionId]: index }))
      },
      onOpenSectionImagePicker: openSectionImagePicker,
      onRemoveSectionImage: handleRemoveSectionImage,
      onOpenGalleryPicker: openGalleryPicker,
      onRemoveGalleryImage: handleRemoveGalleryImage,
      onOpenResourcesPicker: openResourcesPicker,
      onOpenResourcesImagePicker: openResourcesImagePicker,
      onRemoveResourcesFile: handleRemoveResourcesFile,
      onOpenVideoUploadPicker: openVideoUploadPicker,
      onOpenVideoResourcePicker: openVideoResourcePicker,
      onOpenImageResourcePicker: openImageResourcePicker,
      eventUuid,
      onAddSpeakerToSection: (sectionId: string, speaker: { id: string; name: string; role?: string }) => {
        if (sectionId === 'template-speakers') {
          setFormData((prev) => ({
            ...prev,
            speakers: [
              ...prev.speakers,
              { id: speaker.id, name: speaker.name, role: speaker.role || 'Chairman' }
            ]
          }))
          return
        }
        const sec = formData.sections?.find((s) => s.id === sectionId)
        if (!sec) return
        const current = (sec.data?.speakers as Array<{ id: string; name: string; role?: string }>) ?? []
        updateSection(sectionId, { data: { ...(sec.data || {}), speakers: [...current, speaker] } })
      }
    }),
    [
      eventUuid,
      galleryCurrentIndex,
      formData.sections
    ]
  )

  const renderSectionPreview = (section: SessionSection) => (
    <SessionSectionPreview section={section} handlers={sectionPreviewHandlers} />
  )



  const handleSave = async () => {
    if (!onSave) return
    try {
      setIsSaving(true)
      await Promise.resolve(onSave(formData, sessionId ?? undefined))
      // After successful save, reset local form state and close so user sees session list
      setFormData({
        title: '',
        startTime: '',
        endTime: '',
        location: '',
        sessionType: '',
        tags: [],
        childSession: false,
        videoUrl: '',
        videoFile: null,
        videoPreviewUrl: '',
        speakers: [],
        description: '',
        hyperlinks: [],
        resources: [],
        liveChatEnabled: false,
        comment: '',
        submitAnonymous: false,
        sections: []
      })
      setIsEditing(true)
      handleClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleBeginEdit = () => {
    setIsEditing(true)
  }

  // Map formData to SessionDraft for summary view.
  // Include dynamic sections (Add section) plus synthetic sections for template blocks (Video, Speakers, etc.) so they appear in the summary.
  const templateSections: SessionSection[] = []
  const effectiveVideoUrl = formData.videoUrl || formData.videoPreviewUrl || ''
  if (effectiveVideoUrl || formData.videoFile) {
    templateSections.push({
      id: 'template-video',
      type: 'video',
      title: 'Video',
      description: 'Video added',
      data: {
        videoUrl: effectiveVideoUrl,
        videoFile: formData.videoFile ?? undefined,
        videoPreviewUrl: formData.videoPreviewUrl ?? ''
      }
    })
  }
  if ((formData.speakers || []).length > 0) {
    templateSections.push({
      id: 'template-speakers',
      type: 'speakers',
      title: 'Speakers',
      description: `${formData.speakers.length} speaker(s)`,
      data: { speakers: formData.speakers }
    })
  }
  if (formData.description?.trim()) {
    templateSections.push({
      id: 'template-description',
      type: 'text',
      title: 'Text',
      description: formData.description.trim()
    })
  }
  if ((formData.hyperlinks || []).length > 0) {
    templateSections.push({
      id: 'template-hyperlinks',
      type: 'hyperlink',
      title: 'Hyperlink',
      description: `${formData.hyperlinks.length} link(s)`,
      data: { hyperlinks: formData.hyperlinks }
    })
  }
  if ((formData.resources || []).length > 0) {
    templateSections.push({
      id: 'template-resources',
      type: 'resources',
      title: 'Resources',
      description: `${formData.resources.length} file(s)`,
      data: { fileNames: (formData.resources || []).map((f) => f.name) }
    })
  }
  if (formData.liveChatEnabled) {
    templateSections.push({
      id: 'template-live-chat',
      type: 'live-chat',
      title: 'Live Chat',
      description: formData.comment || 'Live Chat will appear here.',
      data: {
        submitAnonymous: formData.submitAnonymous ?? false
      }
    })
  }
  const summaryDraft = {
    ...defaultSessionDraft,
    title: (formData.title || '').trim() || 'Session title',
    startTime: formData.startTime || defaultSessionDraft.startTime,
    startPeriod: 'AM' as const,
    endTime: formData.endTime || defaultSessionDraft.endTime,
    endPeriod: 'AM' as const,
    location: formData.location || '',
    sessionType: formData.sessionType || '',
    tags: formData.tags || [],
    sections: [...(formData.sections || []), ...templateSections]
  }

  // Section Component – only show Remove when onRemove is provided (for removable sections)
  const SectionHeader: React.FC<{
    title: string
    onRemove?: () => void
  }> = ({ title, onRemove }) => (
    <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-t-lg border-b border-slate-200">
      <div className="flex items-center gap-3 min-w-0">
        <DragHandleIcon className="h-4 w-4 shrink-0 text-slate-400 cursor-move" />
        <span className="text-sm font-semibold text-slate-900 truncate">{title}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label={`Edit ${title} section`}
        >
          <Pencil01 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label={`Settings for ${title}`}
        >
          <Settings01 className="h-4 w-4" />
        </button>
        {typeof onRemove === 'function' && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            aria-label={`Remove ${title} section`}
          >
            <Trash01 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )

  const slideoutHeader = (
    <div className="flex items-center justify-end border-b border-slate-200 px-6 py-3">
      <button
        type="button"
        onClick={handleClose}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label="Close"
      >
        <XClose className="h-5 w-5" />
      </button>
    </div>
  )

  const footerContent = (
    <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
      {isEditing ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleClose}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleBeginEdit}
            className="bg-primary hover:bg-primary/90"
          >
            Edit
          </Button>
        </>
      )}
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
        ref={resourcesImageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleResourcesImageChange}
        aria-hidden
      />
      <input
        ref={sectionVideoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleSectionVideoFileChange}
        aria-hidden
      />
      {resourcePickerTarget && eventUuid && (
        <ResourceVideoPickerModal
          isOpen={Boolean(resourcePickerTarget)}
          onClose={() => setResourcePickerTarget(null)}
          eventUuid={eventUuid}
          mediaType={resourcePickerTarget.media}
          onSelect={handleResourcePickerSelect}
        />
      )}
      <Slideout
        ref={slideoutRef}
        isOpen={isOpen}
        onClose={handleClose}
        header={slideoutHeader}
        topOffset={topOffset}
        panelWidthRatio={panelWidthRatio}
        footer={footerContent}
      >
        {isEditing ? (
          <>
            {/* Scrollable Content */}
            <div className="px-6 py-6 space-y-4">
        {/* Title Section */}
            <div className="min-w-0">
              <Input
                label="Title *"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter session title"
              />
            </div>
          {/* Row 1: start / end / session type — single row; row 2: location / tags — single row */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 min-w-0">
              <div className="min-w-0">
                <Input
                  label="Start time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="min-w-0">
                <Input
                  label="End time"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
              <div className="min-w-0">
                <Select
                  label="Session type"
                  value={formData.sessionType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sessionType: e.target.value }))}
                  options={[
                    { value: '', label: 'Select session type' },
                    { value: 'online', label: 'Online' },
                    { value: 'in-person', label: 'In person' },
                  ]}
                  className="h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-0">
              <div className="min-w-0">
                <CreatableMultiSelect
                  label="Location"
                  options={locationOptions}
                  value={selectedLocationOptions}
                  onChange={handleLocationMultiChange}
                  placeholder="Select or create"
                  className="rounded-lg"
                />
              </div>
              <div className="min-w-0">
                <CreatableMultiSelect
                  label="Tags"
                  options={tagOptions}
                  value={selectedTagOptions}
                  onChange={handleTagsChange}
                  onCreateOption={eventUuid ? handleCreateTagOption : undefined}
                  placeholder="Select or create"
                  className="rounded-lg"
                />
              </div>
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

          {/* Section 1: Video – uses SessionSectionPreview (URL, upload, resource picker, preview) */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <SectionHeader title="Video" />
            <SessionSectionPreview section={templateVideoSection} handlers={sectionPreviewHandlers} />
          </div>

          {/* Section 2: Speakers – uses SessionSectionPreview (same as session slideout) */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <SectionHeader title="Speakers" />
            <SessionSectionPreview section={templateSpeakersSection} handlers={sectionPreviewHandlers} />
          </div>

          {/* Section 3: Text – same Text section as SessionSlideout (add from modal) */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <SectionHeader title="Text" />
            <SessionSectionPreview section={templateDescriptionSection} handlers={sectionPreviewHandlers} />
          </div>

          {/* Section 4: Hyperlink */}
          {/* <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
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
          </div> */}

          {/* Section 5: Resources – same as SessionSlideout (SessionSectionPreview) */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <SectionHeader title="Resources" />
            <SessionSectionPreview section={templateResourcesSection} handlers={sectionPreviewHandlers} />
          </div>
        </div>
          </>
        ) : (
          <div key="summary" className="px-6 py-4 min-h-[200px]">
            <SessionSummaryView session={summaryDraft} />
          </div>
        )}
      </Slideout>

      <SectionPickerModal
        isOpen={isSectionModalOpen}
        selectedSectionId={selectedSectionId}
        onClose={handleCloseSectionModal}
        onSelect={(sectionId) => setSelectedSectionId(sectionId)}
        onConfirm={handleConfirmSection}
        options={sectionOptions}
      />
      {typeof document !== 'undefined' &&
        pendingRemoveSection != null &&
        createPortal(
          <ConfirmDeleteModal
            isOpen={true}
            title="Remove section"
            itemName={pendingRemoveSection.title}
            description={`Are you sure you want to remove "${pendingRemoveSection.title}"? This cannot be undone.`}
            confirmText="Remove"
            cancelText="Cancel"
            isLoading={isRemovingSection}
            onCancel={() => setPendingRemoveSection(null)}
            onConfirm={handleConfirmRemoveSection}
          />,
          document.body
        )}
    </>
  )
}

export default TemplateSessionSlideout
