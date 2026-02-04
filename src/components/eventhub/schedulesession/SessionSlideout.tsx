import React, { useEffect, useMemo, useRef, useState } from 'react'
import Slideout from '../../ui/untitled/Slideout'
import Button from '../../ui/untitled/Button'
import SessionDetailsForm from './SessionDetailsForm'
import SectionPickerModal from './SectionPickerModal'
import SessionSummaryView from './SessionSummaryView'
import SessionSectionPreview from './SessionSectionPreview'
import type { SessionSectionPreviewHandlers } from './SessionSectionPreview'
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
  availableLocations = []
}) => {
  const [draft, setDraft] = useState<SessionDraft>(defaultSessionDraft)
  const [tagsInput, setTagsInput] = useState('')
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sectionOptions[0]?.id ?? 'slides')
  const [isEditing, setIsEditing] = useState(startInEditMode)
  const [galleryCurrentIndex, setGalleryCurrentIndex] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)

  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const imageUploadSectionIdRef = useRef<string | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const galleryUploadSectionIdRef = useRef<string | null>(null)
  const resourcesInputRef = useRef<HTMLInputElement | null>(null)
  const resourcesUploadSectionIdRef = useRef<string | null>(null)


  useEffect(() => {
    if (!isOpen) {
      setDraft(defaultSessionDraft)
      setTagsInput('')
      setIsSectionModalOpen(false)
      setSelectedSectionId(sectionOptions[0]?.id ?? 'slides')
      setIsEditing(true)
    }
  }, [isOpen])

  const prevIsOpenRef = useRef(false)
  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false
      return
    }
    // Only sync draft and isEditing when the slideout first opens (isOpen false → true).
    // When parent updates after save (e.g. activeDraft=null), do not overwrite – we stay in summary view.
    const justOpened = !prevIsOpenRef.current
    prevIsOpenRef.current = true

    if (!justOpened) {
      return
    }

    const sourceDraft = initialDraft
      ? {
          ...defaultSessionDraft,
          ...initialDraft,
          tags: [...(initialDraft.tags ?? [])],
          sections: initialDraft.sections?.map((section) => ({ ...section })) ?? []
        }
      : defaultSessionDraft

    setDraft(sourceDraft)
    setTagsInput(sourceDraft.tags.join(', '))
    setIsSectionModalOpen(false)
    setSelectedSectionId(sectionOptions[0]?.id ?? 'slides')
    setIsEditing(startInEditMode || !initialDraft)
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

  const handleRemoveSection = (sectionId: string) => {
    const section = draft.sections.find((s) => s.id === sectionId)
    const previewUrl = section?.data?.previewUrl
    if (typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewUrl)
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
    setDraft((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== sectionId) }))
  }

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

  const handleResourcesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectionId = resourcesUploadSectionIdRef.current
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    resourcesUploadSectionIdRef.current = null
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

  const handleRemoveResourcesFile = (sectionId: string, index: number) => {
    const section = draft.sections.find((s) => s.id === sectionId)
    const files = (section?.data?.files as File[]) ?? []
    const nextFiles = files.filter((_, i) => i !== index)
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, data: { ...(s.data || {}), files: nextFiles } } : s
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
    onRemoveResourcesFile: handleRemoveResourcesFile
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
      setIsEditing(false)
      setIsSectionModalOpen(false)
      setTagsInput(draft.tags.join(', '))
    } finally {
      setIsSaving(false)
    }
  }

  const handleBeginEdit = () => {
    setTagsInput(draft.tags.join(', '))
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
            onClick={onClose}
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
            onClick={onClose}
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
      <Slideout
        isOpen={isOpen}
        onClose={onClose}
        topOffset={topOffset}
        panelWidthRatio={panelWidthRatio}
        footer={footerContent}
      >
        <div className="px-6 py-4">
          {isEditing ? (
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
            <SessionSummaryView session={draft} />
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
    </>
  )
}

export default SessionSlideout


