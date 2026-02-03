import React, { useEffect, useMemo, useState } from 'react'
import { readEventStoreJSON } from '../../utils/eventLocalStore'
import { fetchPublicAttendees } from '../../services/publicAttendeeService'
import { fetchPublicSpeakers } from '../../services/publicSpeakerService'

type DirectoryAttendee = {
  id: string
  name: string
  organization?: string
  post?: string
  avatarUrl?: string
  groups?: any
  tags?: any
}

type DirectorySpeaker = {
  id: string
  name: string
  organization?: string
  title?: string
  avatarUrl?: string
  groups?: any
  tags?: any
}

type DirectoryOrganization = {
  id: string
  name: string
  logoLink?: string
  groups?: string
}

export interface GroupDirectoryProps {
  groupId?: string
  groupName?: string
  title?: string
  showAttendees?: boolean
  showSpeakers?: boolean
  showOrganizations?: boolean
}

const getEventUuidFromEnv = (): string => {
  if (typeof window === 'undefined') return ''
  const path = window.location.pathname || ''
  const m = path.match(/\/events\/([^/]+)/)
  if (m?.[1]) return m[1]
  return (
    localStorage.getItem('currentEventUuid') ||
    localStorage.getItem('createdEventUuid') ||
    ''
  )
}

const normalize = (s: string) => String(s || '').trim().toLowerCase()

const extractGroupNames = (value: any): string[] => {
  if (!value) return []
  // common shapes:
  // - "VIP, Speakers"
  // - ["VIP", "Speakers"]
  // - [{id,name}]
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((x) => normalize(x))
      .filter(Boolean)
  }
  if (Array.isArray(value)) {
    return value
      .map((x) => {
        if (typeof x === 'string') return normalize(x)
        if (typeof x === 'number') return normalize(String(x))
        const name = x?.name ?? x?.title ?? x?.label
        return normalize(String(name || ''))
      })
      .filter(Boolean)
  }
  if (typeof value === 'object') {
    const name = value?.name ?? value?.title ?? value?.label
    return name ? [normalize(String(name))] : []
  }
  return []
}

const CardRow = ({
  title,
  subtitle,
  imageUrl
}: {
  title: string
  subtitle?: string
  imageUrl?: string
}) => {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 text-xs font-semibold text-slate-500">
          {(title || 'G')
            .split(' ')
            .filter(Boolean)
            .map((p) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="truncate text-xs text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  )
}

const GroupDirectory: React.FC<GroupDirectoryProps> = ({
  groupId,
  groupName,
  title,
  showAttendees = true,
  showSpeakers = true,
  showOrganizations = true
}) => {
  const eventUuid = useMemo(() => getEventUuidFromEnv(), [])
  const groupKey = normalize(groupName || groupId || '')

  const [attendees, setAttendees] = useState<DirectoryAttendee[] | null>(null)
  const [speakers, setSpeakers] = useState<DirectorySpeaker[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        if (showAttendees && eventUuid) {
          const raw = await fetchPublicAttendees(eventUuid)
          const mapped = (Array.isArray(raw) ? raw : []).map((a: any, idx: number) => ({
            id: String(a.uuid ?? a.id ?? `attendee-${idx}`),
            name:
              String(a.name ?? '').trim() ||
              String([a.first_name, a.last_name].filter(Boolean).join(' ')).trim() ||
              'Unknown',
            organization: a.organization ?? a.institute ?? a.company ?? undefined,
            post: a.post ?? a.title ?? undefined,
            avatarUrl: a.avatarUrl ?? a.avatar_url ?? undefined,
            groups: (a as any).groups,
            tags: (a as any).tags
          }))
          if (!cancelled) setAttendees(mapped)
        }
      } catch {
        if (!cancelled) setAttendees(null)
      }

      try {
        if (showSpeakers && eventUuid) {
          const raw = await fetchPublicSpeakers(eventUuid)
          const mapped = (Array.isArray(raw) ? raw : []).map((s: any, idx: number) => ({
            id: String(s.uuid ?? s.id ?? `speaker-${idx}`),
            name:
              String(s.name ?? '').trim() ||
              String([s.first_name, s.last_name].filter(Boolean).join(' ')).trim() ||
              'Unknown',
            title: s.title ?? s.role ?? undefined,
            organization: s.organization ?? s.company ?? undefined,
            avatarUrl: s.avatarUrl ?? s.avatar_url ?? undefined,
            groups: (s as any).groups,
            tags: (s as any).tags
          }))
          if (!cancelled) setSpeakers(mapped)
        }
      } catch {
        if (!cancelled) setSpeakers(null)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [eventUuid, showAttendees, showSpeakers])

  const organizations = useMemo(() => {
    return readEventStoreJSON<DirectoryOrganization[]>(eventUuid, 'organizations', [])
  }, [eventUuid])

  const filteredAttendees = useMemo(() => {
    const source = attendees ?? readEventStoreJSON<DirectoryAttendee[]>(eventUuid, 'attendees', [])
    if (!groupKey) return source
    return source.filter((a) => {
      const names = [
        ...extractGroupNames((a as any).groups),
        ...extractGroupNames((a as any).tags)
      ]
      return names.includes(groupKey)
    })
  }, [attendees, eventUuid, groupKey])

  const filteredSpeakers = useMemo(() => {
    const source = speakers ?? readEventStoreJSON<DirectorySpeaker[]>(eventUuid, 'speakers', [])
    if (!groupKey) return source
    return source.filter((s) => {
      const names = [
        ...extractGroupNames((s as any).groups),
        ...extractGroupNames((s as any).tags)
      ]
      return names.includes(groupKey)
    })
  }, [speakers, eventUuid, groupKey])

  const filteredOrganizations = useMemo(() => {
    if (!groupKey) return organizations
    return organizations.filter((o) => extractGroupNames(o.groups).includes(groupKey))
  }, [organizations, groupKey])

  const resolvedTitle = title || (groupName ? `${groupName} directory` : 'Group directory')

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">{resolvedTitle}</h2>
        {groupName ? <p className="text-sm text-slate-600">Group: {groupName}</p> : null}
      </div>

      <div className="mt-8 space-y-10">
        {showAttendees ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900">Attendees</h3>
              <div className="text-xs text-slate-500">
                {filteredAttendees.length} items
              </div>
            </div>
            {filteredAttendees.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                No attendees in this group.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAttendees.map((a, idx) => (
                  <CardRow
                    key={`${a.id}-${idx}`}
                    title={a.name}
                    subtitle={[a.post, a.organization].filter(Boolean).join(' • ')}
                    imageUrl={a.avatarUrl}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {showSpeakers ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900">Speakers</h3>
              <div className="text-xs text-slate-500">
                {filteredSpeakers.length} items
              </div>
            </div>
            {filteredSpeakers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                No speakers in this group.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSpeakers.map((s, idx) => (
                  <CardRow
                    key={`${s.id}-${idx}`}
                    title={s.name}
                    subtitle={[s.title, s.organization].filter(Boolean).join(' • ')}
                    imageUrl={s.avatarUrl}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {showOrganizations ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900">Organizations</h3>
              <div className="text-xs text-slate-500">
                {filteredOrganizations.length} items
              </div>
            </div>
            {filteredOrganizations.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                No organizations in this group.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrganizations.map((o, idx) => (
                  <CardRow
                    key={`${o.id}-${idx}`}
                    title={o.name}
                    subtitle={undefined}
                    imageUrl={o.logoLink}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default GroupDirectory

