import React, { useEffect, useMemo, useState, createContext, useContext, useRef } from 'react'
import { Puck } from '@measured/puck'
import '@measured/puck/puck.css'

import { getPuckConfig } from '../../config/getPuckConfig'
import { PageSidebar, NewPageCreationModal } from '../page'
import PageCreationModal, { type PageType } from '../page/PageCreationModal'
import BlockTypeSelectionModal from '../page/BlockTypeSelectionModal'
import TemplateSelectionModal from '../page/TemplateSelectionModal'
import HtmlCodeModal from '../page/HtmlCodeModal'
import type { PageCreationType } from '../page/NewPageCreationModal'
import Preview from './Preview'
import { NavigationProvider } from '../../contexts/NavigationContext'
import { useEventForm } from '../../contexts/EventFormContext'
import { useWebsitePages } from '../../contexts/WebsitePagesContext'
import { Page } from '../../types'
import PuckPropertySidebarSaveButton from './PuckPropertySidebarSaveButton'
import { fetchWebpages, type WebpageData } from '../../services/webpageService'

// Context to provide current data to custom fields
const PuckDataContext = createContext<any>(null)
export const usePuckData = () => useContext(PuckDataContext)

interface EditorViewProps {
  currentData: any
  currentPage: string
  currentPageName: string
  pages: Page[]
  puckUi: any
  showPreview: boolean
  showLeftSidebar: boolean
  showRightSidebar: boolean
  showPageManager: boolean
  onPublish: (data: any) => void
  onChange: (data: any) => void
  onDataChange: (data: any) => void
  onPageSelect: (filename: string) => Promise<any>
  onAddPage: () => void
  onManagePages: () => void
  onNavigateToEditor: () => void
  onAddComponent: (componentType: string, props?: any) => void
  onPreviewToggle: () => void
  onBack?: () => void
  onCreatePageFromTemplate?: (templateType: string) => Promise<any>
  onCreateNewPage?: () => void
}

