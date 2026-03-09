export type SpeakerStatus = 'active' | 'inactive' | 'pending'

export interface SpeakerGroup {
  id: string
  name: string
  variant?: 'primary' | 'info' | 'muted'
}

export interface Speaker {
  id: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  phoneNumber?: string
  inviteCode?: string
  role?: string
  avatarUrl?: string
  bannerUrl?: string
  status: SpeakerStatus
  bio?: string
  organization?: string
  title?: string
  groups: SpeakerGroup[]
  sessions?: string[]
  socialLinks?: {
    linkedin?: string
    twitter?: string
    website?: string
  }
  customFields?: Array<{ label: string; value: string }>
}

export interface Group {
  id: string
  name: string
  /** From API: speaker_count (snake_case). Fallback: speakerCount (camelCase). */
  speaker_count?: number
  speakerCount?: number
}

export interface CustomField {
  id: string
  fieldName: string
  users: number
  fieldType: 'Text' | 'Dropdown' | 'PDF'
  visibility: 'Visible to attendees' | 'Invisible'
}

export type SpeakerTab = 'user' | 'groups' | 'custom-schedule'

export interface SpeakerTableRowData {
  speaker?: Speaker
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
