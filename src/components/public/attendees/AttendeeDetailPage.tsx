import React, { useEffect, useMemo, useState } from 'react'
import { readEventStoreJSON } from '../../../utils/eventLocalStore'
import { fetchPublicAttendee } from '../../../services/publicAttendeeService'

type PublicAttendee = {
  id: string
  name: string
  post?: string
  designation?: string
  organization?: string
  email?: string
  description?: string
  avatarUrl?: string
}

interface AttendeeDetailPageProps {
  eventUuid: string
  attendeeId: string
  onNavigate: (path: string) => void
}

const AttendeeDetailPage: React.FC<AttendeeDetailPageProps> = ({ eventUuid, attendeeId, onNavigate }) => {
  const [apiAttendee, setApiAttendee] = useState<PublicAttendee | null>(null)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!cancelled) setStatus('loading')
      try {
        const raw = await fetchPublicAttendee(eventUuid, attendeeId)
        const mapped: PublicAttendee | null = raw
          ? {
              id: String(raw.uuid ?? raw.id ?? attendeeId),
              name:
                String(raw.name ?? '').trim() ||
                String([raw.first_name, raw.last_name].filter(Boolean).join(' ')).trim() ||
                'Unknown',
              post: (raw as any).post ?? (raw as any).title ?? undefined,
              designation: (raw as any).designation ?? undefined,
              organization:
                (raw as any).organization ?? (raw as any).institute ?? (raw as any).company ?? undefined,
              email: (raw as any).email ?? undefined,
              description: (raw as any).description ?? undefined,
              avatarUrl:
                (raw as any).avatarUrl ?? (raw as any).avatar_url ?? (raw as any).image ?? undefined,
            }
          : null
        if (!cancelled) {
          setApiAttendee(mapped)
          setStatus('success')
        }
      } catch {
        if (!cancelled) {
          setApiAttendee(null)
          setStatus('error')
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [eventUuid, attendeeId])

  const attendee = useMemo(() => {
    if (apiAttendee) return apiAttendee
    const all = readEventStoreJSON<PublicAttendee[]>(eventUuid, 'attendees', [])
    return all.find((a) => String(a.id) === String(attendeeId)) || null
  }, [apiAttendee, attendeeId, eventUuid])

  // Avoid flashing "not found" while the network request is still in-flight.
  if (!attendee && status === 'loading') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <button
          type="button"
          onClick={() => onNavigate(`/events/${eventUuid}/attendees`)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          ← Back
        </button>
        <span className="sr-only">Loading attendee</span>
        <div className="animate-pulse">
          <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center">
            <div className="h-28 w-28 rounded-full bg-slate-100" />
            <div className="mt-6 h-6 w-48 rounded bg-slate-100" />
            <div className="mt-2 h-4 w-64 rounded bg-slate-100" />
            <div className="mt-6 h-10 w-full rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    )
  }

  if (!attendee) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <button
          type="button"
          onClick={() => onNavigate(`/events/${eventUuid}/attendees`)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          ← Back
        </button>
        <div className="text-base font-semibold text-slate-900">Attendee not found</div>
        <div className="mt-1 text-sm text-slate-600">
          This attendee doesn’t exist or hasn’t been published to this browser.
        </div>
      </div>
    )
  }

  const affiliation = [attendee.designation ?? attendee.post, attendee.organization].filter(Boolean).join(' at ').trim() || undefined

  return (
    <div className="flex flex-col items-center px-4">
      <button
        type="button"
        onClick={() => onNavigate(`/events/${eventUuid}/attendees`)}
        className="self-start mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        aria-label="Back to attendees"
      >
        ← Back
      </button>

      <div className="w-full max-w-md   bg-white px-8 py-10 text-center shadow-sm">
        {attendee.avatarUrl ? (
          <img
            src={attendee.avatarUrl}
            alt={attendee.name}
            className=" h-28 w-28 rounded-xl object-cover ring-1 ring-slate-100"
          />
        ) : (
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-xl bg-slate-100 text-2xl font-semibold text-slate-500 ring-2 ring-slate-100">
            {(attendee.name || 'A')
              .split(' ')
              .filter(Boolean)
              .map((p) => p[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
        )}

        <h1 className="mt-6 text-xl font-bold text-slate-900">{attendee.name}</h1>
        {affiliation ? (
          <p className="mt-1 text-sm text-slate-500">{affiliation}</p>
        ) : null}
        {attendee.description ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            {attendee.description}
          </p>
        ) : null}
        {attendee.email ? (
          <a
            href={`mailto:${attendee.email}`}
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            {attendee.email}
          </a>
        ) : null}

        <a
          href={attendee.email ? `mailto:${attendee.email}` : '#'}
          className="mt-8 block w-full rounded-xl bg-primary px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          Send a Message
        </a>
      </div>
    </div>
  )
}

export default AttendeeDetailPage

