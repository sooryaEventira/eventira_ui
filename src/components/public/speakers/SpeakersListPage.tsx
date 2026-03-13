import React, { useEffect, useMemo, useState } from 'react'
import { SearchLg } from '@untitled-ui/icons-react'
import { readEventStoreJSON } from '../../../utils/eventLocalStore'
import { fetchPublicSpeakers } from '../../../services/publicSpeakerService'
import { buildSearchIndex, normalizeSearchText } from '../../../utils/indexedSearch'

type PublicSpeaker = {
  id: string
  name: string
  title?: string
  organization?: string
  avatarUrl?: string
  bio?: string
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
}

const SpeakerRow = ({ speaker }: { speaker: PublicSpeaker }) => {
  const subtitle = [speaker.title, speaker.organization].filter(Boolean).join(' • ')
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {speaker.avatarUrl ? (
        <img
          src={speaker.avatarUrl}
          alt={speaker.name}
          className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 text-xs font-semibold text-slate-500">
          {(speaker.name || 'S')
            .split(' ')
            .filter(Boolean)
            .map((p) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)}
        </div>
      )}
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

const SpeakersListPage: React.FC<SpeakersListPageProps> = ({ eventUuid, onNavigate, tagId }) => {
  const cacheKey = speakersCacheKey(eventUuid, tagId)
  const [queryInput, setQueryInput] = useState('')
  const [apiSpeakers, setApiSpeakers] = useState<PublicSpeaker[] | null>(() =>
    speakersListCache.get(cacheKey) ?? null
  )
  const [isLoading, setIsLoading] = useState(false)

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
            title: s.title ?? s.role ?? undefined,
            organization: s.organization ?? s.company ?? undefined,
            avatarUrl: s.avatarUrl ?? s.avatar_url ?? undefined,
            bio: s.bio ?? s.description ?? undefined,
            tagIds: getTagIdsFromItem(s)
          }
        })
        speakersListCache.set(cacheKey, mapped)
        setApiSpeakers(mapped)
      } catch {
        if (!cancelled) {
          // Keep previous list on error so the page doesn't flash empty after a failed refetch
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [eventUuid, tagId, cacheKey])

  const speakers = useMemo(() => {
    // Prefer API speakers, fallback to local store
    const list = apiSpeakers ?? readEventStoreJSON<any[]>(eventUuid, 'speakers', [])
    return list.map((s: any, idx: number) => ({
      ...s,
      tagIds: s.tagIds ?? getTagIdsFromItem(s)
    }))
  }, [apiSpeakers, eventUuid])

  // Normalize IDs (API/localStorage can contain missing/duplicate ids, which breaks React list rendering)
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

    // If API already returned only speakers for this tag (no tagIds metadata),
    // don't filter further – just use the list as-is.
    const hasAnyTagIds = normalizedSpeakers.some((s) => Array.isArray(s.tagIds) && s.tagIds.length > 0)
    if (!hasAnyTagIds) return normalizedSpeakers

    // Otherwise, filter by tag id / name using tagIds metadata.
    return normalizedSpeakers.filter((s) => {
      const itemIds = s.tagIds ?? []
      if (itemIds.some((tid: string) => String(tid) === tagIdStr)) return true
      if (tagLabelLower && itemIds.some((tid: string) => String(tid).toLowerCase() === tagLabelLower)) return true
      return false
    })
  }, [normalizedSpeakers, tagId, tagLabel])

  const speakerIndex = useMemo(() => {
    return buildSearchIndex(baseByTag, (s) => s.name)
  }, [baseByTag])

  const filtered = useMemo(() => {
    const q = normalizeSearchText(queryInput)
    if (!q) return baseByTag
    const tokens = q.split(' ').filter(Boolean)
    return speakerIndex.filter((e) => tokens.every((t) => e.text.includes(t))).map((e) => e.item)
  }, [baseByTag, queryInput, speakerIndex])

  const pageTitle = tagLabel ?? 'Speakers'

  return (
    <div className="space-y-6">
      {tagId ? (
        <button
          type="button"
          onClick={() => onNavigate(`/events/${eventUuid}/speakers`)}
          className="text-sm text-slate-500 hover:text-slate-700 focus:outline-none"
        >
          ← Back to all speakers
        </button>
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">{pageTitle}</h1>

        {/* Search (match attendees design) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search speakers"
              className="w-[240px] px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              className="flex h-9 w-10 items-center justify-center bg-primary text-white"
              aria-label="Search"
            >
              <SearchLg className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{' '}
        <span className="font-semibold text-slate-700">{baseByTag.length}</span>
      </div>

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
        <div className="space-y-3">
          {filtered.map((s, idx) => (
            <button
              key={`${s.id}-${idx}`}
              type="button"
              className="w-full text-left"
              onClick={() => onNavigate(`/events/${eventUuid}/speakers/${s.id}`)}
            >
              <SpeakerRow speaker={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SpeakersListPage

