import React, { useEffect, useMemo, useState } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import { fetchEventOverview, type EventOverviewPayload } from '../../../services/eventOverviewService'
import { fetchAttendees } from '../../../services/attendeeService'
import { showToast } from '../../../utils/toast'
import {
  Link01,
  Calendar,
  Clock,
  Building01,
  Globe01,
  Settings01,
  UploadCloud01,
  Mail01
} from '@untitled-ui/icons-react'

interface EventHubOverviewPageProps {
  onNavigateSection?: (sectionId: string) => void
}

const SkeletonBlock = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} />
)

const StatCard = ({
  title,
  items,
  loading
}: {
  title: string
  items: Array<{ label: string; value: React.ReactNode }>
  loading?: boolean
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5">
    <div className="text-sm font-semibold text-slate-900">{title}</div>
    <div className="mt-4 grid grid-cols-2 gap-6">
      {items.slice(0, 2).map((it) => (
        <div key={it.label}>
          {loading ? (
            <SkeletonBlock className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold text-[#6938EF]">{it.value}</div>
          )}
          <div className="mt-2 text-xs text-slate-500">{it.label}</div>
        </div>
      ))}
    </div>
  </div>
)

function formatDateRange(startISO: string, endISO: string): string {
  const start = startISO ? new Date(startISO) : null
  const end = endISO ? new Date(endISO) : null
  if (!start || Number.isNaN(start.getTime())) return '—'

  const df = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  const tf = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

  const startDate = df.format(start)
  const startTime = tf.format(start)
  if (!end || Number.isNaN(end.getTime())) return `${startDate}, ${startTime}`

  const endDate = df.format(end)
  const endTime = tf.format(end)
  const sameDay = startDate === endDate
  if (sameDay) return `${startDate}, ${startTime} – ${endTime}`
  return `${startDate}, ${startTime} – ${endDate}, ${endTime}`
}

function prettyMode(mode: EventOverviewPayload['event']['mode']) {
  if (mode === 'online') return 'Online'
  if (mode === 'offline') return 'Offline'
  return 'Hybrid'
}

function prettyLocation(location: string) {
  if (!location) return '—'
  const s = location.toLowerCase().trim()
  if (s === 'in-person') return 'In-person'
  if (s === 'virtual' || s === 'online') return 'Virtual'
  if (s === 'hybrid') return 'Hybrid'
  return location
}

const StatusBadge = ({ status }: { status: EventOverviewPayload['event']['status'] }) => {
  const isLive = status === 'live'
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
      ].join(' ')}
    >
      {isLive ? 'Live' : 'Draft'}
    </span>
  )
}

