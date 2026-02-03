import React, { useEffect, useMemo, useState } from 'react'
import { readEventStoreJSON } from '../../../utils/eventLocalStore'
import { fetchPublicAttendees } from '../../../services/publicAttendeeService'

type PublicAttendee = {
  id: string
  name: string
  post?: string
  organization?: string
  avatarUrl?: string
}

interface AttendeeDetailPageProps {
  eventUuid: string
  attendeeId: string
  onNavigate: (path: string) => void
}

const AttendeeDetailPage: React.FC<AttendeeDetailPageProps> = ({ eventUuid, attendeeId, onNavigate }) => {
  const [apiAttendees, setApiAttendees] = useState<PublicAttendee[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!cancelled) setStatus('loading')
      try {
        const raw = await fetchPublicAttendees(eventUuid)
        const mapped: PublicAttendee[] = (Array.isArray(raw) ? raw : []).map((a: any, idx: number) => {
          const id = String(a.uuid ?? a.id ?? `attendee-${idx}`)
          const name =
            String(a.name ?? '').trim() ||
            String([a.first_name, a.last_name].filter(Boolean).join(' ')).trim() ||
            'Unknown'
          return {
            id,
            name,
            post: a.post ?? a.title ?? undefined,
            organization: a.organization ?? a.institute ?? a.company ?? undefined,
            avatarUrl: a.avatarUrl ?? a.avatar_url ?? undefined,
          }
        })
        if (!cancelled) {
          setApiAttendees(mapped)
          setStatus('success')
        }
      } catch {
        if (!cancelled) {
          setApiAttendees(null)
          setStatus('error')
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [eventUuid])

  const attendee = useMemo(() => {
    const all = apiAttendees ?? readEventStoreJSON<PublicAttendee[]>(eventUuid, 'attendees', [])
    return all.find((a) => String(a.id) === String(attendeeId)) || null
  }, [apiAttendees, attendeeId, eventUuid])

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
          <div className="flex flex-col items-center text-center">
            <div className="h-32 w-32 rounded-xl bg-slate-100 ring-1 ring-slate-200" />
            <div className="mt-6 h-7 w-56 rounded bg-slate-100" />
            <div className="mt-2 h-4 w-72 rounded bg-slate-100" />
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

  const subtitle = [attendee.post, attendee.organization].filter(Boolean).join(' • ')

  return (
    <div className="space-y-10">
      <button
        type="button"
        onClick={() => onNavigate(`/events/${eventUuid}/attendees`)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        aria-label="Back to attendees"
      >
        ← Back
      </button>

      <div className="flex flex-col items-center text-center">
        {attendee.avatarUrl ? (
          <img
            src={attendee.avatarUrl}
            alt={attendee.name}
            className="h-32 w-32 rounded-xl object-cover ring-1 ring-slate-200"
          />
        ) : (
          <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200 text-xl font-semibold text-slate-500">
            {(attendee.name || 'A')
              .split(' ')
              .filter(Boolean)
              .map((p) => p[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
        )}

        <h1 className="mt-6 text-2xl font-semibold text-slate-900">{attendee.name}</h1>
        {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  )
}

export default AttendeeDetailPage

