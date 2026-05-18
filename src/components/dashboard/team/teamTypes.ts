export type TeamMemberStatus = 'active' | 'pending'

export type TeamMember = {
  id: string
  name: string
  email: string
  status: TeamMemberStatus
  role: string
}

export type EventAccess = {
  id: string
  name: string
  startDate: string
  endDate: string
  color: string
}

export const ROLE_OPTIONS = ['team_manager', 'event_admin', 'organizer'] as const

export const ROLE_LABELS: Record<string, string> = {
  team_manager: 'Team manager',
  event_admin: 'Event admin',
  organizer: 'Organizer',
}

export type TeamRoleFilterValue = 'all' | (typeof ROLE_OPTIONS)[number]

export const ROLE_SELECT_OPTIONS = [
  { value: '', label: 'Select access level' },
  ...ROLE_OPTIONS.map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r })),
]

export type TeamRow = TeamMember & { __skeleton?: boolean }
