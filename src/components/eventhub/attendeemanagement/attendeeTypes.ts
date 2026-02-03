export type AttendeeStatus = 'opened' | 'loggedin' | 'sent' | 'delivered' | 'active' | 'bounced' | 'invited'

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
  attendeeCount: number
}

export interface CustomField {
  id: string
  fieldName: string
  users: number
  fieldType: 'Text' | 'Dropdown' | 'PDF'
  visibility: 'Visible to attendees' | 'Invisible'
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

