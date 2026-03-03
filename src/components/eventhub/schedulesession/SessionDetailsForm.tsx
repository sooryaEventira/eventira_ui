import React from 'react'
import { Eye, Pencil01, Trash01 } from '@untitled-ui/icons-react'
import { Input, Select, Button } from '../../ui/untitled'
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
  const tagOptions = (sessionTagOptions && sessionTagOptions.length > 0)
    ? sessionTagOptions.map((t) => ({ value: t.uuid, label: t.name }))
    : availableTags.map((value) => ({ value, label: tagOptionsMap[value] || value }))
  const hasTagOptions = (sessionTagOptions && sessionTagOptions.length > 0) || availableTags.length > 0

  const locationOptions = availableLocations.map(value => ({
    value,
    label: locationOptionsMap[value] || value
  }))




  const renderTimeField = (
    label: string,
    timeKey: 'startTime' | 'endTime'
  ) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        placeholder="00:00"
        value={draft[timeKey] || ''}
        onChange={(event) => {
          const value = event.target.value
          // Allow empty or basic HH:MM-like input; validation happens on save
          onFieldChange(timeKey, value)
        }}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-600 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  )

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
              className="h-10"
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

        {/* Tags Dropdown - when sessionTagOptions used, value is uuid so tag_uuids sent to backend */}
        {hasTagOptions ? (
          <div className="flex-1 min-w-0">
            <Select
              label="Tags"
              value={draft.tags.length > 0 ? draft.tags[0] : ''}
              onChange={(event) => onFieldChange('tags', event.target.value ? [event.target.value] : [])}
              options={[
                { value: '', label: 'Select tags' },
                ...tagOptions
              ]}
              className="h-10"
            />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <Input
              label="Tags"
              placeholder="Select tags"
              value={tagsInput}
              onChange={(event) => onTagsInputChange(event.target.value)}
            />
          </div>
        )}
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