const EventHubOverviewPage: React.FC<EventHubOverviewPageProps> = ({ onNavigateSection }) => {
  const { eventData, createdEvent } = useEventForm()
  const eventUuid = createdEvent?.uuid ?? (eventData as any)?.uuid ?? localStorage.getItem('currentEventUuid') ?? ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<EventOverviewPayload | null>(null)

  const websiteUrl = useMemo(() => {
    if (!eventUuid) return ''
    return `${window.location.origin}/events/${eventUuid}`
  }, [eventUuid])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!eventUuid) {
        setLoading(false)
        setData(null)
        setError('Event not selected.')
        return
      }

      setLoading(true)
      setError(null)
      try {
        const payload = await fetchEventOverview(eventUuid)
        if (cancelled) return
        setData(payload)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load overview.'
        if (cancelled) return
        setError(msg)
        setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [eventUuid])

  const handleExportAttendees = async () => {
    if (!eventUuid) return
    try {
      const attendees = await fetchAttendees(eventUuid)
      if (!attendees.length) {
        showToast.error('No attendees to export.')
        return
      }

      const rows = attendees.map((a) => ({
        name: (a as any)?.name ?? `${(a as any)?.first_name ?? ''} ${(a as any)?.last_name ?? ''}`.trim(),
        email: a.email ?? '',
        status: (a as any)?.status ?? '',
      }))

      const header = ['name', 'email', 'status']
      const csv = [header.join(','), ...rows.map((r) => header.map((k) => JSON.stringify((r as any)[k] ?? '')).join(','))].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendees-${eventUuid}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast.success('Attendee list exported.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to export attendees.'
      showToast.error(msg)
    }
  }

  const eventTitle = data?.event.title ?? (createdEvent?.eventName || eventData?.eventName || 'Event Overview')
  const status = data?.event.status ?? 'draft'

  return (
    <div className="flex-1 p-8 bg-white overflow-x-auto overflow-y-auto min-w-0">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {loading ? (
              <SkeletonBlock className="h-8 w-72" />
            ) : (
              <h1 className="truncate text-[22px] font-bold text-primary-dark">{eventTitle}</h1>
            )}
            {!loading && <StatusBadge status={status} />}
          </div>

          <div className="flex items-center gap-3">
            {websiteUrl ? (
              <button
                type="button"
                onClick={() => window.open(websiteUrl, '_blank', 'noopener,noreferrer')}
                className="text-sm font-medium text-[#6938EF] hover:text-[#5925DC] inline-flex items-center gap-1"
              >
                Website
                <Link01 className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Error / empty */}
        {error && !loading ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5">
            <div className="text-sm font-semibold text-rose-900">Unable to load overview</div>
            <div className="mt-1 text-sm text-rose-800">{error}</div>
          </div>
        ) : null}

        {/* Summary + Stats */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Summary card */}
          <div className="lg:col-span-3 rounded-xl bg-[#4A23B6] text-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  {loading ? (
                    <SkeletonBlock className="h-4 w-64 bg-white/20" />
                  ) : (
                    <span>{formatDateRange(data?.event.startDate || '', data?.event.endDate || '')}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building01 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {loading ? (
                    <SkeletonBlock className="h-4 w-56 bg-white/20" />
                  ) : (
                    <span>{prettyLocation(data?.event?.location ?? '') || '—'}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe01 className="h-4 w-4" aria-hidden="true" />
                  {loading ? (
                    <SkeletonBlock className="h-4 w-40 bg-white/20" />
                  ) : (
                    <span>{data?.event.timezone || '—'}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {loading ? (
                    <SkeletonBlock className="h-4 w-24 bg-white/20" />
                  ) : (
                    <span>{data ? prettyMode(data.event.mode) : '—'}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/15"
                aria-label="Settings (coming soon)"
                title="Settings (coming soon)"
              >
                <Settings01 className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="lg:col-span-2 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <StatCard
              title="Registrations"
              items={[
                { label: 'Total registrations', value: data?.stats.registrations.total ?? 0 },
                { label: 'Invitees', value: data?.stats.registrations.invited ?? 0 }
              ]}
              loading={loading}
            />
            <StatCard
              title="Devices"
              items={[
                { label: 'Desktop', value: data?.stats.devices.desktop ?? 0 },
                { label: 'Mobile', value: data?.stats.devices.mobile ?? 0 }
              ]}
              loading={loading}
            />
            <StatCard
              title="Communications"
              items={[
                { label: 'Scheduled', value: data?.stats.communications.scheduled ?? 0 },
                { label: 'Sent', value: data?.stats.communications.sent ?? 0 }
              ]}
              loading={loading}
            />
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">Quick Action</div>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleExportAttendees}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <UploadCloud01 className="h-5 w-5 text-[#6938EF]" aria-hidden="true" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Export Attendee List</div>
                      <div className="text-xs text-slate-500">Export as CSV (Excel compatible)</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateSection?.('communications')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <Mail01 className="h-5 w-5 text-[#6938EF]" aria-hidden="true" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Send Mass Email</div>
                      <div className="text-xs text-slate-500">Notify all attendees</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right column placeholder to mirror dashboard balance on large screens */}
          <div className="hidden lg:block" />
        </div>
      </div>
    </div>
  )
}

export default EventHubOverviewPage

