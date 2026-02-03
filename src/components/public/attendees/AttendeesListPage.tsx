import React, { useEffect, useMemo, useState } from 'react'
import { SearchLg, FilterLines } from '@untitled-ui/icons-react'
import { readEventStoreJSON } from '../../../utils/eventLocalStore'
import { fetchPublicAttendees } from '../../../services/publicAttendeeService'
import { buildSearchIndex, normalizeSearchText } from '../../../utils/indexedSearch'

type PublicAttendee = {
  id: string
  name: string
  post?: string
  organization?: string
  avatarUrl?: string
}

interface AttendeesListPageProps {
  eventUuid: string
  onNavigate: (path: string) => void
}

const AttendeeRow = ({ attendee }: { attendee: PublicAttendee }) => {
  const subtitle = [attendee.post, attendee.organization].filter(Boolean).join(' • ')
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {attendee.avatarUrl ? (
        <img
          src={attendee.avatarUrl}
          alt={attendee.name}
          className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 text-xs font-semibold text-slate-500">
          {(attendee.name || 'A')
            .split(' ')
            .filter(Boolean)
            .map((p) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{attendee.name}</div>
        {subtitle ? <div className="truncate text-xs text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  )
}

const AttendeesListPage: React.FC<AttendeesListPageProps> = ({ eventUuid, onNavigate }) => {
  const [queryInput, setQueryInput] = useState('') // live query
  const [organizationFilter, setOrganizationFilter] = useState<string>('all')
  const [apiAttendees, setApiAttendees] = useState<PublicAttendee[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsLoading(true)
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
        if (!cancelled) setApiAttendees(mapped)
      } catch {
        if (!cancelled) setApiAttendees(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [eventUuid])

  const attendees = useMemo(() => {
    return apiAttendees ?? readEventStoreJSON<PublicAttendee[]>(eventUuid, 'attendees', [])
  }, [apiAttendees, eventUuid])

  // Normalize IDs (localStorage data can contain missing/duplicate ids, which breaks React list rendering)
  const normalizedAttendees = useMemo(() => {
    const seen = new Set<string>()
    return attendees.map((a, idx) => {
      const baseId = String((a as any)?.id ?? '').trim()
      const nameKey = normalizeSearchText((a as any)?.name).replace(/\s+/g, '-') || 'attendee'
      let id = baseId || `${nameKey}-${idx}`
      while (seen.has(id)) id = `${id}-${idx}`
      seen.add(id)
      return { ...a, id }
    })
  }, [attendees])

  const organizationOptions = useMemo(() => {
    const set = new Set<string>()
    normalizedAttendees.forEach((a) => {
      const v = String(a.organization ?? '').trim()
      if (v) set.add(v)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [normalizedAttendees])

  const baseAttendees = useMemo(() => {
    if (organizationFilter === 'all') return normalizedAttendees
    return normalizedAttendees.filter((a) => String(a.organization ?? '').trim() === organizationFilter)
  }, [normalizedAttendees, organizationFilter])

  const attendeeIndex = useMemo(() => {
    // Search by attendee name only
    return buildSearchIndex(baseAttendees, (a) => a.name)
  }, [baseAttendees])

  const filtered = useMemo(() => {
    const q = normalizeSearchText(queryInput)
    if (!q) return baseAttendees
    const tokens = q.split(' ').filter(Boolean)
    return attendeeIndex
      .filter((e) => tokens.every((t) => e.text.includes(t)))
      .map((e) => e.item)
  }, [attendeeIndex, baseAttendees, queryInput])

  return (
    <div className="space-y-6">
      {/* Header row with search + filter (match screenshot) */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Attendees</h1>

        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <input
              value={queryInput}
              onChange={(e) => {
                setQueryInput(e.target.value)
              }}
              placeholder="Search attendees"
              className="w-[240px] px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none hover:border-primary"
              onKeyDown={(e) => {
                // Live search already applies; keep Enter as no-op to match UX.
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
            />
            <button
              type="button"
              className="flex h-9 w-10 items-center justify-center bg-primary/90 text-white"
              aria-label="Search"
              onClick={() => {
                // Live search already applies; keep button for UI parity.
              }}
            >
              <SearchLg className="h-4 w-4" />
            </button>
          </div>

          {/* Filter icon button + hidden select overlay */}
          <div className="relative">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              aria-label="Filter"
            >
              <FilterLines className="h-4 w-4" />
            </button>
            <select
              value={organizationFilter}
              onChange={(e) => setOrganizationFilter(e.target.value)}
              className="absolute inset-0 h-9 w-9 cursor-pointer opacity-0"
              aria-label="Filter by organization"
            >
              <option value="all">All organizations</option>
              {organizationOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{' '}
        <span className="font-semibold text-slate-700">{baseAttendees.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="text-base font-semibold text-slate-900">
            {isLoading ? 'Loading attendees…' : 'No attendees found'}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Add attendees in Attendee Management to see them here.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, idx) => (
            <button
              key={`${a.id}-${idx}`}
              type="button"
              className="w-full text-left"
              onClick={() => onNavigate(`/events/${eventUuid}/attendees/${a.id}`)}
            >
              <AttendeeRow attendee={a} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default AttendeesListPage

