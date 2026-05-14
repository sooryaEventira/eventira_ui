import React, { useMemo, useRef, useState } from 'react'
import { Eye, Pencil01, Trash01 } from '@untitled-ui/icons-react'
import { Input, Select, Button } from '../../ui/untitled'
import CreatableMultiSelect, { type CreatableMultiSelectOption } from '../../ui/untitled/CreatableMultiSelect'
import type { MultiValue, ActionMeta } from 'react-select'
import { SessionDraft, SessionSection } from './sessionTypes'
import { sectionOptions } from './sessionConfig'

/** Tag option with uuid for sending tag_uuids to backend. */
export interface SessionTagOption {
  uuid: string
  name: string
}

interface SessionDetailsFormProps {
  draft: SessionDraft
  tagsInput: string
  onFieldChange: <K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) => void
  onTagsInputChange: (value: string) => void
  onAddSectionClick: () => void
  /** When set, tag select uses uuid as value so draft.tags are UUIDs for tag_uuids payload. */
  sessionTagOptions?: SessionTagOption[]
  availableTags?: string[]
  availableLocations?: string[]
  renderSectionPreview?: (section: SessionSection) => React.ReactNode
  onRemoveSection?: (sectionId: string) => void
  onReorderSections?: (sections: SessionSection[]) => void
  /** Called when user creates a new tag — should persist via API and update draft.tags with real UUID. */
  onCreateTagOption?: (inputValue: string) => void
}