export const EditorView: React.FC<EditorViewProps> = ({
  currentData,
  currentPage,
  currentPageName,
  pages,
  puckUi,
  showPreview,
  showRightSidebar,
  onPublish,
  onChange,
  onDataChange,
  onPageSelect,
  onManagePages,
  onNavigateToEditor,
  onAddComponent,
  onPreviewToggle,
  onCreatePageFromTemplate,
  onCreateNewPage,
}) => {
  // Get pages from WebsitePagesContext
  const { pages: websitePages } = useWebsitePages()

  // In template mode, use backend webpages for sidebar (avoid local "Welcome" artifacts)
  const [sidebarWebpages, setSidebarWebpages] = useState<WebpageData[]>(() => {
    // Hydrate from per-event cache so sidebar doesn't "vanish" on remount/navigation
    try {
      const eventUuid = localStorage.getItem('currentEventUuid')
      if (!eventUuid) return []
      const raw = localStorage.getItem(`sidebar-webpages-${eventUuid}`)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as WebpageData[]) : []
    } catch {
      return []
    }
  })
  const [isLoadingSidebarWebpages, setIsLoadingSidebarWebpages] = useState(false)
  const sidebarWebpagesEventUuidRef = useRef<string | null>(null)
  const sidebarWebpagesRequestIdRef = useRef(0)
  
  // Initially show default COMPONENTS sidebar, canvas, and property sidebar with Page 1
  // Custom sidebar only appears after "Create from scratch" is selected
  const [showCustomSidebar, setShowCustomSidebar] = useState(() => {
    // Check if we're creating from scratch
    return localStorage.getItem('create-from-scratch') === 'true'
  })
  const [showPageCreationModal, setShowPageCreationModal] = useState(false)
  const [showNewPageCreationModal, setShowNewPageCreationModal] = useState(false)
  const [showHtmlCodeModal, setShowHtmlCodeModal] = useState(false)
  const [showBlockTypeModal, setShowBlockTypeModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  
  // Detect editor mode from URL query params (blank or template)
  const getEditorMode = (): 'blank' | 'template' => {
    if (typeof window === 'undefined') return 'template'
    const urlParams = new URLSearchParams(window.location.search)
    const mode = urlParams.get('mode')
    return mode === 'blank' ? 'blank' : 'template'
  }
  
  const [editorMode, setEditorMode] = useState<'blank' | 'template'>(getEditorMode())
  
  // Update editor mode when URL changes
  useEffect(() => {
    const updateMode = () => {
      setEditorMode(getEditorMode())
    }
    updateMode()
    window.addEventListener('popstate', updateMode)
    return () => window.removeEventListener('popstate', updateMode)
  }, [])
  
  // Use a ref to store the latest data from Puck (including zones)
  // This ensures we always publish the most up-to-date data
  const latestDataRef = useRef(currentData)

  // Keep onChange stable for effects (avoids effect loops on re-renders)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  
  // Get banner URL for key generation (to force re-render when banner changes).
  // Use per-event storage to avoid leaking banners across events.
  const bannerUrl = typeof window !== 'undefined'
    ? (() => {
        const eventUuid = localStorage.getItem('currentEventUuid')
        return eventUuid ? localStorage.getItem(`event-form-banner-${eventUuid}`) : null
      })()
    : null
  const bannerKey = bannerUrl ? bannerUrl.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '') : 'no-banner'
  
  // Update the ref whenever currentData changes
  useEffect(() => {
    latestDataRef.current = currentData
    
    // Check for duplicates
    if (currentData?.content) {
      const typeCounts: Record<string, number> = {}
      const componentDetails: Record<string, any[]> = {}
      
      currentData.content.forEach((item: any, index: number) => {
        const type = item.type
        typeCounts[type] = (typeCounts[type] || 0) + 1
        
        if (!componentDetails[type]) {
          componentDetails[type] = []
        }
        componentDetails[type].push({
          index,
          id: item.props?.id || 'no-id',
          props: item.props
        })
      })
      
      // Warn if PricingPlans appears multiple times (duplicates are handled by usePageManagement)
      if (typeCounts['PricingPlans'] > 1) {
        // Duplicates are cleaned up automatically
      }
    }
  }, [currentData, currentPage, currentPageName])

  // Get eventData and createdEvent from context
  const { eventData, createdEvent } = useEventForm()

  /**
   * Ensure we always have an "event-form-banner" value available.
   * In template mode this is often already present (because preview pages load it),
   * but in create-from-scratch mode users may add HeroSection later by dragging it.
   * We normalize banner sources:
   * - createdEvent.banner (URL string) preferred (normalize http->https)
   * - eventData.banner (File/Blob) fallback -> convert to dataURL
   */
  const lastBannerStoredRef = useRef<string | null>(null)
  const lastBannerBlobRef = useRef<Blob | null>(null)
  useEffect(() => {
    // Prefer API banner URL if present
    let apiBanner = createdEvent?.banner
    if (apiBanner && apiBanner.startsWith('http://')) {
      apiBanner = apiBanner.replace('http://', 'https://')
    }

    // If we have a good https banner from API, store it (and mark initialized)
    if (apiBanner && apiBanner.startsWith('https://')) {
      const current = localStorage.getItem('event-form-banner')
      if (!current || !current.startsWith('https://') || current !== apiBanner) {
        localStorage.setItem('event-form-banner', apiBanner)
      }
      lastBannerStoredRef.current = apiBanner
      return
    }

    // Otherwise, if banner is a File/Blob (create event flow), convert to data URL once
    const bannerFile = (eventData as any)?.banner
    if (bannerFile instanceof Blob) {
      // Avoid re-reading the same blob repeatedly
      if (lastBannerBlobRef.current === bannerFile) {
        return
      }
      lastBannerBlobRef.current = bannerFile

      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : null
        if (dataUrl) {
          // Only set if there's nothing yet, or existing is also a dataURL
          const existing = localStorage.getItem('event-form-banner')
          if (!existing || existing.startsWith('data:')) {
            localStorage.setItem('event-form-banner', dataUrl)
            lastBannerStoredRef.current = dataUrl
          }
        }
      }
      reader.onerror = () => {
        // noop
      }
      reader.readAsDataURL(bannerFile)
      return
    }
  }, [createdEvent?.banner, (eventData as any)?.banner])

  // Fetch webpages list for sidebar.
  // In template mode: fetch.
  // In create-from-scratch mode: do NOT fetch (sidebar should show only local scratch pages like page1).
  useEffect(() => {
    const loadSidebarWebpages = async () => {
      if (editorMode === 'blank') {
        setSidebarWebpages([])
        return
      }
      const eventUuidToFetch = createdEvent?.uuid ?? localStorage.getItem('currentEventUuid')
      if (!eventUuidToFetch) {
        setSidebarWebpages([])
        return
      }

      const requestId = ++sidebarWebpagesRequestIdRef.current

      // Prime from cache immediately for this event (prevents temporary disappearance)
      try {
        const raw = localStorage.getItem(`sidebar-webpages-${eventUuidToFetch}`)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSidebarWebpages(parsed as WebpageData[])
          }
        }
      } catch {
        // ignore
      }

      // Only clear when the event actually changes (prevents the sidebar flashing to Page 1/Page 2
      // when you click an unsaved page and a new fetch starts for the SAME event).
      if (sidebarWebpagesEventUuidRef.current !== eventUuidToFetch) {
        setSidebarWebpages([])
        sidebarWebpagesEventUuidRef.current = eventUuidToFetch
      }

      setIsLoadingSidebarWebpages(true)
      try {
        const fetched = await fetchWebpages(eventUuidToFetch)
        // Ignore out-of-order responses
        if (requestId !== sidebarWebpagesRequestIdRef.current) return
        setSidebarWebpages(fetched)
        // Cache per-event for fast hydration on remount
        try {
          localStorage.setItem(`sidebar-webpages-${eventUuidToFetch}`, JSON.stringify(fetched))
        } catch {
          // ignore
        }
      } catch (error) {
        console.error('❌ EditorView: Failed to fetch webpages for sidebar:', error)
        if (requestId !== sidebarWebpagesRequestIdRef.current) return
        setSidebarWebpages([])
      } finally {
        if (requestId !== sidebarWebpagesRequestIdRef.current) return
        setIsLoadingSidebarWebpages(false)
      }
    }

    loadSidebarWebpages()
  }, [createdEvent?.uuid, editorMode])

  // Helper function to format event date (single date or range)
  const formatEventDate = (startDate?: string, endDate?: string): string => {
    if (!startDate) return 'Jan 13, 2025'
    try {
      const start = new Date(startDate)
      if (isNaN(start.getTime())) return 'Jan 13, 2025'
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

      if (!endDate) return startStr
      const end = new Date(endDate)
      if (isNaN(end.getTime())) return startStr
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

      return startStr === endStr ? startStr : `${startStr} - ${endStr}`
    } catch {
      return 'Jan 13, 2025'
    }
  }

  // Avoid rerunning hero-sync effect on every keystroke.
  // This signature only changes when HeroSection props change (not when you edit other blocks like Sponsors).
  const heroPropsSignature = useMemo(() => {
    const content = currentData?.content
    if (!Array.isArray(content)) return 'no-content'
    const hero = content.find((item: any) => item?.type === 'HeroSection')
    if (!hero?.props) return 'no-hero'
    const p = hero.props || {}
    return JSON.stringify({
      title: p.title ?? '',
      subtitle: p.subtitle ?? '',
      backgroundImage: p.backgroundImage ?? ''
    })
  }, [currentData?.content])

  // Ensure banner, title, location, and date from eventData are applied when currentData changes
  useEffect(() => {
    // Add a small delay to ensure data is fully loaded
    const timer = setTimeout(() => {
      // Try multiple sources for banner
      const bannerUrl = localStorage.getItem('event-form-banner')
      const apiBanner = createdEvent?.banner
      const content = currentData?.content
      if (!Array.isArray(content)) return

      const heroSection = content.find((item: any) => item?.type === 'HeroSection')
      if (!heroSection) return

      // Get event data values - prioritize createdEvent, then eventData, then existing props
      const eventName = createdEvent?.eventName || eventData?.eventName || heroSection.props.title || 'Event Title'
      const location = createdEvent?.location || eventData?.location || ''
      const eventDate = formatEventDate(
        createdEvent?.startDate || eventData?.startDate,
        createdEvent?.endDate || eventData?.endDate
      )
      const subtitle = location ? `${location} | ${eventDate}` : (eventDate || 'Location | Date')

      const currentBanner = heroSection.props.backgroundImage || ''
      const hasDefaultImage = currentBanner?.includes('unsplash.com/photo-1540575467063')
      
      // Process API banner URL if needed
      let processedApiBanner = apiBanner
      if (processedApiBanner && processedApiBanner.startsWith('http://')) {
        processedApiBanner = processedApiBanner.replace('http://', 'https://')
      }
      
      // Banner priority: API banner (if HTTPS URL) > localStorage (if HTTPS URL) > saved page banner > localStorage (data URL) > createdEvent.banner > default
      // This ensures API HTTPS URLs take precedence over localStorage data URLs
      let finalBannerUrl: string | null = null
      
      // Priority 1: API banner (if it's an HTTPS URL - the correct uploaded banner)
      if (processedApiBanner && processedApiBanner.startsWith('https://')) {
        finalBannerUrl = processedApiBanner
        localStorage.setItem('event-form-banner', finalBannerUrl)
        console.log('🖼️ EditorView useEffect - Using banner from createdEvent API (HTTPS URL)')
      }
      // Priority 2: localStorage banner (if it's an HTTPS URL, not a data URL)
      else if (bannerUrl && bannerUrl.startsWith('https://')) {
        finalBannerUrl = bannerUrl
        console.log('🖼️ EditorView useEffect - Using banner from localStorage (HTTPS URL)')
      }
      // Priority 3: Saved page banner (if it's not default and not empty)
      else if (currentBanner && !hasDefaultImage && currentBanner !== '') {
        finalBannerUrl = currentBanner
        // If it's an HTTPS URL, sync to localStorage
        if (currentBanner.startsWith('https://')) {
          localStorage.setItem('event-form-banner', currentBanner)
        }
        console.log('🖼️ EditorView useEffect - Using saved banner from page data')
      }
      // Priority 4: localStorage banner (even if data URL - fallback)
      else if (bannerUrl) {
        finalBannerUrl = bannerUrl
        console.log('🖼️ EditorView useEffect - Using banner from localStorage (data URL fallback)')
      }
      // Priority 5: API banner (even if not HTTPS - final fallback)
      else if (processedApiBanner) {
        finalBannerUrl = processedApiBanner
        localStorage.setItem('event-form-banner', finalBannerUrl)
        console.log('🖼️ EditorView useEffect - Using banner from createdEvent API (fallback)')
      }
      
      // Check if any update is needed
      // Always update if finalBannerUrl exists and is different from current, or if current is default/empty
      const needsBannerUpdate = finalBannerUrl && (
        hasDefaultImage || 
        !currentBanner || 
        currentBanner !== finalBannerUrl ||
        (currentBanner === '' && finalBannerUrl !== '')
      )
      const needsTitleUpdate = heroSection.props.title !== eventName
      const needsSubtitleUpdate = heroSection.props.subtitle !== subtitle
      const needsUpdate = needsBannerUpdate || needsTitleUpdate || needsSubtitleUpdate

      if (needsUpdate) {
        const updatedContent = currentData.content.map((item: any) => {
          if (item.type === 'HeroSection') {
            return {
              ...item,
              props: {
                ...item.props,
                ...(finalBannerUrl && (hasDefaultImage || !item.props.backgroundImage || item.props.backgroundImage !== finalBannerUrl) ? { backgroundImage: finalBannerUrl } : {}),
                ...(needsTitleUpdate ? { title: eventName } : {}),
                ...(needsSubtitleUpdate ? { subtitle: subtitle } : {})
              }
            }
          }
          return item
        })

        const updatedData = {
          ...currentData,
          content: updatedContent
        }

        // Update via onChange to ensure the parent state is updated
        onChangeRef.current(updatedData)
      }
    }, 100) // Small delay to ensure data is loaded

    return () => clearTimeout(timer)
  }, [
    heroPropsSignature,
    currentPage,
    createdEvent?.uuid,
    createdEvent?.banner,
    createdEvent?.eventName,
    createdEvent?.location,
    createdEvent?.startDate,
    createdEvent?.endDate,
    (eventData as any)?.eventName,
    (eventData as any)?.location,
    (eventData as any)?.startDate,
    (eventData as any)?.endDate
  ])

  const handleBackButtonClick = () => {
    setShowCustomSidebar(prev => !prev)
  }

  const handlePageCreationSelect = (pageType: PageType) => {
    // Handle different page types
    switch (pageType) {
      case 'scratch':
        // Create from scratch - load empty editor
        setShowCustomSidebar(false)
        if (onCreateNewPage) {
          onCreateNewPage()
        }
        break
      case 'html-general':
        // For HTML/General page, create from scratch
        setShowCustomSidebar(false)
        if (onCreateNewPage) {
          onCreateNewPage()
        }
        break
      case 'attendee':
      case 'schedule':
      case 'folder':
      case 'organization':
      case 'hyperlink':
      case 'qr-scanner':
      case 'documents':
      case 'gallery':
      case 'forms':
      case 'meeting-room':
        // TODO: Implement specific page type creation logic
        setShowCustomSidebar(false)
        if (onCreateNewPage) {
          onCreateNewPage()
        }
        break
      default:
        break
    }
  }

  const handleBlockTypeSelect = (_blockType: string) => {
    setShowBlockTypeModal(false)
    setShowCustomSidebar(false)
  }

  const handleTemplateSelect = async (templateType: string) => {
    setShowTemplateModal(false)
    
    if (onCreatePageFromTemplate) {
      const result = await onCreatePageFromTemplate(templateType)
      
      // Ensure the template data is set correctly after page creation
      if (result && result.newPageData) {
        // Use requestAnimationFrame to ensure state updates are complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (onDataChange) {
              onDataChange(result.newPageData)
            }
            if (onChange) {
              onChange(result.newPageData)
            }
          })
        })
      }
    }
    
    setShowCustomSidebar(true)
  }

  const handleNewPageCreationSelect = (pageType: PageCreationType) => {
    // Close the NewPageCreationModal first
    setShowNewPageCreationModal(false)
    
    switch (pageType) {
      case 'scratch':
        // Create from scratch - load empty editor
        setShowCustomSidebar(false)
        if (onCreateNewPage) {
          onCreateNewPage()
        }
        break
      case 'html':
        // Open HTML code input modal
        setShowHtmlCodeModal(true)
        break
      case 'template':
        // Open template selection modal
        setShowTemplateModal(true)
        break
      default:
        break
    }
  }

  const handleHtmlCodeConvert = (htmlCode: string) => {
    // Convert HTML code to Puck template format using HTMLContent component
    try {
      // Clean and validate HTML code
      const cleanedHtml = htmlCode.trim()
      
      if (!cleanedHtml) {
        console.error('HTML code is empty')
        alert('Please provide HTML code to convert.')
        return
      }

      console.log('🔄 Converting HTML code, length:', cleanedHtml.length)

      // Create the converted data with HTMLContent component
      // This replaces ALL content with just the HTML (no default template)
      const convertedData = {
        root: {
          props: {
            id: 'root',
            title: 'HTML Page',
            pageTitle: 'HTML Page'
          }
        },
        content: [
          {
            type: 'HTMLContent',
            props: {
              htmlContent: cleanedHtml,
              id: 'html-content-' + Date.now()
            }
          }
        ],
        zones: {}
      }

      console.log('📦 Converted data structure:', convertedData)

      // Check if we're on page1 - if so, replace page1's content directly (removes default template)
      // Otherwise, create a new page
      const isPage1 = currentPage === 'page1' || currentPage === 'page1.json'
      
      if (isPage1) {
        // Replace page1's content directly (removes default template)
        console.log('📝 Replacing page1 content with HTML (removing default template)')
        if (onDataChange) {
          onDataChange(convertedData)
        }
        if (onChange) {
          onChange(convertedData)
        }
        console.log('✅ HTML code converted and replaced page1 content')
      } else if (onCreateNewPage) {
        // Create a new page (Page 2, 3, etc.) with HTML content
        onCreateNewPage()
        
        // Wait for the page creation to complete, then set the HTML content
        setTimeout(() => {
          console.log('⏰ Setting HTML content after page creation')
          
          // Set the converted data using onDataChange (this updates the state)
          if (onDataChange) {
            console.log('📝 Calling onDataChange with converted data')
            onDataChange(convertedData)
          }

          // Also update via onChange to ensure Puck receives the update immediately
          if (onChange) {
            console.log('📝 Calling onChange with converted data')
            onChange(convertedData)
          }

          console.log('✅ HTML code converted successfully and loaded into editor')
        }, 500) // Longer delay to ensure page creation completes
      } else {
        // Fallback: just set the data directly
        if (onDataChange) {
          onDataChange(convertedData)
        }
        if (onChange) {
          onChange(convertedData)
        }
        console.log('✅ HTML code converted successfully and loaded into editor')
      }

      // Hide custom sidebar to show the default Puck sidebar
      setShowCustomSidebar(false)
    } catch (error) {
      console.error('❌ Error converting HTML code:', error)
      alert('Failed to convert HTML code. Please try again.')
    }
  }

  useEffect(() => {
    if (!showCustomSidebar) {
      const sidebarSelectors = [
        'aside[class*="puck__sidebar--left"]',
        'aside[class*="Sidebar--left"]:not([class*="right"])',
        'nav[class*="puck__sidebar--left"]',
      ]
      
      sidebarSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement
          htmlEl.style.removeProperty('display')
          htmlEl.style.removeProperty('width')
          htmlEl.style.removeProperty('visibility')
          htmlEl.style.removeProperty('opacity')
        })
      })
      return
    }
    
    const hideDefaultSidebar = () => {
      const sidebarSelectors = [
        'aside[class*="puck__sidebar--left"]',
        'aside[class*="Sidebar--left"]:not([class*="right"])',
        'nav[class*="puck__sidebar--left"]',
        '[class*="ComponentList"]',
        '[class*="component-list"]',
      ]
      
      sidebarSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement
          const rect = htmlEl.getBoundingClientRect()
          if (rect.left < 350 && rect.width > 100) {
            htmlEl.style.setProperty('display', 'none', 'important')
            htmlEl.style.setProperty('width', '0', 'important')
            htmlEl.style.setProperty('visibility', 'hidden', 'important')
            htmlEl.style.setProperty('opacity', '0', 'important')
            htmlEl.style.setProperty('pointer-events', 'none', 'important')
          }
        })
      })
    }
    
    hideDefaultSidebar()
    const interval = setInterval(hideDefaultSidebar, 100)
    
    return () => clearInterval(interval)
  }, [showCustomSidebar])

  return (
    <div className="relative mt-16 flex h-[calc(100vh-64px)] flex-1 w-full">
      {showPreview ? (
        <NavigationProvider onNavigateToEditor={onNavigateToEditor} onAddComponent={onAddComponent}>
          <div className="w-full h-full">
            <Preview data={currentData} isInteractive={true} onDataChange={onDataChange} />
          </div>
        </NavigationProvider>
      ) : (
        <NavigationProvider onNavigateToEditor={onNavigateToEditor} onAddComponent={onAddComponent}>
          {showCustomSidebar && (() => {
            // In create-from-scratch mode, use pages from usePageManagement (only page1)
            // Do NOT use websitePages from context as it may contain backend pages
            let pagesForSidebar: Array<{ id: string; name: string }>
            
            if (editorMode === 'blank') {
              // Blank/scratch mode: ONLY local scratch pages (no backend webpages).
              // Keep only local scratch ids: "page1" or "page-<...>"
              pagesForSidebar = pages
                .filter((page) => {
                  const pageNameLower = page.name.toLowerCase()
                  const pageIdLower = page.id.toLowerCase()
                  const isWelcome = pageNameLower === 'welcome' || pageIdLower === 'welcome'
                  const isLocalScratchId = page.id === 'page1' || page.id.startsWith('page-')
                  return !isWelcome && isLocalScratchId
                })
                .map((page) => ({ id: page.id, name: page.name }))
            } else {
              // Template mode: Prefer backend webpages list (accurate for current event)
              pagesForSidebar = sidebarWebpages.map(w => ({
                id: w.uuid,
                name: w.name
              }))

              // Fallback (if backend list not yet available): use local websitePages context
              if (pagesForSidebar.length === 0 && !isLoadingSidebarWebpages) {
                pagesForSidebar = websitePages.map(page => ({ id: page.id, name: page.name }))
              }

              // Ensure current page is included if not already in the list (e.g. newly created page not yet in API response)
              const currentPageExists = pagesForSidebar.some(p =>
                p.id === currentPage ||
                (currentPageName && p.name.toLowerCase() === currentPageName.toLowerCase())
              )
              if (!currentPageExists && currentPage && currentPageName) {
                pagesForSidebar.push({ id: currentPage, name: currentPageName })
              }

              // Remove duplicates based on case-insensitive name matching
              const uniquePagesForSidebar = pagesForSidebar.reduce((acc, page) => {
                const existingIndex = acc.findIndex(p => 
                  p.name.toLowerCase() === page.name.toLowerCase()
                )
                
                if (existingIndex === -1) {
                  acc.push(page)
                } else {
                  const existing = acc[existingIndex]
                  const isCurrentPage = page.id === currentPage
                  const isExistingCurrentPage = existing.id === currentPage
                  const pageHasUuid = page.id.includes('-') && page.id.length > 20
                  const existingHasUuid = existing.id.includes('-') && existing.id.length > 20
                  
                  if (isCurrentPage || (pageHasUuid && !existingHasUuid && !isExistingCurrentPage)) {
                    acc[existingIndex] = page
                  }
                }
                
                return acc
              }, [] as typeof pagesForSidebar)
              pagesForSidebar = uniquePagesForSidebar
            }

            return (
              <div className="absolute inset-y-0 left-0 w-[280px] border-r border-slate-200 bg-white z-[1000]">
                <PageSidebar
                  pages={pagesForSidebar}
                  currentPage={currentPage}
                  currentPageName={currentPageName}
                  onPageSelect={async (pageId) => {
                    // Don't reload if clicking the same page
                    if (pageId === currentPage) {
                      return
                    }

                    try {
                      // Always load by pageId; UUIDs are handled by usePageManagement.loadPage()
                      const filename = pageId.endsWith('.json') ? pageId : `${pageId}.json`
                      await onPageSelect(filename)

                      // Navigate to editor for the selected page.
                      // IMPORTANT: preserve create-from-scratch mode (`?mode=blank`) so the sidebar keeps
                      // the Add Page button and doesn't switch into template mode.
                      const url = new URL(window.location.href)
                      url.pathname = `/event/website/editor/${pageId}`
                      if (editorMode === 'blank') {
                        url.searchParams.set('mode', 'blank')
                      } else {
                        url.searchParams.delete('mode')
                      }
                      window.history.pushState({}, '', `${url.pathname}${url.search}`)
                      window.dispatchEvent(new PopStateEvent('popstate'))
                    } catch (error) {
                      // Error loading page - silently fail
                      console.error('Error loading page:', error)
                    }
                  }}
                  onAddPage={editorMode === 'blank' ? () => setShowNewPageCreationModal(true) : undefined}
                  onManagePages={onManagePages}
                  onBackClick={() => {
                    // Always go back to Event Website listing page.
                    // Users expect the PageSidebar back arrow to return to `/event/website`
                    // (not the preview page), regardless of editor mode or origin.
                    window.history.pushState({}, '', '/event/website')
                    window.dispatchEvent(new PopStateEvent('popstate'))
                  }}
                  editorMode={editorMode}
                />
              </div>
            )
          })()}
          
          <div
            className={`flex-1 h-full transition-[margin-left] duration-200 ${
              showCustomSidebar ? 'ml-[280px]' : 'ml-0'
            }`}
          >
            <style>
              {`
                ${showCustomSidebar ? `
                  aside[class*="puck__sidebar--left"],
                  aside[class*="Sidebar--left"]:not([class*="right"]),
                  nav[class*="puck__sidebar--left"] {
                    display: none !important;
                    width: 0 !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                  }
                ` : ''}
                
                ${!showRightSidebar ? `
                  aside[class*="Sidebar--right"],
                  aside[class*="Sidebar_Sidebar--right_"] {
                    display: none !important;
                    width: 0 !important;
                  }
                ` : ''}
                
                [class*="DragHandle"],
                [class*="dragHandle"],
                [class*="ResizeHandle"],
                [class*="resizeHandle"],
                [class*="Sidebar__dragHandle"],
                [class*="Sidebar_Sidebar__dragHandle"],
                button[class*="dragHandle"],
                div[class*="dragHandle"],
                [data-drag-handle],
                [role="separator"] {
                  display: none !important;
                  width: 0 !important;
                  opacity: 0 !important;
                  pointer-events: none !important;
                  visibility: hidden !important;
                }
                
                .puck,
                [class*="Puck"],
                [class*="puck"] {
                  padding: 0 !important;
                  
                  gap: 0 !important;
                }
                
                main,
                main[class*="Canvas"],
                [class*="Canvas"],
                [class*="Frame"],
                section {
                  padding-left: 0 !important;
                  margin-left: 0 !important;
                }
                
                [class*="Puck"] > div,
                [class*="Puck"] section {
                  padding: 0 !important;
                 
                  gap: 0 !important;
                }

                button[data-hidden-publish-btn="true"],
                span[data-hidden-publish-btn="true"],
                button[data-testid="publish"]:not([data-custom-publish-button]),
                button[data-testid*="publish"]:not([data-custom-publish-button]),
                span[data-testid="publish"]:not([data-custom-publish-button]),
                span[data-testid*="publish"]:not([data-custom-publish-button]),
                button[aria-label*="Publish"]:not([data-custom-publish-button]),
                button[aria-label*="publish"]:not([data-custom-publish-button]),
                span[aria-label*="Publish"]:not([data-custom-publish-button]),
                span[aria-label*="publish"]:not([data-custom-publish-button]),
                button[title*="Publish"]:not([data-custom-publish-button]),
                button[title*="publish"]:not([data-custom-publish-button]),
                span[title*="Publish"]:not([data-custom-publish-button]),
                span[title*="publish"]:not([data-custom-publish-button]),
                span[class*="Button--primary"][style*="rgb(111, 66, 193)"]:not([data-custom-publish-button]),
                span[class*="Button--primary"][style*="6f42c1"]:not([data-custom-publish-button]),
                span[class*="Button--primary"]:not([data-custom-publish-button]) {
                  display: none !important;
                  visibility: hidden !important;
                  opacity: 0 !important;
                  pointer-events: none !important;
                  position: absolute !important;
                  left: -9999px !important;
                  width: 0 !important;
                  height: 0 !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  overflow: hidden !important;
                }
                
                [class*="PuckHeader-inner"] {
                  display: flex !important;                 
                  white-space: nowrap !important;
                  
                }
                
                [class*="PuckHeader-title"] {
                 margin-left: auto !important;
                 margin-right: auto !important;
                 visibility: hidden !important;
                 opacity: 0 !important;
                 width: 0 !important;
                 overflow: hidden !important;
                }
                
                [class*="Header-title"] {
                  visibility: hidden !important;
                  opacity: 0 !important;
                  width: 0 !important;
                  overflow: hidden !important;
                }




                /* Style action buttons container */
                [data-action-buttons] {
                  display: flex !important;
                  align-items: center !important;
                  gap: 0 !important;
                  border-left: 1px solid #e5e7eb !important;
                  margin-left: 8px !important;
                  padding-left: 8px !important;
                  flex-shrink: 0 !important;
                }

                .puck {
                  height: 100% !important;
                }
                .puck__sidebar {
                  height: 100% !important;
                  overflow-y: auto !important;
                  max-height: calc(100vh - 64px) !important;
                }
                .puck__sidebar-content {
                  height: auto !important;
                  min-height: 100% !important;
                }
                [class*="puck__component-list"],
                [class*="puck__components"],
                [class*="puck__component-categories"] {
                  max-height: none !important;
                  overflow-y: auto !important;
                }
                .puck__sidebar [class*="scroll"],
                .puck__sidebar [class*="overflow"] {
                  overflow-y: auto !important;
                  max-height: none !important;
                }
                
                [data-puck-interactive="true"],
                [data-puck-interactive="true"] * {
                  pointer-events: auto !important;
                  cursor: pointer !important;
                }
                
                [data-puck-interactive="true"] {
                  position: relative !important;
                  z-index: 999 !important;
                }
              `}
            </style>
            <PuckDataContext.Provider value={{ data: currentData, onChange }}>
              <Puck 
                key={`${currentPage}-sidebar-${showCustomSidebar}-banner-${bannerKey.substring(0, 20)}`}
                config={getPuckConfig(
                  currentData?.root?.props?.pageType,
                  currentPageName
                ) as any} 
                data={currentData || { content: [], root: { props: {} }, zones: {} }}
                ui={showCustomSidebar ? {
                  ...puckUi,
                  leftSideBarVisible: false,
                  rightSideBarVisible: true,
                  drawer: null
                } : {
                  ...puckUi,
                  leftSideBarVisible: true,
                  rightSideBarVisible: showRightSidebar,
                }}
                onChange={(data: any) => {
                  // Update the ref with the latest data (including zones)
                  latestDataRef.current = data
                  
                  // Remove SchedulePage from non-schedule pages
                  // SchedulePage should only appear on pages with pageType='schedule'
                  if (data?.content) {
                    const pageType = data?.root?.props?.pageType
                    const isSchedulePage = pageType === 'schedule'
                    
                    if (!isSchedulePage) {
                      const hasSchedulePage = data.content.some((item: any) => item.type === 'SchedulePage')
                      if (hasSchedulePage) {
                        console.log('🔄 EditorView onChange - Removing SchedulePage from non-schedule page')
                        data = {
                          ...data,
                          content: data.content.filter((item: any) => item.type !== 'SchedulePage')
                        }
                        latestDataRef.current = data
                      }
                    }
                  }
                  
                  // ALWAYS preserve banner image - Priority: API banner (HTTPS) > localStorage (HTTPS) > saved page banner > localStorage (data URL) > API banner (fallback)
                  const bannerUrl = localStorage.getItem('event-form-banner')
                  const apiBanner = createdEvent?.banner
                  let processedApiBanner = apiBanner
                  if (processedApiBanner && processedApiBanner.startsWith('http://')) {
                    processedApiBanner = processedApiBanner.replace('http://', 'https://')
                  }
                  
                  if (data?.content) {
                    const heroSection = data.content.find((item: any) => item.type === 'HeroSection')
                    if (heroSection) {
                      const currentBanner = heroSection.props.backgroundImage || ''
                      const hasDefaultImage = currentBanner.includes('unsplash.com/photo-1540575467063')
                      
                      // Determine which banner to use - prioritize API HTTPS URLs over localStorage data URLs
                      let finalBanner: string | null = null
                      
                      // Priority 1: API banner (if it's an HTTPS URL - the correct uploaded banner)
                      if (processedApiBanner && processedApiBanner.startsWith('https://')) {
                        finalBanner = processedApiBanner
                        localStorage.setItem('event-form-banner', finalBanner)
                        console.log('🖼️ EditorView onChange - Using banner from createdEvent API (HTTPS URL)')
                      }
                      // Priority 2: localStorage banner (if it's an HTTPS URL, not a data URL)
                      else if (bannerUrl && bannerUrl.startsWith('https://')) {
                        finalBanner = bannerUrl
                        console.log('🖼️ EditorView onChange - Using banner from localStorage (HTTPS URL)')
                      }
                      // Priority 3: Saved page banner (if it's not default and not empty)
                      else if (currentBanner && !hasDefaultImage && currentBanner !== '') {
                        finalBanner = currentBanner
                        // If it's an HTTPS URL, sync to localStorage
                        if (currentBanner.startsWith('https://')) {
                          localStorage.setItem('event-form-banner', currentBanner)
                        }
                        console.log('🖼️ EditorView onChange - Using saved banner from page data')
                      }
                      // Priority 4: localStorage banner (even if data URL - fallback)
                      else if (bannerUrl) {
                        finalBanner = bannerUrl
                        console.log('🖼️ EditorView onChange - Using banner from localStorage (data URL fallback)')
                      }
                      // Priority 5: API banner (even if not HTTPS - final fallback)
                      else if (processedApiBanner) {
                        finalBanner = processedApiBanner
                        localStorage.setItem('event-form-banner', finalBanner)
                        console.log('🖼️ EditorView onChange - Using banner from createdEvent API (fallback)')
                      }
                      
                      // Update if we have a banner and it's different
                      // Create a new object to ensure React/Puck detects the change
                      if (finalBanner && (hasDefaultImage || !currentBanner || currentBanner !== finalBanner)) {
                        console.log('🖼️ EditorView onChange - Updating HeroSection backgroundImage:', finalBanner.substring(0, 50) + '...')
                        // Create new content array with updated heroSection to ensure proper re-render
                        const updatedContent = data.content.map((item: any) => {
                          if (item.type === 'HeroSection') {
                            return {
                              ...item,
                              props: {
                                ...item.props,
                                backgroundImage: finalBanner
                              }
                            }
                          }
                          return item
                        })
                        // Create new data object to trigger re-render
                        data = {
                          ...data,
                          content: updatedContent
                        }
                        // Update the ref with the new data
                        latestDataRef.current = data
                      }
                    }
                  }
                  
                  // Call the original onChange handler
                  onChange(data)
                }}
              />
            </PuckDataContext.Provider>
            <PuckPropertySidebarSaveButton
              getCurrentData={() => latestDataRef.current || currentData}
              currentPage={currentPage}
              currentPageName={currentPageName}
              onSaveSuccess={() => {
                // Optional: Reload pages or update state after save
                console.log('Page saved successfully')
              }}
            />
            <PuckHeaderButtons
              onPreviewToggle={onPreviewToggle}
              onPublish={() => {
                // Use the latest data from ref to ensure zones are included
                const dataToPublish = {
                  ...latestDataRef.current,
                  // Ensure zones are always included (even if empty)
                  zones: latestDataRef.current?.zones || {}
                }
                onPublish(dataToPublish)
              }}
              showPreview={showPreview}
              pageTitle={currentPageName}
              onBack={handleBackButtonClick}
            />
          </div>
        </NavigationProvider>
      )}

      <PageCreationModal
        isVisible={showPageCreationModal}
        onClose={() => {
          setShowPageCreationModal(false)
        }}
        onSelect={handlePageCreationSelect}
      />

      <NewPageCreationModal
        isVisible={showNewPageCreationModal}
        onClose={() => setShowNewPageCreationModal(false)}
        onSelect={handleNewPageCreationSelect}
      />

      <HtmlCodeModal
        isVisible={showHtmlCodeModal}
        onClose={() => setShowHtmlCodeModal(false)}
        onConvert={handleHtmlCodeConvert}
      />

      <BlockTypeSelectionModal
        isVisible={showBlockTypeModal}
        onClose={() => setShowBlockTypeModal(false)}
        onSelect={handleBlockTypeSelect}
      />

      <TemplateSelectionModal
        isVisible={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />
    </div>
  )
}

