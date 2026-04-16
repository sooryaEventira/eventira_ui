import React, { useEffect, useMemo, useState } from 'react'
import { SearchLg, FilterLines } from '@untitled-ui/icons-react'
import { fetchPublicParticipants, fetchPublicParticipant } from '../../../services/publicParticipantService'
import { buildSearchIndex, normalizeSearchText } from '../../../utils/indexedSearch'
import { useAblyPresence } from '../../../hooks/useAblyPresence'
import AblyDirectChat from '../speakers/AblyDirectChat'
import { TablePagination } from '../../ui'

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
  tagId?: string
}

const AttendeeRow = ({ attendee, isSelected, isOnline }: { attendee: PublicAttendee; isSelected: boolean; isOnline: boolean }) => {
  const subtitle = [attendee.designation ?? attendee.post, attendee.organization].filter(Boolean).join(' • ')
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'}`}>
      <div className="relative shrink-0">
        {attendee.avatarUrl ? (
          <img src={attendee.avatarUrl} alt={attendee.name} className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 text-xs font-semibold text-slate-500">
            {(attendee.name || 'A').split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
          </div>
        )}
        {isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 ring-2 ring-white" />}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{attendee.name}</div>
        {subtitle ? <div className="truncate text-xs text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  )
}

const AttendeesListPage: React.FC<AttendeesListPageProps> = ({ eventUuid, onNavigate, tagId }) => {
  const [myId, setMyId] = useState(() => localStorage.getItem('pub_attendeeUuid') ?? '')
  const onlineIds = useAblyPresence(`event-${eventUuid}-presence`, myId || undefined)

  // Keep myId in sync — the shell resolves the correct UUID async after mount
  useEffect(() => {
    const onChanged = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id) setMyId(id)
    }
    window.addEventListener('pub_attendeeUuid_changed', onChanged)
    return () => window.removeEventListener('pub_attendeeUuid_changed', onChanged)
  }, [])
  const [queryInput, setQueryInput] = useState('')
  const [organizationFilter, setOrganizationFilter] = useState<string>('all')
  const [apiAttendees, setApiAttendees] = useState<PublicAttendee[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null)
  const [detailAttendee, setDetailAttendee] = useState<PublicAttendee | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [chatOpenForId, setChatOpenForId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 10

  // Reset to page 1 only when the tag (navigation item) changes — triggers a server re-fetch.
  // Search and org filter are client-side and must NOT reset the page or cause re-fetches.
  useEffect(() => { setCurrentPage(1) }, [tagId])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsLoading(true)
      try {
        const result = await fetchPublicParticipants(eventUuid, tagId, currentPage, PAGE_SIZE)
        if (cancelled) return
        const currentEmail = localStorage.getItem('pub_userEmail') ?? ''
        const mapped: PublicAttendee[] = result.items.map((a: any, idx: number) => {
          const id = String(a.uuid ?? a.id ?? `attendee-${idx}`)
          const name = String(a.name ?? '').trim() || String([a.first_name, a.last_name].filter(Boolean).join(' ')).trim() || 'Unknown'
          if (currentEmail && String(a.email ?? '').toLowerCase() === currentEmail.toLowerCase()) {
            localStorage.setItem('pub_attendeeUuid', id)
            setMyId(id)
          }
          return {
            id,
            name,
            post: a.post ?? a.title ?? undefined,
            designation: a.designation ?? undefined,
            organization: a.organization ?? a.institute ?? a.company ?? undefined,
            avatarUrl: a.avatarUrl ?? a.avatar_url ?? a.image ?? undefined,
          }
        })
        setApiAttendees(mapped)
        setTotalPages(result.totalPages)
        setTotalCount(result.count)
        if (mapped.length > 0) setSelectedAttendeeId((prev) => prev ?? mapped[0].id)
      } catch {
        if (!cancelled) setApiAttendees([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [eventUuid, tagId, currentPage])

  useEffect(() => {
    if (!selectedAttendeeId) { setDetailAttendee(null); return }
    const listMatch = normalizedAttendees.find((a) => a.id === selectedAttendeeId) ?? null
    setDetailAttendee(listMatch)
    let cancelled = false
    setDetailLoading(true)
    fetchPublicParticipant(eventUuid, selectedAttendeeId)
      .then((raw) => {
        if (cancelled || !raw) return
        setDetailAttendee({
          id: String(raw.uuid ?? raw.id ?? selectedAttendeeId),
          name: String(raw.name ?? '').trim() || String([(raw as any).first_name, (raw as any).last_name].filter(Boolean).join(' ')).trim() || 'Unknown',
          post: (raw as any).post ?? (raw as any).title ?? undefined,
          designation: (raw as any).designation ?? undefined,
          organization: (raw as any).organization ?? (raw as any).institute ?? (raw as any).company ?? undefined,
          email: (raw as any).email ?? undefined,
          description: (raw as any).description ?? undefined,
          avatarUrl: (raw as any).avatarUrl ?? (raw as any).avatar_url ?? (raw as any).image ?? undefined,
        })
      })
      .catch(() => { })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [selectedAttendeeId, eventUuid])

  const attendees = useMemo(() => apiAttendees, [apiAttendees])

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
    normalizedAttendees.forEach((a) => { const v = String(a.organization ?? '').trim(); if (v) set.add(v) })
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

      // Search navigation items for a participant entry whose ref_uuid matches tagId
      const findInNav = (items: any[]): string | null => {
        for (const item of Array.isArray(items) ? items : []) {
          if (item?.item_type === 'participant' && String(item?.ref_uuid ?? '') === String(tagId)) {
            return String(item?.name ?? item?.title ?? '').trim() || null
          }
          const found = findInNav(Array.isArray(item?.items) ? item.items : [])
          if (found) return found
        }
        return null
      }

      return findInNav(Array.isArray(data?.navigation) ? data.navigation : []) ?? null
    } catch { return null }
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
    const isOnline = onlineIds.has(a.id)
    return (
      <div className="flex flex-col items-center p-6">
        <div className="relative">
          {a.avatarUrl ? (
            <img src={a.avatarUrl} alt={a.name} className="h-24 w-24 rounded-full object-cover ring-2 ring-slate-200" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 ring-2 ring-slate-200 text-lg font-semibold text-slate-500">
              {(a.name || 'A').split(' ').filter(Boolean).map((p: string) => p[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          )}
          {isOnline && <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-400 ring-2 ring-white" />}
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900 text-center">{a.name}</h2>
        {affiliation ? <p className="mt-1 text-xs text-slate-500 text-center">{affiliation}</p> : null}
        {(a as any).description ? <p className="mt-3 text-xs leading-5 text-slate-600 text-center">{(a as any).description}</p> : null}
        {(a as any).email ? (
          <a href={`mailto:${(a as any).email}`} className="mt-2 text-xs text-primary hover:underline">{(a as any).email}</a>
        ) : null}
        <button
          type="button"
          onClick={() => setChatOpenForId(a.id)}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-center text-xs font-semibold text-white hover:bg-primary/90"
        >
          Send a Message
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">{pageTitle}</h1>
        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
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
        Showing{' '}
        <span className="font-semibold text-slate-700">{Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)}</span>
        {' '}to{' '}
        <span className="font-semibold text-slate-700">{Math.min(currentPage * PAGE_SIZE, totalCount)}</span>
        {' '}of{' '}
        <span className="font-semibold text-slate-700">{totalCount}</span>
      </div>

      <div className="flex gap-4 items-stretch">
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
                onClick={() => { setChatOpenForId(null); setSelectedAttendeeId((prev) => prev === a.id ? null : a.id) }}
              >
                <AttendeeRow attendee={a} isSelected={selectedAttendeeId === a.id} isOnline={onlineIds.has(a.id)} />
              </button>
            ))
          )}
          {totalPages > 1 && (
            <div className="pt-2">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        {/* Detail / Chat panel */}
        {selectedAttendeeId && (() => {
          const a = detailAttendee ?? normalizedAttendees.find((x) => x.id === selectedAttendeeId)
          if (chatOpenForId === selectedAttendeeId && a) {
            return (
              <div className="w-1/2 rounded-xl border border-primary bg-white shadow-sm flex flex-col max-h-[420px] sticky top-4">
                <AblyDirectChat
                  peerId={a.id}
                  peerName={a.name}
                  peerAvatarUrl={a.avatarUrl}
                  isPeerOnline={onlineIds.has(a.id)}
                  onClose={() => setChatOpenForId(null)}
                />
              </div>
            )
          }
          return (
            <div className="w-1/2 rounded-xl  border border-primary bg-primary/5 shadow-sm max-h-[420px] sticky top-4 overflow-y-auto">
              {renderDetail()}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default AttendeesListPage
