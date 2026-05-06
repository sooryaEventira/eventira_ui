import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Upload01, Download01, Plus, ArrowNarrowLeft, FilterLines, SearchLg, Edit02, Trash01, XClose, SearchMd, Tag01 } from '@untitled-ui/icons-react'
import { Button } from '../../ui/untitled'
import WeekDateSelector from './WeekDateSelector'
import UploadModal from '../../ui/UploadModal'
import ScheduleGrid from './ScheduleGrid'
import SessionCreationModal from './SessionCreationModal'
import { SavedSession } from './sessionTypes'
import sessionTemplate from '../../../assets/excel/Session templates.xlsx?url'
import { fetchScheduleTags, createScheduleTag, updateScheduleTag, deleteScheduleTag, createScheduleLocation, fetchScheduleLocations, updateScheduleLocation, deleteScheduleLocation, type ScheduleTag, type ScheduleLocation } from '../../../services/scheduleTagService'
import { bulkDeleteSessions, bulkUpdateSessions } from '../../../services/sessionService'
import { showToast } from '../../../utils/toast'
import ConfirmDeleteModal from '../../ui/ConfirmDeleteModal'

const ATTENDANCE_OPTIONS = ['All', 'Online', 'In-person', 'Hybrid'] as const
type AttendanceOption = (typeof ATTENDANCE_OPTIONS)[number]

function sessionTypeToAttendance(sessionType: string): AttendanceOption {
  const t = String(sessionType || '').toLowerCase()
  if (t === 'virtual' || t === 'online') return 'Online'
  if (t === 'hybrid') return 'Hybrid'
  return 'In-person'
}

interface ScheduleContentProps {
  scheduleName?: string
  scheduleUuid?: string
  eventUuid?: string
  onUpload?: () => void
  onUploadFiles?: (files: File[]) => Promise<void> | void
  /** Called when Download button is clicked. If not provided, downloads session template. */
  onDownload?: () => void
  onAddSession?: (parentSessionId?: string, creationType?: 'template' | 'scratch') => void
  onBack?: () => void
  sessions?: SavedSession[] | any[] // Allow any[] for Puck compatibility
  onDateChange?: (date: Date) => void
  selectedDate?: Date | string // Allow string for Puck (ISO string)
  rangeStartDate?: Date | string
  rangeEndDate?: Date | string
  onEditSession?: (session: SavedSession) => void
  onDeleteSession?: (session: SavedSession) => void
  /** When true, grid closes any open 3-dot menu so it doesn't show over the session form. */
  /** When provided, session cards are clickable and open the session summary (e.g. in a slideout). */
  onSessionClick?: (session: SavedSession) => void
  sessionFormOpen?: boolean
  /** Optional list of location names for filter dropdown. Falls back to unique from sessions. */
  availableLocations?: string[]
  /** Optional list of tags for filter dropdown. Will be fetched from API if eventUuid is provided. */
  availableTags?: string[]
  onBulkUpdateApplied?: () => Promise<void> | void
  onBulkDeleteApplied?: () => Promise<void> | void
  onTagsOrLocationsChanged?: () => Promise<void> | void
}

