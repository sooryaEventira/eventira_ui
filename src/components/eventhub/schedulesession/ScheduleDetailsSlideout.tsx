import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MultiValue, ActionMeta } from 'react-select'
import Slideout, { type SlideoutHandle } from '../../ui/untitled/Slideout'
import Input from '../../ui/untitled/Input'
import Button from '../../ui/untitled/Button'
import CreatableMultiSelect, { CreatableMultiSelectOption } from '../../ui/untitled/CreatableMultiSelect'
import { useEventForm } from '../../../contexts/EventFormContext'
import { API_ENDPOINTS } from '../../../config/env'

interface ScheduleDetails {
  title: string
  tags: string[]
  location: string[]
  description: string
}

interface ScheduleDetailsSlideoutProps {
  isOpen: boolean
  onClose: () => void
  /** When provided with scheduleId, save performs update; otherwise create. */
  onSave?: (details: ScheduleDetails, scheduleId?: string) => void
  initialDetails?: ScheduleDetails | null
  /** When set, slideout is in edit mode (same form as create, different title/button). */
  editingScheduleId?: string | null
  topOffset?: number
  panelWidthRatio?: number
  availableTags?: string[]
  availableLocations?: string[]
}

const ScheduleDetailsSlideout: React.FC<ScheduleDetailsSlideoutProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDetails,
  editingScheduleId = null,
  topOffset = 64,
  panelWidthRatio = 0.39,
  availableTags = [],
  availableLocations = []
}) => {
  const isEditMode = Boolean(editingScheduleId)
  const slideoutRef = useRef<SlideoutHandle>(null)
  const handleClose = useCallback(() => {
    slideoutRef.current?.returnFocus()
    onClose()
  }, [onClose])

  const { createdEvent } = useEventForm()
  const [details, setDetails] = useState<ScheduleDetails>({
    title: '',
    tags: [],
    location: [],
    description: ''
  })
  const [tagOptions, setTagOptions] = useState<CreatableMultiSelectOption[]>([])
  const [locationOptions, setLocationOptions] = useState<CreatableMultiSelectOption[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)

  // Convert available tags/locations to options format
  useEffect(() => {
    const tagsFromSchedules = availableTags.map(tag => ({
      value: tag.toLowerCase().replace(/\s+/g, '-'),
      label: tag
    }))
    setTagOptions(tagsFromSchedules)

    const locationsFromSchedules = availableLocations.map(location => ({
      value: location.toLowerCase().replace(/\s+/g, '-'),
      label: location
    }))
    setLocationOptions(locationsFromSchedules)
  }, [availableTags, availableLocations])

  // Fetch tags for this event from API (GET {{admin_url}}tags/?event_uuid={{event_uuid}})
  useEffect(() => {
    const loadTags = async () => {
      if (!isOpen) return
      const eventUuid = createdEvent?.uuid
      if (!eventUuid) return

      const accessToken = localStorage.getItem('accessToken')
      const organizationUuid = localStorage.getItem('organizationUuid')
      if (!accessToken || !organizationUuid) return

      setIsLoadingTags(true)
      try {
        const url = API_ENDPOINTS.SCHEDULE_TAGS.LIST(eventUuid)
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Organization': organizationUuid
          },
          credentials: 'include'
        })

        if (!response.ok) {
          // If list endpoint not found / no tags yet, just keep existing options
          setIsLoadingTags(false)
          return
        }

        const data = await response.json()

        // Support common response shapes (ApiResponse, DRF pagination, direct array)
        const extractArray = (payload: any): any[] => {
          if (!payload) return []
          if (Array.isArray(payload)) return payload
          if (payload.status === 'success' && Array.isArray(payload.data)) return payload.data
          if (payload.status === 'success' && Array.isArray(payload.data?.results)) return payload.data.results
          if (Array.isArray(payload.results)) return payload.results
          if (Array.isArray(payload.data?.results)) return payload.data.results
          if (Array.isArray(payload.data)) return payload.data
          return []
        }

        const items = extractArray(data)
        const names = items
          .map((t: any) => t?.name)
          .filter((n: any) => typeof n === 'string' && n.trim().length > 0) as string[]

        setTagOptions((prev) => {
          const merged = [...prev]
          for (const name of names) {
            const value = name.toLowerCase().replace(/\s+/g, '-')
            const exists = merged.some((opt) => opt.value === value || opt.label === name)
            if (!exists) merged.push({ value, label: name })
          }
          return merged
        })
      } catch (e) {
        // keep UI usable even if request fails
      } finally {
        setIsLoadingTags(false)
      }
    }

    loadTags()
  }, [isOpen, createdEvent?.uuid])


  useEffect(() => {
    if (!isOpen) {
      setDetails({
        title: '',
        tags: [],
        location: [],
        description: ''
      })
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && initialDetails) {
      setDetails(initialDetails)
    } else if (isOpen) {
      setDetails({
        title: '',
        tags: [],
        location: [],
        description: ''
      })
    }
  }, [initialDetails, isOpen])


  const handleFieldChange = (field: keyof ScheduleDetails, value: string | string[]) => {
    setDetails((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  // Convert tags from string[] to CreatableMultiSelectOption[]
  const selectedTags = useMemo(() => {
    return details.tags.map(tag => {
      // Try to find existing option
      const existingOption = tagOptions.find(opt => opt.value === tag || opt.label === tag)
      if (existingOption) {
        return existingOption
      }
      // If not found, create new option
      return {
        value: tag.toLowerCase().replace(/\s+/g, '-'),
        label: tag
      }
    })
  }, [details.tags, tagOptions])

  // Convert locations from string[] to CreatableMultiSelectOption[]
  const selectedLocations = useMemo(() => {
    return details.location.map(location => {
      // Try to find existing option
      const existingOption = locationOptions.find(opt => opt.value === location || opt.label === location)
      if (existingOption) {
        return existingOption
      }
      // If not found, create new option
      return {
        value: location.toLowerCase().replace(/\s+/g, '-'),
        label: location
      }
    })
  }, [details.location, locationOptions])

  const handleTagsChange = (newValue: MultiValue<CreatableMultiSelectOption>, _actionMeta: ActionMeta<CreatableMultiSelectOption>) => {
    const tagValues = Array.from(newValue).map(option => option.label)
    handleFieldChange('tags', tagValues)
  }

  const handleLocationsChange = (newValue: MultiValue<CreatableMultiSelectOption>, _actionMeta: ActionMeta<CreatableMultiSelectOption>) => {
    const locationValues = Array.from(newValue).map(option => option.label)
    handleFieldChange('location', locationValues)
  }

  const handleCreateTag = async (inputValue: string) => {
    const newTag: CreatableMultiSelectOption = {
      value: inputValue.toLowerCase().replace(/\s+/g, '-'),
      label: inputValue
    }

    // Optimistically add to options + selection
    setTagOptions((prev) => {
      const exists = prev.some((opt) => opt.value === newTag.value || opt.label === newTag.label)
      if (exists) return prev
      return [...prev, newTag]
    })
    setDetails((prev) => ({
      ...prev,
      tags: prev.tags.includes(inputValue) ? prev.tags : [...prev.tags, inputValue]
    }))

    // Persist to API (POST {{admin_url}}tags/)
    const eventUuid = createdEvent?.uuid
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!eventUuid || !accessToken || !organizationUuid) {
      return
    }

    try {
      const response = await fetch(API_ENDPOINTS.SCHEDULE_TAGS.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Organization': organizationUuid
        },
        credentials: 'include',
        body: JSON.stringify({
          event_uuid: eventUuid,
          name: inputValue.trim(),
          description: '',
          is_active: true
        })
      })

      // If creation fails, keep it locally (still useful for schedule details)
      if (!response.ok) {
        return
      }

      // After success, refresh list once so options match backend
      // (reuses the GET effect next open; this is just an immediate sync)
      const data = await response.json().catch(() => null)
      const createdName = data?.data?.name || data?.name || inputValue
      setTagOptions((prev) => {
        const value = createdName.toLowerCase().replace(/\s+/g, '-')
        const exists = prev.some((opt) => opt.value === value || opt.label === createdName)
        return exists ? prev : [...prev, { value, label: createdName }]
      })
    } catch (e) {
      // ignore network issues here; UI already has the tag optimistically
    }
  }

  const handleCreateLocation = (inputValue: string) => {
    const newLocation: CreatableMultiSelectOption = {
      value: inputValue.toLowerCase().replace(/\s+/g, '-'),
      label: inputValue
    }
    // Add to options if not already present
    setLocationOptions(prev => {
      const exists = prev.some(opt => opt.value === newLocation.value || opt.label === newLocation.label)
      if (exists) return prev
      return [...prev, newLocation]
    })
  }

  const handleSave = () => {
    if (onSave) {
      onSave(details, editingScheduleId ?? undefined)
    }
    handleClose()
  }

  const footerContent = (
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
        disabled={!details.title.trim()}
      >
        {isEditMode ? 'Update schedule' : 'Create schedule'}
      </Button>
    </>
  )

  return (
    <Slideout
      ref={slideoutRef}
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit schedule' : 'Schedule details'}
      topOffset={topOffset}
      panelWidthRatio={panelWidthRatio}
      footer={footerContent}
      
    >
      <div className="px-6 py-6">
        <div className="space-y-6">
          <Input
            label="Title *"
            type="text"
            value={details.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Enter schedule title"
            autoFocus
          />

          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <CreatableMultiSelect
                label="Tags"
                placeholder="Select or create tags"
                options={tagOptions}
                value={selectedTags}
                onChange={handleTagsChange}
                onCreateOption={handleCreateTag}
                isDisabled={isLoadingTags}
              />
            </div>

            <div className="flex-1">
              <CreatableMultiSelect
                label="Location"
                placeholder="Select or create location"
                options={locationOptions}
                value={selectedLocations}
                onChange={handleLocationsChange}
                onCreateOption={handleCreateLocation}
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={details.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="e.g. I joined Stripe's Customer Success team to help them scale their checkout product. I focused mainly on onboarding new customers and resolving complaints."
              rows={6}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>
      </div>
    </Slideout>
  )
}

export default ScheduleDetailsSlideout

