import React, { useEffect, useMemo, useState } from 'react'
import { Plus, XClose, Pencil01, Trash03, RefreshCcw02, Mail01 } from '@untitled-ui/icons-react'
import { Button, DividerLineTable, Input, Select, type DividerLineTableColumn } from '../../ui/untitled'
import { showToast } from '../../../utils/toast'
import Slideout from '../../ui/untitled/Slideout'
import { useTableHeader } from '../../ui/TableHeader'
import { API_ENDPOINTS } from '../../../config/env'
import { fetchTeamMembers, inviteTeamMember } from '../../../services/teamService'

type TeamMemberStatus = 'active' | 'pending'
type TeamMember = {
  id: string
  name: string
  email: string
  status: TeamMemberStatus
  role: string
}

const ROLE_OPTIONS = ['team_manager', 'event_admin', 'organizer'] as const
const ROLE_LABELS: Record<string, string> = {
  team_manager: 'Team manager',
  event_admin: 'Event admin',
  organizer: 'Organizer',
}
type EventAccess = {
  id: string
  name: string
  startDate: string
  endDate: string
  color: string
}

const StatusBadge = ({ status }: { status: TeamMember['status'] }) => {
  const isActive = status === 'active'
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
      ].join(' ')}
    >
      {isActive ? 'Active' : 'Pending'}
    </span>
  )
}

const Avatar = ({ name }: { name: string }) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return (
    <div className="h-8 w-8 rounded-full bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
      {initials || 'U'}
    </div>
  )
}

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9" />
    <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 9 9" />
    <path d="M7 7H3V3" />
    <path d="M21 21v-4h-4" />
  </svg>
)

const ROLE_SELECT_OPTIONS = [
  { value: '', label: 'Select access level' },
  ...ROLE_OPTIONS.map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r }))
]

const InviteTeamSlideout = ({
  isOpen,
  onClose,
  onInvite,
  eventOptions = [],
}: {
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string, role: string, eventIds?: string[]) => void | Promise<void>
  eventOptions?: Array<{ id: string; name: string }>
}) => {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [eventIds, setEventIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setEmail('')
      setRole('')
      setEventIds([])
      setLoading(false)
    }
  }, [isOpen])

  const submit = async () => {
    if (!email.trim() || loading) return
    if (!role) return
    setLoading(true)
    try {
      await Promise.resolve(onInvite(email.trim(), role, eventIds.length ? eventIds : undefined))
      onClose()
    } catch {
      // leave slideout open so user can retry
    } finally {
      setLoading(false)
    }
  }

  const eventSelectOptions = [
    { value: '', label: 'Select events' },
    ...eventOptions.map((e) => ({ value: e.id, label: e.name }))
  ]

  return (
    <Slideout
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose()
      }}
      title="Invite member"
      topOffset={64}
      width={420}
      footer={
        <Button
          type="button"
          variant="primary"
          onClick={submit}
          disabled={!email.trim() || !role || loading}
        >
          {loading ? 'Inviting...' : 'Send invite'}
        </Button>
      }
    >
      <div className="px-6 py-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            icon={<Mail01 className="h-4 w-4" />}
            className="w-full rounded-md border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Role <span className="text-red-500">*</span>
          </label>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={ROLE_SELECT_OPTIONS}
            className="w-full rounded-md border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Events</label>
          <Select
            value={eventIds[0] ?? ''}
            onChange={(e) => setEventIds(e.target.value ? [e.target.value] : [])}
            options={eventSelectOptions}
            className="w-full rounded-md border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
    </Slideout>
  )
}

const formatDateRange = (startISO: string, endISO: string) => {
  const start = new Date(startISO)
  const end = new Date(endISO)
  const df = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—'
  return `${df.format(start)} – ${df.format(end)}`
}

