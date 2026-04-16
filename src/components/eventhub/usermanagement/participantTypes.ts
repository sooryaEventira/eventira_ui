export type ParticipantRole = 'speaker' | 'attendee'

// ── User / Attendee ────────────────────────────────────────────────────────────

export type AttendeeStatus = 'opened' | 'loggedin' | 'sent' | 'delivered' | 'active' | 'bounced' | 'invited' | 'pending' | 'inactive'

export interface AttendeeGroup {
  id: string
  name: string
  variant?: 'primary' | 'info' | 'muted'
}

export interface Attendee {
  id: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  avatarUrl?: string
  bannerUrl?: string
  status: AttendeeStatus
  inviteCode?: string
  groups: AttendeeGroup[]
  tags?: string[]
  organization?: string
  post?: string
  description?: string
  emailVerified?: boolean
  emailVerifiedDate?: string
  feedbackIncomplete?: boolean
  customFields?: Array<{ label: string; value: string }>
}

export interface Group {
  id: string
  name: string
  attendee_count?: number
  attendeeCount?: number
}

export type AttendeeTab = 'user' | 'groups' | 'custom-schedule'

export interface AttendeeTableRowData {
  attendee?: Attendee
  index: number
}

export interface GroupTableRowData {
  group?: Group
  index: number
}

export interface CustomFieldTableRowData {
  customField?: CustomField
  index: number
}

export type ParticipantStatus =
  | 'opened'
  | 'loggedin'
  | 'sent'
  | 'delivered'
  | 'active'
  | 'bounced'
  | 'invited'
  | 'pending'
  | 'inactive'

export interface ParticipantGroup {
  id: string
  name: string
  variant?: 'primary' | 'info' | 'muted'
}

export interface Participant {
  id: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  avatarUrl?: string
  bannerUrl?: string
  status: ParticipantStatus
  role: ParticipantRole
  inviteCode?: string
  groups: ParticipantGroup[]
  tags?: string[]
  organization?: string
  post?: string
  bio?: string
  description?: string
  emailVerified?: boolean
  emailVerifiedDate?: string
  feedbackIncomplete?: boolean
  customFields?: Array<{ label: string; value: string }>
}

export interface ParticipantGroup_ {
  id: string
  name: string
  participant_count?: number
  participantCount?: number
}

export type ParticipantTab = 'user' | 'groups' | 'custom-schedule'

export interface ParticipantTableRowData {
  participant?: Participant
  index: number
}

export interface CustomField {
  id: string
  fieldName: string
  users: number
  fieldType: 'Text' | 'Dropdown' | 'PDF'
  visibility: 'Visible to attendees' | 'Invisible'
}