const PuckHeaderButtons: React.FC<{
  onPreviewToggle: () => void
  onPublish: () => void
  showPreview: boolean
  pageTitle: string
  onBack?: () => void
}> = ({ onPreviewToggle, onPublish, showPreview, pageTitle, onBack }) => {
  useEffect(() => {
    let isUpdating = false
    let lastUpdateTime = 0
    const UPDATE_THROTTLE = 100 // ms
    
    const waitForPageReady = () => {
      return new Promise<void>((resolve) => {
        if (document.readyState === 'complete') {
          resolve()
        } else {
          window.addEventListener('load', () => resolve(), { once: true })
        }
      })
    }

    const findAndInjectButtons = () => {
      // Prevent rapid re-execution
      const now = Date.now()
      if (isUpdating || (now - lastUpdateTime < UPDATE_THROTTLE)) {
        return
      }
      
      isUpdating = true
      lastUpdateTime = now
      const headerSelectors = [
        '[class*="Header"]',
        'header',
        '[class*="puck__header"]',
        '[data-puck-header]',
      ]

      let header: HTMLElement | null = null
      for (const selector of headerSelectors) {
        const elements = document.querySelectorAll(selector)
        for (const el of Array.from(elements)) {
          if (el.querySelector('button') || el.textContent?.includes('Publish')) {
            header = el as HTMLElement
            break
          }
        }
        if (header) break
      }

      if (!header) return

      // Always keep the header title in sync with the current page name
      const syncHeaderTitle = () => {
        const nextTitle = (pageTitle || '').trim() || 'Page 1'
        const headerInner = header.querySelector('[class*="PuckHeader-inner"]') as HTMLElement | null
        const scope: ParentNode = headerInner || header
        const existingTitle = scope.querySelector('[data-custom-page-title]') as HTMLElement | null

        if (existingTitle) {
          if ((existingTitle.textContent || '').trim() !== nextTitle) {
            existingTitle.textContent = nextTitle
          }
          return
        }

        // Fallback: inject our own title element once
        if (headerInner && !headerInner.querySelector('[data-custom-page-title]')) {
          const titleEl = document.createElement('div')
          titleEl.setAttribute('data-custom-page-title', 'true')
          titleEl.textContent = nextTitle
          titleEl.style.cssText = `
            flex: 1;
            text-align: center;
            font-weight: 600;
            color: #111827;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 12px;
          `
          // Insert near the middle: after first child if possible
          const first = headerInner.firstChild
          if (first && first.nextSibling) {
            headerInner.insertBefore(titleEl, first.nextSibling)
          } else {
            headerInner.appendChild(titleEl)
          }
        }
      }

      syncHeaderTitle()

      const existingLeftContainer = header.querySelector('[data-puck-header-left]')
      const existingPreviewBtn = header.querySelector('[data-custom-preview-button]') as HTMLElement
      const existingPublishBtn = header.querySelector('[data-custom-publish-button]') as HTMLElement
      const existingFallbackPreviewBtn = header.querySelector('[data-fallback-preview-button]') as HTMLElement

      // Keep only one preview button (fallback). Remove legacy custom preview button if present.
      if (existingPreviewBtn) {
        existingPreviewBtn.remove()
      }
      
      // If fallback preview button exists and is properly attached, just update it and return early
      if (existingFallbackPreviewBtn &&
          existingFallbackPreviewBtn.isConnected &&
          existingLeftContainer) {
        existingFallbackPreviewBtn.setAttribute('title', showPreview ? 'Exit Preview' : 'Preview')
        existingFallbackPreviewBtn.setAttribute('aria-label', showPreview ? 'Exit Preview' : 'Preview')
        existingFallbackPreviewBtn.style.backgroundColor = showPreview ? '#7c3aed' : '#ffffff'
        existingFallbackPreviewBtn.style.color = showPreview ? '#ffffff' : '#6b7280'
        existingFallbackPreviewBtn.style.display = 'inline-flex'
        existingFallbackPreviewBtn.style.visibility = 'visible'
        existingFallbackPreviewBtn.style.opacity = '1'
        isUpdating = false
        return
      }
      
      // Only remove if they're not properly connected
      if (existingPublishBtn && existingPublishBtn.parentNode && !existingPublishBtn.isConnected) {
        existingPublishBtn.parentNode.removeChild(existingPublishBtn)
      }

      const allButtons = Array.from(header.querySelectorAll('button'))
      
      const publishButtons = allButtons.filter(btn => {
        const text = btn.textContent || ''
        const ariaLabel = btn.getAttribute('aria-label') || ''
        const title = btn.getAttribute('title') || ''
        const testId = btn.getAttribute('data-testid') || ''
        return testId.includes('publish') ||
               text.toLowerCase().includes('publish') || 
               ariaLabel.toLowerCase().includes('publish') ||
               title.toLowerCase().includes('publish') ||
               btn.className.includes('publish') ||
               btn.className.includes('Publish')
      }) as HTMLElement[]

      publishButtons.forEach(publishButton => {
        if (!publishButton.hasAttribute('data-custom-publish-button')) {
          publishButton.style.display = 'none'
          publishButton.style.visibility = 'hidden'
          publishButton.setAttribute('data-hidden-publish-btn', 'true')
        }
      })

      const menuBarInner = header.querySelector('[class*="MenuBar-inner"]') as HTMLElement
      if (menuBarInner) {
        menuBarInner.style.setProperty('margin-left', 'auto', 'important')
        menuBarInner.style.setProperty('flex-shrink', '0', 'important')
        menuBarInner.style.setProperty('white-space', 'nowrap', 'important')
        
        const menuBarParent = menuBarInner.parentElement
        if (menuBarParent) {
          const parentStyle = window.getComputedStyle(menuBarParent)
          if (parentStyle.display !== 'flex') {
            menuBarParent.style.setProperty('display', 'flex', 'important')
            menuBarParent.style.setProperty('align-items', 'center', 'important')
            menuBarParent.style.setProperty('width', '100%', 'important')
          }
        }
      }

      const headerInner = header.querySelector('[class*="PuckHeader-inner"]') as HTMLElement
      
      if (!headerInner) return

      const allInnerElements = Array.from(headerInner.querySelectorAll('*')) as HTMLElement[]
      const panelToggleButtons = allInnerElements.filter(el => {
        const svg = el.querySelector('svg')
        if (svg) {
          const svgClass = svg.getAttribute('class') || ''
          return svgClass.includes('lucide-panel') || 
                 svgClass.includes('panel-right') || 
                 svgClass.includes('panel-left') ||
                 svg.getAttribute('data-lucide')?.includes('panel')
        }
        let elClass = ''
        if (typeof el.className === 'string') {
          elClass = el.className
        } else if (el.className && typeof el.className === 'object') {
          elClass = String(el.className) || ''
        }
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase()
        const title = (el.getAttribute('title') || '').toLowerCase()
        return elClass.includes('lucide-panel') ||
               elClass.includes('panel-right') ||
               elClass.includes('panel-left') ||
               ariaLabel.includes('panel') ||
               title.includes('panel')
      })

      const existingBackButton = headerInner.querySelector('[data-custom-back-button]')

      if (onBack && panelToggleButtons.length > 0 && !existingBackButton) {
        const firstPanelButton = panelToggleButtons[0]
        
        const backButton = document.createElement('button')
        backButton.setAttribute('data-custom-back-button', 'true')
        backButton.setAttribute('title', 'Edit components')
        backButton.setAttribute('aria-label', 'Edit components')
        backButton.style.cssText = `
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        `
        
        const backIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        backIcon.setAttribute('width', '20')
        backIcon.setAttribute('height', '20')
        backIcon.setAttribute('viewBox', '0 0 24 24')
        backIcon.setAttribute('fill', 'none')
        backIcon.setAttribute('stroke', 'currentColor')
        backIcon.setAttribute('stroke-width', '2')
        backIcon.setAttribute('stroke-linecap', 'round')
        backIcon.setAttribute('stroke-linejoin', 'round')
        // Pencil / edit icon (no underline)
        backIcon.innerHTML =
          '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/><path d="m15 5 3 3"/>'
        backButton.appendChild(backIcon)
        
        backButton.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          onBack()
        })
        
        backButton.addEventListener('mouseenter', () => {
          backButton.style.backgroundColor = '#f3f4f6'
          backButton.style.color = '#374151'
        })
        backButton.addEventListener('mouseleave', () => {
          backButton.style.backgroundColor = 'transparent'
          backButton.style.color = '#6b7280'
        })

        const backDivider = document.createElement('div')
        backDivider.setAttribute('data-back-button-divider', 'true')
        backDivider.style.cssText = `
          width: 1px;
          height: 24px;
          background-color: #e5e7eb;
          margin: 0 8px;
          flex-shrink: 0;
        `

        const panelButtonParent = firstPanelButton.parentElement
        if (panelButtonParent === headerInner) {
          headerInner.insertBefore(backDivider, firstPanelButton)
          headerInner.insertBefore(backButton, backDivider)
        } else if (panelButtonParent) {
          panelButtonParent.insertBefore(backDivider, firstPanelButton)
          panelButtonParent.insertBefore(backButton, backDivider)
        } else {
          headerInner.insertBefore(backDivider, headerInner.firstChild)
          headerInner.insertBefore(backButton, backDivider)
        }
      }

      const allHeaderButtons = Array.from(header.querySelectorAll('button, [role="button"], span[class*="Button"]')) as HTMLElement[]
      let undoButton = allHeaderButtons.find(btn => {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase()
        const title = (btn.getAttribute('title') || '').toLowerCase()
        return ariaLabel.includes('undo') || title.includes('undo')
      })
      
      let redoButton = allHeaderButtons.find(btn => {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase()
        const title = (btn.getAttribute('title') || '').toLowerCase()
        return ariaLabel.includes('redo') || title.includes('redo')
      })
      
      let insertAfterElement: HTMLElement | null = null
      if (redoButton && redoButton.parentElement) {
        insertAfterElement = redoButton.parentElement
      } else if (undoButton && undoButton.parentElement) {
        insertAfterElement = undoButton.parentElement
      } else if (redoButton) {
        insertAfterElement = redoButton
      } else if (undoButton) {
        insertAfterElement = undoButton
      }
      
      let leftContainer = header.querySelector('[data-puck-header-left]') as HTMLElement
      
      if (!leftContainer) {
        leftContainer = document.createElement('div')
        leftContainer.setAttribute('data-puck-header-left', 'true')
        leftContainer.style.display = 'flex'
        leftContainer.style.alignItems = 'center'
        leftContainer.style.gap = '0'
        leftContainer.setAttribute('data-styles-set', 'true')
        if (insertAfterElement && insertAfterElement.nextSibling) {
          insertAfterElement.parentElement?.insertBefore(leftContainer, insertAfterElement.nextSibling)
        } else if (insertAfterElement) {
          insertAfterElement.parentElement?.appendChild(leftContainer)
        } else {
          header.insertBefore(leftContainer, header.firstChild)
        }
      }

      // Update existing preview button if it exists, otherwise create it
      if (existingPreviewBtn) {
        // Update the existing button's appearance based on showPreview state
        existingPreviewBtn.setAttribute('title', showPreview ? 'Exit Preview' : 'Preview')
        existingPreviewBtn.setAttribute('aria-label', showPreview ? 'Exit Preview' : 'Preview')
        if (!showPreview) {
          existingPreviewBtn.style.backgroundColor = 'transparent'
          existingPreviewBtn.style.color = '#6b7280'
        } else {
          existingPreviewBtn.style.backgroundColor = '#7c3aed'
          existingPreviewBtn.style.color = '#ffffff'
        }
        existingPreviewBtn.style.display = 'flex'
        existingPreviewBtn.style.alignItems = 'center'
        existingPreviewBtn.style.justifyContent = 'center'
        existingPreviewBtn.style.minWidth = '44px'
        existingPreviewBtn.style.height = '36px'
        existingPreviewBtn.style.padding = '8px 12px'
        existingPreviewBtn.style.opacity = '1'
        existingPreviewBtn.style.visibility = 'visible'

        // Self-heal icon if any external style/script removed it.
        let existingIcon = existingPreviewBtn.querySelector('svg') as SVGElement | null
        if (!existingIcon) {
          existingIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          existingIcon.setAttribute('viewBox', '0 0 24 24')
          existingIcon.setAttribute('fill', 'none')
          existingIcon.setAttribute('stroke', 'currentColor')
          existingIcon.setAttribute('stroke-width', '2')
          existingIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
          existingPreviewBtn.innerHTML = ''
          existingPreviewBtn.appendChild(existingIcon)
        }
        existingIcon.setAttribute('width', '20')
        existingIcon.setAttribute('height', '20')
        return
      }

      const existingActionContainer = leftContainer.querySelector('[data-action-buttons]')
      let actionButtonsContainer: HTMLElement
      
      if (existingActionContainer) {
        actionButtonsContainer = existingActionContainer as HTMLElement
      } else {
        actionButtonsContainer = document.createElement('div')
        actionButtonsContainer.setAttribute('data-action-buttons', 'true')
        actionButtonsContainer.style.cssText = `
          display: flex;
          align-items: center;
          border-left: 1px solid #e5e7eb;
        `
      }

      const existingPreviewContainer = leftContainer.querySelector('[data-preview-container]')
      let previewContainer: HTMLElement
      
      if (existingPreviewContainer) {
        previewContainer = existingPreviewContainer as HTMLElement
      } else {
        previewContainer = document.createElement('div')
        previewContainer.setAttribute('data-preview-container', 'true')
        previewContainer.style.cssText = `
          display: flex;
          align-items: center;
          border-left: 1px solid #e5e7eb;
        `
      }

      // Remove any previously injected publish remnants so preview keeps clean spacing.
      const stalePublishBtn = leftContainer.querySelector('[data-custom-publish-button]')
      if (stalePublishBtn) stalePublishBtn.remove()
      const stalePublishDivider = leftContainer.querySelector('[data-publish-divider]')
      if (stalePublishDivider) stalePublishDivider.remove()

      if (!actionButtonsContainer.contains(previewContainer)) {
        actionButtonsContainer.appendChild(previewContainer)
      }
      if (!leftContainer.contains(actionButtonsContainer)) {
        leftContainer.appendChild(actionButtonsContainer)
      }
      
      isUpdating = false

      if (actionButtonsContainer.children.length > 0) {
        leftContainer.appendChild(actionButtonsContainer)
      }

      // Hard fallback preview button: always ensure one visible eye button in header.
      // This avoids edge-cases where container-based injection is hidden by upstream DOM updates.
      if (!existingFallbackPreviewBtn) {
        const fallbackPreviewBtn = document.createElement('button')
        fallbackPreviewBtn.setAttribute('data-fallback-preview-button', 'true')
        fallbackPreviewBtn.setAttribute('data-puck-custom-button', 'true')
        fallbackPreviewBtn.setAttribute('title', showPreview ? 'Exit Preview' : 'Preview')
        fallbackPreviewBtn.setAttribute('aria-label', showPreview ? 'Exit Preview' : 'Preview')
        fallbackPreviewBtn.style.cssText = `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 36px;
          min-width: 40px;
          margin-left: 6px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: ${showPreview ? '#7c3aed' : '#ffffff'};
          color: ${showPreview ? '#ffffff' : '#6b7280'};
          cursor: pointer;
          visibility: visible;
          opacity: 1;
          z-index: 1001;
          position: relative;
        `
        const eye = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        eye.setAttribute('width', '18')
        eye.setAttribute('height', '18')
        eye.setAttribute('viewBox', '0 0 24 24')
        eye.setAttribute('fill', 'none')
        eye.setAttribute('stroke', 'currentColor')
        eye.setAttribute('stroke-width', '2')
        eye.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
        fallbackPreviewBtn.appendChild(eye)
        fallbackPreviewBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          e.preventDefault()
          onPreviewToggle()
        })
        headerInner.appendChild(fallbackPreviewBtn)
      } else {
        existingFallbackPreviewBtn.setAttribute('title', showPreview ? 'Exit Preview' : 'Preview')
        existingFallbackPreviewBtn.setAttribute('aria-label', showPreview ? 'Exit Preview' : 'Preview')
        existingFallbackPreviewBtn.style.backgroundColor = showPreview ? '#7c3aed' : '#ffffff'
        existingFallbackPreviewBtn.style.color = showPreview ? '#ffffff' : '#6b7280'
        existingFallbackPreviewBtn.style.display = 'inline-flex'
        existingFallbackPreviewBtn.style.visibility = 'visible'
        existingFallbackPreviewBtn.style.opacity = '1'
        let icon = existingFallbackPreviewBtn.querySelector('svg') as SVGElement | null
        if (!icon) {
          icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          icon.setAttribute('viewBox', '0 0 24 24')
          icon.setAttribute('fill', 'none')
          icon.setAttribute('stroke', 'currentColor')
          icon.setAttribute('stroke-width', '2')
          icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
          existingFallbackPreviewBtn.innerHTML = ''
          existingFallbackPreviewBtn.appendChild(icon)
        }
        icon.setAttribute('width', '18')
        icon.setAttribute('height', '18')
      }

    }

    const hideAllPublishButtons = () => {
      const puckHeaders = document.querySelectorAll('[class*="puck"]:not([data-puck-header-left]), [class*="Puck"]:not([data-puck-header-left]), header:not([data-puck-header-left]), [class*="Header"]:not([data-puck-header-left]), [class*="Toolbar"]:not([data-puck-header-left]), [class*="toolbar"]:not([data-puck-header-left]), [class*="PuckHeader"]:not([data-puck-header-left])')
      const puckHeaderButtons: HTMLElement[] = []
      puckHeaders.forEach(header => {
        if (header.hasAttribute('data-puck-header-left') || header.querySelector('[data-puck-header-left]')) {
          return
        }
        const buttons = header.querySelectorAll('button:not([data-puck-header-left] *), span[class*="Button"]:not([data-puck-header-left] *), span[class*="button"]:not([data-puck-header-left] *), div[class*="Button"]:not([data-puck-header-left] *), div[class*="button"]:not([data-puck-header-left] *), [role="button"]:not([data-puck-header-left] *)')
        buttons.forEach(btn => {
          if (!btn.closest('[data-puck-header-left]')) {
            puckHeaderButtons.push(btn as HTMLElement)
          }
        })
      })
      
      const allDocumentButtons = Array.from(document.querySelectorAll('button:not([data-puck-header-left] *), span[class*="Button"]:not([data-puck-header-left] *), span[class*="button"]:not([data-puck-header-left] *), [role="button"]:not([data-puck-header-left] *)')) as HTMLElement[]
      const filteredButtons = allDocumentButtons.filter(btn => !btn.closest('[data-puck-header-left]'))
      
      const buttonsToCheck = [...new Set([...puckHeaderButtons, ...filteredButtons])]
      
      buttonsToCheck.forEach(btn => {
        // Never remove our custom buttons
        if (btn.hasAttribute('data-custom-publish-button') ||
            btn.hasAttribute('data-custom-preview-button') ||
            btn.hasAttribute('data-fallback-preview-button') ||
            btn.hasAttribute('data-puck-custom-button') ||
            btn.closest('[data-custom-preview-button]') ||
            btn.closest('[data-fallback-preview-button]') ||
            btn.closest('[data-custom-publish-button]')) {
          return
        }
        
        if (btn.hasAttribute('data-hidden-publish-btn')) {
          const isVisible = window.getComputedStyle(btn).display !== 'none'
          if (!isVisible) return
          btn.removeAttribute('data-hidden-publish-btn')
        }
        
        const text = (btn.textContent || '').trim()
        const innerHTML = btn.innerHTML || ''
        const ariaLabel = btn.getAttribute('aria-label') || ''
        const title = btn.getAttribute('title') || ''
        const testId = btn.getAttribute('data-testid') || ''
        const className = btn.className || ''
        const style = btn.getAttribute('style') || ''
        
        const computedStyle = window.getComputedStyle(btn)
        const bgColor = computedStyle.backgroundColor
        const isPurpleButton = bgColor.includes('124, 58, 237') ||
                               bgColor.includes('111, 66, 193') ||
                               bgColor.includes('purple') ||
                               style.includes('7c3aed') ||
                               style.includes('6f42c1')
        
        const isProtectedButton = 
          text.toLowerCase().includes('toggle') ||
          text.toLowerCase().includes('sidebar') ||
          text.toLowerCase().includes('menu') ||
          text.toLowerCase() === 'undo' ||
          text.toLowerCase() === 'redo' ||
          text.toLowerCase().includes('undo') ||
          text.toLowerCase().includes('redo') ||
          className.includes('IconButton') && !isPurpleButton
        
        if (isProtectedButton) {
          return
        }
        
        const hasPublishText = 
          testId.toLowerCase().includes('publish') ||
          text.toLowerCase() === 'publish' ||
          text.toLowerCase().includes('publish') || 
          ariaLabel.toLowerCase().includes('publish') ||
          title.toLowerCase().includes('publish') ||
          className.toLowerCase().includes('publish') ||
          innerHTML.toLowerCase().includes('publish')
        
        const svgElement = btn.querySelector('svg')
        const hasGlobeIcon = svgElement && (
          svgElement.innerHTML.includes('globe') ||
          svgElement.innerHTML.includes('Globe') ||
          (svgElement.innerHTML.includes('circle') && hasPublishText)
        )
        
        const isPublishButton = 
          hasPublishText ||
          (isPurpleButton && (hasPublishText || hasGlobeIcon)) ||
          (hasGlobeIcon && hasPublishText)
        
        if (isPublishButton) {
          try {
            const parent = btn.parentElement
            const grandParent = parent?.parentElement
            
            btn.remove()
            
            if (parent && parent.children.length === 0) {
              parent.remove()
            }
            
            if (grandParent && grandParent.children.length === 0) {
              grandParent.remove()
            }
            
            return
          } catch (removeError) {
          }
          
          btn.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; position: absolute !important; left: -9999px !important; width: 0 !important; height: 0 !important; padding: 0 !important; margin: 0 !important; border: none !important; outline: none !important; overflow: hidden !important;'
          
          btn.style.setProperty('display', 'none', 'important')
          btn.style.setProperty('visibility', 'hidden', 'important')
          btn.style.setProperty('opacity', '0', 'important')
          btn.style.setProperty('pointer-events', 'none', 'important')
          btn.style.setProperty('position', 'absolute', 'important')
          btn.style.setProperty('left', '-9999px', 'important')
          btn.style.setProperty('width', '0', 'important')
          btn.style.setProperty('height', '0', 'important')
          btn.style.setProperty('padding', '0', 'important')
          btn.style.setProperty('margin', '0', 'important')
          btn.style.setProperty('border', 'none', 'important')
          btn.style.setProperty('outline', 'none', 'important')
          btn.style.setProperty('overflow', 'hidden', 'important')
          btn.setAttribute('data-hidden-publish-btn', 'true')
          
          btn.setAttribute('aria-hidden', 'true')
          btn.setAttribute('tabindex', '-1')
          
          try {
            const parent = btn.parentElement
            if (parent) {
              const parentText = parent.textContent?.toLowerCase().trim() || ''
              const hasOnlyPublish = parent.children.length === 1 && 
                                     (parentText === 'publish' || parentText.includes('publish'))
              if (hasOnlyPublish) {
                parent.remove()
              } else {
                const visibleChildren = Array.from(parent.children).filter((child: Element) => {
                  const childStyle = window.getComputedStyle(child as HTMLElement)
                  return childStyle.display !== 'none'
                })
                if (visibleChildren.length === 0) {
                  parent.style.setProperty('display', 'none', 'important')
                }
              }
            }
          } catch (e) {
          }
        }
        
        if (!isPublishButton && !btn.hasAttribute('data-custom-publish-button') && !btn.hasAttribute('data-hidden-publish-btn') && !isProtectedButton) {
          const btnParent = btn.closest('header, [class*="Header"], [class*="Toolbar"], [class*="toolbar"], [class*="puck"], [class*="PuckHeader"]')
          if (btnParent) {
            const computedBg = window.getComputedStyle(btn).backgroundColor
            const btnText = (btn.textContent || '').trim().toLowerCase()
            const tagName = btn.tagName.toUpperCase()
            const hasButtonClass = className.includes('Button')
            
            const isPurpleColored = computedBg.includes('124, 58, 237') ||
                                   computedBg.includes('111, 66, 193') ||
                                   computedBg.includes('139, 92, 246') ||
                                   computedBg.includes('147, 51, 234') ||
                                   btn.getAttribute('style')?.includes('7c3aed') ||
                                   btn.getAttribute('style')?.includes('6f42c1') ||
                                   btn.getAttribute('style')?.includes('8b5cf6')
            
            if ((isPurpleColored && btnText.includes('publish')) ||
                (tagName === 'SPAN' && hasButtonClass && btnText.includes('publish') && isPurpleColored)) {
              try {
                btn.remove()
              } catch (e) {
                btn.style.setProperty('display', 'none', 'important')
                btn.style.setProperty('visibility', 'hidden', 'important')
                btn.style.setProperty('opacity', '0', 'important')
                btn.style.setProperty('width', '0', 'important')
                btn.style.setProperty('height', '0', 'important')
                btn.style.setProperty('position', 'absolute', 'important')
                btn.style.setProperty('left', '-9999px', 'important')
                btn.setAttribute('data-hidden-publish-btn', 'true')
              }
            }
          }
        }
      })
    }

    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false
      mutations.forEach((mutation) => {
        const target = mutation.target as HTMLElement
        
        // Completely ignore any mutations on our custom buttons or their containers
        if (target && (
          target.hasAttribute('data-custom-preview-button') ||
          target.hasAttribute('data-custom-publish-button') ||
          target.hasAttribute('data-fallback-preview-button') ||
          target.hasAttribute('data-puck-custom-button') ||
          target.hasAttribute('data-preview-container') ||
          target.hasAttribute('data-action-buttons') ||
          target.hasAttribute('data-puck-header-left') ||
          target.closest('[data-custom-preview-button]') ||
          target.closest('[data-fallback-preview-button]') ||
          target.closest('[data-custom-publish-button]') ||
          target.closest('[data-preview-container]') ||
          target.closest('[data-action-buttons]') ||
          target.closest('[data-puck-header-left]')
        )) {
          return
        }
        
        // Ignore style-only mutations (hover effects)
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          return
        }
        
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              const element = node as HTMLElement
              // Skip if it's our custom button
              if (element.hasAttribute('data-custom-preview-button') || 
                  element.hasAttribute('data-custom-publish-button') ||
                  element.closest('[data-custom-preview-button]') ||
                  element.closest('[data-custom-publish-button]')) {
                return
              }
              
              const tagName = element.tagName.toUpperCase()
              const isButtonLike = tagName === 'BUTTON' || 
                                   tagName === 'SPAN' ||
                                   element.classList.toString().includes('Button') ||
                                   element.getAttribute('role') === 'button'
              
              if (isButtonLike) {
                const text = (element.textContent || '').toLowerCase()
                if (text.includes('publish')) {
                  hideAllPublishButtons()
                  shouldCheck = true
                }
              } else if (element.querySelector('button, span[class*="Button"], [role="button"]')) {
                shouldCheck = true
              }
            }
          })
        }
        
        if (mutation.type === 'attributes' && mutation.target) {
          const target = mutation.target as HTMLElement
          // Skip if it's our custom button
          if (target.hasAttribute('data-custom-preview-button') || 
              target.hasAttribute('data-custom-publish-button') ||
              target.closest('[data-custom-preview-button]') ||
              target.closest('[data-custom-publish-button]')) {
            return
          }
          
          const tagName = target.tagName.toUpperCase()
          const isButtonLike = tagName === 'BUTTON' || 
                               tagName === 'SPAN' ||
                               target.classList.toString().includes('Button') ||
                               target.getAttribute('role') === 'button'
          
          if (isButtonLike && !target.hasAttribute('data-custom-publish-button')) {
            const text = (target.textContent || '').toLowerCase()
            if (text.includes('publish')) {
              hideAllPublishButtons()
            }
          }
        }
      })
      if (shouldCheck) {
        setTimeout(hideAllPublishButtons, 0)
        setTimeout(hideAllPublishButtons, 50)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-testid'] // Removed 'style' to ignore hover style changes
    })

    waitForPageReady().then(() => {
      requestAnimationFrame(() => {
        findAndInjectButtons()
        hideAllPublishButtons()
      })
    })
    
    let rafId: number | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null
    let timeoutIds: ReturnType<typeof setTimeout>[] = []
    let buttonsInjected = false
    
    waitForPageReady().then(() => {
      timeoutIds = [
        setTimeout(() => { hideAllPublishButtons() }, 0),
        setTimeout(() => { hideAllPublishButtons() }, 10),
        setTimeout(() => { hideAllPublishButtons() }, 50),
        setTimeout(() => { hideAllPublishButtons() }, 100),
        setTimeout(() => { hideAllPublishButtons() }, 200),
        setTimeout(() => { hideAllPublishButtons() }, 500),
        setTimeout(() => { hideAllPublishButtons() }, 1000)
      ]
      
      const timeout = setTimeout(() => {
        findAndInjectButtons()
        hideAllPublishButtons()
        const existingPreview = document.querySelector('[data-custom-preview-button]')
        const existingPublish = document.querySelector('[data-custom-publish-button]')
        if (existingPreview && existingPublish) {
          buttonsInjected = true
        }
      }, 100)
      timeoutIds.push(timeout)
      
      const checkWithRAF = () => {
        if (!buttonsInjected) {
          hideAllPublishButtons()
          rafId = requestAnimationFrame(checkWithRAF)
        } else {
          rafId = null
        }
      }
      checkWithRAF()
      
      const createInterval = (slow: boolean) => {
        if (intervalId !== null) {
          clearInterval(intervalId)
        }
        intervalId = setInterval(() => {
          // Skip if currently updating
          if (isUpdating) {
            return
          }
          
          const existingPreview = document.querySelector('[data-custom-preview-button]') as HTMLElement
          
          // Check if preview button exists and is properly connected to DOM
          if (existingPreview && existingPreview.isConnected) {
            if (!buttonsInjected) {
              buttonsInjected = true
            }
            // Only update if state actually changed (check class)
            const shouldBeActive = showPreview
            const isCurrentlyActive = existingPreview.classList.contains('puck-preview-active')
            
            if (shouldBeActive !== isCurrentlyActive) {
              existingPreview.setAttribute('title', showPreview ? 'Exit Preview' : 'Preview')
              if (showPreview) {
                existingPreview.classList.add('puck-preview-active')
              } else {
                existingPreview.classList.remove('puck-preview-active')
              }
            }
            if (slow) {
              hideAllPublishButtons()
            }
          } else if (!buttonsInjected) {
            hideAllPublishButtons()
            findAndInjectButtons()
            const checkPreview = document.querySelector('[data-custom-preview-button]') as HTMLElement
            if (checkPreview && checkPreview.isConnected) {
              buttonsInjected = true
              createInterval(true)
            }
          } else {
            hideAllPublishButtons()
          }
        }, slow ? 3000 : 500) // Increased intervals to reduce frequency
      }
      createInterval(false)
    })

    return () => {
      timeoutIds.forEach(t => clearTimeout(t))
      if (intervalId !== null) {
        clearInterval(intervalId)
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      observer.disconnect()
      const existingButtons = document.querySelector('[data-custom-buttons="true"]')
      if (existingButtons) {
        existingButtons.remove()
      }
    }
   }, [onPreviewToggle, onPublish, showPreview, pageTitle, onBack])

  return null
}

export default EditorView
