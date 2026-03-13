import React, { useEffect, useState } from 'react'
import { readEventStoreJSON } from '../../../utils/eventLocalStore'
import { fetchPublicSpeaker } from '../../../services/publicSpeakerService'

type PublicSpeaker = {
  id: string
  name: string
  title?: string
  organization?: string
  avatarUrl?: string
  bio?: string
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
              bio: raw.bio ?? raw.description ?? undefined
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
      </div>
    </div>
  )
}

export default SpeakerDetailPage

