import React, { useEffect, useMemo, useState } from 'react'
import { Plus } from '@untitled-ui/icons-react'
import { Button, DividerLineTable } from '../../ui/untitled'
import { showToast } from '../../../utils/toast'
import { useTableHeader } from '../../ui/TableHeader'
import { API_ENDPOINTS } from '../../../config/env'
import {
  fetchTeamMembers,
  inviteTeamMember,
  fetchMyInvitations,
  acceptTeamInvite,
  revokeTeamInvite,
  type MyInvitation,
} from '../../../services/teamService'
import InviteTeamSlideout from './InviteTeamSlideout'
import InvitationsTab from './InvitationsTab'
import TeamMemberSlideout from './TeamMemberSlideout'
import { ROLE_LABELS, ROLE_OPTIONS, type EventAccess, type TeamMember, type TeamRow } from './teamTypes'
import { useTeamTableColumns } from './useTeamTableColumns'

const TeamManagementPage: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTabId, setActiveTabId] = useState('team-members')
  const [eventOptions, setEventOptions] = useState<Array<{ id: string; name: string }>>([])

  const [inviteOpen, setInviteOpen] = useState(false)
  const [invitations, setInvitations] = useState<MyInvitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)
  const [processingInviteUuid, setProcessingInviteUuid] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
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
    return () => {
      cancelled = true
    }
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
          list
            .map((e: any) => ({
              id: String(e?.uuid ?? e?.id ?? ''),
              name: String(e?.name ?? e?.title ?? e?.eventName ?? 'Untitled event'),
            }))
            .filter((e) => e.id)
        )
      })
      .catch(() => setEventOptions([]))
  }, [])

  useEffect(() => {
    if (activeTabId !== 'invitations') return
    let cancelled = false
    setInvitationsLoading(true)
    fetchMyInvitations()
      .then((list) => {
        if (!cancelled) setInvitations(list)
      })
      .catch(() => {
        if (!cancelled) showToast.error('Failed to load invitations.')
      })
      .finally(() => {
        if (!cancelled) setInvitationsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeTabId])

  const handleAcceptInvitation = async (inv: MyInvitation) => {
    setProcessingInviteUuid(inv.uuid)
    try {
      const result = await acceptTeamInvite(inv.uuid)
      setInvitations((prev) => prev.filter((i) => i.uuid !== inv.uuid))
      showToast.success(`Joined "${inv.organization.name}" successfully.`)
      const orgUuid = result.organization_uuid || inv.organization.uuid
      const orgName = result.organization_name || inv.organization.name
      if (orgUuid) {
        localStorage.setItem('organizationUuid', orgUuid)
        localStorage.setItem('organizationName', orgName)
      }
    } catch (e: any) {
      showToast.error(e?.message ?? 'Failed to accept invitation.')
    } finally {
      setProcessingInviteUuid(null)
    }
  }

  const handleDeclineInvitation = async (inv: MyInvitation) => {
    setProcessingInviteUuid(inv.uuid)
    try {
      await revokeTeamInvite(inv.uuid)
      setInvitations((prev) => prev.filter((i) => i.uuid !== inv.uuid))
      showToast.success('Invitation declined.')
    } catch (e: any) {
      showToast.error(e?.message ?? 'Failed to decline invitation.')
    } finally {
      setProcessingInviteUuid(null)
    }
  }

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
    setDraftRole(member.role)
    setTimeout(() => setDrawerLoading(false), 450)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
  }

  const saveDrawerChanges = () => {
    if (!activeMember) return
    setMembers((prev) => prev.map((m) => (m.id === activeMember.id ? { ...m, role: draftRole } : m)))
    showToast.success('Changes saved.')
  }

  const filtered = useMemo(() => {
    if (activeTabId !== 'team-members') return []
    const list = members.filter((m) => m.status === 'active')
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((m) => {
      const roleLabel = ROLE_LABELS[m.role] ?? m.role
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        roleLabel.toLowerCase().includes(q)
      )
    })
  }, [members, search, activeTabId])

  const filteredInvitations = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invitations
    return invitations.filter((inv) => {
      const roleLabel = ROLE_LABELS[inv.role] ?? inv.role
      return (
        inv.organization.name.toLowerCase().includes(q) ||
        inv.role.toLowerCase().includes(q) ||
        roleLabel.toLowerCase().includes(q) ||
        inv.events.some((e) => e.title.toLowerCase().includes(q))
      )
    })
  }, [invitations, search])

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
    tabs: [
      { id: 'team-members', label: 'Team members' },
      { id: 'invitations', label: 'Invitations' },
    ],
    activeTabId,
    searchQuery: search,
    searchPlaceholder: activeTabId === 'invitations' ? 'Search invitations' : 'Search team',
    onTabChange: (id) => {
      setActiveTabId(id)
      setSearch('')
      setSelectedIds(new Set())
    },
    onSearchChange: setSearch,
    showFilter: true,
    filterLabel: activeTabId === 'invitations' ? 'Filter invitations' : 'Filter team',
  })

  const tableData: TeamRow[] = useMemo(() => {
    if (!loading) return filtered
    return Array.from({ length: 8 }).map((_, idx) => ({
      id: `skeleton-${idx}`,
      name: '',
      email: '',
      status: 'active' as const,
      role: '',
      __skeleton: true,
    }))
  }, [filtered, loading])

  const columns = useTeamTableColumns({
    filtered,
    loading,
    selectedIds,
    allVisibleSelected,
    toggleAllVisible,
    toggleOne,
    openDrawerFor,
    performRemove,
  })

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-primary-dark sm:text-2xl">Team Management</h1>
          </div>
        </div>
        <Button variant="primary" onClick={() => setInviteOpen(true)} iconLeading={<Plus className="h-4 w-4" />}>
          Invite team
        </Button>
      </div>

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

      {activeTabId === 'invitations' ? (
        <InvitationsTab
          tableHeaderLeading={tableHeaderLeading}
          tableHeaderActions={tableHeaderActions}
          invitationsLoading={invitationsLoading}
          invitations={invitations}
          filteredInvitations={filteredInvitations}
          processingInviteUuid={processingInviteUuid}
          onAccept={handleAcceptInvitation}
          onDecline={handleDeclineInvitation}
        />
      ) : (
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
              {search.trim() ? 'No team members match your search.' : 'No team members.'}
            </div>
          }
          size="md"
        />
      )}

      <InviteTeamSlideout
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        eventOptions={inviteEventOptions}
        onInvite={async (email, role, eventIds) => {
          const { teamInviteUuid } = await inviteTeamMember({ email, role, events: eventIds ?? [] })
          const list = await fetchTeamMembers()
          setMembers(list)
          return teamInviteUuid || undefined
        }}
      />

      <TeamMemberSlideout
        isOpen={drawerOpen}
        onClose={closeDrawer}
        drawerLoading={drawerLoading}
        activeMember={activeMember}
        draftRole={draftRole}
        onDraftRoleChange={setDraftRole}
        activeEvents={activeEvents}
        onSave={saveDrawerChanges}
        onRemove={() => {
          if (!activeMember) return
          performRemove([activeMember.id])
        }}
      />
    </div>
  )
}

export default TeamManagementPage
