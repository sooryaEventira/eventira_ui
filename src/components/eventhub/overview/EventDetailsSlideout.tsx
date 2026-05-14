import React, { useEffect, useState } from 'react'
import Slideout from '../../ui/untitled/Slideout'
import DatePicker from '../../ui/untitled/DatePicker'
import TimezoneSelector from '../../dashboard/NewEventForm/TimezoneSelector'
import { fetchEvent, updateEvent } from '../../../services/eventService'
import { showToast } from '../../../utils/toast'

interface EventDetailsSlideoutProps {
  isOpen: boolean
  onClose: () => void
  eventUuid: string
  onUpdated?: () => void
}

type ExperienceValue = '' | 'in-person' | 'virtual' | 'hybrid'

interface FormState {
  eventName: string
  startDate: string
  endDate: string
  timezoneId: string
  location: string
  venue: string
  attendees: string
  eventExperience: ExperienceValue
}

const EMPTY_FORM: FormState = {
  eventName: '',
  startDate: '',
  endDate: '',
  timezoneId: '',
  location: '',
  venue: '',
  attendees: '',
  eventExperience: '',
}

const EXPERIENCE_OPTIONS: { value: ExperienceValue; label: string }[] = [
  { value: 'in-person', label: 'In-person' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hybrid', label: 'Hybrid' },
]

const EventDetailsSlideout: React.FC<EventDetailsSlideoutProps> = ({
  isOpen,
  onClose,
  eventUuid,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    if (!isOpen || !eventUuid) return
    setLoading(true)
    fetchEvent(eventUuid)
      .then((data: any) => {
        // attendance_type from API: 'Online' | 'Offline' | 'Hybrid'
        const atMap: Record<string, ExperienceValue> = {
          online: 'virtual',
          offline: 'in-person',
          hybrid: 'hybrid',
          virtual: 'virtual',
          'in-person': 'in-person',
        }
        const rawExp =
          data.eventExperience ??
          String(data.attendance_type ?? '').toLowerCase()
        setForm({
          eventName: data.eventName ?? '',
          startDate: data.startDate ?? '',
          endDate: data.endDate ?? '',
          timezoneId: data.timezone_id ?? data.timezoneId ?? '',
          location: data.location ?? '',
          venue: data.venue ?? '',
          attendees: data.attendees != null ? String(data.attendees) : '',
          eventExperience: atMap[rawExp] ?? '',
        })
      })
      .catch(() => showToast.error('Failed to load event details.'))
      .finally(() => setLoading(false))
  }, [isOpen, eventUuid])

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!form.eventName.trim()) {
      showToast.error('Event name is required.')
      return
    }
    setSaving(true)
    try {
      const toISO = (date: string, isEnd: boolean) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date)
          ? isEnd ? `${date}T23:59:59.999` : `${date}T00:00:00`
          : undefined

      await updateEvent(eventUuid, {
        eventName: form.eventName,
        startDateTimeISO: form.startDate ? toISO(form.startDate, false) : undefined,
        endDateTimeISO: form.endDate ? toISO(form.endDate, true) : undefined,
        timezoneId: form.timezoneId || undefined,
        location: form.location || undefined,
        venue: form.venue || undefined,
        attendees: form.attendees ? Number(form.attendees) : undefined,
        eventExperience: (form.eventExperience as 'in-person' | 'virtual' | 'hybrid') || undefined,
      })
      showToast.success('Event details updated.')
      onUpdated?.()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update event.'
      showToast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Slideout
      isOpen={isOpen}
      onClose={onClose}
      title="Event details"
      width="480px"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-lg bg-[#6938EF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5925DC] disabled:opacity-50"
          >
            {saving ? 'Updating…' : 'Update'}
          </button>
        </>
      }
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">
          Loading…
        </div>
      ) : (
        <div className="space-y-5 p-6">
          {/* Event name */}
          <div>
            <label htmlFor="edit-event-name" className="flex w-full flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Event name <span className="text-rose-500">*</span>
              </span>
            <input
              id="edit-event-name"
              type="text"
              value={form.eventName}
              onChange={(e) => set('eventName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#6938EF] focus:outline-none focus:ring-1 focus:ring-[#6938EF]"
              placeholder="Enter event name"
            />
            </label>
          </div>

          {/* Start / End date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex w-full flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Start date <span className="text-rose-500">*</span>
                </span>
              <DatePicker
                id="edit-start-date"
                value={form.startDate}
                onChange={(v) => set('startDate', v)}
                placeholder="Pick start date"
              />
              </label>
            </div>
            <div>
              <label className="flex w-full flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  End date <span className="text-rose-500">*</span>
                </span>
              <DatePicker
                id="edit-end-date"
                value={form.endDate}
                onChange={(v) => set('endDate', v)}
                minDate={form.startDate || undefined}
                placeholder="Pick end date"
              />
              </label>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="flex w-full flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Timezone <span className="text-rose-500">*</span>
              </span>
            <TimezoneSelector
              value={form.timezoneId}
              onChange={(v) => set('timezoneId', v)}
            />
            </label>
          </div>

          {/* Location */}
          <div>
            <label className="flex w-full flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Location <span className="text-rose-500">*</span>
              </span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="6.5" cy="6.5" r="5" />
                  <path d="m14 14-3-3" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-[#6938EF] focus:outline-none focus:ring-1 focus:ring-[#6938EF]"
                placeholder="City, Country"
              />
            </div>
            </label>
          </div>

          {/* Venue */}
          {/* <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Venue <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.venue}
              onChange={(e) => set('venue', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#6938EF] focus:outline-none focus:ring-1 focus:ring-[#6938EF]"
              placeholder="Enter venue name"
            />
          </div> */}

          {/* Attendees */}
          <div>
            <label htmlFor="edit-attendees" className="flex w-full flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Attendees <span className="text-rose-500">*</span>
              </span>
            <input
              id="edit-attendees"
              type="number"
              min={1}
              value={form.attendees}
              onChange={(e) => set('attendees', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#6938EF] focus:outline-none focus:ring-1 focus:ring-[#6938EF]"
              placeholder="500"
            />
            </label>
          </div>

          {/* Event experience */}
          <div>
            <label htmlFor="edit-event-experience" className="flex w-full flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Event experience</span>
            <select
              id="edit-event-experience"
              value={form.eventExperience}
              onChange={(e) => set('eventExperience', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#6938EF] focus:outline-none focus:ring-1 focus:ring-[#6938EF]"
            >
              <option value="">Select experience</option>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            </label>
          </div>
        </div>
      )}
    </Slideout>
  )
}

export default EventDetailsSlideout
