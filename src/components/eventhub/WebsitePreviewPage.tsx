import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Edit05, User01 } from '@untitled-ui/icons-react'
import Input from '../ui/untitled/Input'
import PageCreationModal, { type PageType } from '../page/PageCreationModal'
import { fetchWebpage, fetchWebpages, type WebpageData } from '../../services/webpageService'
import Preview from '../shared/Preview'
import type { PageData } from '../../types'

interface WebsitePreviewPageProps {
  pageId: string
  onBackClick?: () => void
  userAvatarUrl?: string
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
  const [webpageData, setWebpageData] = useState<WebpageData | null>(null)
  const [isLoadingWebpage, setIsLoadingWebpage] = useState(false)
  const [webpageError, setWebpageError] = useState<string | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const isFetchingRef = React.useRef(false)
  const lastFetchedPageRef = React.useRef<string | null>(null)
  const currentPageRef = React.useRef<string | null>(null)
  
  // Fetch actual webpages from backend for sidebar
  const [webpages, setWebpages] = useState<WebpageData[]>([])
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
        const fetchedWebpages = await fetchWebpages(createdEvent.uuid)
        console.log('📋 [WebsitePreviewPage] Fetched webpages:', fetchedWebpages.length, 'pages')
        console.log('📋 [WebsitePreviewPage] Webpage names:', fetchedWebpages.map(w => w.name))
        setWebpages(fetchedWebpages)
      } catch (error) {
        console.error('❌ [WebsitePreviewPage] Error fetching webpages:', error)
        setWebpages([])
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
            const fetchedWebpages = await fetchWebpages(createdEvent.uuid)
            setWebpages(fetchedWebpages)
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

  // Convert fetched webpages to PageSidebar format (use backend data, not context)
  const pages = useMemo(() => {
    const mappedPages = webpages.map(webpage => ({
      id: webpage.uuid, // Use UUID from backend
      name: webpage.name
    }))
    console.log('📋 [WebsitePreviewPage] Pages array updated:', mappedPages.length, 'pages:', mappedPages.map(p => p.name))
    return mappedPages
  }, [webpages])
  
  const [currentPage, setCurrentPage] = useState<string | null>(null)
  
  // Initialize ref with initial currentPage value (only once)
  React.useEffect(() => {
    if (currentPageRef.current === null && currentPage) {
      currentPageRef.current = currentPage
    }
  }, []) // Only run once on mount
  const [isPageModalOpen, setIsPageModalOpen] = useState(false)
  
  // Settings form state
  const [settings, setSettings] = useState({
    title: 'Welcome',
    icon: 'user',
    desktopMaxWidth: '700',
    desktopMaxWidthUnit: 'px',
    browser: 'app' as 'app' | 'browser',
    featurePermission: 'everyone' as 'everyone' | 'logged-in' | 'guests' | 'groups',
    visibility: 'show' as 'show' | 'show-no-access' | 'hide',
    hideOnMobile: false,
    showFeatureInMenu: false,
    setAsDesktopHome: true,
    setAsMobileHome: false
  })

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
  }, [pageId, pages])

  // Fetch webpage data when currentPage changes and event UUID is available
  useEffect(() => {
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
  }, [currentPage, pageId, createdEvent?.uuid])

  const handleSearchClick = () => {
    // TODO: Implement search functionality
  }

  const handleNotificationClick = () => {
    // TODO: Implement notification functionality
  }

  const handleProfileClick = () => {
    // TODO: Implement profile functionality
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
    console.log('📋 [WebsitePreviewPage] currentPage state updated to:', pageId)
    console.log('📋 [WebsitePreviewPage] currentPageRef updated to:', pageId)
    
    // Update URL to match the selected page
    const newUrl = `/event/website/preview/${pageId}`
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
  const currentPageData = webpages.find(w => w.uuid === currentPage)
  const currentPageName = currentPageData?.name || 'Welcome'
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
          containerPadding="px-4 sm:px-6 lg:px-8 py-8"
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
          containerPadding="px-4 sm:px-6 lg:px-8 py-8"
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
  }, [currentPage, currentPageName])

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
            <h1 className="text-3xl font-bold text-primary">Event Website</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <Edit05 className="h-4 w-4" />
                Edit
              </button>
              {/* <button
                onClick={handleNewPage}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#6938EF] hover:bg-[#5925DC] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New page
              </button> */}
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
                {isLoadingWebpage ? (
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
                {/* Title */}
                <div>
                  <Input
                    label="Title"
                    value={settings.title}
                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                    className="w-full"
                  />
                </div>

                {/* Icon */}
                <div>
                  <label className="flex w-full flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Icon</span>
                    <div className="relative">
                      <select
                        value={settings.icon}
                        onChange={(e) => setSettings({ ...settings, icon: e.target.value })}
                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pl-10 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="user">Change icon</option>
                        <option value="home">Home</option>
                        <option value="calendar">Calendar</option>
                        <option value="users">Users</option>
                        <option value="settings">Settings</option>
                      </select>
                      <User01 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <svg
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </label>
                </div>

                {/* Desktop container max width */}
                <div>
                  <label className="flex w-full flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Desktop container max width</span>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={settings.desktopMaxWidth}
                        onChange={(e) => setSettings({ ...settings, desktopMaxWidth: e.target.value })}
                        className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <select
                        value={settings.desktopMaxWidthUnit}
                        onChange={(e) => setSettings({ ...settings, desktopMaxWidthUnit: e.target.value })}
                        className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="px">px</option>
                        <option value="%">%</option>
                        <option value="rem">rem</option>
                      </select>
                    </div>
                  </label>
                </div>

                {/* Browser */}
                <div>
                  <label className="flex w-full flex-col gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Browser</span>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="browser"
                          value="app"
                          checked={settings.browser === 'app'}
                          onChange={(e) => setSettings({ ...settings, browser: e.target.value as 'app' | 'browser' })}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Open website in app</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="browser"
                          value="browser"
                          checked={settings.browser === 'browser'}
                          onChange={(e) => setSettings({ ...settings, browser: e.target.value as 'app' | 'browser' })}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Open website in browser</span>
                      </label>
                    </div>
                  </label>
                </div>

                {/* Feature permission */}
                <div>
                  <label className="flex w-full flex-col gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Feature permission (Who has access)</span>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="featurePermission"
                          value="everyone"
                          checked={settings.featurePermission === 'everyone'}
                          onChange={(e) => setSettings({ ...settings, featurePermission: e.target.value as any })}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
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
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Logged in users</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="featurePermission"
                          value="guests"
                          checked={settings.featurePermission === 'guests'}
                          onChange={(e) => setSettings({ ...settings, featurePermission: e.target.value as any })}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Guests (Non-logged in users)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="featurePermission"
                          value="groups"
                          checked={settings.featurePermission === 'groups'}
                          onChange={(e) => setSettings({ ...settings, featurePermission: e.target.value as any })}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Users in certain groups</span>
                      </label>
                    </div>
                  </label>
                </div>

                {/* Visibility */}
                <div>
                  <label className="flex w-full flex-col gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Visibility</span>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visibility"
                          value="show"
                          checked={settings.visibility === 'show'}
                          onChange={(e) => setSettings({ ...settings, visibility: e.target.value as any })}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Show feature in menu</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visibility"
                          value="show-no-access"
                          checked={settings.visibility === 'show-no-access'}
                          onChange={(e) => setSettings({ ...settings, visibility: e.target.value as any })}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Show feature in menu, even if user has not access</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visibility"
                          value="hide"
                          checked={settings.visibility === 'hide'}
                          onChange={(e) => setSettings({ ...settings, visibility: e.target.value as any })}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Hide feature for now</span>
                      </label>
                    </div>
                  </label>
                </div>

                {/* Platform */}
                <div>
                  <label className="flex w-full flex-col gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Platform</span>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.hideOnMobile}
                          onChange={(e) => setSettings({ ...settings, hideOnMobile: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Hide on mobile</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showFeatureInMenu}
                          onChange={(e) => setSettings({ ...settings, showFeatureInMenu: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Show feature in menu, even if user has not access</span>
                      </label>
                    </div>
                  </label>
                </div>

                {/* Home page */}
                <div>
                  <label className="flex w-full flex-col gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Home page</span>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.setAsDesktopHome}
                          onChange={(e) => setSettings({ ...settings, setAsDesktopHome: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Set as desktop home page</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.setAsMobileHome}
                          onChange={(e) => setSettings({ ...settings, setAsMobileHome: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-slate-700">Set as mobile home page</span>
                      </label>
                    </div>
                  </label>
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