const SessionDetailsForm: React.FC<SessionDetailsFormProps> = ({
  draft,
  tagsInput: _tagsInput,
  onFieldChange,
  onTagsInputChange: _onTagsInputChange,
  onAddSectionClick,
  sessionTagOptions,
  availableTags = [],
  availableLocations = [],
  renderSectionPreview,
  onRemoveSection,
  onReorderSections,
  onCreateTagOption
}) => {
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Tag and location option mappings (same as ScheduleDetailsSlideout)
  const tagOptionsMap: Record<string, string> = {
    'speaker': 'Speaker',
    'volunteer': 'Volunteer',
    'student': 'Student',
  }

  const locationOptionsMap: Record<string, string> = {
    'cafeteria': 'Cafeteria',
    'room1': 'Room 1',
    'room2': 'Room 2',
  }

  // Use sessionTagOptions (uuid as value) when present so we send tag_uuids to backend; else use availableTags (name as value).
  // Deduplicate by label (case-insensitive) to prevent duplicate entries in dropdown.
  const tagOptions: CreatableMultiSelectOption[] = useMemo(() => {
    const base = (sessionTagOptions && sessionTagOptions.length > 0)
      ? sessionTagOptions.map((t) => ({ value: t.uuid, label: t.name }))
      : availableTags.map((value) => ({ value, label: tagOptionsMap[value] || value }))

    const seen = new Set<string>()
    return base.filter((opt) => {
      const key = String(opt.label ?? '').trim().toLowerCase()
      if (!key) return false
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [sessionTagOptions, availableTags])

  const locationOptions = availableLocations.map(value => ({
    value,
    label: locationOptionsMap[value] || value
  }))

  const selectedLocationOptions: CreatableMultiSelectOption[] = useMemo(() => {
    const location = (draft.location || '').trim()
    if (!location) return []
    const fromOptions = locationOptions.find((opt) => opt.value === location || opt.label === location)
    if (fromOptions) return [fromOptions]
    return [{ value: location.toLowerCase().replace(/\s+/g, '-'), label: location }]
  }, [draft.location, locationOptions])

  // Map draft.tags (uuid or name) to CreatableMultiSelect selected options
  const selectedTagOptions: CreatableMultiSelectOption[] = useMemo(() => {
    return (draft.tags ?? []).map((tag) => {
      if (typeof tag !== 'string') {
        return {
          value: String(tag),
          label: String(tag)
        }
      }
      // Direct lookup in sessionTagOptions by UUID — most reliable when draft.tags holds UUIDs
      const fromSessionTag = sessionTagOptions?.find((opt) => opt.uuid === tag)
      if (fromSessionTag) return { value: fromSessionTag.uuid, label: fromSessionTag.name }
      // Fallback: match by value or label in tagOptions
      const fromOptions = tagOptions.find((opt) => opt.value === tag || opt.label === tag)
      if (fromOptions) return fromOptions
      // Otherwise treat as freeform tag name
      return {
        value: tag.toLowerCase().replace(/\s+/g, '-'),
        label: tag
      }
    })
  }, [draft.tags, tagOptions, sessionTagOptions])

  const handleTagsMultiChange = (
    newValue: MultiValue<CreatableMultiSelectOption>,
    _actionMeta: ActionMeta<CreatableMultiSelectOption>
  ) => {
    const tagValues = Array.from(newValue).map((option) => {
      // If this option matches a known sessionTagOption, store its uuid
      const fromSessionTag = sessionTagOptions?.find(
        (opt) => opt.uuid === option.value || opt.name === option.label
      )
      if (fromSessionTag) return fromSessionTag.uuid
      // Otherwise store the label as a new tag name (backend will see it in tag_names only)
      return option.label
    })
    onFieldChange('tags', tagValues as unknown as SessionDraft['tags'])
  }

  const handleLocationMultiChange = (
    newValue: MultiValue<CreatableMultiSelectOption>,
    _actionMeta: ActionMeta<CreatableMultiSelectOption>
  ) => {
    const selected = Array.from(newValue)
    const latest = selected[selected.length - 1]
    onFieldChange('location', latest?.label ?? '')
  }

  // Convert stored 12-hour time + period to 24-hour display string
  const to24h = (time: string | undefined, period: 'AM' | 'PM' | undefined): string => {
    const rawTime = (time || '').trim()
    if (!rawTime) return ''
    const [hRaw, mRaw = '00'] = rawTime.split(':')
    const h = Number(hRaw)
    const m = Number(mRaw)
    if (Number.isNaN(h) || Number.isNaN(m)) return rawTime
    const p = (period || 'AM').toUpperCase() as 'AM' | 'PM'
    let hours24 = h % 12
    if (p === 'PM') hours24 += 12
    if (p === 'AM' && h === 12) hours24 = 0
    const hh = String(hours24).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    return `${hh}:${mm}`
  }

  // Parse 24-hour string into 12-hour time + period
  const from24h = (
    input: string,
    fallback: { time: string; period: 'AM' | 'PM' }
  ): { time: string; period: 'AM' | 'PM' } => {
    const raw = input.trim()
    const match = raw.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return fallback
    let h24 = Number(match[1])
    const m = Number(match[2])
    if (Number.isNaN(h24) || Number.isNaN(m)) return fallback
    h24 = Math.max(0, Math.min(23, h24))
    const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM'
    let h12 = h24 % 12
    if (h12 === 0) h12 = 12
    const hh = String(h12).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    return { time: `${hh}:${mm}`, period }
  }

  const renderTimeField = (
    label: string,
    timeKey: 'startTime' | 'endTime'
  ) => {
    const periodKey = timeKey === 'startTime' ? 'startPeriod' : 'endPeriod'
    const period = (draft as any)[periodKey] as 'AM' | 'PM' | undefined
    const displayValue = to24h(draft[timeKey] as string | undefined, period)

    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <input
          type="time"
          step={60}
          value={displayValue}
          onChange={(event) => {
            const value = event.target.value
            const fallback = {
              time: (draft[timeKey] as string) || '',
              period: ((draft as any)[periodKey] as 'AM' | 'PM') || 'AM'
            }
            const next = from24h(value, fallback)
            onFieldChange(timeKey, next.time as any)
            onFieldChange(periodKey as any, next.period as any)
          }}
          className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-600 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Input
        label="Title *"
        placeholder="Enter session title"
        value={draft.title || ''}
        onChange={(event) => onFieldChange('title', event.target.value)}
      />

      {/* Row 1: Start time | End time | Session type — single row (grid) */}
      <div className="grid grid-cols-3 gap-3 min-w-0">
        <div className="min-w-0">{renderTimeField('Start time', 'startTime')}</div>
        <div className="min-w-0">{renderTimeField('End time', 'endTime')}</div>
        <div className="min-w-0">
          <Select
            label="Session type"
            value={draft.sessionType}
            onChange={(event) => onFieldChange('sessionType', event.target.value)}
            options={[
              { value: '', label: 'Select session type' },
              { value: 'online', label: 'Online' },
              { value: 'inperson', label: 'In person' }
            ]}
            className="h-10"
          />
        </div>
      </div>

      {/* Row 2: Location | Tags — single row (grid) */}
      <div className="grid grid-cols-2 gap-3 min-w-0">
        {/* Location */}
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

        {/* Tags */}
        <div className="min-w-0">
          <CreatableMultiSelect
            label="Tags"
            options={tagOptions}
            value={selectedTagOptions}
            onChange={handleTagsMultiChange}
            onCreateOption={onCreateTagOption}
            placeholder="Select or create"
            className='rounded-lg'
          />
        </div>
      </div>

      <div className="text-center">
        {draft.sections.length === 0 ? (
          <>
            <p className="text-base font-medium text-slate-600">Click to add a section!</p>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={onAddSectionClick}
              className="mt-4"
              iconLeading={<span>+</span>}
              aria-label="Add a section"
            >
              Add section
            </Button>
          </>
        ) : (
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-start">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={onAddSectionClick}
                iconLeading={<span>+</span>}
                aria-label="Add another section"
              >
                Add section
              </Button>
            </div>
            <ul className="space-y-3">
              {draft.sections.map((section, index) => (
                <li
                  key={section.id}
                  draggable
                  onDragStart={() => { dragIndexRef.current = index }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index) }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={() => {
                    const from = dragIndexRef.current
                    if (from == null || from === index) { setDragOverIndex(null); return }
                    const reordered = [...draft.sections]
                    const [moved] = reordered.splice(from, 1)
                    reordered.splice(index, 0, moved)
                    onReorderSections?.(reordered)
                    dragIndexRef.current = null
                    setDragOverIndex(null)
                  }}
                  onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null) }}
                  className={`overflow-hidden rounded-xl border bg-slate-50 shadow-sm transition-colors ${dragOverIndex === index ? 'border-primary/50 bg-primary/5' : 'border-slate-200'}`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                    {(() => {
                      const displayTitle = sectionOptions.find(o => o.id === section.type)?.label ?? section.title
                      return (
                        <div className="flex items-center gap-3">
                          {/* Drag handle */}
                          <span
                            className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                            title="Drag to reorder"
                          >
                            <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden>
                              <circle cx="4" cy="4" r="1.5"/><circle cx="10" cy="4" r="1.5"/>
                              <circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/>
                              <circle cx="4" cy="16" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
                            </svg>
                          </span>
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold uppercase text-primary">
                            {displayTitle.slice(0, 1)}
                          </span>
                          <span className="text-sm font-semibold text-slate-700">{displayTitle}</span>
                        </div>
                      )
                    })()}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        aria-label={`Edit ${section.title} section`}
                      >
                        <Pencil01 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        aria-label={`Preview ${section.title} section`}
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      {onRemoveSection && (
                        <button
                          type="button"
                          onClick={() => onRemoveSection(section.id)}
                          className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          aria-label={`Remove ${section.title} section`}
                        >
                          <Trash01 className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-white">
                    {renderSectionPreview ? (
                      renderSectionPreview(section)
                    ) : section.description ? (
                      <div className="space-y-2 px-4 py-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Description
                        </p>
                        <p className="text-sm leading-6 text-slate-600">{section.description}</p>
                      </div>
                    ) : (
                      <p className="px-4 py-2 text-sm text-slate-500">
                        No additional details have been added for this section yet.
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionDetailsForm
