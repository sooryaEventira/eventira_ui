import React, { useEffect, useState } from 'react'
import { fetchPublicEventList } from '../../services/authService'

/** Event item from public event list API ({{url}}{{public_url}}event/) */
export interface PublicEventListItem {
  uuid: string
  eventName?: string
  title?: string
  [key: string]: unknown
}

function normalizeEventListPayload(data: unknown): PublicEventListItem[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is PublicEventListItem =>
        item && typeof item === 'object' && 'uuid' in item && typeof (item as any).uuid === 'string'
    )
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.results)) return normalizeEventListPayload(obj.results)
    if (Array.isArray(obj.data)) return normalizeEventListPayload(obj.data)
  }
  return []
}

const PublicEventListPage: React.FC = () => {
  const [events, setEvents] = useState<PublicEventListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPublicEventList()
      .then((data) => {
        if (cancelled) return
        setEvents(normalizeEventListPayload(data))
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load events.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const getEventName = (e: PublicEventListItem) =>
    e.eventName || e.title || (e as any).name || 'Event'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold text-slate-900">Events</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Choose an event to view details and register.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
            No events available at the moment.
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.uuid}>
                <a
                  href={`/events/${event.uuid}`}
                  className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <span className="font-medium text-slate-900">{getEventName(event)}</span>
                  <span className="ml-2 text-slate-500">→</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default PublicEventListPage
