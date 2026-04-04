import React, { useEffect, useMemo, useState } from 'react'
import AblyDirectChat from './AblyDirectChat'
import { SearchLg } from '@untitled-ui/icons-react'
import { readEventStoreJSON } from '../../../utils/eventLocalStore'
import { fetchPublicSpeakers, fetchPublicSpeaker } from '../../../services/publicSpeakerService'
import { buildSearchIndex, normalizeSearchText } from '../../../utils/indexedSearch'
import { useAblyPresence } from '../../../hooks/useAblyPresence'

type PublicSpeaker = {
  id: string
  name: string
  title?: string
  organization?: string
  avatarUrl?: string
  bio?: string
  tags?: string[]
  /** Normalized list of tag/group UUIDs this speaker belongs to (from API: group_ids, tag_uuids, groups, etc.) */
  tagIds?: string[]
}

const speakersCacheKey = (eventUuid: string, tagId?: string) =>
  tagId ? `${eventUuid}:tag:${tagId}` : `${eventUuid}:all`
const speakersListCache = new Map<string, PublicSpeaker[]>()

interface SpeakersListPageProps {
  eventUuid: string
  onNavigate: (path: string) => void
  /** When set, only show speakers in this group (from website index). */
  tagId?: string
  /** When set, pre-select this speaker on load. */
  initialSpeakerId?: string
}

