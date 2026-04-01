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

  // Merge availableTags/Locations props into options without overwriting better labels.
  // availableTags may contain UUID strings when the API returns tag UUIDs; loadTags
  // later replaces those with real names. We must not overwrite real names with UUIDs.
  useEffect(() => {
    setTagOptions((prev) => {
      const result = [...prev]
      for (const tag of availableTags) {
        const value = tag.toLowerCase().replace(/\s+/g, '-')
        const existingIdx = result.findIndex((o) => o.value === value)
        if (existingIdx >= 0) {
          // Only update if existing label is still a UUID/placeholder (same as the value itself)
          const existingLabel = result[existingIdx].label
          if (existingLabel === value || existingLabel === tag) {
            result[existingIdx] = { value, label: tag }
          }
          // else: keep the better label already set by loadTags
        } else {
          result.push({ value, label: tag })
        }
      }
      return result
    })

    setLocationOptions(availableLocations.map(location => ({
      value: location.toLowerCase().replace(/\s+/g, '-'),
      label: location
    })))
  }, [availableTags, availableLocations])

  // Fetch tags for this schedule from API (GET {{admin_url}}schedules/{{schedule_uuid}}/tags/?event_id={{event_uuid}})
  useEffect(() => {
    const loadTags = async () => {
      if (!isOpen) return
      const eventUuid = createdEvent?.uuid
      if (!eventUuid || !editingScheduleId) return

      const accessToken = localStorage.getItem('accessToken')
      const organizationUuid = localStorage.getItem('organizationUuid')
      if (!accessToken || !organizationUuid) return

      setIsLoadingTags(true)
      try {
        const url = API_ENDPOINTS.SCHEDULE_TAGS.LIST(editingScheduleId, eventUuid)
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

        // Build name→UUID map from API response
        const nameToUuid: Record<string, string> = {}
        const newOptions: CreatableMultiSelectOption[] = []
        for (const tag of items) {
          const name = tag?.name
          if (typeof name !== 'string' || !name.trim()) continue
          const value = tag?.uuid || tag?.id || name.toLowerCase().replace(/\s+/g, '-')
          nameToUuid[name] = value
          newOptions.push({ value, label: name })
        }

        setTagOptions((prev) => {
          const merged = [...prev]
          for (const opt of newOptions) {
            const existingIdx = merged.findIndex((o) => o.value === opt.value)
            if (existingIdx >= 0) {
              // Replace so the label is updated from UUID placeholder to real name
              merged[existingIdx] = opt
            } else if (!merged.some((o) => o.label.toLowerCase() === opt.label.toLowerCase())) {
              merged.push(opt)
            }
          }
          return merged
        })

        // Normalize details.tags: replace any name-based entries with their UUID
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        setDetails((prev) => ({
          ...prev,
          tags: prev.tags.map((tag) => {
            if (UUID_RE.test(tag)) return tag          // already a UUID
            return nameToUuid[tag] ?? tag               // swap name → UUID
          })
        }))
      } catch (e) {
        // keep UI usable even if request fails
      } finally {
        setIsLoadingTags(false)
      }
    }

    loadTags()
  }, [isOpen, createdEvent?.uuid, editingScheduleId])


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

  // Deduplicate tagOptions by label (case-insensitive) — prevents duplicates from
  // multiple loadTags runs or availableTags prop + API results overlapping
  const deduplicatedTagOptions = useMemo(() => {
    const seen = new Set<string>()
    return tagOptions.filter((opt) => {
      const key = opt.label.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [tagOptions])

  // Convert tags from string[] to CreatableMultiSelectOption[]
  const selectedTags = useMemo(() => {
    return details.tags.map(tag => {
      const existingOption = deduplicatedTagOptions.find(opt => opt.value === tag || opt.label === tag)
      if (existingOption) return existingOption
      return { value: tag, label: tag }
    })
  }, [details.tags, deduplicatedTagOptions])

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
    // Store option.value: UUID for API tags, original name for newly created tags
    const tagValues = Array.from(newValue).map(option => option.value)
    console.log('[Slideout] handleTagsChange called, tagValues:', tagValues)
    handleFieldChange('tags', tagValues)
  }

  const handleLocationsChange = (newValue: MultiValue<CreatableMultiSelectOption>, _actionMeta: ActionMeta<CreatableMultiSelectOption>) => {
    const locationValues = Array.from(newValue).map(option => option.label)
    handleFieldChange('location', locationValues)
  }

  const handleCreateTag = async (inputValue: string) => {
    console.log('[Slideout] handleCreateTag called, inputValue:', inputValue, '| current details.tags:', details.tags)
    // Use the original input as value so it's distinguishable from UUIDs on save
    const newTag: CreatableMultiSelectOption = {
      value: inputValue,
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

    // Persist to API only in edit mode (schedule must exist first)
    const eventUuid = createdEvent?.uuid
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!editingScheduleId || !eventUuid || !accessToken || !organizationUuid) {
      return
    }

    try {
      const response = await fetch(API_ENDPOINTS.SCHEDULE_TAGS.CREATE(editingScheduleId, eventUuid), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Organization': organizationUuid
        },
        credentials: 'include',
        body: JSON.stringify({ name: inputValue.trim() })
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
    console.log('[Slideout] handleSave called, details.tags:', details.tags)
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
                options={deduplicatedTagOptions}
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

