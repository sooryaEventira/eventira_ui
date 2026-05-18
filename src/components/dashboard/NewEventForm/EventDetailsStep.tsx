import React, { useMemo } from 'react'
import { DatePicker } from '../../ui/untitled'
import { SearchLg, X } from '@untitled-ui/icons-react'
import type { EventFormData } from '../NewEventForm'
import TimezoneSelector from './TimezoneSelector'

interface EventDetailsStepProps {
  formData: EventFormData
  updateFormData: (updates: Partial<EventFormData>) => void
}

const EventDetailsStep: React.FC<EventDetailsStepProps> = ({ formData, updateFormData }) => {
  const dateValidationError = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return null
    const startDate = new Date(formData.startDate)
    const endDate = new Date(formData.endDate)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)
    if (endDate < startDate) return 'End date must be on or after start date'
    return null
  }, [formData.startDate, formData.endDate])

  const handleStartDateChange = (value: string) => {
    updateFormData({ startDate: value })
    if (formData.endDate) {
      const start = new Date(value)
      const end = new Date(formData.endDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      if (end < start) updateFormData({ endDate: '' })
    }
  }

  const handleEndDateChange = (value: string) => {
    updateFormData({ endDate: value })
  }

  return (
    <div className="space-y-4">
      {/* Event name */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Event name<span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.eventName}
          onChange={(e) => updateFormData({ eventName: e.target.value })}
          placeholder="Highly important conference of 2025"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Start date, End date, and Timezone */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_180px_1fr]">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Start date<span className="text-red-500">*</span>
          </label>
          <DatePicker
            id="start-date"
            value={formData.startDate}
            onChange={handleStartDateChange}
            placeholder="Select date"
            className="w-[250px] "
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            End date<span className="text-red-500">*</span>
          </label>
          <DatePicker
            id="end-date"
            value={formData.endDate}
            onChange={handleEndDateChange}
            placeholder="Select date"
            minDate={formData.startDate ? formData.startDate : undefined}
            className="w-[250px] "
          />
          {dateValidationError && (
            <span className="text-xs text-red-500 mt-0.5">{dateValidationError}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Timezone<span className="text-red-500">*</span>
          </label>
          <TimezoneSelector
            value={formData.timezone}
            onChange={(value) => updateFormData({ timezone: value })}
            className="w-full"
          />
        </div>
      </div>

      {/* Fix timezone checkbox */}
      {/* <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="fix-timezone"
          checked={formData.fixTimezoneForAttendees}
          onChange={(e) => updateFormData({ fixTimezoneForAttendees: e.target.checked })}
          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
        />
        <label htmlFor="fix-timezone" className="text-sm text-slate-700">
          Fix timezone for attendees
        </label>
      </div> */}

      {/* Location and Attendees in same row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Location<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <SearchLg className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => updateFormData({ location: e.target.value })}
              placeholder="New York, NY"
              className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {formData.location && (
              <button
                type="button"
                onClick={() => updateFormData({ location: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Total attendees<span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.attendees || ''}
            onChange={(e) => updateFormData({ attendees: parseInt(e.target.value) || 0 })}
            placeholder="120"
            min="0"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Event Experience */}
     <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">
          Event experience
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="eventExperience"
              value="in-person"
              checked={formData.eventExperience === 'in-person'}
              onChange={(e) => updateFormData({ eventExperience: e.target.value as 'in-person' | 'virtual' | 'hybrid' })}
              className="h-4 w-4 shrink-0 cursor-pointer accent-primary text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-700">In-person</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="eventExperience"
              value="virtual"
              checked={formData.eventExperience === 'virtual'}
              onChange={(e) => updateFormData({ eventExperience: e.target.value as 'in-person' | 'virtual' | 'hybrid' })}
              className="h-4 w-4 shrink-0 cursor-pointer accent-primary text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-700">Virtual</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="eventExperience"
              value="hybrid"
              checked={formData.eventExperience === 'hybrid'}
              onChange={(e) => updateFormData({ eventExperience: e.target.value as 'in-person' | 'virtual' | 'hybrid' })}
              className="h-4 w-4 shrink-0 cursor-pointer accent-primary text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-700">Hybrid</span>
          </label>
        </div>
      </div> 
    </div>
  )
}

export default EventDetailsStep

