import React, { useState, useMemo, useEffect, useRef } from 'react'
import DashboardSidebar from './DashboardSidebar'
import DashboardNavbar from './DashboardNavbar'
import DashboardContent from './DashboardContent'
import NewEventForm, { type EventFormData } from './NewEventForm'
import TemplateSelectionPage from './TemplateSelectionPage'
import EventWebsitePage from '../eventhub/EventWebsitePage'
import WebsitePreviewPage from '../eventhub/WebsitePreviewPage'
import TeamManagementPage from './team/TeamManagementPage'
import { type Event } from './EventsTable'
import type { DateRange } from '../ui/untitled'
import { deleteEvent, fetchEvents, fetchEvent, type EventData, type CreateEventResponseData } from '../../services/eventService'
import { useEventForm } from '../../contexts/EventFormContext'
import { showToast } from '../../utils/toast'

interface DashboardLayoutProps {
  organizationName?: string
  title?: string
  userAvatarUrl?: string
  userEmail?: string
  onSidebarItemClick?: (itemId: string) => void
  onSearchClick?: () => void
  onNotificationClick?: () => void
  onProfileClick?: () => void
  onLogout?: () => void
  onNewEventClick?: () => void
  onEditEvent?: (eventId: string) => void
  onSortEvents?: (column: string) => void
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  organizationName,
  title = 'Web Submit Events',
  userAvatarUrl,
  userEmail,
  onSidebarItemClick,
  onSearchClick,
  onNotificationClick,
  onProfileClick,
  onLogout,
  onNewEventClick,
  onEditEvent,
  onSortEvents
}) => {
  const { setCreatedEvent, createdEvent } = useEventForm()
  // Use ref to store latest createdEvent so checkRoute always has access to current value
  // without causing the effect to re-run when event changes
  const createdEventRef = React.useRef(createdEvent)
  
  // Update ref immediately when createdEvent changes (synchronously during render)
  // This ensures the ref is always up-to-date before any navigation happens
  // CRITICAL: This must happen synchronously, not in useEffect, to prevent race conditions
  if (createdEventRef.current?.uuid !== createdEvent?.uuid) {
    createdEventRef.current = createdEvent
  }
  
  // Also verify in effect
  React.useEffect(() => {
    if (createdEventRef.current?.uuid !== createdEvent?.uuid) {
      createdEventRef.current = createdEvent
    }
  }, [createdEvent])
  
  const [activeItemId, setActiveItemId] = useState('events')
  const [routePath, setRoutePath] = useState<string>(() => window.location.pathname)
  const [searchValue, setSearchValue] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null })
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showNewEventForm, setShowNewEventForm] = useState(false)
  const [showTemplatePage, setShowTemplatePage] = useState(false)
  const [showEventWebsitePage, setShowEventWebsitePage] = useState(false)
  const [showPreviewPage, setShowPreviewPage] = useState(false)
  const [previewPageId, setPreviewPageId] = useState<string>('')

  const getDashboardPathForItem = (itemId: string) => {
    if (itemId === 'events') return '/dashboard'
    return `/dashboard/${itemId}`
  }

  // Check if we should show template page or event website page based on URL
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname
      setRoutePath(path)
      // Read latest event from ref (always current, doesn't cause re-renders)
      // Also verify it matches context to catch any sync issues
      const currentEvent = createdEventRef.current
      const contextEvent = createdEvent
      
      // If ref and context are out of sync, use context (more authoritative)
      const eventToUse = (currentEvent?.uuid === contextEvent?.uuid) ? currentEvent : contextEvent
      
      if (currentEvent?.uuid !== contextEvent?.uuid) {
        // Update ref to match context
        createdEventRef.current = contextEvent
      }
      
      // Don't handle editor routes here - they're handled by App.tsx
      if (path.startsWith('/event/website/editor/')) {
        return
      }
      
      if (path === '/event/create/template') {
        setShowTemplatePage(true)
        setShowNewEventForm(false)
        setShowEventWebsitePage(false)
        setShowPreviewPage(false)
      } else if (path.startsWith('/event/website/preview/')) {
        // Extract pageId from path: /event/website/preview/:pageId
        const pageIdMatch = path.match(/\/event\/website\/preview\/(.+)/)
        const pageId = pageIdMatch ? pageIdMatch[1] : 'welcome'
        // Only show preview if we have a valid event context
        // Use eventToUse which is guaranteed to be in sync
        if (eventToUse?.uuid) {
          setPreviewPageId(pageId)
          setShowPreviewPage(true)
          setShowEventWebsitePage(false)
          setShowTemplatePage(false)
          setShowNewEventForm(false)
        } else {
          setShowPreviewPage(false)
          setPreviewPageId('')
          window.history.pushState({}, '', '/dashboard')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
      } else if (path === '/event/website') {
        // Ensure we have event context before showing event website page
        // Use eventToUse which is guaranteed to be in sync
        if (eventToUse?.uuid) {
          // ok
        } else {
          window.history.pushState({}, '', '/dashboard')
          window.dispatchEvent(new PopStateEvent('popstate'))
          return
        }
        setShowEventWebsitePage(true)
        setShowTemplatePage(false)
        setShowNewEventForm(false)
        setShowPreviewPage(false)
      } else if (path === '/dashboard' || path === '/') {
        setActiveItemId('events')
      } else {
        // Support dashboard sub-routes like /dashboard/team
        if (path.startsWith('/dashboard/')) {
          const sub = path.split('/')[2] || 'events'
          setActiveItemId(sub)
        }
        const wasShowingOtherPages = showTemplatePage || showEventWebsitePage || showPreviewPage
        setShowTemplatePage(false)
        setShowEventWebsitePage(false)
        setShowPreviewPage(false)
        // If navigating back to dashboard from other pages, refresh events
        if ((path === '/dashboard' || path === '/') && wasShowingOtherPages) {
          loadEvents()
        }
      }
    }

    // Check on mount
    checkRoute()

    // Listen for navigation events
    const handleLocationChange = () => {
      checkRoute()
    }

    // Listen for custom event to open form
    const handleOpenForm = () => {
      setShowTemplatePage(false)
      setShowEventWebsitePage(false)
      setShowNewEventForm(true)
    }

    window.addEventListener('locationchange', handleLocationChange)
    window.addEventListener('open-event-form', handleOpenForm)

    return () => {
      window.removeEventListener('locationchange', handleLocationChange)
      window.removeEventListener('open-event-form', handleOpenForm)
    }
  }, []) // Only run on mount - checkRoute reads latest event from ref, not from closure
  
  // Events data - fetched from API
  const [events, setEvents] = useState<Event[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true)
  const [eventsError, setEventsError] = useState<string | null>(null)

  // Fetch events function
  const loadEvents = async () => {
    setIsLoadingEvents(true)
    setEventsError(null)
    
    try {
      const eventDataList = await fetchEvents()
      
      // Sort events by createdAt in descending order (newest first)
      const sortedEventDataList = [...eventDataList].sort((a, b) => {
        // Get creation date from various possible fields
        const getCreationDate = (event: EventData | any): number => {
          // Priority 1: Try created_at (snake_case from API - most common)
          if ((event as any).created_at) {
            const date = new Date((event as any).created_at)
            if (!isNaN(date.getTime())) {
              return date.getTime()
            }
          }
          // Priority 2: Try createdAt (camelCase)
          if (event.createdAt) {
            const date = new Date(event.createdAt)
            if (!isNaN(date.getTime())) {
              return date.getTime()
            }
          }
          // Priority 3: Try created_date
          if ((event as any).created_date) {
            const date = new Date((event as any).created_date)
            if (!isNaN(date.getTime())) {
              return date.getTime()
            }
          }
          // Fallback: Use event_date or startDate if no creation date available
          if ((event as any).event_date) {
            const date = new Date((event as any).event_date)
            if (!isNaN(date.getTime())) {
              return date.getTime()
            }
          }
          if (event.startDate) {
            const date = new Date(event.startDate)
            if (!isNaN(date.getTime())) {
              return date.getTime()
            }
          }
          // If no date found, put at the end (oldest)
          return 0
        }
        
        const dateA = getCreationDate(a)
        const dateB = getCreationDate(b)
        // Descending order: newest first (larger date value comes first)
        return dateB - dateA
      })
      
      // Map API response to Event interface format (already sorted)
      const mappedEvents: Event[] = sortedEventDataList.map((eventData: EventData) => {
        // Map eventExperience to attendanceType
        const attendanceTypeMap: Record<string, 'Online' | 'Offline' | 'Hybrid'> = {
          'virtual': 'Online',
          'in-person': 'Offline',
          'hybrid': 'Hybrid',
        }
        
        // Map status to Live/Draft
        const statusMap: Record<string, 'Live' | 'Draft'> = {
          'Live': 'Live',
          'live': 'Live',
          'Published': 'Live',
          'published': 'Live',
          'Draft': 'Draft',
          'draft': 'Draft',
        }
        
        // Format date
        const formatDate = (dateString?: string): string => {
          if (!dateString) return 'TBD'
          try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return 'TBD'
            return date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })
          } catch {
            return 'TBD'
          }
        }
        
        // Get createdBy from user info or default
        const createdBy = eventData.createdBy || 
                         (eventData as any).created_by || 
                         localStorage.getItem('userEmail')?.split('@')[0] || 
                         'Unknown'
        
        const rawId = eventData.uuid ?? (eventData as any).id ?? (eventData as any).pk
        return {
          id: rawId != null && rawId !== '' ? String(rawId) : '',
          name: eventData.eventName,
          status: statusMap[eventData.status || ''] || 'Draft',
          attendanceType: attendanceTypeMap[eventData.eventExperience || ''] || 'Online',
          registrations: eventData.registrations || 0,
          eventDate: formatDate(eventData.startDate),
          createdBy: createdBy,
          createdAt: eventData.createdAt || (eventData as any).created_at || (eventData as any).created_date,
        }
      })
      
      // Ensure events are still sorted by createdAt after mapping (newest first)
      mappedEvents.sort((a, b) => {
        const getDate = (event: Event): number => {
          if (event.createdAt) {
            const date = new Date(event.createdAt)
            if (!isNaN(date.getTime())) {
              return date.getTime()
            }
          }
          return 0
        }
        const dateA = getDate(a)
        const dateB = getDate(b)
        return dateB - dateA // Descending order (newest first)
      })
      
      setEvents(mappedEvents)
    } catch (error) {
      setEventsError(error instanceof Error ? error.message : 'Failed to load events')
      // Fallback to empty array or default events on error
      setEvents([])
    } finally {
      setIsLoadingEvents(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!eventId) return
    const idToRemove = String(eventId).trim()
    if (!idToRemove) return
    try {
      await deleteEvent(idToRemove)
      setEvents((prev) => prev.filter((e) => String(e.id).trim() !== idToRemove))
      await loadEvents()
      showToast.success('Event deleted')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete event. Please try again.'
      showToast.error(msg)
      throw e
    }
  }

  // Fetch events on mount
  useEffect(() => {
    loadEvents()
  }, [])

  // Track previous path to detect navigation back to dashboard
  const prevPathRef = useRef<string>(window.location.pathname)

  // Refresh events when navigating back to dashboard
  // IMPORTANT: Only refresh when actually on dashboard, NOT when navigating between event pages
  useEffect(() => {
    const checkAndRefresh = () => {
      const currentPath = window.location.pathname
      setRoutePath(currentPath)
      const prevPath = prevPathRef.current

      // Only refresh events if we're actually on the dashboard page
      // Do NOT refresh when navigating between /event/website, /event/website/preview, etc.
      const isOnDashboard = (currentPath === '/dashboard' || currentPath === '/') && 
                            !showTemplatePage && !showEventWebsitePage && !showPreviewPage && !showNewEventForm

      // Only refresh if we're on dashboard AND we came from somewhere else
      // This prevents unnecessary refreshes when navigating between event pages
      if (isOnDashboard && prevPath !== currentPath && 
          (prevPath.startsWith('/event/create') || prevPath.startsWith('/event/website') || prevPath.startsWith('/event/hub'))) {
        loadEvents()
      }

      prevPathRef.current = currentPath
    }

    checkAndRefresh()

    // Listen for navigation events
    const handleLocationChange = () => {
      checkAndRefresh()
    }

    window.addEventListener('locationchange', handleLocationChange)
    
    return () => {
      window.removeEventListener('locationchange', handleLocationChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTemplatePage, showEventWebsitePage, showPreviewPage, showNewEventForm])

  // Helper function to parse event date from format "Jan 13, 2025" to Date object
  const parseEventDate = (dateString: string): Date | null => {
    try {
      const parsed = new Date(dateString)
      if (isNaN(parsed.getTime())) {
        return null
      }
      return parsed
    } catch {
      return null
    }
  }

  // Calculate summary statistics from all events
  const summaryStats = useMemo(() => {
    const totalEvents = events.length
    const liveEvents = events.filter(event => event.status === 'Live').length
    const eventDrafts = events.filter(event => event.status === 'Draft').length
    
    return {
      totalEvents,
      liveEvents,
      eventDrafts
    }
  }, [events])

  // Filter events based on search query and date range
  const filteredEvents = useMemo(() => {
    let filtered = events

    // Apply date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((event) => {
        const eventDate = parseEventDate(event.eventDate)
        if (!eventDate) return false
        
        // Set time to start of day for accurate comparison
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
        const startDate = dateRange.start!
        const endDate = dateRange.end!
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
        
        return eventDateOnly >= startDateOnly && eventDateOnly <= endDateOnly
      })
    }

    // Apply search filter
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase().trim()
      
      filtered = filtered.filter((event) => {
        // Search across multiple fields: name, status, attendanceType, createdBy, eventDate, registrations
        const matchesName = event.name.toLowerCase().includes(searchLower)
        const matchesStatus = event.status.toLowerCase().includes(searchLower)
        const matchesAttendanceType = event.attendanceType.toLowerCase().includes(searchLower)
        const matchesCreatedBy = event.createdBy.toLowerCase().includes(searchLower)
        const matchesEventDate = event.eventDate.toLowerCase().includes(searchLower)
        const matchesRegistrations = event.registrations.toString().includes(searchLower)
        
        return (
          matchesName ||
          matchesStatus ||
          matchesAttendanceType ||
          matchesCreatedBy ||
          matchesEventDate ||
          matchesRegistrations
        )
      })
    }

    return filtered
  }, [events, searchValue, dateRange])

  const handleSidebarItemClick = (itemId: string, pathOverride?: string) => {
    setActiveItemId(itemId)
    onSidebarItemClick?.(itemId)
    // Close sidebar on mobile when item is clicked
    setIsSidebarOpen(false)

    // Ensure "Events" always returns to the main dashboard content area
    // Close any overlays/pages
    setShowNewEventForm(false)
    setShowTemplatePage(false)
    setShowEventWebsitePage(false)
    setShowPreviewPage(false)
    setPreviewPageId('')

    // Update URL to reflect dashboard section
    const nextPath = pathOverride || getDashboardPathForItem(itemId)
    window.history.pushState({}, '', nextPath)
    // pushState does not trigger popstate
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleNewEventClick = () => {
    setShowNewEventForm(true)
    onNewEventClick?.()
  }

  const handleFormClose = () => {
    setShowNewEventForm(false)
  }

  const handleFormSubmit = (_data: EventFormData) => {
    // TODO: Handle form submission (e.g., API call)
    setShowNewEventForm(false)
    onNewEventClick?.()
  }

  const handleEventRowClick = async (event: Event) => {
    try {
      // Fetch event details by UUID (assuming event.id is the UUID)
      const eventData = await fetchEvent(event.id)
      
      // Convert EventData to CreateEventResponseData format for context
      // EventData already contains all required fields, so we can cast it directly
      const createdEventData: CreateEventResponseData = {
        ...eventData
      }
      
      // Set event in context - this updates both state and localStorage synchronously
      // IMPORTANT: This must happen BEFORE navigation to ensure context is updated
      setCreatedEvent(createdEventData)
      
      // Immediately update the ref synchronously (don't wait for effect)
      createdEventRef.current = createdEventData
      
      // Verify localStorage was updated
      const storedEvent = localStorage.getItem('created-event')
      if (storedEvent) {
        const parsed = JSON.parse(storedEvent)
        if (parsed.uuid !== createdEventData.uuid) {
          // ignore mismatch (will be corrected by next navigation)
        }
      }
      
      // Small delay to ensure context update propagates before navigation
      // This prevents race conditions when switching events quickly
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Navigate to event website page
      window.history.pushState({}, '', '/event/website')
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (error) {
      // Error is already handled in fetchEvent with toast
    }
  }

  // Use routePath as the source of truth for what is rendered.
  // This prevents stale boolean flags from showing the wrong page (e.g., URL=/dashboard but website page still mounted).
  const pathname = routePath
  const shouldRenderPreview = pathname.startsWith('/event/website/preview/')
  const shouldRenderWebsite = pathname === '/event/website'
  const shouldRenderTemplate = pathname === '/event/create/template'

  // Show preview page
  if (showPreviewPage && shouldRenderPreview) {
    return (
      <WebsitePreviewPage
        pageId={previewPageId}
        onBackClick={() => {
          // Clear preview state first
          setShowPreviewPage(false)
          setPreviewPageId('')
          // Navigate back to event website page - preserve event context
          window.history.pushState({}, '', '/event/website')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }}
        userAvatarUrl={userAvatarUrl}
      />
    )
  }

  // Show event website page
  if (showEventWebsitePage && shouldRenderWebsite) {
    return (
      <EventWebsitePage
        onBackClick={() => {
          // Close the website view immediately (don't rely on route listeners)
          setShowEventWebsitePage(false)
          setShowPreviewPage(false)
          setShowTemplatePage(false)
          setShowNewEventForm(false)
          setPreviewPageId('')
          setActiveItemId('events')

          window.history.pushState({}, '', '/dashboard')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }}
        userAvatarUrl={userAvatarUrl}
      />
    )
  }

  // Show template selection page
  if (showTemplatePage && shouldRenderTemplate) {
    return <TemplateSelectionPage />
  }

  // Show form overlay if form is open
  if (showNewEventForm) {
    return (
      <NewEventForm
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <DashboardSidebar
        organizationName={organizationName}
        activeItemId={activeItemId}
        onItemClick={handleSidebarItemClick}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Navbar */}
      <DashboardNavbar
        title={title}
        onSearchClick={onSearchClick}
        onNotificationClick={onNotificationClick}
        onProfileClick={onProfileClick}
        onLogout={onLogout}
        onNewEventClick={handleNewEventClick}
        userAvatarUrl={userAvatarUrl}
        userEmail={userEmail}
        onMenuClick={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />


      {/* Main Content */}
      <main className="lg:ml-[250px] mt-16 p-4 sm:p-6">
        {activeItemId === 'team' ? (
          <TeamManagementPage />
        ) : activeItemId !== 'events' ? (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-900">Coming soon</div>
              <div className="mt-1 text-sm text-slate-500">This section hasn’t been implemented yet.</div>
            </div>
          </div>
        ) : isLoadingEvents ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6938EF] mb-4"></div>
              <p className="text-slate-600">Loading events...</p>
            </div>
          </div>
        ) : eventsError ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-600 mb-2">Error loading events</p>
              <p className="text-slate-600 text-sm">{eventsError}</p>
            </div>
          </div>
        ) : (
          <DashboardContent
            title={title}
            onNewEventClick={handleNewEventClick}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onEditEvent={onEditEvent}
            onDeleteEvent={handleDeleteEvent}
            onEventRowClick={handleEventRowClick}
            onSortEvents={onSortEvents}
            events={filteredEvents}
            totalEvents={summaryStats.totalEvents}
            liveEvents={summaryStats.liveEvents}
            eventDrafts={summaryStats.eventDrafts}
          />
        )}
      </main>
    </div>
  )
}

export default DashboardLayout

