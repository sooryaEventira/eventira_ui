import React, { useEffect, useState } from 'react'
import { fetchPublicSpeaker } from '../../../services/publicSpeakerService'

type SpeakerSession = {
  uuid: string
  title: string
  start_at?: string
  end_at?: string
  location?: string
  session_type?: string
  schedule_title?: string
  schedule_date?: string
}

type PublicSpeaker = {
  id: string
  name: string
  title?: string
  organization?: string
  avatarUrl?: string
  bio?: string
  tags?: string[]
  sessions?: SpeakerSession[]
}

interface SpeakerDetailPageProps {
  eventUuid: string
  speakerId: string
  onNavigate: (path: string) => void
}

const SpeakerDetailPage: React.FC<SpeakerDetailPageProps> = ({ eventUuid, speakerId, onNavigate }) => {
  const [speaker, setSpeaker] = useState<PublicSpeaker | null>(null)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!cancelled) setStatus('loading')
      try {
        const raw = await fetchPublicSpeaker(eventUuid, speakerId)
        const mapped: PublicSpeaker | null = raw
          ? {
              id: String(raw.uuid ?? raw.id ?? speakerId),
              name:
                String(raw.name ?? '').trim() ||
                String([raw.first_name, raw.last_name].filter(Boolean).join(' ')).trim() ||
                'Unknown',
              title: (raw as any).designation ?? raw.title ?? raw.role ?? undefined,
              organization:
                (raw as any).organisation ??
                raw.organization ??
                (raw as any).company ??
                undefined,
              avatarUrl: (raw as any).avatarUrl ?? raw.avatar_url ?? (raw as any).image ?? undefined,
              bio: raw.bio ?? raw.description ?? undefined,
              tags: Array.isArray((raw as any).tags)
                ? (raw as any).tags.map((t: any) => String(t?.name ?? t?.label ?? t ?? '').trim()).filter(Boolean)
                : [],
              sessions: Array.isArray((raw as any).sessions)
                ? (raw as any).sessions.map((s: any) => ({
                    uuid: s.uuid ?? s.id ?? '',
                    title: s.title ?? '',
                    start_at: s.start_at ?? undefined,
                    end_at: s.end_at ?? undefined,
                    location: s.location ?? undefined,
                    session_type: s.session_type ?? undefined,
                    schedule_title: s.schedule_title ?? undefined,
                    schedule_date: s.schedule_date ?? undefined,
                  }))
                : []
            }
          : null
        if (!cancelled) {
          if (mapped) {
            setSpeaker(mapped)
            setStatus('success')
          } else {
            setStatus('error')
          }
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [eventUuid, speakerId])

  // Avoid flashing "not found" while the network request is still in-flight.
  if (!speaker && status === 'loading') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <button
          type="button"
          onClick={() => onNavigate(`/events/${eventUuid}/speakers`)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          ← Back
        </button>
        <span className="sr-only">Loading speaker</span>
        <div className="animate-pulse">
          <div className="flex flex-col items-center text-center">
            <div className="h-32 w-32 rounded-xl bg-slate-100 ring-1 ring-slate-200" />
            <div className="mt-6 h-7 w-56 rounded bg-slate-100" />
            <div className="mt-2 h-4 w-72 rounded bg-slate-100" />
            <div className="mt-6 h-20 w-full max-w-2xl rounded bg-slate-100" />
          </div>
        </div>
      </div>
    )
  }

  if (!speaker) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <button
          type="button"
          onClick={() => onNavigate(`/events/${eventUuid}/speakers`)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          ← Back
        </button>
        <div className="text-base font-semibold text-slate-900">Speaker not found</div>
        <div className="mt-1 text-sm text-slate-600">
          This speaker doesn’t exist or hasn’t been published to this browser.
        </div>
      </div>
    )
  }

  const subtitle = [speaker.title, speaker.organization].filter(Boolean).join(' • ')

  return (
    <div className="space-y-10">
      <button
        type="button"
        onClick={() => onNavigate(`/events/${eventUuid}/speakers`)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        aria-label="Back to speakers"
      >
        ← Back
      </button>

      <div className="flex flex-col items-center text-center">
        {speaker.avatarUrl ? (
          <img
            src={speaker.avatarUrl}
            alt={speaker.name}
            className="h-32 w-32 rounded-xl object-cover ring-1 ring-slate-200"
          />
        ) : (
          <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200 text-xl font-semibold text-slate-500">
            {(speaker.name || 'S')
              .split(' ')
              .filter(Boolean)
              .map((p) => p[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
        )}

        <h1 className="mt-6 text-2xl font-semibold text-slate-900">{speaker.name}</h1>
        {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}

        {speaker.bio ? (
          <div className="mt-6 max-w-2xl text-sm leading-6 text-slate-600">
            {speaker.bio}
          </div>
        ) : null}

        {speaker.tags && speaker.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {speaker.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 px-3 py-0.5 text-xs font-medium text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <button
          type="button"
          className="w-52 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Send a message
        </button>
        <button
          type="button"
          className="w-52 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Book a meeting
        </button>
      </div>

      {speaker.sessions && speaker.sessions.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Sessions</h2>
          <div className="space-y-3">
            {speaker.sessions.map((session) => {
              const formatTime = (iso?: string) => {
                if (!iso) return ''
                return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
              }
              const timeRange = session.start_at
                ? `${formatTime(session.start_at)}${session.end_at ? ` - ${formatTime(session.end_at)}` : ''}`
                : ''

              return (
                <div key={session.uuid} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">{session.title}</div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {timeRange && (
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {timeRange}
                      </span>
                    )}
                    {session.location && (
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {session.location}
                      </span>
                    )}
                    {session.session_type && (
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        {session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SpeakerDetailPage