const splitName = (full: string) => {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

const TeamManagementPage: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTabId, setActiveTabId] = useState('team-members')
  const [eventOptions, setEventOptions] = useState<Array<{ id: string; name: string }>>([])

  const [inviteOpen, setInviteOpen] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [draftFirstName, setDraftFirstName] = useState('')
  const [draftLastName, setDraftLastName] = useState('')
  const [draftRole, setDraftRole] = useState<string>(ROLE_OPTIONS[1])

  useEffect(() => {
    let cancelled = false
    fetchTeamMembers()
      .then((list) => {
        if (!cancelled) setMembers(list)
      })
      .catch(() => {
        if (!cancelled) {
          setMembers([])
          showToast.error('Failed to load team members.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!accessToken || !organizationUuid) {
      setEventOptions([])
      return
    }
    const url = API_ENDPOINTS.EVENT.LIST
    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Organization': organizationUuid,
      },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: unknown) => {
        const raw = data as any
        const list: any[] = Array.isArray(raw)
          ? raw
          : raw?.status === 'success' && Array.isArray(raw?.data)
            ? raw.data
            : Array.isArray(raw?.results)
              ? raw.results
              : Array.isArray(raw?.data)
                ? raw.data
                : Array.isArray(raw?.data?.results)
                  ? raw.data.results
                  : []
        setEventOptions(
          list.map((e: any) => ({
            id: String(e?.uuid ?? e?.id ?? ''),
            name: String(e?.name ?? e?.title ?? e?.eventName ?? 'Untitled event')
          })).filter((e) => e.id)
        )
      })
      .catch(() => setEventOptions([]))
  }, [])

  const activeMember = useMemo(
    () => (activeMemberId ? members.find((m) => m.id === activeMemberId) || null : null),
    [activeMemberId, members]
  )

  const activeEvents: EventAccess[] = useMemo(() => {
    if (!activeMemberId) return []
    return []
  }, [activeMemberId])

  const inviteEventOptions = eventOptions

  const openDrawerFor = (member: TeamMember) => {
    setActiveMemberId(member.id)
    setDrawerOpen(true)
    setDrawerLoading(true)
    const { firstName, lastName } = splitName(member.name)
    setDraftFirstName(firstName)
    setDraftLastName(lastName)
    setDraftRole(member.role)
    // Simulate fetching details
    setTimeout(() => setDrawerLoading(false), 450)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    // Keep activeMemberId so reopening is instant; clear if you prefer:
    // setActiveMemberId(null)
  }

  const saveDrawerChanges = () => {
    if (!activeMember) return
    const name = `${draftFirstName} ${draftLastName}`.trim() || activeMember.name
    setMembers((prev) =>
      prev.map((m) => (m.id === activeMember.id ? { ...m, name, role: draftRole } : m))
    )
    showToast.success('Changes saved.')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) => {
      const roleLabel = ROLE_LABELS[m.role] ?? m.role
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          roleLabel.toLowerCase().includes(q)
        )
    })
  }, [members, search])

  const allVisibleSelected = filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id))

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        filtered.forEach((m) => next.delete(m.id))
      } else {
        filtered.forEach((m) => next.add(m.id))
      }
      return next
    })
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const performRemove = (targetIds: string[]) => {
    if (targetIds.length === 0) return
    setMembers((prev) => prev.filter((m) => !targetIds.includes(m.id)))
    setSelectedIds(new Set())
    if (activeMemberId && targetIds.includes(activeMemberId)) {
      closeDrawer()
    }
    showToast.success('Removed from team.')
  }

  const bulkRemove = () => {
    performRemove(Array.from(selectedIds))
  }

  const { leading: tableHeaderLeading, actions: tableHeaderActions } = useTableHeader({
    tabs: [{ id: 'team-members', label: 'Team members' }],
    activeTabId,
    searchQuery: search,
    searchPlaceholder: 'Search team',
    onTabChange: setActiveTabId,
    onSearchChange: setSearch,
    showFilter: false,
  })

  type TeamRow = TeamMember & { __skeleton?: boolean }
  const tableData: TeamRow[] = useMemo(() => {
    if (!loading) return filtered
    return Array.from({ length: 8 }).map((_, idx) => ({
      id: `skeleton-${idx}`,
      name: '',
      email: '',
      status: 'active',
      role: '',
      __skeleton: true
    }))
  }, [filtered, loading])

  const columns: Array<DividerLineTableColumn<TeamRow>> = useMemo(
    () => [
      {
        id: 'select',
        header: (
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={() => {
              if (!loading) toggleAllVisible()
            }}
            disabled={loading || filtered.length === 0}
            aria-label="Select all"
          />
        ),
        sortable: false,
        render: (item) => {
          if (item.__skeleton) {
            return <div className="h-4 w-4 rounded bg-slate-100 animate-pulse" />
          }
          return (
            <input
              type="checkbox"
              checked={selectedIds.has(item.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleOne(item.id)}
              aria-label={`Select ${item.name}`}
            />
          )
        }
      },
      {
        id: 'name',
        header: 'Name',
        sortable: false,
        render: (item) => {
          if (item.__skeleton) {
            return (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
                <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
              </div>
            )
          }
          return (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={item.name} />
              <div className="truncate font-medium text-slate-900">{item.name}</div>
            </div>
          )
        }
      },
      {
        id: 'email',
        header: 'Email address',
        sortable: false,
        render: (item) => {
          if (item.__skeleton) return <div className="h-4 w-56 rounded bg-slate-100 animate-pulse" />
          return <div className="text-slate-600">{item.email}</div>
        }
      },
      {
        id: 'status',
        header: 'Status',
        sortable: false,
        render: (item) => {
          if (item.__skeleton) return <div className="h-6 w-20 rounded-full bg-slate-100 animate-pulse" />
          return <StatusBadge status={item.status} />
        }
      },
      {
        id: 'role',
        header: 'Role',
        sortable: false,
        render: (item) => {
          if (item.__skeleton) return <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />
          return (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {ROLE_LABELS[item.role] ?? item.role}
            </span>
          )
        }
      },
      {
        id: 'actions',
        header: '',
        sortable: false,
        align: 'right',
        render: (item) => {
          if (item.__skeleton) return <div className="ml-auto h-8 w-8 rounded bg-slate-100 animate-pulse" />
          const isPending = item.status === 'pending'
          return (
            <div className="flex items-center justify-end gap-3">
              {isPending ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    showToast.success('Invite resent.')
                  }}
                  className="text-slate-500 hover:text-primary transition-colors"
                  aria-label={`Resend invite to ${item.name}`}
                  title="Resend invite"
                >
                  <RefreshCcw02 className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    openDrawerFor(item)
                  }}
                  className="text-slate-500 hover:text-primary transition-colors"
                  aria-label={`Edit ${item.name}`}
                  title="Edit"
                >
                  <Pencil01 className="h-4 w-4" strokeWidth={1.8} />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  performRemove([item.id])
                }}
                className="text-slate-500 hover:text-rose-600 transition-colors"
                aria-label={`Remove ${item.name}`}
                title="Remove"
              >
                <Trash03 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          )
        }
      }
    ],
    [allVisibleSelected, filtered.length, loading, openDrawerFor, performRemove, selectedIds, toggleAllVisible, toggleOne]
  )

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-primary-dark">Team Management</h1>
            
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => setInviteOpen(true)}
          iconLeading={<Plus className="h-4 w-4" />}
        >
          Invite team
        </Button>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 ? (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-700">
            <span className="font-semibold">{selectedIds.size}</span> selected
          </div>
          <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={bulkRemove}>
              Remove
            </Button>
          </div>
        </div>
      ) : null}

      <DividerLineTable
        data={tableData}
        columns={columns}
        getRowKey={(item) => item.id}
        onRowClick={(item) => {
          if ((item as TeamRow).__skeleton) return
          openDrawerFor(item as TeamMember)
        }}
        headerLeading={tableHeaderLeading}
        headerActions={tableHeaderActions}
        emptyState={
          <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
            {search.trim() ? `No team members found matching "${search}".` : 'No team members.'}
          </div>
        }
        size="md"
      />

      <InviteTeamSlideout
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        eventOptions={inviteEventOptions}
        onInvite={async (email, role, eventIds) => {
          const { teamInviteUuid } = await inviteTeamMember({ email, role, events: eventIds ?? [] })
          const list = await fetchTeamMembers()
          setMembers(list)
          showToast.success('Invite sent.')
          if (teamInviteUuid) {
            setInviteOpen(false)
            window.history.pushState({}, '', `/dashboard?invite=${teamInviteUuid}`)
            window.dispatchEvent(new Event('locationchange'))
          }
        }}
      />

      <Slideout
        isOpen={drawerOpen}
        onClose={closeDrawer}
        topOffset={64}
        width={460}
        header={
          <div className="sticky top-0 bg-white">
            <div className="relative">
              <div className="h-28 w-full bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200" />
              <button
                type="button"
                onClick={closeDrawer}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/70 text-slate-600 shadow-sm transition hover:bg-white"
                aria-label="Close"
              >
                <XClose className="h-5 w-5" />
              </button>

              <div className="absolute left-0 right-0 -bottom-8 flex items-center justify-center">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-white p-1 shadow-sm">
                    <div className="h-full w-full rounded-full bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
                      {activeMember?.name ? splitName(activeMember.name).firstName.slice(0, 1).toUpperCase() : 'U'}
                    </div>
                  </div>
                  {activeMember ? (
                    <div className="absolute right-0 bottom-0 translate-x-2 translate-y-1">
                      <StatusBadge status={activeMember.status} />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="pt-12 pb-4 px-6 text-center border-b border-slate-200">
              {drawerLoading ? (
                <div className="mx-auto h-5 w-40 rounded bg-slate-100 animate-pulse" />
              ) : (
                <div className="text-lg font-semibold text-slate-900">{activeMember?.name || '—'}</div>
              )}
              <div className="mt-1 text-sm text-slate-500">{drawerLoading ? ' ' : (activeMember?.role ? (ROLE_LABELS[activeMember.role] ?? activeMember.role) : '')}</div>
            </div>
          </div>
        }
        footer={
          <div className="w-full flex items-center justify-between">
            <div>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!activeMember) return
                  performRemove([activeMember.id])
                }}
                disabled={!activeMember}
              >
                Remove
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {activeMember?.status === 'pending' ? (
                <Button
                  variant="secondary"
                  onClick={() => showToast.success('Invite resent.')}
                  disabled={!activeMember}
                >
                  Resend invite
                </Button>
              ) : null}
              <Button variant="primary" onClick={saveDrawerChanges} disabled={!activeMember || drawerLoading}>
                Save
              </Button>
            </div>
          </div>
        }
      >
        <div className="px-6 py-5 space-y-6">
          {/* Editable details */}
          <div>
            <div className="text-sm font-semibold text-slate-900 mb-3">Details</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">First name</label>
                <input
                  value={draftFirstName}
                  onChange={(e) => setDraftFirstName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="First name"
                  disabled={drawerLoading}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Last name</label>
                <input
                  value={draftLastName}
                  onChange={(e) => setDraftLastName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Last name"
                  disabled={drawerLoading}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  value={activeMember?.email || ''}
                  readOnly
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                <select
                  value={draftRole}
                  onChange={(e) => setDraftRole(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={drawerLoading}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r] ?? r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Events access */}
          <div>
            <div className="text-sm font-semibold text-slate-900 mb-3">Events</div>
            {drawerLoading ? (
              <div className="space-y-2">
                <div className="h-16 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-16 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            ) : activeEvents.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                No events assigned.
              </div>
            ) : (
              <div className="space-y-2">
                {activeEvents.map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: ev.color }}
                        aria-hidden="true"
                      >
                        ↗
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{ev.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{formatDateRange(ev.startDate, ev.endDate)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Slideout>

    </div>
  )
}

export default TeamManagementPage