const SpeakerRow = ({ speaker, isSelected, isOnline }: { speaker: PublicSpeaker; isSelected: boolean; isOnline: boolean }) => {
  const subtitle = [speaker.title, speaker.organization].filter(Boolean).join(' • ')
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'}`}>
      <div className="relative shrink-0">
        {speaker.avatarUrl ? (
          <img
            src={speaker.avatarUrl}
            alt={speaker.name}
            className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 text-xs font-semibold text-slate-500">
            {String(speaker.name || 'S')
              .split(' ')
              .filter(Boolean)
              .map((p) => p[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
        )}
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 ring-2 ring-white" />
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{speaker.name}</div>
        {subtitle ? <div className="truncate text-xs text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  )
}

/** Collect all tag/group identifiers: uuid, id, and name (normalized). API may return groups as { id: "vip", name: "vip" } (no uuid). */
function getTagIdsFromItem(item: any): string[] {
  if (!item) return []
  const ids: string[] = []
  const add = (v: unknown) => {
    if (typeof v === 'string' && v.trim()) {
      ids.push(v.trim())
      ids.push(v.trim().toLowerCase())
      return
    }
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      if (typeof o.uuid === 'string' && o.uuid.trim()) ids.push(o.uuid.trim())
      if (typeof o.id === 'string' && o.id.trim()) {
        ids.push(o.id.trim())
        ids.push(o.id.trim().toLowerCase())
      }
      if (typeof o.name === 'string' && o.name.trim()) ids.push(o.name.trim().toLowerCase())
    }
  }
  const arr = item.group_ids ?? item.tag_uuids ?? item.tag_ids ?? item.groups ?? []
  if (Array.isArray(arr)) arr.forEach((x: unknown) => add(x))
  return [...new Set(ids)]
}

const SpeakersListPage: React.FC<SpeakersListPageProps> = ({ eventUuid, onNavigate, tagId, initialSpeakerId }) => {
  const onlineIds = useAblyPresence(`event-${eventUuid}-presence`)
  const [chatOpenForId, setChatOpenForId] = useState<string | null>(null)
  const cacheKey = speakersCacheKey(eventUuid, tagId)
  const [queryInput, setQueryInput] = useState('')
  const [apiSpeakers, setApiSpeakers] = useState<PublicSpeaker[] | null>(() =>
    speakersListCache.get(cacheKey) ?? null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(initialSpeakerId ?? null)
  const [detailSpeaker, setDetailSpeaker] = useState<PublicSpeaker | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsLoading(true)
      try {
        const raw = await fetchPublicSpeakers(eventUuid, tagId)
        if (cancelled) return
        const mapped: PublicSpeaker[] = (Array.isArray(raw) ? raw : []).map((s: any, idx: number) => {
          const id = String(s.uuid ?? s.id ?? `speaker-${idx}`)
          const name =
            String(s.name ?? '').trim() ||
            String([s.first_name, s.last_name].filter(Boolean).join(' ')).trim() ||
            'Unknown'
          return {
            id,
            name,
            title: s.designation ?? s.title ?? s.role ?? undefined,
            organization: s.organisation ?? s.organization ?? s.company ?? undefined,
            avatarUrl: s.avatarUrl ?? s.avatar_url ?? s.image ?? undefined,
            bio: s.bio ?? s.description ?? undefined,
            tagIds: getTagIdsFromItem(s)
          }
        })
        speakersListCache.set(cacheKey, mapped)
        setApiSpeakers(mapped)
        if (mapped.length > 0) setSelectedSpeakerId((prev) => prev ?? mapped[0].id)
      } catch {
        if (!cancelled) {
          // Keep previous list on error
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [eventUuid, tagId, cacheKey])

  // When selected speaker changes, immediately show list data, then enrich with API detail
  useEffect(() => {
    if (!selectedSpeakerId) { setDetailSpeaker(null); return }

    // Immediately populate from list so panel appears right away
    const listMatch = normalizedSpeakers.find((s) => s.id === selectedSpeakerId) ?? null
    setDetailSpeaker(listMatch)

    let cancelled = false
    setDetailLoading(true)
    fetchPublicSpeaker(eventUuid, selectedSpeakerId)
      .then((raw) => {
        if (cancelled || !raw) return
        setDetailSpeaker({
          id: String(raw.uuid ?? raw.id ?? selectedSpeakerId),
          name:
            String(raw.name ?? '').trim() ||
            String([(raw as any).first_name, (raw as any).last_name].filter(Boolean).join(' ')).trim() ||
            'Unknown',
          title: (raw as any).designation ?? (raw as any).title ?? (raw as any).role ?? undefined,
          organization: (raw as any).organisation ?? (raw as any).organization ?? (raw as any).company ?? undefined,
          avatarUrl: (raw as any).avatarUrl ?? (raw as any).avatar_url ?? (raw as any).image ?? undefined,
          bio: (raw as any).bio ?? (raw as any).description ?? undefined,
          tags: Array.isArray((raw as any).tags)
            ? (raw as any).tags.map((t: any) => String(t?.name ?? t?.label ?? t ?? '').trim()).filter(Boolean)
            : []
        })
      })
      .catch(() => { /* keep list fallback already set */ })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [selectedSpeakerId, eventUuid])

  const speakers = useMemo(() => {
    const list = apiSpeakers ?? readEventStoreJSON<any[]>(eventUuid, 'speakers', [])
    return list.map((s: any) => ({
      ...s,
      tagIds: s.tagIds ?? getTagIdsFromItem(s)
    }))
  }, [apiSpeakers, eventUuid])

  const normalizedSpeakers = useMemo(() => {
    const seen = new Set<string>()
    return speakers.map((s, idx) => {
      const baseId = String((s as any)?.id ?? '').trim()
      const nameKey = normalizeSearchText((s as any)?.name).replace(/\s+/g, '-') || 'speaker'
      let id = baseId || `${nameKey}-${idx}`
      while (seen.has(id)) id = `${id}-${idx}`
      seen.add(id)
      return { ...s, id, tagIds: (s as any).tagIds ?? getTagIdsFromItem(s) }
    })
  }, [speakers])

  const tagLabel = useMemo(() => {
    if (!tagId || typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(`website-index-${eventUuid}`)
      const data = raw ? JSON.parse(raw) : null
      const tags = Array.isArray(data?.speaker_tags) ? data.speaker_tags : []
      const t = tags.find((x: { uuid?: string }) => String(x?.uuid) === String(tagId))
      return t?.name ?? null
    } catch {
      return null
    }
  }, [eventUuid, tagId])

  const baseByTag = useMemo(() => {
    if (!tagId) return normalizedSpeakers
    const tagIdStr = String(tagId)
    const tagLabelLower = tagLabel ? String(tagLabel).toLowerCase() : ''
    const hasAnyTagIds = normalizedSpeakers.some((s) => Array.isArray(s.tagIds) && s.tagIds.length > 0)
    if (!hasAnyTagIds) return normalizedSpeakers
    return normalizedSpeakers.filter((s) => {
      const itemIds = s.tagIds ?? []
      if (itemIds.some((tid: string) => String(tid) === tagIdStr)) return true
      if (tagLabelLower && itemIds.some((tid: string) => String(tid).toLowerCase() === tagLabelLower)) return true
      return false
    })
  }, [normalizedSpeakers, tagId, tagLabel])

  const speakerIndex = useMemo(() => buildSearchIndex(baseByTag, (s) => s.name), [baseByTag])

  const filtered = useMemo(() => {
    const q = normalizeSearchText(queryInput)
    if (!q) return baseByTag
    const tokens = q.split(' ').filter(Boolean)
    return speakerIndex.filter((e) => tokens.every((t) => e.text.includes(t))).map((e) => e.item)
  }, [baseByTag, queryInput, speakerIndex])

  const pageTitle = tagLabel ?? 'Speakers'

  // Speaker detail panel content
  const renderDetail = () => {
    if (!selectedSpeakerId) return null

    const sp = detailSpeaker ?? normalizedSpeakers.find((s) => s.id === selectedSpeakerId)

    if (!sp && detailLoading) {
      return (
        <div className="animate-pulse space-y-4 p-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-slate-100" />
          <div className="mx-auto h-5 w-40 rounded bg-slate-100" />
          <div className="mx-auto h-4 w-56 rounded bg-slate-100" />
          <div className="h-20 w-full rounded bg-slate-100" />
        </div>
      )
    }
    if (!sp) return null

    const subtitle = [sp.title, sp.organization].filter(Boolean).join(' at ')

    const isOnline = onlineIds.has(sp.id)
    return (
      <div className="flex h-full flex-col overflow-y-auto p-6">
        {/* Avatar */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            {sp.avatarUrl ? (
              <img
                src={sp.avatarUrl}
                alt={sp.name}
                className="h-24 w-24 rounded-full object-cover ring-2 ring-slate-200"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 ring-2 ring-slate-200 text-lg font-semibold text-slate-500">
                {String(sp.name || 'S').split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
            {isOnline && (
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-400 ring-2 ring-white" />
            )}
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">{sp.name}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
          {sp.bio ? <p className="mt-3 text-xs leading-5 text-slate-600">{sp.bio}</p> : null}
          {Array.isArray(sp.tags) && sp.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {sp.tags.map((tag: any, i: number) => {
                const label = typeof tag === 'string' ? tag : String(tag?.name ?? tag?.label ?? '')
                if (!label) return null
                return (
                  <span key={i} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600">
                    {label}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setChatOpenForId(sp.id)}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Send a message
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90"
          >
            Book a meeting
          </button>
        </div>

        {/* Sessions */}
        <SpeakerSessions eventUuid={eventUuid} speakerId={sp.id} />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">{pageTitle}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm mt-4">
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search speakers"
              className="w-[200px] px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            <button type="button" className="flex h-9 w-10 items-center justify-center bg-primary text-white" aria-label="Search">
              <SearchLg className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{' '}
        <span className="font-semibold text-slate-700">{baseByTag.length}</span>
      </div>

      <div className={`flex gap-4 ${selectedSpeakerId ? 'items-stretch' : ''}`}>
        {/* Speaker list */}
        <div className={selectedSpeakerId ? 'w-1/2 shrink-0 space-y-3' : 'w-full space-y-3'}>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="text-base font-semibold text-slate-900">
                {isLoading ? 'Loading speakers…' : 'No speakers found'}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {tagId ? 'No speakers in this group.' : 'Add speakers in Speaker Management to see them here.'}
              </div>
            </div>
          ) : (
            filtered.map((s, idx) => (
              <button
                key={`${s.id}-${idx}`}
                type="button"
                className="w-full text-left"
                onClick={() => { setChatOpenForId(null); setSelectedSpeakerId((prev) => prev === s.id ? null : s.id) }}
              >
                <SpeakerRow speaker={s} isSelected={selectedSpeakerId === s.id} isOnline={onlineIds.has(s.id)} />
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedSpeakerId && (() => {
          const sp = detailSpeaker ?? normalizedSpeakers.find((s) => s.id === selectedSpeakerId)
          if (chatOpenForId === selectedSpeakerId && sp) {
            return (
              <div className="w-1/2 rounded-xl border border-primary bg-white shadow-sm flex flex-col max-h-[420px] sticky top-4">
                <AblyDirectChat
                  peerId={sp.id}
                  peerName={sp.name}
                  peerAvatarUrl={sp.avatarUrl}
                  isPeerOnline={onlineIds.has(sp.id)}
                  onClose={() => setChatOpenForId(null)}
                />
              </div>
            )
          }
          return (
            <div className="w-1/2 rounded-xl border-t border-l border-r border-primary bg-primary/5 shadow-sm max-h-[420px] sticky top-4 overflow-y-auto">
              {renderDetail()}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

/** Sessions belonging to a speaker fetched from local store */
const SpeakerSessions: React.FC<{ eventUuid: string; speakerId: string }> = ({ eventUuid, speakerId }) => {
  const sessions = useMemo(() => {
    const raw = readEventStoreJSON<any>(eventUuid, 'sessions', [])
    const allSessions: any[] = Array.isArray(raw) ? raw : []
    return allSessions.filter((s: any) => {
      const speakerIds: string[] = Array.isArray(s.speakers)
        ? s.speakers.map((sp: any) => String(sp?.uuid ?? sp?.id ?? sp ?? ''))
        : []
      return speakerIds.includes(speakerId)
    })
  }, [eventUuid, speakerId])

  if (sessions.length === 0) return null

  return (
    <div className="mt-6 w-full">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Sessions</h3>
      <div className="space-y-2">
        {sessions.map((s: any, idx: number) => {
          const title = s.title ?? s.name ?? 'Session'
          const time = [s.start_time ?? s.startTime, s.end_time ?? s.endTime].filter(Boolean).join(' - ')
          const location = s.location ?? ''
          return (
            <div key={s.uuid ?? s.id ?? idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-800">{title}</div>
              {time && <div className="mt-0.5 text-xs text-slate-500">{time}{location ? ` · ${location}` : ''}</div>}
              {s.description && <div className="mt-1 text-xs text-slate-500 line-clamp-2">{s.description}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SpeakersListPage
