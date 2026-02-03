export interface SessionSection {
  id: string
  /**
   * Machine readable section type derived from SectionOption.id
   */
  type: string
  /**
   * Human readable section title shown in the UI.
   */
  title: string
  /**
   * Optional description/content for sections such as text blocks.
   */
  description?: string
  /**
   * Optional structured data for section-specific settings (e.g., map embed src).
   */
  data?: Record<string, any>
}

export interface SectionOption {
  id: string
  label: string
}

export interface SessionDraft {
  title: string
  startTime: string
  startPeriod: 'AM' | 'PM'
  endTime: string
  endPeriod: 'AM' | 'PM'
  location: string
  sessionType: string
  tags: string[]
  sections: SessionSection[]
  attachments?: File[]
}

export interface SavedSession extends SessionDraft {
  id: string
  date?: Date
  parentId?: string // ID of parent session if this is a parallel session
}

export interface SavedSchedule {
  id: string
  name: string
  session?: SessionDraft // Keep for backward compatibility
  sessions?: SavedSession[] // New: array of sessions
  availableTags?: string[]
  availableLocations?: string[]
}
