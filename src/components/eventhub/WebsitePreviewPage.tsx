import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useEventForm } from '../../contexts/EventFormContext'
import { useWebsitePages } from '../../contexts/WebsitePagesContext'
import { NavigationProvider } from '../../contexts/NavigationContext'
import EventHubNavbar from './EventHubNavbar'
import PageSidebar from '../page/PageSidebar'
import HeroSection from '../advanced/HeroSection'
import AboutSection from '../advanced/AboutSection'
import SpeakersSection from '../advanced/SpeakersSection'
import RegistrationCTA from '../advanced/RegistrationCTA'
import Sponsors from '../advanced/Sponsors'
import FAQAccordion from '../advanced/FAQAccordion'
import ContactFooter from '../advanced/ContactFooter'
import SchedulePage from '../advanced/SchedulePage'
import { Edit05 } from '@untitled-ui/icons-react'
import Input from '../ui/untitled/Input'
import PageCreationModal, { type PageType } from '../page/PageCreationModal'
import {
  fetchWebpage,
  fetchWebpages,
  fetchWebsitePageConfigs,
  fetchWebsitePageConfigDetail,
  fetchNavigationContent,
  type WebpageData,
  type NavigationContentData,
} from '../../services/webpageService'
import Preview from '../shared/Preview'
import type { PageData } from '../../types'
import { fetchParticipants } from '../../services/participantService'
import PublicScheduleSessionsPage from '../public/schedule/PublicScheduleSessionsPage'
import { API_ENDPOINTS } from '../../config/env'
import { showToast } from '../../utils/toast'
import { fetchUserTags } from '../../services/communicationService'

interface WebsitePreviewPageProps {
  pageId: string
  onBackClick?: () => void
  userAvatarUrl?: string
}

type CmsPreviewSection = 'webpage' | 'participants' | 'schedule-sessions'

const getDefaultSettings = () => ({
  title: '',
  icon: 'user',
  desktopMaxWidth: '700',
  desktopMaxWidthUnit: 'px',
  browser: 'app' as 'app' | 'browser',
  featurePermission: 'everyone' as 'everyone' | 'logged-in' | 'guests' | 'groups',
  allowedGroups: [] as string[],
  visibility: 'show' as 'show' | 'show-no-access' | 'hide',
  hideOnMobile: false,
  hideOnWebsite: false,
  showFeatureInMenu: false,
  setAsDesktopHome: true,
  setAsMobileHome: false
})

const getPreviewSectionFromSearch = (): CmsPreviewSection => {
  const section = new URLSearchParams(window.location.search).get('section')
  if (section === 'participants') return 'participants'
  if (section === 'schedule-sessions') return 'schedule-sessions'
  return 'webpage'
}

