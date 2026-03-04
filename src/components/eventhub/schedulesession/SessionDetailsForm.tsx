import React, { useMemo } from 'react'
import { Eye, Pencil01, Trash01 } from '@untitled-ui/icons-react'
import { Input, Select, Button } from '../../ui/untitled'
import CreatableMultiSelect, { type CreatableMultiSelectOption } from '../../ui/untitled/CreatableMultiSelect'
import type { MultiValue, ActionMeta } from 'react-select'
import { SessionDraft, SessionSection } from './sessionTypes'

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
}

const SessionDetailsForm: React.FC<SessionDetailsFormProps> = ({
  draft,
  tagsInput,
  onFieldChange,
  onTagsInputChange,
  onAddSectionClick,
  sessionTagOptions,
  availableTags = [],
  availableLocations = [],
  renderSectionPreview,
  onRemoveSection
}) => {

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

  // Use sessionTagOptions (uuid as value) when present so we send tag_uuids to backend; else use availableTags (name as value)
  const tagOptions: CreatableMultiSelectOption[] = (sessionTagOptions && sessionTagOptions.length > 0)
    ? sessionTagOptions.map((t) => ({ value: t.uuid, label: t.name }))
    : availableTags.map((value) => ({ value, label: tagOptionsMap[value] || value }))

  const locationOptions = availableLocations.map(value => ({
    value,
    label: locationOptionsMap[value] || value
  }))

  // Map draft.tags (uuid or name) to CreatableMultiSelect selected options
  const selectedTagOptions: CreatableMultiSelectOption[] = useMemo(() => {
    return (draft.tags ?? []).map((tag) => {
      if (typeof tag !== 'string') {
        return {
          value: String(tag),
          label: String(tag)
        }
      }
      // If this looks like a UUID and exists in options, use that option
      const fromOptions = tagOptions.find((opt) => opt.value === tag || opt.label === tag)
      if (fromOptions) return fromOptions
      // Otherwise treat as freeform tag name
      return {
        value: tag.toLowerCase().replace(/\s+/g, '-'),
        label: tag
      }
    })
  }, [draft.tags, tagOptions])

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
          type="text"
          inputMode="numeric"
          placeholder="00:00"
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
          className="h-10 w-[100px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-600 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-slate-600">SESSION TITLE</p>
        <Input
          placeholder="Enter session title"
          value={draft.title || ''}
          onChange={(event) => onFieldChange('title', event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:gap-3">
        {renderTimeField('Start time', 'startTime')}
        {renderTimeField('End time', 'endTime')}

        {/* Location Select */}
        {availableLocations.length > 0 ? (
          <div className="flex-1 min-w-0">
            <Select
              label="Location"
              value={draft.location}
              onChange={(event) => onFieldChange('location', event.target.value)}
              options={[
                { value: '', label: 'Select location' },
                ...locationOptions
              ]}
              className="h-10 "
            />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <Input
              label="Location"
              placeholder="Select location"
              value={draft.location}
              onChange={(event) => onFieldChange('location', event.target.value)}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
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

        {/* Tags: always use creatable multiselect so user can select existing tags or create new ones */}
        <div className="flex-1 min-w-0">
          <CreatableMultiSelect
            label="Tags"
            options={tagOptions}
            value={selectedTagOptions}
            onChange={handleTagsMultiChange}
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
              {draft.sections.map((section) => (
                <li
                  key={section.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold uppercase text-primary">
                        {section.title.slice(0, 1)}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">{section.title}</span>
                    </div>
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
