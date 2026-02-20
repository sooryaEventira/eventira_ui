import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Slideout, { type SlideoutHandle } from '../../ui/untitled/Slideout'
import Button from '../../ui/untitled/Button'
import SessionDetailsForm from './SessionDetailsForm'
import SectionPickerModal from './SectionPickerModal'
import SessionSummaryView from './SessionSummaryView'
import SessionSectionPreview from './SessionSectionPreview'
import type { SessionSectionPreviewHandlers } from './SessionSectionPreview'
import ResourceVideoPickerModal from './ResourceVideoPickerModal'
import ConfirmDeleteModal from '../../ui/ConfirmDeleteModal'
import { defaultSessionDraft, sectionOptions } from './sessionConfig'
import { SessionDraft, SessionSection } from './sessionTypes'

interface SessionSlideoutProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (session: SessionDraft) => void | Promise<void>
  initialDraft?: SessionDraft | null
  startInEditMode?: boolean
  topOffset?: number
  panelWidthRatio?: number
  availableTags?: string[]
  availableLocations?: string[]
  /** When set, Speakers sections can search and add event speakers. */
  eventUuid?: string
  /** When a section with a backend id (sectionId) is removed, call this before updating local state (e.g. DELETE session section on API). */
  onBeforeRemoveSection?: (section: SessionSection) => void | Promise<void>
  /** When a resource file with a backend id (resourceId) is removed, call this before updating local state (e.g. DELETE session resource on API). */
  onBeforeRemoveResourceFile?: (sectionId: string, file: { url?: string; name: string; resourceId?: string }, index: number) => void | Promise<void>
  /** When true, show loading state instead of form/summary (parent is fetching session data). */
  draftLoading?: boolean
  /** Called when draft is updated due to section/resource removal so parent can keep activeDraft in sync. */
  onDraftChange?: (draft: SessionDraft) => void
}

const SessionSlideout: React.FC<SessionSlideoutProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDraft,
  startInEditMode = true,
  topOffset = 64,
  panelWidthRatio = 0.5,
  availableTags = [],
  availableLocations = [],
  eventUuid = '',
  onBeforeRemoveSection,
  onBeforeRemoveResourceFile,
  draftLoading = false,
  onDraftChange
}) => {
  const [draft, setDraft] = useState<SessionDraft>(defaultSessionDraft)
  const [tagsInput, setTagsInput] = useState('')
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sectionOptions[0]?.id ?? 'slides')
  const [isEditing, setIsEditing] = useState(startInEditMode)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [galleryCurrentIndex, setGalleryCurrentIndex] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [pendingRemoveSection, setPendingRemoveSection] = useState<{ sectionId: string; title: string } | null>(null)
  const [isRemovingSection, setIsRemovingSection] = useState(false)

  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const imageUploadSectionIdRef = useRef<string | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const galleryUploadSectionIdRef = useRef<string | null>(null)
  const resourcesInputRef = useRef<HTMLInputElement | null>(null)
  const resourcesImageInputRef = useRef<HTMLInputElement | null>(null)
  const resourcesUploadSectionIdRef = useRef<string | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const videoUploadSectionIdRef = useRef<string | null>(null)
  const [resourceVideoPickerSectionId, setResourceVideoPickerSectionId] = useState<string | null>(null)
  const slideoutRef = useRef<SlideoutHandle>(null)

  const handleClose = useCallback(() => {
    slideoutRef.current?.returnFocus()
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) {
      setDraft(defaultSessionDraft)
      setTagsInput('')
      setIsSectionModalOpen(false)
      setSelectedSectionId(sectionOptions[0]?.id ?? 'slides')
      setIsEditing(true)
      setActiveTab('edit')
      setIsSaving(false)
      setPendingRemoveSection(null)
    }
  }, [isOpen])

  const prevIsOpenRef = useRef(false)
  const hasSyncedDraftForThisOpenRef = useRef(false)
  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false
      hasSyncedDraftForThisOpenRef.current = false
      return
    }
    const justOpened = !prevIsOpenRef.current
    prevIsOpenRef.current = true

    const sourceDraft = initialDraft
      ? {
          ...defaultSessionDraft,
          ...initialDraft,
          tags: [...(initialDraft.tags ?? [])],
          sections: initialDraft.sections?.map((section) => ({ ...section })) ?? []
        }
      : defaultSessionDraft

    // Only sync draft when first opening or when initialDraft has just loaded (so we don't overwrite user edits like deleted sections).
    const shouldSync =
      justOpened ||
      (!hasSyncedDraftForThisOpenRef.current && initialDraft != null)
    if (shouldSync) {
      // Mark as synced only when we have real data (so we sync again when initialDraft loads after opening with loading)
      if (initialDraft != null) hasSyncedDraftForThisOpenRef.current = true
      setDraft(sourceDraft)
      setTagsInput(sourceDraft.tags.join(', '))
    }
    setIsSaving(false)

    if (justOpened) {
      setIsSectionModalOpen(false)
      setSelectedSectionId(sectionOptions[0]?.id ?? 'slides')
      setIsEditing(startInEditMode || !initialDraft)
      setActiveTab(startInEditMode ? 'edit' : 'preview')
    }
  }, [initialDraft, isOpen, startInEditMode])

  const handleChange = <K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleAddSection = () => {
    if (!isEditing) {
      return
    }
    setIsSectionModalOpen(true)
    setSelectedSectionId(sectionOptions[0]?.id ?? 'slides')
  }

  const handleConfirmSection = () => {
    const section = sectionOptions.find((item) => item.id === selectedSectionId) ?? sectionOptions[0]
    if (!section) {
      setIsSectionModalOpen(false)
      return
    }

    const sectionDescription =
      section.id === 'text'
        ? 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Odio dictumst tempus magna elit cras posuere cursus pulvinar id. Facilisis at eu amet ornare enim arcu malesuada rutrum a.'
        : undefined

    const data =
      section.id === 'location'
        ? { embed: '' }
        : section.id === 'slides' || section.id === 'image'
          ? { url: '' }
          : section.id === 'photo-gallery'
            ? { images: [] }
            : section.id === 'resources'
              ? { files: [] }
              : section.id === 'video'
                ? { videoUrl: '' }
                : section.id === 'speakers'
                  ? { speakers: [] }
                  : undefined

    setDraft((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: `${section.id}-${Date.now()}`,
          type: section.id,
          title: section.label,
          description: sectionDescription,
          data
        }
      ]
    }))

    setIsSectionModalOpen(false)
  }

  const executeRemoveSection = useCallback(
    async (sectionId: string) => {
      const section = draft.sections.find((s) => s.id === sectionId)
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
      // Resources section: delete each session resource on the backend before removing the section
      if (section.type === 'resources' && onBeforeRemoveResourceFile) {
        const files = (section.data?.files as Array<{ url?: string; name: string; resourceId?: string } | File>) ?? []
        for (let i = 0; i < files.length; i++) {
          const item = files[i]
          if (item && typeof item === 'object' && !(item instanceof File) && item.resourceId) {
            try {
              await Promise.resolve(onBeforeRemoveResourceFile(sectionId, item, i))
            } catch {
              // Caller may toast; continue removing others
            }
          }
        }
      }
      // Section with backend id: delete session section on the backend
      if (section.sectionId && onBeforeRemoveSection) {
        try {
          await Promise.resolve(onBeforeRemoveSection(section))
        } catch {
          // Caller may toast; still remove from local state
        }
      }
      setDraft((prev) => {
        const next = { ...prev, sections: prev.sections.filter((s) => s.id !== sectionId) }
        onDraftChange?.(next)
        return next
      })
    },
    [draft.sections, onBeforeRemoveSection, onBeforeRemoveResourceFile, onDraftChange]
  )

  const handleRemoveSection = (sectionId: string) => {
    const section = draft.sections.find((s) => s.id === sectionId)
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

  const updateSection = (sectionId: string, patch: Partial<SessionSection>) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s))
    }))
  }

  const openSectionImagePicker = (id: string) => {
    imageUploadSectionIdRef.current = id
    imageInputRef.current?.click()
  }

  const handleSectionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectionId = imageUploadSectionIdRef.current
    const file = e.target.files?.[0]
    e.target.value = ''
    imageUploadSectionIdRef.current = null
    if (!file || !sectionId) return
    if (!file.type?.startsWith('image/')) return
    const section = draft.sections.find((s) => s.id === sectionId)
    const prevPreviewUrl = section?.data?.previewUrl
    if (typeof prevPreviewUrl === 'string' && prevPreviewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(prevPreviewUrl)
      } catch {
        // ignore
      }
    }
    const previewUrl = URL.createObjectURL(file)
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, data: { ...(s.data || {}), file, previewUrl, url: '' } } : s
      )
    }))
  }

  const handleRemoveSectionImage = (sectionId: string) => {
    const section = draft.sections.find((s) => s.id === sectionId)
    const previewUrl = section?.data?.previewUrl
    if (typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewUrl)
      } catch {
        // ignore
      }
    }
    setDraft((prev) => ({
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
    const section = draft.sections.find((s) => s.id === sectionId)
    const existingImages = (section?.data?.images as Array<{ file: File; previewUrl: string }>) ?? []
    const newEntries = files
      .filter((file) => file.type?.startsWith('image/'))
      .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    if (newEntries.length === 0) return
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, data: { ...(s.data || {}), images: [...existingImages, ...newEntries] } }
          : s
      )
    }))
  }

  const handleRemoveGalleryImage = (sectionId: string, index: number) => {
    const section = draft.sections.find((s) => s.id === sectionId)
    const images = (section?.data?.images as Array<{ file: File; previewUrl: string }>) ?? []
    const item = images[index]
    if (item?.previewUrl?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(item.previewUrl)
      } catch {
        // ignore
      }
    }
    const nextImages = images.filter((_, i) => i !== index)
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, data: { ...(s.data || {}), images: nextImages } } : s
      )
    }))
    setGalleryCurrentIndex((prev) => {
      const current = prev[sectionId] ?? 0
      return { ...prev, [sectionId]: Math.min(current, Math.max(0, nextImages.length - 1)) }
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

  const addResourcesFilesToSection = (sectionId: string, files: File[]) => {
    if (!files.length || !sectionId) return
    const section = draft.sections.find((s) => s.id === sectionId)
    const existingFiles = (section?.data?.files as File[]) ?? []
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, data: { ...(s.data || {}), files: [...existingFiles, ...files] } }
          : s
      )
    }))
  }

  const handleResourcesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectionId = resourcesUploadSectionIdRef.current
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    resourcesUploadSectionIdRef.current = null
    addResourcesFilesToSection(sectionId ?? '', files)
  }

  const handleResourcesImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectionId = resourcesUploadSectionIdRef.current
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    resourcesUploadSectionIdRef.current = null
    addResourcesFilesToSection(sectionId ?? '', files)
  }

  const handleRemoveResourcesFile = async (sectionId: string, index: number) => {
    const section = draft.sections.find((s) => s.id === sectionId)
    const files = (section?.data?.files as Array<File | { url?: string; name: string; resourceId?: string }>) ?? []
    const fileAt = files[index]
    const hasResourceId = fileAt && typeof fileAt === 'object' && !(fileAt instanceof File) && (fileAt as { resourceId?: string }).resourceId
    if (hasResourceId && onBeforeRemoveResourceFile) {
      const item = fileAt as { url?: string; name: string; resourceId?: string }
      try {
        await Promise.resolve(onBeforeRemoveResourceFile(sectionId, item, index))
      } catch {
        // Caller may toast; still remove from local state
      }
    }
    const nextFiles = files.filter((_, i) => i !== index)
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, data: { ...(s.data || {}), files: nextFiles } } : s
      )
    }))
  }

  const openVideoUploadPicker = (sectionId: string) => {
    videoUploadSectionIdRef.current = sectionId
    videoInputRef.current?.click()
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectionId = videoUploadSectionIdRef.current
    const file = e.target.files?.[0]
    e.target.value = ''
    videoUploadSectionIdRef.current = null
    if (!file || !sectionId) return
    const previewUrl = URL.createObjectURL(file)
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              data: {
                ...(s.data || {}),
                videoFile: file,
                videoPreviewUrl: previewUrl,
                videoUrl: '',
                video_url: ''
              }
            }
          : s
      )
    }))
  }

  const openVideoResourcePicker = (sectionId: string) => {
    setResourceVideoPickerSectionId(sectionId)
  }

  const handleResourceVideoSelect = (url: string, name: string) => {
    const sectionId = resourceVideoPickerSectionId
    setResourceVideoPickerSectionId(null)
    if (!sectionId) return
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              data: {
                ...(s.data || {}),
                videoUrl: url,
                video_url: url,
                videoFile: undefined,
                videoPreviewUrl: undefined
              }
            }
          : s
      )
    }))
  }

  const sectionPreviewHandlers: SessionSectionPreviewHandlers = {
    onUpdateSection: updateSection,
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
    eventUuid: eventUuid || undefined,
    onAddSpeakerToSection: (sectionId: string, speaker: { id: string; name: string; role?: string }) => {
      const sec = draft.sections.find((s) => s.id === sectionId)
      if (!sec) return
      const current = (sec.data?.speakers as Array<{ id: string; name: string; role?: string }>) ?? []
      updateSection(sectionId, { data: { ...(sec.data || {}), speakers: [...current, speaker] } })
    }
  }

  const handleCloseSectionModal = () => {
    setIsSectionModalOpen(false)
  }

  const tagTokens = useMemo(
    () =>
      tagsInput
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean),
    [tagsInput]
  )

  useEffect(() => {
    // Only sync tags from tagsInput if we're using the Input field (no availableTags)
    if (availableTags.length === 0) {
      handleChange('tags', tagTokens)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagTokens.join(','), availableTags.length])

  // Sync tagsInput with draft.tags when using dropdowns
  useEffect(() => {
    if (availableTags.length > 0 && draft.tags) {
      setTagsInput(draft.tags.join(', '))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.tags.join(','), availableTags.length])

  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      await onSave(draft)
      setIsSectionModalOpen(false)
      setTagsInput(draft.tags.join(', '))
      handleClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleBeginEdit = () => {
    setTagsInput(draft.tags.join(', '))
    setActiveTab('edit')
    setIsEditing(true)
  }

  const footerContent = (
    <>
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
          >
            Edit
          </Button>
        </>
      )}
    </>
  )

  const docAccept =
    '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain'

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
        accept={docAccept}
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
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoFileChange}
        aria-hidden
      />
      {resourceVideoPickerSectionId && eventUuid && (
        <ResourceVideoPickerModal
          isOpen={Boolean(resourceVideoPickerSectionId)}
          onClose={() => setResourceVideoPickerSectionId(null)}
          eventUuid={eventUuid}
          onSelect={(url, name) => handleResourceVideoSelect(url, name)}
        />
      )}
      <Slideout
        ref={slideoutRef}
        isOpen={isOpen}
        onClose={handleClose}
        topOffset={topOffset}
        panelWidthRatio={panelWidthRatio}
        footer={footerContent}
      >
        <div className="px-6 py-4">
          {draftLoading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-12 text-slate-500" aria-busy="true">
              <svg className="h-10 w-10 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm font-medium">Loading session…</p>
            </div>
          ) : activeTab === 'edit' ? (
            <SessionDetailsForm
              draft={draft}
              tagsInput={tagsInput}
              onFieldChange={handleChange}
              onTagsInputChange={setTagsInput}
              onAddSectionClick={handleAddSection}
              availableTags={availableTags}
              availableLocations={availableLocations}
              renderSectionPreview={(section) => (
                <SessionSectionPreview section={section} handlers={sectionPreviewHandlers} />
              )}
              onRemoveSection={handleRemoveSection}
            />
          ) : (
            <SessionSummaryView session={draft} sessionId={(draft as { id?: string }).id} eventId={eventUuid || undefined} />
          )}
        </div>
      </Slideout>

      {isEditing && (
        <SectionPickerModal
          isOpen={isSectionModalOpen}
          selectedSectionId={selectedSectionId}
          onClose={handleCloseSectionModal}
          onSelect={(sectionId) => setSelectedSectionId(sectionId)}
          onConfirm={handleConfirmSection}
          options={sectionOptions}
        />
      )}
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

export default SessionSlideout