const ScheduleContent: React.FC<ScheduleContentProps> = ({
  scheduleName = 'Schedule 1',
  scheduleUuid,
  eventUuid,
  onUpload,
  onUploadFiles,
  onDownload,
  onAddSession,
  onBack,
  sessions = [],
  onDateChange,
  selectedDate: propSelectedDate,
  rangeStartDate,
  rangeEndDate,
  onEditSession,
  onDeleteSession,
  onSessionClick,
  sessionFormOpen = false,
  availableLocations: propAvailableLocations,
  availableTags: propAvailableTags,
  onBulkUpdateApplied,
  onBulkDeleteApplied,
  onTagsOrLocationsChanged
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isSessionCreationModalOpen, setIsSessionCreationModalOpen] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState(0)
  const [tagsLocationOpen, setTagsLocationOpen] = useState(false)
  const [tagsLocationTab, setTagsLocationTab] = useState<'tags' | 'locations'>('tags')
  const [tagSearch, setTagSearch] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [manageTags, setManageTags] = useState<ScheduleTag[]>([])
  const [isLoadingManageTags, setIsLoadingManageTags] = useState(false)
  const [isSavingTag, setIsSavingTag] = useState(false)
  const [deleteTagCandidate, setDeleteTagCandidate] = useState<ScheduleTag | null>(null)
  const [isDeletingTag, setIsDeletingTag] = useState(false)
  const [deleteLocationCandidate, setDeleteLocationCandidate] = useState<ScheduleLocation | null>(null)
  const [isDeletingLocation, setIsDeletingLocation] = useState(false)
  const [manageLocations, setManageLocations] = useState<ScheduleLocation[]>([])
  type TagLocationModalState = { type: 'tag' | 'location'; mode: 'add' | 'edit'; name: string; uuid?: string; originalName?: string }
  const [tagLocationModal, setTagLocationModal] = useState<TagLocationModalState | null>(null)
  const openAddModal = (type: 'tag' | 'location') => setTagLocationModal({ type, mode: 'add', name: '' })
  const openEditModal = (type: 'tag' | 'location', uuid: string, name: string) =>
    setTagLocationModal({ type, mode: 'edit', name, uuid, originalName: name })
  const closeTagLocationModal = () => setTagLocationModal(null)

  const [filterOpen, setFilterOpen] = useState(false)
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterKeywordApplied, setFilterKeywordApplied] = useState('')
  const [filterLocations, setFilterLocations] = useState<Set<string>>(new Set())
  const [filterAttendance, setFilterAttendance] = useState<Set<string>>(new Set())
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set())
  const [filterPanelPosition, setFilterPanelPosition] = useState<{ top: number; left: number } | null>(null)
  const [apiTags, setApiTags] = useState<ScheduleTag[]>([])
  const [apiLocations, setApiLocations] = useState<ScheduleLocation[]>([])
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const filterPanelRef = useRef<HTMLDivElement>(null)
  const [addTagsDropdownOpen, setAddTagsDropdownOpen] = useState(false)
  const [addTagsDropdownPos, setAddTagsDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const [addTagsSelected, setAddTagsSelected] = useState<Set<string>>(new Set())
  const [addLocationSelected, setAddLocationSelected] = useState<string | null>(null)
  const [isApplyingBulkUpdate, setIsApplyingBulkUpdate] = useState(false)
  const [isApplyingBulkDelete, setIsApplyingBulkDelete] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const addTagsBtnRef = useRef<HTMLButtonElement>(null)
  const addTagsDropdownRef = useRef<HTMLDivElement>(null)
  const didNotifyInitialDateRef = useRef(false)

  // Parse to local calendar date (year, month-1, day) so weekday selector shows correct day; no UTC shift for YYYY-MM-DD
  const parseToLocalDate = useMemo(() => (value: Date | string | undefined | null): Date | null => {
    if (value == null) return null
    if (value instanceof Date) {
      const d = new Date(value.getTime())
      d.setUTCHours(0, 0, 0, 0)
      return Number.isNaN(d.getTime()) ? null : d
    }
    const r = String(value).trim()
    if (!r) return null
    const datePart = r.slice(0, 10)
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const day = parseInt(match[3], 10)
      const d = new Date(Date.UTC(year, month, day))
      return Number.isNaN(d.getTime()) ? null : d
    }
    const d = new Date(r)
    if (Number.isNaN(d.getTime())) return null
    d.setUTCHours(0, 0, 0, 0)
    return d
  }, [])

  const getInitialDate = (): Date => {
    const d = parseToLocalDate(propSelectedDate)
    if (d) return d
    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    return date
  }

  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate)

  const normalizedRangeStart = useMemo(() => parseToLocalDate(rangeStartDate), [rangeStartDate, parseToLocalDate])
  const normalizedRangeEnd = useMemo(() => parseToLocalDate(rangeEndDate), [rangeEndDate, parseToLocalDate])

  useEffect(() => {
    // Initialize date when component mounts or prop changes
    const initialDate = getInitialDate()
    setSelectedDate((prev) => (prev.getTime() === initialDate.getTime() ? prev : initialDate))

    // Only notify parent once when parent didn't supply a selected date.
    // If parent *did* supply a date, calling onDateChange here can cause a render loop.
    if (!propSelectedDate && !didNotifyInitialDateRef.current) {
      didNotifyInitialDateRef.current = true
      onDateChange?.(initialDate)
    }
  }, [propSelectedDate, onDateChange])
  
  // Normalize sessions - convert date strings to Date objects if needed
  const gridSessions = useMemo(() => {
    const raw = (sessions || []) as any[]

    const toMinutes = (time?: string, period?: string) => {
      if (!time) return 0
      const [hRaw, mRaw] = String(time).split(':')
      let h = Number(hRaw)
      const m = Number(mRaw ?? 0)
      const p = String(period ?? 'AM').toUpperCase()
      if (p === 'PM' && h !== 12) h += 12
      if (p === 'AM' && h === 12) h = 0
      return h * 60 + (Number.isFinite(m) ? m : 0)
    }

    // 1) Normalize shape (date, ids, parent references)
    const normalized: SavedSession[] = raw
      .map((session: any) => {
        // IMPORTANT:
        // Always prioritize stable UUIDs over numeric/internal IDs so that
        // parent/child (parallel) relationships use the same identifier
        // that the backend exposes via `parent_session_uuid`.
        const id = String(
          session?.uuid ??
          session?.session_uuid ??
          session?.id ??
          ''
        )
        if (!id) return null

        const sessionTypeRaw = String(session?.sessionType ?? session?.session_type ?? '').toLowerCase()
        const parentUuid =
          session?.parentUuid ??
          session?.parent_uuid ??
          session?.parent_session_uuid ??
          session?.parentSessionUuid ??
          session?.parent_id ??
          session?.parentId ??
          session?.parentId

        const date =
          session?.date && typeof session.date === 'string'
            ? new Date(session.date)
            : session?.date instanceof Date
              ? session.date
              : undefined

        const normalizedSession: SavedSession = {
          ...session,
          id,
          date,
          sessionType: sessionTypeRaw || session?.sessionType,
          // Set parentId whenever a parent reference exists so the grid nests children under parents (combined view).
          parentId: parentUuid ? String(parentUuid) : undefined,
        }

        return normalizedSession
      })
      .filter(Boolean) as SavedSession[]

    // 2) Group by parentId so parent+child show as combined grid (don't rely on sessionType)
    const idSet = new Set(normalized.map((s) => String(s.id)))
    const sortByStart = (a: SavedSession, b: SavedSession) =>
      toMinutes(a.startTime, a.startPeriod) - toMinutes(b.startTime, b.startPeriod) ||
      String(a.title ?? '').localeCompare(String(b.title ?? ''))

    // Roots = no parentId, or parent not in this list (show as top-level row)
    const roots = normalized
      .filter((s) => !s.parentId || !idSet.has(String(s.parentId)))
      .sort(sortByStart)

    // Children by parent (any session whose parentId is in the list)
    const childrenByParentId = new Map<string, SavedSession[]>()
    for (const s of normalized) {
      const pid = s.parentId ? String(s.parentId) : ''
      if (pid && idSet.has(pid)) {
        const arr = childrenByParentId.get(pid) ?? []
        arr.push(s)
        childrenByParentId.set(pid, arr)
      }
    }

    // 3) Output: each root then its children (combined grid), so grid can nest them
    const output: SavedSession[] = []
    for (const root of roots) {
      output.push(root)
      const kids = (childrenByParentId.get(String(root.id)) ?? []).slice().sort(sortByStart)
      output.push(...kids)
    }

    return output
  }, [sessions])

  const handleDateChange = (date: Date) => {
    const normalizedDate = new Date(date)
    normalizedDate.setUTCHours(0, 0, 0, 0)
    setSelectedDate(normalizedDate)
    onDateChange?.(normalizedDate)
  }

  const handleUploadClick = () => {
    setIsUploadModalOpen(true)
    onUpload?.()
  }

  const handleCloseModal = () => {
    setIsUploadModalOpen(false)
  }

  const handleDownloadTemplate = () => {
    const link = document.createElement('a')
    link.href = sessionTemplate
    link.download = 'Session template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownload = () => {
    if (onDownload) onDownload()
    else handleDownloadTemplate()
  }

  // Fetch schedule tags + locations for filter/bulk actions
  useEffect(() => {
    if (!eventUuid || !scheduleUuid) return
    let cancelled = false

    Promise.all([
      fetchScheduleTags(scheduleUuid, eventUuid),
      fetchScheduleLocations(scheduleUuid, eventUuid),
    ])
      .then(([tags, locations]) => {
        if (!cancelled) setApiTags(tags)
        if (!cancelled) setApiLocations(locations)
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to fetch schedule tags/locations:', error)
          setApiTags([])
          setApiLocations([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [eventUuid, scheduleUuid])

  // Fetch tags and locations when the manage panel opens
  useEffect(() => {
    if (!tagsLocationOpen || !eventUuid || !scheduleUuid) return
    let cancelled = false
    setIsLoadingManageTags(true)
    Promise.all([
      fetchScheduleTags(scheduleUuid, eventUuid),
      fetchScheduleLocations(scheduleUuid, eventUuid),
    ])
      .then(([tags, locations]) => {
        if (!cancelled) {
          setManageTags(tags)
          setManageLocations(locations)
        }
      })
      .catch(() => { if (!cancelled) showToast.error('Failed to load tags or locations.') })
      .finally(() => { if (!cancelled) setIsLoadingManageTags(false) })
    return () => { cancelled = true }
  }, [tagsLocationOpen, eventUuid, scheduleUuid])

  // Fetch tags + locations specifically when "Add tags & Location" dropdown opens.
  // This ensures the dropdown list is always sourced from:
  // - API_ENDPOINTS.SCHEDULE_TAGS.LIST
  // - API_ENDPOINTS.SCHEDULE_LOCATIONS.LIST
  useEffect(() => {
    if (!addTagsDropdownOpen || !eventUuid || !scheduleUuid) return
    let cancelled = false
    Promise.all([
      fetchScheduleTags(scheduleUuid, eventUuid),
      fetchScheduleLocations(scheduleUuid, eventUuid),
    ])
      .then(([tags, locations]) => {
        if (cancelled) return
        setApiTags(tags)
        setApiLocations(locations)
      })
      .catch(() => {
        if (cancelled) return
        showToast.error('Failed to load tags or locations.')
      })
    return () => { cancelled = true }
  }, [addTagsDropdownOpen, eventUuid, scheduleUuid])

  const handleAddTag = async () => {
    if (!tagLocationModal || !eventUuid || !scheduleUuid) return
    const name = tagLocationModal.name.trim()
    if (!name) return
    setIsSavingTag(true)
    try {
      const created = await createScheduleTag(scheduleUuid, eventUuid, name)
      setManageTags((prev) => [...prev, created])
      setApiTags((prev) => [...prev, created])
      showToast.success('Tag added.')
      closeTagLocationModal()
      onTagsOrLocationsChanged?.()
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to add tag.')
    } finally {
      setIsSavingTag(false)
    }
  }

  const handleAddLocation = async () => {
    if (!tagLocationModal || !eventUuid || !scheduleUuid) return
    const name = tagLocationModal.name.trim()
    if (!name) return
    setIsSavingTag(true)
    try {
      const created = await createScheduleLocation(scheduleUuid, eventUuid, name)
      setManageLocations((prev) => [...prev, created])
      showToast.success('Location added.')
      closeTagLocationModal()
      onTagsOrLocationsChanged?.()
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to add location.')
    } finally {
      setIsSavingTag(false)
    }
  }

  const handleEditLocation = async () => {
    if (!tagLocationModal || !eventUuid || !scheduleUuid) return
    const newName = tagLocationModal.name.trim()
    const originalName = tagLocationModal.originalName ?? ''
    if (!newName || !originalName) return
    setIsSavingTag(true)
    try {
      const updated = await updateScheduleLocation(scheduleUuid, eventUuid, originalName, newName)
      setManageLocations((prev) => prev.map((l) => l.name === originalName ? { ...l, name: updated.name ?? newName } : l))
      showToast.success('Location updated.')
      closeTagLocationModal()
      onTagsOrLocationsChanged?.()
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to update location.')
    } finally {
      setIsSavingTag(false)
    }
  }

  const handleEditTag = async () => {
    if (!tagLocationModal || !eventUuid || !scheduleUuid || !tagLocationModal.uuid) return
    const newName = tagLocationModal.name.trim()
    if (!newName) return
    setIsSavingTag(true)
    try {
      const updated = await updateScheduleTag(scheduleUuid, eventUuid, tagLocationModal.uuid, newName)
      setManageTags((prev) =>
        prev.map((t) => (t.uuid === tagLocationModal.uuid ? { ...t, name: updated.name ?? newName } : t))
      )
      setApiTags((prev) =>
        prev.map((t) => (t.uuid === tagLocationModal.uuid ? { ...t, name: updated.name ?? newName } : t))
      )
      showToast.success('Tag updated.')
      closeTagLocationModal()
      onTagsOrLocationsChanged?.()
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to update tag.')
    } finally {
      setIsSavingTag(false)
    }
  }

  const handleDeleteLocation = async () => {
    if (!deleteLocationCandidate || !eventUuid || !scheduleUuid) return
    setIsDeletingLocation(true)
    try {
      await deleteScheduleLocation(scheduleUuid, eventUuid, deleteLocationCandidate.name)
      setManageLocations((prev) => prev.filter((l) => l.name !== deleteLocationCandidate.name))
      showToast.success('Location deleted.')
      setDeleteLocationCandidate(null)
      onTagsOrLocationsChanged?.()
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to delete location.')
    } finally {
      setIsDeletingLocation(false)
    }
  }

  const handleDeleteTag = async () => {
    if (!deleteTagCandidate || !eventUuid || !scheduleUuid) return
    setIsDeletingTag(true)
    try {
      await deleteScheduleTag(scheduleUuid, deleteTagCandidate.uuid, eventUuid)
      setManageTags((prev) => prev.filter((t) => t.uuid !== deleteTagCandidate.uuid))
      setApiTags((prev) => prev.filter((t) => t.uuid !== deleteTagCandidate.uuid))
      showToast.success('Tag deleted.')
      setDeleteTagCandidate(null)
      onTagsOrLocationsChanged?.()
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to delete tag.')
    } finally {
      setIsDeletingTag(false)
    }
  }

  // Location options: prefer API, then prop, then unique from sessions; always include "All"
  const locationOptions = useMemo(() => {
    const base = apiLocations.length > 0
      ? apiLocations.map((loc) => String(loc?.name ?? '').trim()).filter(Boolean)
      : propAvailableLocations && propAvailableLocations.length > 0
        ? propAvailableLocations
      : (() => {
          const raw = (sessions || []) as any[]
          const set = new Set<string>()
          raw.forEach((s: any) => {
            const loc = s?.location ?? s?.venue
            if (loc && String(loc).trim()) set.add(String(loc).trim())
          })
          return Array.from(set).sort()
        })()
    return ['All', ...Array.from(new Set(base))]
  }, [sessions, propAvailableLocations, apiLocations])

  // Tag options: prefer API, then prop, then unique from sessions; always include "All"
  const tagOptions = useMemo(() => {
    const base = apiTags.length > 0
      ? apiTags.map((t) => t.name)
      : propAvailableTags && propAvailableTags.length > 0
        ? propAvailableTags
        : (() => {
            const raw = (sessions || []) as any[]
            const set = new Set<string>()
            raw.forEach((s: any) => {
              const tags = Array.isArray(s?.tags) ? s.tags : []
              tags.forEach((tag: string) => {
                if (tag && String(tag).trim()) set.add(String(tag).trim())
              })
            })
            return Array.from(set).sort()
          })()
    return ['All', ...Array.from(new Set(base))]
  }, [sessions, propAvailableTags, apiTags])

  // Position filter panel below trigger (for portal)
  useLayoutEffect(() => {
    if (!filterOpen || !filterTriggerRef.current) return
    const rect = filterTriggerRef.current.getBoundingClientRect()
    const panelWidth = Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 32 : 320)
    setFilterPanelPosition({
      top: rect.bottom + 8,
      left: Math.min(rect.right - panelWidth, rect.left)
    })
  }, [filterOpen])

  // Close filter dropdown on outside click (trigger or panel)
  useEffect(() => {
    if (!filterOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      const inTrigger = filterTriggerRef.current?.contains(target)
      const inPanel = filterPanelRef.current?.contains(target)
      if (!inTrigger && !inPanel) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterOpen])

  // Position add-tags dropdown below its trigger button
  useLayoutEffect(() => {
    if (!addTagsDropdownOpen || !addTagsBtnRef.current) return
    const rect = addTagsBtnRef.current.getBoundingClientRect()
    const panelWidth = 280
    setAddTagsDropdownPos({
      top: rect.bottom + 4,
      left: Math.min(rect.left, (typeof window !== 'undefined' ? window.innerWidth : 800) - panelWidth - 16),
    })
  }, [addTagsDropdownOpen])

  // Close add-tags dropdown on outside click
  useEffect(() => {
    if (!addTagsDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (!addTagsBtnRef.current?.contains(target) && !addTagsDropdownRef.current?.contains(target)) {
        setAddTagsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [addTagsDropdownOpen])


  const appliedKeyword = filterKeywordApplied.trim().toLowerCase()
  const appliedLocations = filterLocations.size === 0 || filterLocations.has('All') ? null : filterLocations
  const appliedAttendance = filterAttendance.size === 0 || filterAttendance.has('All') ? null : filterAttendance
  const appliedTags = filterTags.size === 0 || filterTags.has('All') ? null : filterTags

  const filteredSessions = useMemo(() => {
    let list = gridSessions
    if (appliedKeyword) {
      list = list.filter((s) => {
        const title = String(s.title ?? '').toLowerCase()
        const desc = String((s as any).description ?? '').toLowerCase()
        const sectionText = (s.sections ?? [])
          .map((sec: any) => String(sec?.title ?? '') + ' ' + String(sec?.description ?? ''))
          .join(' ')
          .toLowerCase()
        return title.includes(appliedKeyword) || desc.includes(appliedKeyword) || sectionText.includes(appliedKeyword)
      })
    }
    if (appliedLocations && appliedLocations.size > 0) {
      list = list.filter((s) => {
        const loc = String(s.location ?? '').trim()
        return loc && appliedLocations.has(loc)
      })
    }
    if (appliedAttendance && appliedAttendance.size > 0) {
      list = list.filter((s) => {
        const att = sessionTypeToAttendance(s.sessionType ?? '')
        return appliedAttendance.has(att)
      })
    }
    if (appliedTags && appliedTags.size > 0) {
      list = list.filter((s) => {
        const sessionTags = Array.isArray(s.tags) ? s.tags : []
        return sessionTags.some((tag) => appliedTags.has(String(tag).trim()))
      })
    }
    return list
  }, [gridSessions, appliedKeyword, appliedLocations, appliedAttendance, appliedTags])

  const hasAnySessions = gridSessions.length > 0

  const hasSessionsForSelectedDate = useMemo(() => {
    if (!selectedDate) return false
    const selected = new Date(selectedDate)
    selected.setUTCHours(0, 0, 0, 0)
    return gridSessions.some((s: any) => {
      if (!s?.date) return false
      const d = new Date(s.date as any)
      if (Number.isNaN(d.getTime())) return false
      d.setUTCHours(0, 0, 0, 0)
      return d.getTime() === selected.getTime()
    })
  }, [gridSessions, selectedDate])

  const handleFilterApply = () => {
    setFilterKeywordApplied(filterKeyword.trim())
    setFilterOpen(false)
  }

  const handleFilterClearAll = () => {
    setFilterKeyword('')
    setFilterKeywordApplied('')
    setFilterLocations(new Set())
    setFilterAttendance(new Set())
    setFilterTags(new Set())
    setFilterOpen(false)
  }

  const handleApplyBulkTagLocation = async () => {
    if (!eventUuid) {
      showToast.error('Event UUID is required.')
      return
    }
    const sessionUuids = selectedSessionIds
      .map((id) => String(id).trim())
      .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))

    if (sessionUuids.length === 0) {
      showToast.error('Please select saved sessions to apply bulk update.')
      return
    }

    const tagUuids = Array.from(addTagsSelected)
    const location = addLocationSelected ?? undefined
    if (tagUuids.length === 0 && !location) return

    setIsApplyingBulkUpdate(true)
    try {
      await bulkUpdateSessions(eventUuid, {
        session_uuids: sessionUuids,
        ...(tagUuids.length > 0 ? { tag_uuids: tagUuids } : {}),
        ...(location ? { location } : {}),
      })
      showToast.success('Sessions updated successfully.')
      setAddTagsDropdownOpen(false)
      setAddTagsSelected(new Set())
      setAddLocationSelected(null)
      setClearSelectionTrigger((n) => n + 1)
      await Promise.resolve(onBulkUpdateApplied?.())
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to bulk update sessions.')
    } finally {
      setIsApplyingBulkUpdate(false)
    }
  }

  const handleBulkDeleteSelected = async () => {
    if (!eventUuid) {
      showToast.error('Event UUID is required.')
      return
    }
    const sessionUuids = selectedSessionIds
      .map((id) => String(id).trim())
      .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))

    if (sessionUuids.length === 0) {
      showToast.error('Please select saved sessions to delete.')
      return
    }

    setIsApplyingBulkDelete(true)
    try {
      await bulkDeleteSessions(eventUuid, { session_uuids: sessionUuids })
      showToast.success('Selected sessions deleted successfully.')
      setClearSelectionTrigger((n) => n + 1)
      await Promise.resolve(onBulkDeleteApplied?.())
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to delete selected sessions.')
    } finally {
      setIsApplyingBulkDelete(false)
    }
  }

  const toggleFilterLocation = (loc: string) => {
    setFilterLocations((prev) => {
      const next = new Set(prev)
      if (loc === 'All') {
        next.clear()
        next.add('All')
        return next
      }
      next.delete('All')
      if (next.has(loc)) next.delete(loc)
      else next.add(loc)
      if (next.size === 0) next.add('All')
      return next
    })
  }

  const toggleFilterAttendance = (att: string) => {
    setFilterAttendance((prev) => {
      const next = new Set(prev)
      if (att === 'All') {
        next.clear()
        next.add('All')
        return next
      }
      next.delete('All')
      if (next.has(att)) next.delete(att)
      else next.add(att)
      if (next.size === 0) next.add('All')
      return next
    })
  }

  const toggleFilterTag = (tag: string) => {
    setFilterTags((prev) => {
      const next = new Set(prev)
      if (tag === 'All') {
        next.clear()
        next.add('All')
        return next
      }
      next.delete('All')
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      if (next.size === 0) next.add('All')
      return next
    })
  }

  return (
    <main className="relative w-full bg-white px-4 pb-10 pt-8 md:px-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={onBack}
              className="p-2"
              iconLeading={<ArrowNarrowLeft className="h-5 w-5" />}
              aria-label="Back to schedule list"
            />
          )}
          <h1 className="font-manrope text-[20px] font-semibold leading-10 text-primary-dark md:text-[26px] md:leading-10">
            {scheduleName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleDownload}
            iconLeading={<Download01 className="h-4 w-4" />}
            style={{ fontFamily: 'Inter' }}
          >
            Download
          </Button>
          <Button
            type="button"
            data-schedule-upload="true"
            variant="primary"
            size="md"
            onClick={handleUploadClick}
            iconLeading={<Upload01 className="h-4 w-4" />}
            style={{ fontFamily: 'Inter' }}
          >
            Upload
          </Button>
        </div>
      </div>

      <div className="mt-6 flex min-h-[22rem] flex-col gap-6 overflow-hidden rounded border border-slate-200 bg-white px-4 py-6 shadow-sm md:min-h-[819px] md:px-8">
        {/* Date Selector - key by range so switching events remounts and shows that event's dates */}
        <WeekDateSelector 
          key={normalizedRangeStart && normalizedRangeEnd
            ? `${normalizedRangeStart.getTime()}-${normalizedRangeEnd.getTime()}`
            : 'no-range'}
          initialDate={selectedDate} 
          initialRangeStartDate={normalizedRangeStart}
          initialRangeEndDate={normalizedRangeEnd}
          onDateChange={(date) => {
            handleDateChange(date)
          }} 
        />

        <div ref={filterDropdownRef} className="relative flex w-full items-center justify-between gap-3">
          {selectedSessionIds.length > 0 ? (
            <div className="flex flex-1 items-center justify-end gap-3">
              <button
                ref={addTagsBtnRef}
                type="button"
                onClick={() => {
                  setAddTagsSelected(new Set())
                  setAddLocationSelected(null)
                  setAddTagsDropdownOpen((v) => !v)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-primary/40 hover:text-primary transition-colors"
              >
                
                Add tags &amp; Location
              </button>
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={isApplyingBulkDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors"
              >
                <Trash01 className="h-4 w-4" />
                {isApplyingBulkDelete ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ) : (
            <>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setIsSessionCreationModalOpen(true)}
              iconLeading={<Plus className="h-4 w-4" />}
              style={{ fontFamily: 'Inter' }}
            >
              Add session
            </Button>
            <Button
              type="button"
              onClick={() => setTagsLocationOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
              style={{ fontFamily: 'Inter' }}
              iconLeading={<Tag01 className="h-4 w-4" />}
            >
              Tags &amp; location
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-10  items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
              <input
                type="text"
                value={filterKeyword}
                onChange={(e) => { setFilterKeyword(e.target.value); setFilterKeywordApplied(e.target.value.trim()); }}
                onKeyDown={(e) => e.key === 'Escape' && (setFilterKeyword(''), setFilterKeywordApplied(''))}
                placeholder="Search sessions…"
                className="h-full w-72 bg-transparent px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setFilterKeywordApplied(filterKeyword.trim())}
                className="flex h-full items-center justify-center bg-primary px-3 text-white transition hover:bg-primary/90"
              >
                <SearchLg className="h-4 w-4" />
              </button>
            </div>
          <div className="relative">
            <button
              ref={filterTriggerRef}
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Filter sessions"
              aria-expanded={filterOpen}
            >
              <FilterLines className="h-4 w-4 text-slate-500" strokeWidth={2} />
             
            </button>
            {filterOpen &&
              filterPanelPosition &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  ref={filterPanelRef}
                  className="flex max-h-[min(400px,70vh)] w-[min(250px,calc(100vw-32px))] flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
                  style={{
                    position: 'fixed',
                    top: filterPanelPosition.top,
                    left: Math.max(8, filterPanelPosition.left),
                    zIndex: 9999
                  }}
                >
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Search by keyword</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={filterKeyword}
                            onChange={(e) => setFilterKeyword(e.target.value)}
                            placeholder="Search"
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleFilterApply}
                            iconLeading={<SearchLg className="h-4 w-4" />}
                            aria-label="Search"
                          />
                        </div>
                      </div>
                      <hr className="border-slate-100" />
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                        <div className="space-y-2">
                          {locationOptions.map((loc) => (
                            <label key={loc} className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={filterLocations.has(loc) || (filterLocations.size === 0 && loc === 'All')}
                                onChange={() => toggleFilterLocation(loc)}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm text-slate-800">{loc}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <hr className="border-slate-100" />
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Attendance type</label>
                        <div className="space-y-2">
                          {ATTENDANCE_OPTIONS.map((att) => (
                            <label key={att} className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={filterAttendance.has(att) || (filterAttendance.size === 0 && att === 'All')}
                                onChange={() => toggleFilterAttendance(att)}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm text-slate-800">{att}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {tagOptions.length > 1 && (
                        <>
                          <hr className="border-slate-100" />
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Tags</label>
                            <div className="space-y-2">
                              {tagOptions.map((tag) => (
                                <label key={tag} className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={filterTags.has(tag) || (filterTags.size === 0 && tag === 'All')}
                                    onChange={() => toggleFilterTag(tag)}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                                  />
                                  <span className="text-sm text-slate-800">{tag}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2 border-t border-slate-100 px-4 py-4">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleFilterClearAll}
                      style={{ fontFamily: 'Inter' }}
                    >
                      Clear all
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleFilterApply}
                      style={{ fontFamily: 'Inter' }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>,
                document.body
              )}
          </div>
          </div>
            </>
          )}
        </div>

        {filteredSessions && filteredSessions.length > 0 ? (
          <ScheduleGrid
            sessions={filteredSessions}
            selectedDate={selectedDate}
            onAddParallelSession={(parentId) => onAddSession?.(parentId)}
            onEditSession={onEditSession}
            onDeleteSession={onDeleteSession}
            onSessionClick={onSessionClick}
            sessionFormOpen={sessionFormOpen}
            onSelectionChange={(ids) => setSelectedSessionIds(ids)}
            clearSelectionTrigger={clearSelectionTrigger}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-center text-base text-slate-500">
            {!hasAnySessions
              ? 'No sessions for this schedule yet. Upload your schedule or create custom sessions!'
              : !hasSessionsForSelectedDate
                ? 'No sessions are scheduled for this day. Click "Add session" to create one.'
                : 'No sessions match the current filters.'}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseModal}
        onUpload={onUploadFiles}
        multiple={false}
        onDownloadTemplate={handleDownloadTemplate}
        showTemplate={true}
        templateLabel="Session Template"
      />

      {/* Tags & Location Slideout */}
      {tagsLocationOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-[1000]"
            onClick={() => setTagsLocationOpen(false)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-2xl z-[1001] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Manage tags &amp; location</h2>
                <p className="mt-0.5 text-sm text-slate-500">Changes apply to this schedule only</p>
              </div>
              <button
                type="button"
                onClick={() => setTagsLocationOpen(false)}
                className="ml-4 mt-0.5 rounded p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <XClose className="h-5 w-5" />
              </button>
            </div>

            {/* Search + Add */}
            <div className="flex items-center gap-2 px-6 pt-4 pb-3">
              <div className="relative flex-1">
                <SearchMd className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tagsLocationTab === 'tags' ? tagSearch : locationSearch}
                  onChange={(e) =>
                    tagsLocationTab === 'tags'
                      ? setTagSearch(e.target.value)
                      : setLocationSearch(e.target.value)
                  }
                  placeholder={tagsLocationTab === 'tags' ? 'Search for tags' : 'Search for locations'}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {tagsLocationTab === 'tags' ? (
                <button
                  type="button"
                  onClick={() => openAddModal('tag')}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:border-primary/40 hover:text-primary transition-colors whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Add tag
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAddModal('location')}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:border-primary/40 hover:text-primary transition-colors whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Add location
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6">
              <button
                type="button"
                onClick={() => setTagsLocationTab('tags')}
                className={`-mb-px mr-6 pb-3 text-sm font-medium transition-colors ${
                  tagsLocationTab === 'tags'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Tags
              </button>
              <button
                type="button"
                onClick={() => setTagsLocationTab('locations')}
                className={`-mb-px pb-3 text-sm font-medium transition-colors ${
                  tagsLocationTab === 'locations'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Locations
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto] items-center border-b border-slate-100 px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                <span>Name</span>
                <span className="pr-12">Used in</span>
                <span />
              </div>

              {tagsLocationTab === 'tags' ? (
                <div className="divide-y divide-slate-100">
                  {isLoadingManageTags ? (
                    <div className="px-6 py-8 text-center text-sm text-slate-400">Loading tags…</div>
                  ) : manageTags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-slate-400">No tags found.</div>
                  ) : (
                    manageTags
                      .filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                      .map((tag) => (
                        <div key={tag.uuid} className="grid grid-cols-[1fr_auto_auto] items-center px-6 py-4">
                          <span className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-blue-600 bg-blue-50">
                            {tag.name}
                          </span>
                          <span className="pr-8 text-sm text-slate-600">-</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal('tag', tag.uuid, tag.name)}
                              className="rounded p-1 text-slate-400 hover:text-slate-600 transition-colors"
                              aria-label="Edit tag"
                            >
                              <Edit02 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTagCandidate(tag)}
                              className="rounded p-1 text-slate-400 hover:text-red-500 transition-colors"
                              aria-label="Delete tag"
                            >
                              <Trash01 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {manageLocations
                    .filter((l: ScheduleLocation) => l.name.toLowerCase().includes(locationSearch.toLowerCase()))
                    .map((loc: ScheduleLocation) => (
                      <div key={loc.uuid} className="grid grid-cols-[1fr_auto] items-center px-6 py-4">
                        <span className="text-sm font-medium text-slate-800">{loc.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal('location', loc.uuid, loc.name)}
                            className="rounded p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Edit location"
                          >
                            <Edit02 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteLocationCandidate(loc)}
                            className="rounded p-1 text-slate-400 hover:text-red-500 transition-colors"
                            aria-label="Delete location"
                          >
                            <Trash01 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setTagsLocationOpen(false)}
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center rounded-lg bg-slate-200 px-4 text-sm font-medium text-slate-400 cursor-not-allowed"
                disabled
              >
                Save changes
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Add / Edit Tag or Location Modal */}
      {tagLocationModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h3 className="text-base font-semibold text-slate-900">
                {tagLocationModal.mode === 'add'
                  ? tagLocationModal.type === 'tag' ? 'Add tag' : 'Add location'
                  : tagLocationModal.type === 'tag' ? 'Edit tag' : 'Edit location'}
              </h3>
              <button
                type="button"
                onClick={closeTagLocationModal}
                className="rounded p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <XClose className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-6">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {tagLocationModal.type === 'tag' ? 'Tag name' : 'Location name'}
              </label>
              <input
                type="text"
                autoFocus
                value={tagLocationModal.name}
                onChange={(e) => setTagLocationModal((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder={tagLocationModal.type === 'tag' ? 'e.g. Keynote' : 'e.g. Room A'}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeTagLocationModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!tagLocationModal.name.trim() || isSavingTag}
                  onClick={
                    tagLocationModal.mode === 'add'
                      ? tagLocationModal.type === 'tag'
                        ? handleAddTag
                        : handleAddLocation
                      : tagLocationModal.type === 'location'
                        ? handleEditLocation
                        : handleEditTag
                  }
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSavingTag ? 'Saving…' : tagLocationModal.mode === 'add' ? 'Add' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteTagCandidate}
        title="Delete tag"
        description={`Are you sure you want to delete the tag "${deleteTagCandidate?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeletingTag}
        onCancel={() => setDeleteTagCandidate(null)}
        onConfirm={handleDeleteTag}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteLocationCandidate}
        title="Delete location"
        description={`Are you sure you want to delete the location "${deleteLocationCandidate?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeletingLocation}
        onCancel={() => setDeleteLocationCandidate(null)}
        onConfirm={handleDeleteLocation}
      />

      <ConfirmDeleteModal
        isOpen={showBulkDeleteConfirm}
        title="Delete selected sessions"
        description={`Are you sure you want to delete ${selectedSessionIds.length} selected session(s)? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isApplyingBulkDelete}
        onCancel={() => {
          if (isApplyingBulkDelete) return
          setShowBulkDeleteConfirm(false)
        }}
        onConfirm={async () => {
          await handleBulkDeleteSelected()
          setShowBulkDeleteConfirm(false)
        }}
      />

      {/* Add Tags dropdown portal */}
      {addTagsDropdownOpen && addTagsDropdownPos && createPortal(
        <div
          ref={addTagsDropdownRef}
          style={{ position: 'fixed', top: addTagsDropdownPos.top, left: addTagsDropdownPos.left, width: 280, zIndex: 9999 }}
          className="rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Tags
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {apiTags.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">No tags found.</div>
            ) : (
              apiTags.map((tag) => (
                <label key={tag.uuid} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={addTagsSelected.has(tag.uuid)}
                    onChange={() => setAddTagsSelected((prev) => {
                      const next = new Set(prev)
                      next.has(tag.uuid) ? next.delete(tag.uuid) : next.add(tag.uuid)
                      return next
                    })}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-slate-700">{tag.name}</span>
                </label>
              ))
            )}
          </div>
          <div className="px-3 py-2 border-y border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Location
          </div>
          <div className="max-h-40 overflow-y-auto py-1">
            {apiLocations.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">No locations found.</div>
            ) : (
              apiLocations.map((loc) => (
                <label key={loc.uuid || loc.name} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={addLocationSelected === loc.name}
                    onChange={() => setAddLocationSelected((prev) => prev === loc.name ? null : loc.name)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-slate-700">{loc.name}</span>
                </label>
              ))
            )}
          </div>
          {(apiTags.length > 0 || apiLocations.length > 0) && (
            <div className="border-t border-slate-100 px-3 py-2">
              <button
                type="button"
                disabled={(addTagsSelected.size === 0 && !addLocationSelected) || isApplyingBulkUpdate}
                onClick={handleApplyBulkTagLocation}
                className="w-full rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isApplyingBulkUpdate ? 'Applying...' : 'Apply'}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Session Creation Modal */}
      <SessionCreationModal
        isOpen={isSessionCreationModalOpen}
        onClose={() => setIsSessionCreationModalOpen(false)}
        onSelect={(type) => {
          setIsSessionCreationModalOpen(false)
          // Call onAddSession with the selected type
          // If template is selected, it will open the SessionSlideout
          onAddSession?.(undefined, type)
        }}
      />
    </main>
  )
}

export default ScheduleContent