const CmsParticipantsPreview: React.FC<{ eventUuid: string; tagId: string }> = ({ eventUuid, tagId }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsLoading(true)
      try {
        const result = await fetchParticipants(eventUuid, 1, tagId, undefined, 100)
        if (!cancelled) setParticipants(Array.isArray(result?.data) ? result.data : [])
      } catch {
        if (!cancelled) setParticipants([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [eventUuid, tagId])

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading participants...</div>
  }
  if (participants.length === 0) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No participants found for this group.</div>
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
        Participants ({participants.length})
      </div>
      <div className="divide-y divide-slate-100">
        {participants.map((p, idx) => {
          const name = String(p?.name ?? [p?.first_name, p?.last_name].filter(Boolean).join(' ') ?? 'Unknown').trim() || 'Unknown'
          const subtitle = [p?.designation ?? p?.post, p?.organization ?? p?.company].filter(Boolean).join(' • ')
          return (
            <div key={String(p?.uuid ?? p?.id ?? idx)} className="px-4 py-3">
              <div className="text-sm font-medium text-slate-900">{name}</div>
              {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const WebsitePreviewPage: React.FC<WebsitePreviewPageProps> = ({
  pageId,
  onBackClick,
  userAvatarUrl
}) => {
  const { eventData, createdEvent } = useEventForm()
  const { pages: websitePages } = useWebsitePages()
  const [bannerUrl, setBannerUrl] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') === 'settings' ? 'settings' : 'preview'
  })
  const [previewSection, setPreviewSection] = useState<CmsPreviewSection>(() => getPreviewSectionFromSearch())
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [webpageData, setWebpageData] = useState<WebpageData | null>(null)
  const [isLoadingWebpage, setIsLoadingWebpage] = useState(false)
  const [webpageError, setWebpageError] = useState<string | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const isFetchingRef = React.useRef(false)
  const lastFetchedPageRef = React.useRef<string | null>(null)
  const currentPageRef = React.useRef<string | null>(null)
  
  // Fetch actual webpages from backend for sidebar
  const [webpages, setWebpages] = useState<WebpageData[]>([])
  const [navContent, setNavContent] = useState<NavigationContentData>({ pages: [], participant_groups: [], schedules: [] })
  const [isLoadingWebpages, setIsLoadingWebpages] = useState(false)

  // Prioritize createdEvent data from API, fallback to eventData from form
  // Use useMemo to ensure we always get the latest value and prevent stale reads
  const displayEventName = useMemo(() => {
    const name = createdEvent?.eventName || eventData?.eventName
    return name
  }, [createdEvent?.eventName, createdEvent?.uuid, eventData?.eventName])
  const eventStatus = (createdEvent as { status?: string } | null)?.status ?? (eventData as { status?: string } | null)?.status
  const displayStartDate = createdEvent?.startDate || eventData?.startDate
  const displayLocation = createdEvent?.location || eventData?.location
  
  // Fetch webpages from backend for sidebar
  useEffect(() => {
    const loadWebpages = async () => {
      if (!createdEvent?.uuid) {
        setWebpages([])
        return
      }

      setIsLoadingWebpages(true)
      try {
        console.log('📋 [WebsitePreviewPage] Fetching webpages for sidebar...')
        const [fetchedWebpages, fetchedNavContent] = await Promise.all([
          fetchWebpages(createdEvent.uuid),
          fetchNavigationContent(createdEvent.uuid),
        ])
        console.log('📋 [WebsitePreviewPage] Fetched webpages:', fetchedWebpages.length, 'pages')
        console.log('📋 [WebsitePreviewPage] Webpage names:', fetchedWebpages.map(w => w.name))
        setWebpages(fetchedWebpages)
        setNavContent(fetchedNavContent)
      } catch (error) {
        console.error('❌ [WebsitePreviewPage] Error fetching webpages:', error)
        setWebpages([])
        setNavContent({ pages: [], participant_groups: [], schedules: [] })
      } finally {
        setIsLoadingWebpages(false)
      }
    }

    loadWebpages()
  }, [createdEvent?.uuid])

  // Listen for webpage-saved events to refresh the list
  useEffect(() => {
    const handleWebpageSaved = (event: CustomEvent) => {
      const { eventUuid } = event.detail
      if (eventUuid === createdEvent?.uuid) {
        console.log('🔄 [WebsitePreviewPage] Webpage saved, refreshing sidebar...')
        // Reload webpages
        const loadWebpages = async () => {
          if (!createdEvent?.uuid) return
          try {
            const [fetchedWebpages, fetchedNavContent] = await Promise.all([
              fetchWebpages(createdEvent.uuid),
              fetchNavigationContent(createdEvent.uuid),
            ])
            setWebpages(fetchedWebpages)
            setNavContent(fetchedNavContent)
          } catch (error) {
            console.error('❌ [WebsitePreviewPage] Error refreshing webpages:', error)
          }
        }
        loadWebpages()
      }
    }

    window.addEventListener('webpage-saved', handleWebpageSaved as EventListener)
    return () => {
      window.removeEventListener('webpage-saved', handleWebpageSaved as EventListener)
    }
  }, [createdEvent?.uuid])

  // Convert fetched webpages + nav content to PageSidebar items (preview-only).
  const pages = useMemo(() => {
    const mappedPages = [
      ...webpages.map(webpage => ({
        id: webpage.uuid,
        name: webpage.name,
        section: 'webpage' as CmsPreviewSection,
      })),
      ...(navContent.participant_groups ?? []).map((group: any) => ({
        id: String(group?.ref_uuid ?? group?.uuid ?? ''),
        name: String(group?.title ?? group?.name ?? 'Untitled'),
        section: 'participants' as CmsPreviewSection,
      })),
      ...(navContent.schedules ?? []).map((schedule: any) => ({
        id: String(schedule?.ref_uuid ?? schedule?.uuid ?? ''),
        name: String(schedule?.title ?? schedule?.name ?? 'Untitled'),
        section: 'schedule-sessions' as CmsPreviewSection,
      })),
    ].filter((p) => p.id)
    console.log('📋 [WebsitePreviewPage] Pages array updated:', mappedPages.length, 'pages:', mappedPages.map(p => p.name))
    return mappedPages
  }, [webpages, navContent])
  
  const [currentPage, setCurrentPage] = useState<string | null>(null)
  
  // Initialize ref with initial currentPage value (only once)
  React.useEffect(() => {
    if (currentPageRef.current === null && currentPage) {
      currentPageRef.current = currentPage
    }
  }, []) // Only run once on mount
  const [isPageModalOpen, setIsPageModalOpen] = useState(false)
  
  // Settings form state
  const [settings, setSettings] = useState(getDefaultSettings)
  const [availableGroups, setAvailableGroups] = useState<Array<{ uuid: string; name: string }>>([])
  const [isGroupsDropdownOpen, setIsGroupsDropdownOpen] = useState(false)
  const groupsDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isGroupsDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (groupsDropdownRef.current && !groupsDropdownRef.current.contains(e.target as Node)) {
        setIsGroupsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isGroupsDropdownOpen])

  // Fetch available user groups for the Groups dropdown
  useEffect(() => {
    const eventUuid = createdEvent?.uuid
    if (!eventUuid) return
    fetchUserTags(eventUuid)
      .then((tags) => setAvailableGroups(Array.isArray(tags) ? tags : []))
      .catch(() => setAvailableGroups([]))
  }, [createdEvent?.uuid])

  // Load banner from localStorage or eventData
  useEffect(() => {
    // First, try to get banner from eventData (if it's still a File)
    if (eventData?.banner && eventData.banner instanceof File) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        setBannerUrl(dataUrl)
        localStorage.setItem('event-form-banner', dataUrl)
      }
      reader.onerror = () => {
        // Error reading banner file
      }
      reader.readAsDataURL(eventData.banner)
    } else {
      // Otherwise, try to load from localStorage
      const storedBanner = localStorage.getItem('event-form-banner')
      if (storedBanner) {
        setBannerUrl(storedBanner)
      }
    }
  }, [eventData])

  // Track if page selection was manual (from sidebar click) vs automatic (from URL)
  const manualSelectionRef = React.useRef(false)

  // Keep ref in sync with currentPage state
  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  // Initialize currentPage from pageId or first page when pages are loaded
  useEffect(() => {
    const sectionFromUrl = getPreviewSectionFromSearch()
    setPreviewSection(sectionFromUrl)

    if (sectionFromUrl !== 'webpage') {
      // For CMS participant/schedule previews, use route pageId directly.
      if (pageId && pageId !== currentPage) {
        setCurrentPage(pageId)
        currentPageRef.current = pageId
      }
      return
    }

    // Skip if this is a manual selection (handled by handlePageSelect)
    if (manualSelectionRef.current) {
      manualSelectionRef.current = false
      return
    }

    // If we already have a currentPage, don't override it unless pageId changed
    if (currentPage) {
      // Only update if pageId from URL is different and valid
      if (pageId && pageId !== currentPage && pages.some(p => p.id === pageId)) {
        console.log('📋 [WebsitePreviewPage] Updating current page from URL pageId:', pageId)
        setCurrentPage(pageId)
        currentPageRef.current = pageId
      }
      return
    }

    // No currentPage set yet - initialize it
    if (pageId && pages.some(p => p.id === pageId)) {
      // pageId from URL should be a UUID from the backend
      console.log('📋 [WebsitePreviewPage] Setting current page from URL pageId:', pageId)
      setCurrentPage(pageId)
      currentPageRef.current = pageId
    } else if (pages.length > 0) {
      // If no pageId in URL, use first page from fetched webpages
      console.log('📋 [WebsitePreviewPage] Setting current page to first page:', pages[0].id, pages[0].name)
      setCurrentPage(pages[0].id)
      currentPageRef.current = pages[0].id
    }
  }, [pageId, pages, currentPage])

  // Fetch webpage data when currentPage changes and event UUID is available
  useEffect(() => {
    if (previewSection !== 'webpage') {
      setIsLoadingWebpage(false)
      setWebpageError(null)
      setWebpageData(null)
      return
    }

    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const loadWebpage = async () => {
      // Use ref to get the latest currentPage value (avoids stale closure issues)
      // Always prioritize currentPage (from sidebar selection) over pageId (from URL)
      // This ensures sidebar clicks work correctly and state is consistent
      const latestCurrentPage = currentPageRef.current || currentPage
      const pageToLoad = latestCurrentPage || pageId
      
      if (!pageToLoad || !createdEvent?.uuid) {
        console.log('⚠️ [WebsitePreviewPage] Cannot load webpage:', { 
          currentPage, 
          pageId, 
          pageToLoad, 
          hasEventUuid: !!createdEvent?.uuid 
        })
        setWebpageData(null)
        setWebpageError(null)
        return
      }

      // Skip if we're already fetching the same page
      if (isFetchingRef.current && lastFetchedPageRef.current === pageToLoad) {
        console.log('⏸️ [WebsitePreviewPage] Already fetching this page, skipping duplicate call')
        return
      }

      // Only skip if we have data for this exact page
      if (lastFetchedPageRef.current === pageToLoad && webpageData && webpageData.uuid === pageToLoad) {
        console.log('⏸️ [WebsitePreviewPage] Already have data for this page, skipping fetch')
        return
      }

      console.log('📥 [WebsitePreviewPage] Loading webpage data for:', pageToLoad)
      console.log('📥 [WebsitePreviewPage] Source:', latestCurrentPage ? 'currentPage (sidebar)' : 'pageId (URL)')
      console.log('📥 [WebsitePreviewPage] Current state:', { 
        currentPage, 
        currentPageRef: currentPageRef.current,
        latestCurrentPage: latestCurrentPage,
        pageId, 
        pageToLoad 
      })
      console.log('📥 [WebsitePreviewPage] Last fetched page:', lastFetchedPageRef.current)

      // Check if pageToLoad looks like a real UUID from API (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      // Real UUIDs are 36 characters with dashes in specific positions and all hex characters
      const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageToLoad)
      
      // Locally generated IDs (like page-page-2-1769232008926) are NOT real UUIDs
      // They should not trigger a fetch - they need to be saved first to get a real UUID
      if (!isRealUuid) {
        console.log('⚠️ [WebsitePreviewPage] Page ID is not a real UUID, cannot fetch:', pageToLoad)
        console.log('⚠️ [WebsitePreviewPage] This page needs to be saved first to get a UUID from the server')
        setWebpageData(null)
        setWebpageError('This page has not been saved yet. Please save it in the editor first.')
        return
      }

      // Create new abort controller for this request
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      isFetchingRef.current = true

      setIsLoadingWebpage(true)
      setWebpageError(null)
      
      try {
        console.log('📥 [WebsitePreviewPage] Fetching webpage from API:', pageToLoad)
        const fetchedWebpage = await fetchWebpage(pageToLoad, createdEvent.uuid)
        console.log('✅ [WebsitePreviewPage] Webpage fetched successfully:', {
          uuid: fetchedWebpage.uuid,
          name: fetchedWebpage.name,
          slug: fetchedWebpage.slug,
          hasContent: !!fetchedWebpage.content,
          contentKeys: fetchedWebpage.content ? Object.keys(fetchedWebpage.content) : []
        })
        
        // Log the full content structure for debugging
        if (fetchedWebpage.content) {
          console.log('📦 [WebsitePreviewPage] Full content structure:', JSON.stringify(fetchedWebpage.content, null, 2))
        }
        
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return
        }
        
        // Validate that the webpage belongs to the current event
        if (fetchedWebpage.event && fetchedWebpage.event !== createdEvent.uuid) {
          const errorMessage = `This webpage belongs to a different event. Please select the correct event to view this webpage.`
          setWebpageError(errorMessage)
          setWebpageData(null)
          // Redirect back to event website page after a short delay
          setTimeout(() => {
            window.history.pushState({}, '', '/event/website')
            window.dispatchEvent(new PopStateEvent('popstate'))
          }, 2000)
          return
        }
        
        setWebpageData(fetchedWebpage)
        lastFetchedPageRef.current = pageToLoad
        console.log('✅ [WebsitePreviewPage] Webpage data set, should trigger render')
        console.log('✅ [WebsitePreviewPage] Last fetched page updated to:', pageToLoad)
      } catch (error) {
        // Don't handle errors if request was aborted
        if (abortController.signal.aborted) {
          return
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to load webpage'
        setWebpageError(errorMessage)
        setWebpageData(null)
        
        // If it's a 404 error, redirect back to event website page after a delay
        if (error instanceof Error && error.message.includes('not found')) {
          setTimeout(() => {
            window.history.pushState({}, '', '/event/website')
            window.dispatchEvent(new PopStateEvent('popstate'))
          }, 3000)
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingWebpage(false)
        }
        isFetchingRef.current = false
        abortControllerRef.current = null
      }
    }

    loadWebpage()

    // Cleanup: abort request if component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      isFetchingRef.current = false
    }
  }, [currentPage, pageId, createdEvent?.uuid, previewSection])

  const handleSearchClick = () => {
    // TODO: Implement search functionality
  }

  const handleNotificationClick = () => {
    // TODO: Implement notification functionality
  }

  const handleProfileClick = () => {
    // Profile handled by EventHubNavbar dropdown
  }

  const handleBack = () => {
    // Navigate back to Event Website management page (event-hub with event-website section)
    window.history.pushState({ section: 'event-website' }, '', '/event/hub?section=event-website')
    window.dispatchEvent(new PopStateEvent('popstate'))
    if (onBackClick) {
      onBackClick()
    }
  }

  // Memoize handleEdit to prevent re-renders
  const handleEdit = useCallback(() => {
    // Navigate to editor for this page
    window.history.pushState({}, '', `/event/website/editor/${currentPage}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [currentPage])

  const handlePageSelect = (pageId: string) => {
    console.log('📋 [WebsitePreviewPage] ==========================================')
    console.log('📋 [WebsitePreviewPage] Page selected from sidebar:', pageId)
    console.log('📋 [WebsitePreviewPage] Current page before selection:', currentPage)
    console.log('📋 [WebsitePreviewPage] Available pages:', pages.map(p => ({ id: p.id, name: p.name })))
    
    // Don't do anything if clicking the same page
    if (pageId === currentPage) {
      console.log('📋 [WebsitePreviewPage] Same page selected, skipping')
      return
    }
    
    // Find the page to verify it exists
    const selectedPage = pages.find(p => p.id === pageId)
    if (!selectedPage) {
      console.error('❌ [WebsitePreviewPage] Selected page not found in pages list:', pageId)
      return
    }
    console.log('📋 [WebsitePreviewPage] Selected page found:', selectedPage)
    
    // Mark this as a manual selection to prevent URL sync from overriding it
    manualSelectionRef.current = true
    
    // Update current page state and ref immediately
    setCurrentPage(pageId)
    currentPageRef.current = pageId
    const nextSection = (selectedPage as any).section as CmsPreviewSection
    setPreviewSection(nextSection)
    console.log('📋 [WebsitePreviewPage] currentPage state updated to:', pageId)
    console.log('📋 [WebsitePreviewPage] currentPageRef updated to:', pageId)
    
    // Update URL to match the selected page (preserve tab, include section for non-webpages)
    const params = new URLSearchParams()
    if (nextSection !== 'webpage') params.set('section', nextSection)
    if (activeTab === 'settings') params.set('tab', 'settings')
    const qs = params.toString()
    const newUrl = `/event/website/preview/${pageId}${qs ? `?${qs}` : ''}`
    console.log('📋 [WebsitePreviewPage] Updating URL to:', newUrl)
    window.history.pushState({}, '', newUrl)
    
    // Clear previous webpage data and reset fetch tracking to force reload
    setWebpageData(null)
    setWebpageError(null)
    lastFetchedPageRef.current = null
    console.log('📋 [WebsitePreviewPage] Cleared previous data, reset fetch tracking')
    
    console.log('📋 [WebsitePreviewPage] Page selection complete, useEffect should trigger fetch')
    console.log('📋 [WebsitePreviewPage] ==========================================')
  }

  const handleAddPage = () => {
    // TODO: Implement add page functionality
  }

  const handleNewPage = () => {
    setIsPageModalOpen(true)
  }

  const handlePageTypeSelect = (pageType: PageType) => {
    // TODO: Implement page creation based on selected type
    setIsPageModalOpen(false)
  }

  const handleManagePages = () => {
    // Navigate back to Event Website management page
    handleBack()
  }

  const handleSaveSettings = useCallback(async () => {
    const eventUuid = createdEvent?.uuid
    if (!eventUuid || !currentPage) {
      showToast.error('Please select a page before saving configuration.')
      return
    }

    const params = new URLSearchParams(window.location.search)
    const configUuid = params.get('configUuid')
    if (!configUuid) {
      showToast.error('Page configuration ID is missing. Please reopen from Configuration tab.')
      return
    }

    const accessToken = localStorage.getItem('accessToken')
    const organizationUuid = localStorage.getItem('organizationUuid')
    if (!accessToken || !organizationUuid) {
      showToast.error('Authentication required. Please login again.')
      return
    }

    const browserValue = settings.browser === 'app' ? 'in_app' : 'in_browser'
    const permissionMap: Record<string, string> = {
      everyone: 'everyone',
      'logged-in': 'logged_in',
      guests: 'guests',
      groups: 'certain_groups',
    }

    setIsSavingSettings(true)
    try {
      const response = await fetch(API_ENDPOINTS.WEBSITE.PAGE_CONFIG_DETAIL(configUuid, eventUuid), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Organization': organizationUuid,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: settings.title,
          icon: settings.icon,
          desktop_container_max_width: Number(settings.desktopMaxWidth || 700),
          desktop_container_unit: settings.desktopMaxWidthUnit || 'px',
          browser: browserValue,
          feature_permission: permissionMap[settings.featurePermission] ?? 'everyone',
          allowed_groups: settings.allowedGroups,
          visibility: settings.visibility === 'show-no-access' ? 'show_without_access' : settings.visibility,
          hide_on_mobile: settings.hideOnMobile,
          hide_on_website: settings.hideOnWebsite ?? false,
          show_in_mobile_menu_without_access: settings.showFeatureInMenu,
          is_desktop_home: settings.setAsDesktopHome,
          is_mobile_home: settings.setAsMobileHome,
        }),
      })

      if (!response.ok) {
        const message = await response.text().catch(() => '')
        throw new Error(message || 'Failed to save page configuration.')
      }

      showToast.success('Page configuration saved.')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to save page configuration.')
    } finally {
      setIsSavingSettings(false)
    }
  }, [createdEvent?.uuid, currentPage, settings])

  useEffect(() => {
    const eventUuid = createdEvent?.uuid
    if (!eventUuid || !currentPage) return
    let cancelled = false
    setSettings(getDefaultSettings())

    const applyRow = (row: any) => {
      if (!row || cancelled) return
      const firstNonEmpty = (...vals: any[]) => {
        for (const v of vals) {
          const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
          if (s) return s
        }
        return ''
      }

      setSettings((prev) => ({
        ...prev,
        title: firstNonEmpty(row.title, row.resource_title, prev.title),
        icon: String(row.icon ?? prev.icon ?? 'user'),
        desktopMaxWidth: String(row.desktop_container_max_width ?? prev.desktopMaxWidth ?? '700'),
        desktopMaxWidthUnit: String(row.desktop_container_unit ?? prev.desktopMaxWidthUnit ?? 'px'),
        browser: String(row.browser ?? '').toLowerCase() === 'in_browser' ? 'browser' : 'app',
        featurePermission:
          String(row.feature_permission ?? '').toLowerCase() === 'logged_in'
            ? 'logged-in'
            : String(row.feature_permission ?? '').toLowerCase() === 'guests'
              ? 'guests'
              : String(row.feature_permission ?? '').toLowerCase() === 'certain_groups'
                ? 'groups'
                : 'everyone',
        visibility:
          String(row.visibility ?? '').toLowerCase() === 'show_without_access'
            ? 'show-no-access'
            : String(row.visibility ?? '').toLowerCase() === 'hide'
              ? 'hide'
              : 'show',
        allowedGroups: Array.isArray(row.allowed_groups) ? row.allowed_groups : [],
        hideOnMobile: Boolean(row.hide_on_mobile),
        hideOnWebsite: Boolean(row.hide_on_website),
        showFeatureInMenu: Boolean(row.show_in_mobile_menu_without_access),
        setAsDesktopHome: Boolean(row.is_desktop_home),
        setAsMobileHome: Boolean(row.is_mobile_home),
      }))
    }

    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const configUuid = params.get('configUuid')

        if (configUuid) {
          const detail = await fetchWebsitePageConfigDetail(configUuid, eventUuid)
          applyRow(detail)
          return
        }

        const rows = await fetchWebsitePageConfigs(eventUuid)
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return

        const expectedType =
          previewSection === 'participants'
            ? 'participant_group'
            : previewSection === 'schedule-sessions'
              ? 'schedule'
              : 'page'

        const row = rows.find((r: any) =>
          String(r?.resource_uuid ?? r?.uuid ?? '') === String(currentPage) &&
          String(r?.item_type ?? '') === expectedType
        ) || rows.find((r: any) => String(r?.resource_uuid ?? r?.uuid ?? '') === String(currentPage))

        applyRow(row)
      } catch {
        // Keep local defaults if config fetch fails.
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [createdEvent?.uuid, currentPage, previewSection])

  // Format date for display
  const formatEventDate = () => {
    if (!displayStartDate) return 'Jan 13, 2025'
    try {
      const date = new Date(displayStartDate)
      if (isNaN(date.getTime())) return 'Jan 13, 2025'
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return 'Jan 13, 2025'
    }
  }

  // Default speakers data
  const defaultSpeakers = [
    {
      name: 'Speaker Name',
      title: 'Speaker Title',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
    },
    {
      name: 'Speaker Name',
      title: 'Speaker Title',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
    },
    {
      name: 'Speaker Name',
      title: 'Speaker Title',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
    }
  ]


  // Get current page data from fetched webpages (not context)
  const currentPageEntry = pages.find((p) => p.id === currentPage)
  const currentPageName = currentPageEntry?.name || 'Welcome'
  const currentPageData = webpages.find(w => w.uuid === currentPage)
  const pageType = (currentPageData as any)?.type
  const pageComponent = (currentPageData as any)?.component
  console.log('📋 [WebsitePreviewPage] Current page data:', { 
    currentPage, 
    currentPageName, 
    found: !!currentPageData,
    totalWebpages: webpages.length
  })

  // Render default template components
  const defaultTemplateJSX = useMemo(() => (
    <div className="w-full bg-white">
      {/* Hero Section */}
      <div className="w-full">
        <HeroSection
          title={displayEventName || 'HIC 2025'}
          subtitle={`${displayLocation || 'New York, NY'} | ${formatEventDate()}`}
          buttons={[
            {
              text: 'Register Now',
              link: '#register',
              color: '#6938EF',
              textColor: 'white',
              size: 'large'
            }
          ]}
          backgroundColor="#1a1a1a"
          textColor="#FFFFFF"
          backgroundImage={bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80'}
          height="500px"
          alignment="center"
          overlayOpacity={0.4}
        />
      </div>

      {/* About Section */}
      <div className="w-full">
        <AboutSection
          leftTitle="About Event"
          leftText="We are dedicated to providing innovative solutions that help our clients achieve their goals and drive success in their respective industries."
        />
      </div>

      {/* Speakers Section */}
      <div className="w-full">
        <SpeakersSection 
          speakers={defaultSpeakers}
          title="Speakers"
          showTitle={true}
          containerMaxWidth="max-w-7xl"
          containerPadding="px-8 py-8"
        />
      </div>

      {/* Registration CTA */}
      <div className="w-full">
        <RegistrationCTA />
      </div>

      {/* Sponsors Section */}
      <div className="w-full">
        <Sponsors />
      </div>

      {/* FAQ Accordion */}
      <div className="w-full">
        <FAQAccordion
          title="Frequently Asked Questions"
          description="Everything you need to know about the product and billing. Can't find the answer you're looking for? Please chat to our friendly team"
          containerMaxWidth="max-w-7xl"
          containerPadding="px-8 py-8"
        />
      </div>

      {/* Contact Footer */}
      <div className="w-full">
        <ContactFooter />
      </div>
    </div>
  ), [eventData, bannerUrl, defaultSpeakers])

  // Extract page data from webpage content structure
  // When we fetch a webpage by UUID, the content structure is: { "pageId": { "title": "...", "slug": "...", "data": { "slug": { "root": {...}, "content": [...], "zones": {} } } } }
  // Each webpage should have exactly ONE key in its content (the pageId used when saving)
  const extractPageData = useCallback((webpageContent: any, targetPageId?: string, targetPageName?: string, webpageSlug?: string): PageData | null => {
    if (!webpageContent || typeof webpageContent !== 'object') {
      console.log('⚠️ [WebsitePreviewPage] extractPageData: Invalid content', webpageContent)
      return null
    }

    const pageKeys = Object.keys(webpageContent)
    console.log('📦 [WebsitePreviewPage] extractPageData: Content structure keys:', pageKeys)
    console.log('📦 [WebsitePreviewPage] extractPageData: Looking for page:', { targetPageId, targetPageName, webpageSlug })

    if (pageKeys.length === 0) {
      console.log('⚠️ [WebsitePreviewPage] extractPageData: No page keys found')
      return null
    }

    // Since each webpage fetched by UUID should have exactly one key, we can use the first key directly
    // However, we'll still try to match if multiple keys exist (shouldn't happen but handle gracefully)
    let pageKey: string | null = null
    let pageData: any = null

    // If there's only one key, use it directly (most common case)
    if (pageKeys.length === 1) {
      pageKey = pageKeys[0]
      pageData = webpageContent[pageKey]
      console.log('📦 [WebsitePreviewPage] extractPageData: Single key found, using directly:', pageKey)
    } else {
      // Multiple keys (shouldn't happen, but handle it)
      // Try to match by UUID first
      if (targetPageId && pageKeys.includes(targetPageId)) {
        pageKey = targetPageId
        pageData = webpageContent[targetPageId]
        console.log('📦 [WebsitePreviewPage] extractPageData: Matched by UUID:', targetPageId)
      } 
      // Try to match by webpage slug
      else if (webpageSlug && pageKeys.includes(webpageSlug)) {
        pageKey = webpageSlug
        pageData = webpageContent[webpageSlug]
        console.log('📦 [WebsitePreviewPage] extractPageData: Matched by webpage slug:', webpageSlug)
      }
      // Try to match by slug derived from page name
      else if (targetPageName) {
        const targetSlug = targetPageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        if (pageKeys.includes(targetSlug)) {
          pageKey = targetSlug
          pageData = webpageContent[targetSlug]
          console.log('📦 [WebsitePreviewPage] extractPageData: Matched by name-derived slug:', targetSlug)
        }
      }
      // Try to find by checking the slug inside each page's data
      if (!pageKey) {
        for (const key of pageKeys) {
          const candidatePageData = webpageContent[key]
          if (candidatePageData?.slug) {
            const candidateSlug = candidatePageData.slug.toLowerCase()
            const normalizedTargetSlug = targetPageName?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || webpageSlug?.toLowerCase()
            if (normalizedTargetSlug && (candidateSlug.includes(normalizedTargetSlug) || normalizedTargetSlug.includes(candidateSlug))) {
              pageKey = key
              pageData = candidatePageData
              console.log('📦 [WebsitePreviewPage] extractPageData: Matched by internal slug:', candidateSlug, 'using key:', key)
              break
            }
          }
        }
      }
      // Fallback: use first key
      if (!pageKey) {
        pageKey = pageKeys[0]
        pageData = webpageContent[pageKey]
        console.log('⚠️ [WebsitePreviewPage] extractPageData: No match found, using first key:', pageKey)
      }
    }

    console.log('📦 [WebsitePreviewPage] extractPageData: Selected page key:', pageKey)

    if (!pageData || !pageData.data) {
      console.log('⚠️ [WebsitePreviewPage] extractPageData: No pageData or data found', pageData)
      return null
    }

    // The data structure is: { "slug": { "root": {...}, "content": [...], "zones": {} } }
    // Get the slug key (usually the page name slug like "about", "home", etc.)
    const dataKeys = Object.keys(pageData.data)
    console.log('📦 [WebsitePreviewPage] extractPageData: Data keys:', dataKeys)
    
    if (dataKeys.length === 0) {
      console.log('⚠️ [WebsitePreviewPage] extractPageData: No data keys found')
      return null
    }

    // Choose the correct slug key (avoid "first key" bugs when multiple slugs exist)
    const normalizedWebpageSlug = webpageSlug?.toLowerCase()
    const normalizedPageSlug = typeof pageData.slug === 'string' ? pageData.slug.toLowerCase() : undefined
    const normalizedTargetSlug = targetPageName?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    let slugKey: string = dataKeys[0]
    if (normalizedWebpageSlug && dataKeys.includes(normalizedWebpageSlug)) {
      slugKey = normalizedWebpageSlug
    } else if (normalizedPageSlug && dataKeys.includes(normalizedPageSlug)) {
      slugKey = normalizedPageSlug
    } else if (normalizedTargetSlug && dataKeys.includes(normalizedTargetSlug)) {
      slugKey = normalizedTargetSlug
    }

    const slugData = pageData.data[slugKey]
    console.log('📦 [WebsitePreviewPage] extractPageData: Slug key:', slugKey)
    console.log('📦 [WebsitePreviewPage] extractPageData: Slug data:', {
      hasContent: !!slugData?.content,
      contentLength: slugData?.content?.length || 0,
      hasRoot: !!slugData?.root,
      hasZones: !!slugData?.zones
    })

    if (!slugData) {
      console.log('⚠️ [WebsitePreviewPage] extractPageData: No slug data found')
      return null
    }

    // Extract and return the PageData structure
    const extractedData = {
      content: slugData.content || [],
      root: slugData.root || {},
      zones: slugData.zones || {}
    }
    
    console.log('✅ [WebsitePreviewPage] extractPageData: Successfully extracted', {
      contentCount: extractedData.content.length,
      hasRoot: !!extractedData.root,
      rootProps: extractedData.root?.props
    })
    
    return extractedData
  }, [currentPage, currentPageName, pages])

  // Convert webpage data to PageData format
  const webpagePageData = useMemo(() => {
    if (!webpageData || !webpageData.content) {
      console.log('⚠️ [WebsitePreviewPage] webpagePageData: No webpageData or content', {
        hasWebpageData: !!webpageData,
        hasContent: !!webpageData?.content
      })
      return null
    }
    
    console.log('📦 [WebsitePreviewPage] Extracting page data from webpage:', {
      uuid: webpageData.uuid,
      name: webpageData.name,
      slug: webpageData.slug,
      currentPage,
      currentPageName
    })
    
    // Pass currentPage, currentPageName, and webpage slug to help extractPageData find the correct page
    const extracted = extractPageData(
      webpageData.content,
      currentPage ?? undefined,
      currentPageName || webpageData.name,
      webpageData.slug
    )
    
    if (!extracted) {
      console.error('❌ [WebsitePreviewPage] Failed to extract page data from webpage content')
    } else {
      const rootPropsKeys = extracted.root?.props ? Object.keys(extracted.root.props) : []
      console.log('✅ [WebsitePreviewPage] Successfully extracted page data:', {
        contentCount: extracted.content?.length || 0,
        hasRoot: !!extracted.root,
        rootPropsKeys
      })
    }
    
    return extracted
  }, [webpageData, extractPageData, currentPage, currentPageName])

  // Dynamic component renderer based on page type
  const renderPageComponent = useMemo(() => {
    // If page type is 'schedule' and component is 'SchedulePage', render SchedulePage
    if (pageType === 'schedule' && pageComponent === 'SchedulePage') {
      return (
        <NavigationProvider onNavigateToEditor={handleEdit}>
          <SchedulePage key={currentPage} />
        </NavigationProvider>
      )
    }
    
    // Default: render template components
    return defaultTemplateJSX
  }, [pageType, pageComponent, currentPage, handleEdit, defaultTemplateJSX])

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col">
      {/* Navbar */}
      <EventHubNavbar
        key={createdEvent?.uuid || 'no-event'} // Force re-render when event changes
        eventName={displayEventName || 'Highly important conference of 2025'}
        isDraft={true}
        eventStatus={eventStatus}
        onBackClick={handleBack}
        onSearchClick={handleSearchClick}
        onNotificationClick={handleNotificationClick}
        onProfileClick={handleProfileClick}
        userAvatarUrl={userAvatarUrl}
      />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden mt-16">
        {/* PageSidebar */}
        <PageSidebar
          pages={pages}
          currentPage={currentPage ?? ''}
          currentPageName={currentPageName}
          onPageSelect={(pageId) => {
            console.log('📋 [WebsitePreviewPage] PageSidebar onPageSelect called with:', pageId)
            handlePageSelect(pageId)
          }}
          onAddPage={handleAddPage}
          onManagePages={handleManagePages}
          onBackClick={handleBack}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[26px] font-bold text-primary-dark">{currentPageName || 'Event Website'}</h1>
            <div className="flex items-center gap-3">
              {previewSection === 'webpage' && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <Edit05 className="h-4 w-4" />
                  Edit
                </button>
              )}

            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('preview')}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'text-[#6938EF] border-b-2 border-[#6938EF]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-[#6938EF] border-b-2 border-[#6938EF]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settings
            </button>
          </div>

          {/* Content based on active tab */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'preview' && (
              <>
                {previewSection === 'participants' && createdEvent?.uuid && currentPage ? (
                  <CmsParticipantsPreview eventUuid={createdEvent.uuid} tagId={currentPage} />
                ) : previewSection === 'schedule-sessions' && createdEvent?.uuid && currentPage ? (
                  <PublicScheduleSessionsPage
                    eventUuid={createdEvent.uuid}
                    scheduleUuid={currentPage}
                    onNavigate={() => {}}
                    showBookmark={false}
                  />
                ) : isLoadingWebpage ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                      <p className="text-slate-600">Loading webpage...</p>
                    </div>
                  </div>
                ) : webpageError ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <p className="text-red-600 mb-2">Error loading webpage</p>
                      <p className="text-sm text-slate-600">{webpageError}</p>
                    </div>
                  </div>
                ) : webpageData ? (
                  <div className="w-full">
                    {/* Render webpage content from API */}
                    {webpageData.content && typeof webpageData.content === 'string' ? (
                      // If content is HTML string, render it
                      <div 
                        dangerouslySetInnerHTML={{ __html: webpageData.content }}
                        className="w-full"
                      />
                    ) : webpagePageData ? (
                      // If we have valid PageData, render it using Preview component
                      <Preview 
                        data={webpagePageData} 
                        isInteractive={false}
                      />
                    ) : (
                      // Fallback to default template
                      renderPageComponent
                    )}
                  </div>
                ) : (
                  // No webpage data, render default template
                  renderPageComponent
                )}
              </>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-3xl space-y-6">

                <div>
                  <Input
                    label="Title"
                    value={settings.title}
                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Feature permission
                  </label>
                  <p className="mb-2 text-xs text-slate-500">Who has access</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="featurePermission"
                        value="everyone"
                        checked={settings.featurePermission === 'everyone'}
                        onChange={(e) => setSettings({ ...settings, featurePermission: e.target.value as any })}
                        className="h-4 w-4 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">Everyone</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="featurePermission"
                        value="logged-in"
                        checked={settings.featurePermission === 'logged-in'}
                        onChange={(e) => setSettings({ ...settings, featurePermission: e.target.value as any })}
                        className="h-4 w-4 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">Logged in users</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="featurePermission"
                        value="groups"
                        checked={settings.featurePermission === 'groups'}
                        onChange={(e) => setSettings({ ...settings, featurePermission: e.target.value as any })}
                        className="h-4 w-4 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">Users in certain groups</span>
                    </label>
                  </div>
                </div>

                <div className="relative" ref={groupsDropdownRef}>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Groups</label>
                  <button
                    type="button"
                    onClick={() => setIsGroupsDropdownOpen(!isGroupsDropdownOpen)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {settings.allowedGroups.length === 0 ? (
                        <span className="text-slate-400">Select groups...</span>
                      ) : (
                        settings.allowedGroups.map((groupId) => {
                          const group = availableGroups.find((g) => g.uuid === groupId)
                          return (
                            <span
                              key={groupId}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs"
                            >
                              {group?.name ?? groupId}
                              <span
                                role="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSettings({ ...settings, allowedGroups: settings.allowedGroups.filter((id) => id !== groupId) })
                                }}
                                className="cursor-pointer text-slate-400 hover:text-slate-600"
                              >
                                x
                              </span>
                            </span>
                          )
                        })
                      )}
                    </div>
                    <svg className="h-4 w-4 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {isGroupsDropdownOpen && (
                    <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                      {availableGroups.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400">No groups available</div>
                      ) : (
                        availableGroups.map((group) => {
                          const isSelected = settings.allowedGroups.includes(group.uuid)
                          return (
                            <label
                              key={group.uuid}
                              className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const next = isSelected
                                    ? settings.allowedGroups.filter((id) => id !== group.uuid)
                                    : [...settings.allowedGroups, group.uuid]
                                  setSettings({ ...settings, allowedGroups: next })
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm text-slate-700">{group.name}</span>
                            </label>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Visibility</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="show"
                        checked={settings.visibility === 'show'}
                        onChange={(e) => setSettings({ ...settings, visibility: e.target.value as any })}
                        className="h-4 w-4 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">Show feature in menu</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="hide"
                        checked={settings.visibility === 'hide'}
                        onChange={(e) => setSettings({ ...settings, visibility: e.target.value as any })}
                        className="h-4 w-4 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">Hide feature for now</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Platform</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.hideOnMobile}
                        onChange={(e) => setSettings({ ...settings, hideOnMobile: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">Hide on mobile app</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.hideOnWebsite}
                        onChange={(e) => setSettings({ ...settings, hideOnWebsite: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">Hide on event website</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Browser (Mobile app)</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="browser"
                        value="app"
                        checked={settings.browser === 'app'}
                        onChange={(e) => setSettings({ ...settings, browser: e.target.value as 'app' | 'browser' })}
                        className="h-4 w-4 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">Open event page in mobile app</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="browser"
                        value="browser"
                        checked={settings.browser === 'browser'}
                        onChange={(e) => setSettings({ ...settings, browser: e.target.value as 'app' | 'browser' })}
                        className="h-4 w-4 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">Open event page in browser</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Home page</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.setAsDesktopHome}
                        onChange={(e) => setSettings({ ...settings, setAsDesktopHome: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">Set as desktop home page</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.setAsMobileHome}
                        onChange={(e) => setSettings({ ...settings, setAsMobileHome: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">Set as mobile home page</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    {isSavingSettings ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page Creation Modal */}
      <PageCreationModal
        isVisible={isPageModalOpen}
        onClose={() => setIsPageModalOpen(false)}
        onSelect={handlePageTypeSelect}
      />
    </div>
  )
}

export default WebsitePreviewPage

