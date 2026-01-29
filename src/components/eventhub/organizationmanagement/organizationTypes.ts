export interface Organization {
  id: string
  name: string
  website?: string
  linkedin?: string
  groups?: string
  description?: string
  logoLink?: string
  stallNumber?: string
}

export interface OrganizationTableRowData {
  organization?: Organization
  index: number
}

