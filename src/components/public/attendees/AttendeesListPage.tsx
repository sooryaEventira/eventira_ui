import React, { useEffect, useMemo, useState } from 'react'
import { SearchLg, FilterLines } from '@untitled-ui/icons-react'
import { readEventStoreJSON } from '../../../utils/eventLocalStore'
import { fetchPublicAttendees, fetchPublicAttendee } from '../../../services/publicAttendeeService'
import { buildSearchIndex, normalizeSearchText } from '../../../utils/indexedSearch'

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

interface AttendeesListPageProps {
  eventUuid: string
  onNavigate: (path: string) => void
  /** When set, list attendees by this tag (uses LIST_BY_TAG API). */
  tagId?: string
}

const AttendeeRow = ({ attendee, isSelected }: { attendee: PublicAttendee; isSelected: boolean }) => {
  const subtitle = [attendee.post, attendee.organization].filter(Boolean).join(' • ')
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'}`}>
      {attendee.avatarUrl ? (
        <img
          src={attendee.avatarUrl}
          alt={attendee.name}
          className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 text-xs font-semibold text-slate-500">
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

const AttendeesListPage: React.FC<AttendeesListPageProps> = ({ eventUuid, onNavigate, tagId }) => {
  const [queryInput, setQueryInput] = useState('')
  const [organizationFilter, setOrganizationFilter] = useState<string>('all')
  const [apiAttendees, setApiAttendees] = useState<PublicAttendee[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null)
  const [detailAttendee, setDetailAttendee] = useState<PublicAttendee | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsLoading(true)
      try {
        const raw = await fetchPublicAttendees(eventUuid, tagId)
        if (cancelled) return
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
            avatarUrl: a.avatarUrl ?? a.avatar_url ?? a.image ?? undefined,
          }
        })
        setApiAttendees(mapped)
        if (mapped.length > 0) setSelectedAttendeeId((prev) => prev ?? mapped[0].id)
      } catch {
        if (!cancelled) setApiAttendees(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [eventUuid, tagId])

  // Fetch detail when selected attendee changes
  useEffect(() => {
    if (!selectedAttendeeId) { setDetailAttendee(null); return }

    // Immediately show list data
    const listMatch = normalizedAttendees.find((a) => a.id === selectedAttendeeId) ?? null
    setDetailAttendee(listMatch)

    let cancelled = false
    setDetailLoading(true)
    fetchPublicAttendee(eventUuid, selectedAttendeeId)
      .then((raw) => {
        if (cancelled || !raw) return
        setDetailAttendee({
          id: String(raw.uuid ?? raw.id ?? selectedAttendeeId),
          name:
            String(raw.name ?? '').trim() ||
            String([(raw as any).first_name, (raw as any).last_name].filter(Boolean).join(' ')).trim() ||
            'Unknown',
          post: (raw as any).post ?? (raw as any).title ?? undefined,
          designation: (raw as any).designation ?? undefined,
          organization: (raw as any).organization ?? (raw as any).institute ?? (raw as any).company ?? undefined,
          email: (raw as any).email ?? undefined,
          description: (raw as any).description ?? undefined,
          avatarUrl: (raw as any).avatarUrl ?? (raw as any).avatar_url ?? (raw as any).image ?? undefined,
        })
      })
      .catch(() => { /* keep list fallback */ })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [selectedAttendeeId, eventUuid])

  const attendees = useMemo(() => {
    const raw = apiAttendees ?? readEventStoreJSON<any>(eventUuid, 'attendees', [])
    return Array.isArray(raw) ? raw : []
  }, [apiAttendees, eventUuid])

  const normalizedAttendees = useMemo(() => {
    const seen = new Set<string>()
    return attendees.map((a: any, idx: number) => {
      const baseId = String(a?.id ?? '').trim()
      const nameKey = normalizeSearchText(a?.name).replace(/\s+/g, '-') || 'attendee'
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

  const attendeeIndex = useMemo(() => buildSearchIndex(baseAttendees, (a) => a.name), [baseAttendees])

  const filtered = useMemo(() => {
    const q = normalizeSearchText(queryInput)
    if (!q) return baseAttendees
    const tokens = q.split(' ').filter(Boolean)
    return attendeeIndex.filter((e) => tokens.every((t) => e.text.includes(t))).map((e) => e.item)
  }, [attendeeIndex, baseAttendees, queryInput])

  const tagLabel = useMemo(() => {
    if (!tagId || typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(`website-index-${eventUuid}`)
      const data = raw ? JSON.parse(raw) : null
      const tags = Array.isArray(data?.attendee_tags) ? data.attendee_tags : []
      const t = tags.find((x: { uuid?: string }) => String(x?.uuid) === String(tagId))
      return t?.name ?? null
    } catch {
      return null
    }
  }, [eventUuid, tagId])

  const pageTitle = tagLabel ?? 'Attendees'

  const renderDetail = () => {
    if (!selectedAttendeeId) return null

    const a = detailAttendee ?? normalizedAttendees.find((x) => x.id === selectedAttendeeId)

    if (!a && detailLoading) {
      return (
        <div className="animate-pulse space-y-4 p-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-slate-100" />
          <div className="mx-auto h-5 w-40 rounded bg-slate-100" />
          <div className="mx-auto h-4 w-56 rounded bg-slate-100" />
          <div className="h-20 w-full rounded bg-slate-100" />
        </div>
      )
    }
    if (!a) return null

    const affiliation = [(a as any).designation ?? a.post, a.organization].filter(Boolean).join(' at ').trim() || undefined

    return (
      <div className="flex flex-col items-center p-6">
        {a.avatarUrl ? (
          <img src={a.avatarUrl} alt={a.name} className="h-24 w-24 rounded-full object-cover ring-2 ring-slate-200" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 ring-2 ring-slate-200 text-lg font-semibold text-slate-500">
            {(a.name || 'A').split(' ').filter(Boolean).map((p: string) => p[0]).join('').toUpperCase().slice(0, 2)}
          </div>
        )}
        <h2 className="mt-4 text-base font-semibold text-slate-900 text-center">{a.name}</h2>
        {affiliation ? <p className="mt-1 text-xs text-slate-500 text-center">{affiliation}</p> : null}
        {(a as any).description ? <p className="mt-3 text-xs leading-5 text-slate-600 text-center">{(a as any).description}</p> : null}
        {(a as any).email ? (
          <a href={`mailto:${(a as any).email}`} className="mt-2 text-xs text-primary hover:underline">{(a as any).email}</a>
        ) : null}

        <a
          href={(a as any).email ? `mailto:${(a as any).email}` : '#'}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-center text-xs font-semibold text-white hover:bg-primary/90"
        >
          Send a Message
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">{pageTitle}</h1>
        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ">
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search attendees"
              className="w-[200px] px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            />
            <button type="button" className="flex h-9 w-10 items-center justify-center bg-primary/90 text-white" aria-label="Search">
              <SearchLg className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50" aria-label="Filter">
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
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{' '}
        <span className="font-semibold text-slate-700">{baseAttendees.length}</span>
      </div>

      <div className="flex gap-4 items-start">
        {/* Attendee list */}
        <div className={selectedAttendeeId ? 'w-1/2 shrink-0 space-y-3' : 'w-full space-y-3'}>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="text-base font-semibold text-slate-900">
                {isLoading ? 'Loading attendees…' : 'No attendees found'}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {tagId ? 'No attendees in this group.' : 'Add attendees in Attendee Management to see them here.'}
              </div>
            </div>
          ) : (
            filtered.map((a, idx) => (
              <button
                key={`${a.id}-${idx}`}
                type="button"
                className="w-full text-left"
                onClick={() => setSelectedAttendeeId((prev) => prev === a.id ? null : a.id)}
              >
                <AttendeeRow attendee={a} isSelected={selectedAttendeeId === a.id} />
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedAttendeeId && (
          <div className="w-1/2 rounded-xl border border-primary bg-primary/5 shadow-sm">
            {renderDetail()}
          </div>
        )}
      </div>
    </div>
  )
}

export default AttendeesListPage
