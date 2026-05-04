import React, { useEffect, useMemo, useState } from 'react'
import { SearchLg, FilterLines, XClose } from '@untitled-ui/icons-react'
import { fetchPublicParticipants, fetchPublicParticipant } from '../../../services/publicParticipantService'
import { useAblyPresence } from '../../../hooks/useAblyPresence'
import DirectChat from './DirectChat'
import { TablePagination } from '../../ui'

type PublicParticipant = {
  id: string
  name: string
  post?: string
  designation?: string
  organization?: string
  email?: string
  description?: string
  avatarUrl?: string
}

const resolveOrganization = (raw: any): string | undefined => {
  const value =
    raw?.organization ??
    raw?.organisation ??
    raw?.institute ??
    raw?.company ??
    raw?.company_name
  const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
  return text || undefined
}

interface ParticipantsListPageProps {
  eventUuid: string
  onNavigate: (path: string) => void
  tagId?: string
  participantId?: string
}

const ParticipantRow = ({ participant, isSelected, isOnline }: { participant: PublicParticipant; isSelected: boolean; isOnline: boolean }) => {
  const subtitle = [participant.designation ?? participant.post, participant.organization].filter(Boolean).join(' • ')
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'}`}>
      <div className="relative shrink-0">
        {participant.avatarUrl ? (
          <img src={participant.avatarUrl} alt={participant.name} className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 text-xs font-semibold text-slate-500">
            {(participant.name || 'P').split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
          </div>
        )}
        {isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 ring-2 ring-white" />}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{participant.name}</div>
        {subtitle ? <div className="truncate text-xs text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  )
}

const ParticipantsListPage: React.FC<ParticipantsListPageProps> = ({ eventUuid, onNavigate: _onNavigate, tagId, participantId }) => {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
  const [myId, setMyId] = useState(() => localStorage.getItem('pub_attendeeUuid') ?? '')
  const onlineIds = useAblyPresence(`event-${eventUuid}-presence`, myId || undefined)

  useEffect(() => {
    const onChanged = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id) setMyId(id)
    }
    window.addEventListener('pub_attendeeUuid_changed', onChanged)
    return () => window.removeEventListener('pub_attendeeUuid_changed', onChanged)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [queryInput, setQueryInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [organizationFilter, setOrganizationFilter] = useState<string>('all')
  const [apiParticipants, setApiParticipants] = useState<PublicParticipant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(participantId ?? null)
  const [detailParticipant, setDetailParticipant] = useState<PublicParticipant | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [chatOpenForId, setChatOpenForId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 10

  useEffect(() => { setCurrentPage(1) }, [tagId])
  useEffect(() => { setCurrentPage(1) }, [searchQuery])
  useEffect(() => { if (participantId) setSelectedId(participantId) }, [participantId])
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchQuery(queryInput.trim())
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [queryInput])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsLoading(true)
      try {
        const result = await fetchPublicParticipants(eventUuid, tagId, currentPage, PAGE_SIZE, searchQuery)
        if (cancelled) return
        const currentEmail = localStorage.getItem('pub_userEmail') ?? ''
        const mapped: PublicParticipant[] = result.items.map((a: any, idx: number) => {
          const id = String(a.uuid ?? a.id ?? `participant-${idx}`)
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
            organization: resolveOrganization(a),
            avatarUrl: a.avatarUrl ?? a.avatar_url ?? a.image ?? undefined,
          }
        })
        setApiParticipants(mapped)
        setTotalPages(result.totalPages)
        setTotalCount(result.count)
        if (mapped.length > 0) setSelectedId((prev) => prev ?? mapped[0].id)
      } catch {
        if (!cancelled) setApiParticipants([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [eventUuid, tagId, currentPage, searchQuery])

  useEffect(() => {
    if (!selectedId) { setDetailParticipant(null); return }
    const listMatch = normalizedParticipants.find((a) => a.id === selectedId) ?? null
    setDetailParticipant(listMatch)
    let cancelled = false
    setDetailLoading(true)
    fetchPublicParticipant(eventUuid, selectedId)
      .then((raw) => {
        if (cancelled || !raw) return
        setDetailParticipant({
          id: String(raw.uuid ?? raw.id ?? selectedId),
          name: String(raw.name ?? '').trim() || String([(raw as any).first_name, (raw as any).last_name].filter(Boolean).join(' ')).trim() || 'Unknown',
          post: (raw as any).post ?? (raw as any).title ?? undefined,
          designation: (raw as any).designation ?? undefined,
          organization: resolveOrganization(raw),
          email: (raw as any).email ?? undefined,
          description: (raw as any).description ?? undefined,
          avatarUrl: (raw as any).avatarUrl ?? (raw as any).avatar_url ?? (raw as any).image ?? undefined,
        })
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [selectedId, eventUuid])

  const normalizedParticipants = useMemo(() => {
    const seen = new Set<string>()
    return apiParticipants.map((a: any, idx: number) => {
      const baseId = String(a?.id ?? '').trim()
      const nameKey =
        String(a?.name ?? '')
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-') || 'participant'
      let id = baseId || `${nameKey}-${idx}`
      while (seen.has(id)) id = `${id}-${idx}`
      seen.add(id)
      return { ...a, id }
    })
  }, [apiParticipants])

  const organizationOptions = useMemo(() => {
    const set = new Set<string>()
    normalizedParticipants.forEach((a) => { const v = String(a.organization ?? '').trim(); if (v) set.add(v) })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [normalizedParticipants])

  const baseParticipants = useMemo(() => {
    if (organizationFilter === 'all') return normalizedParticipants
    return normalizedParticipants.filter((a) => String(a.organization ?? '').trim() === organizationFilter)
  }, [normalizedParticipants, organizationFilter])

  const filtered = baseParticipants

  const tagLabel = useMemo(() => {
    if (!tagId || typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(`website-index-${eventUuid}`)
      const data = raw ? JSON.parse(raw) : null
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

  const pageTitle = tagLabel ?? 'Participants'

  const renderDetail = () => {
    if (!selectedId) return null
    const a = detailParticipant ?? normalizedParticipants.find((x) => x.id === selectedId)
    if (!a && detailLoading) {
      return (
        <div className="animate-pulse space-y-4 px-4 py-6 sm:px-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-slate-100" />
          <div className="mx-auto h-5 w-40 rounded bg-slate-100" />
          <div className="mx-auto h-4 w-56 rounded bg-slate-100" />
          <div className="h-20 w-full rounded bg-slate-100" />
        </div>
      )
    }
    if (!a) return null
    const affiliation = String((a as any).designation ?? a.post ?? '').trim() || undefined
    const organization = String(a.organization ?? '').trim()
    const isOnline = onlineIds.has(a.id)
    return (
      <div className="flex flex-col items-center px-4 py-6 sm:px-6">
        <div className="relative">
          {a.avatarUrl ? (
            <img src={a.avatarUrl} alt={a.name} className="h-24 w-24 rounded-full object-cover ring-2 ring-slate-200" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 ring-2 ring-slate-200 text-lg font-semibold text-slate-500">
              {(a.name || 'P').split(' ').filter(Boolean).map((p: string) => p[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          )}
          {isOnline && <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-400 ring-2 ring-white" />}
        </div>
        <h2 className="mt-4 text-center text-base font-semibold text-slate-900">{a.name}</h2>
        {affiliation ? <p className="mt-1 text-center text-xs text-slate-500">{affiliation}</p> : null}
        {organization ? (
          <p className="mt-1 text-center text-xs font-medium text-slate-700">
            <span className="font-normal text-slate-600">at {organization}</span>
          </p>
        ) : null}
        {(a as any).description ? (
          <p className="mt-3 w-full text-left text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6 sm:text-justify">
            {(a as any).description}
          </p>
        ) : null}
        {(a as any).email ? (
          <a href={`mailto:${(a as any).email}`} className="mt-2 break-all text-center text-xs text-primary hover:underline">
            {(a as any).email}
          </a>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{pageTitle}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm mt-2">
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search participants"
              className="w-40 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none sm:w-52 md:w-64"
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            />
            <button type="button" className="flex h-9 w-10 items-center justify-center bg-primary/90 text-white" aria-label="Search">
              <SearchLg className="h-4 w-4" />
            </button>
          </div>
          {/* <div className="relative">
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
          </div> */}
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className={selectedId ? 'w-full space-y-3 lg:w-1/2 lg:shrink-0' : 'w-full space-y-3'}>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="text-base font-semibold text-slate-900">
                {isLoading ? 'Loading participants…' : 'No participants found'}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {tagId ? 'No participants in this group.' : 'No participants have been added yet.'}
              </div>
            </div>
          ) : (
            filtered.map((a, idx) => (
              <button
                key={`${a.id}-${idx}`}
                type="button"
                className="w-full text-left"
                onClick={() => {
                  setChatOpenForId(null)
                  setSelectedId((prev) => (isDesktop ? (prev === a.id ? null : a.id) : a.id))
                }}
              >
                <ParticipantRow participant={a} isSelected={selectedId === a.id} isOnline={onlineIds.has(a.id)} />
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

        {selectedId && isDesktop && (
          <div className="flex w-full flex-col rounded-xl border border-primary bg-primary/5 shadow-sm lg:sticky lg:top-20 lg:w-1/2 lg:shrink-0 lg:self-stretch lg:min-h-[calc(100dvh-10.5rem)]">
            {renderDetail()}
          </div>
        )}
      </div>

      {selectedId && !isDesktop && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Participant details">
          <button
            type="button"
            aria-label="Close participant details"
            className="absolute inset-0 bg-black/30"
            onClick={() => setSelectedId(null)}
          />
          <div className="absolute inset-x-2 bottom-2 top-14 overflow-hidden rounded-2xl border border-primary bg-white shadow-2xl">
            <div className="flex items-center justify-end border-b border-slate-200 px-3 py-2">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close details"
              >
                <XClose className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-48px)] overflow-y-auto bg-primary/5">
              {renderDetail()}
            </div>
          </div>
        </div>
      )}

      {/* Sliding bottom chat panel */}
      {(() => {
        const a = chatOpenForId
          ? (detailParticipant?.id === chatOpenForId ? detailParticipant : normalizedParticipants.find((x) => x.id === chatOpenForId))
          : null
        return (
          <div
            className={`fixed bottom-0 left-2 right-2 z-50 h-[70vh] max-h-[520px] rounded-t-xl border border-slate-200 bg-white shadow-2xl transition-transform duration-300 flex flex-col sm:left-auto sm:right-4 sm:w-[420px] sm:h-[520px] ${chatOpenForId ? 'translate-y-0' : 'translate-y-full'}`}
          >
            {a && (
              <div className="flex flex-col h-full">
                <DirectChat
                  peerId={a.id}
                  peerName={a.name}
                  peerAvatarUrl={a.avatarUrl}
                  isPeerOnline={onlineIds.has(a.id)}
                  onClose={() => setChatOpenForId(null)}
                />
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

export default ParticipantsListPage
