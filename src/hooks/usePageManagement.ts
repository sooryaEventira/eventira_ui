import { useState, useEffect, useCallback, useRef } from 'react'
import { Page } from '../types'
import { logger } from '../utils/logger'
import { API_ENDPOINTS } from '../config/env'
import { isPageApiAvailable } from '../utils/apiHelpers'
import { useEventForm } from '../contexts/EventFormContext'
import { fetchWebpage } from '../services/webpageService'

// Function to convert HeadingBlock to Heading for compatibility
const convertHeadingBlock = (item: any) => {
  if (item.type === "HeadingBlock") {
    return {
      type: "Heading",
      props: {
        text: item.props.title,
        level: 1,
        color: '#333',
        align: 'left' as const
      }
    }
  }
  return item
}

// Function to convert JSON structure to Puck-compatible format
const convertJsonToPuckData = (jsonData: any, pageKey: string = 'home') => {
  const page = jsonData[pageKey]
  if (!page || !page.data || !page.data["/"]) {
    return { content: [], root: { props: {} }, zones: {} }
  }
  
  const puckData = page.data["/"]
  const convertedContent = puckData.content?.map(convertHeadingBlock) || []
  
  // Ensure each content item has a proper id
  const contentWithIds = convertedContent.map((item: any, index: number) => ({
    ...item,
    id: item.id || `${item.type}-${index}-${Date.now()}`
  }))
  
  return {
    content: contentWithIds,
    root: {
      props: puckData.root?.props || {}
    },
    zones: puckData.zones || {}
  }
}

// Function to convert JSON structure to pages list
const convertJsonToPagesList = (jsonData: any): Page[] => {
  return Object.keys(jsonData).map(key => {
    const page = jsonData[key]
    return {
      id: key,
      name: page.title,
      filename: `${key}.json`,
      lastModified: new Date().toISOString()
    }
  })
}

// Helper function to generate unique IDs
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Helper function to format event date range (start + end)
// Desired format (same month/year): "Jan 13-14, 2026"
const formatEventDate = (startDate?: string, endDate?: string): string => {
  if (!startDate && !endDate) return 'Jan 13, 2025'
  try {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const fmtFull = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const fmtMonthShort = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short' })

    if (start && !isNaN(start.getTime()) && (!end || isNaN(end.getTime()))) {
      return fmtFull(start)
    }
    if (end && !isNaN(end.getTime()) && (!start || isNaN(start.getTime()))) {
      return fmtFull(end)
    }
    if (!start || !end) return 'Jan 13, 2025'

    // Same day
    if (start.toDateString() === end.toDateString()) {
      return fmtFull(start)
    }

    const sameYear = start.getFullYear() === end.getFullYear()
    const sameMonth = sameYear && start.getMonth() === end.getMonth()

    // Same month + year: "Jan 13-14, 2026"
    if (sameMonth) {
      const month = fmtMonthShort(start)
      const startDay = start.getDate()
      const endDay = end.getDate()
      const year = start.getFullYear()
      return `${month} ${startDay}-${endDay}, ${year}`
    }

    // Same year but different month: "Jan 31 - Feb 2, 2026"
    if (sameYear) {
      const startMonth = fmtMonthShort(start)
      const endMonth = fmtMonthShort(end)
      const startDay = start.getDate()
      const endDay = end.getDate()
      const year = start.getFullYear()
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
    }

    // Different years: fall back to full explicit dates
    return `${fmtFull(start)} - ${fmtFull(end)}`
  } catch {
    return 'Jan 13, 2025'
  }
}

// Default template data with HeroSection, AboutSection, SpeakersSection, Sponsors, RegistrationCTA, and ContactFooter
const getDefaultTemplateData = (pageName: string = 'Page 1', eventData?: any) => {
  const heroId = generateId('HeroSection')
  const aboutId = generateId('AboutSection')
  const speakersId = generateId('SpeakersSection')
  const registrationCTAId = generateId('RegistrationCTA')
  const sponsorsId = generateId('Sponsors')
  const faqId = generateId('FAQAccordion')
  const contactFooterId = generateId('ContactFooter')
  
  // Default banner: do NOT pull from global localStorage (can be from another event).
  // If no banner was uploaded for this event, we keep the template's default.
  const bannerUrl = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80'
  
  // Get event data values
  const eventName = eventData?.eventName || 'Event Title'
  const location = eventData?.location || 'Location'
  const eventDate = formatEventDate(eventData?.startDate, eventData?.endDate)
  const subtitle = `${location} | ${eventDate}`
  
  return {
    content: [
      {
        type: 'HeroSection',
        props: {
          id: heroId,
          title: eventName,
          subtitle: subtitle,
          buttons: [
            {
              text: 'Register Now',
              link: '#register',
              color: '#6938EF',
              textColor: 'white',
              size: 'large'
            }
          ],
          backgroundColor: '#1a1a1a',
          textColor: 'white',
          backgroundImage: bannerUrl,
          height: '500px',
          alignment: 'center',
          overlayOpacity: 0.4,
          titleSize: '3.5rem',
          subtitleSize: '1.25rem',
          buttonSpacing: '12px'
        }
      },
      {
        type: 'AboutSection',
        props: {
          id: aboutId,
          leftTitle: 'About Event',
          leftText: 'We are dedicated to providing innovative solutions that help our clients achieve their goals and drive success in their respective industries.',
          backgroundColor: '#ffffff',
          textColor: '#333333',
          padding: '3rem 2rem'
        }
      },
      {
        type: 'SpeakersSection',
        props: {
          id: speakersId,
          title: 'Speakers',
          showTitle: true,
          speakers: [
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
          ],
          backgroundColor: '#ffffff',
          padding: '0 2rem',
          gap: '2rem',
          containerMaxWidth: 'max-w-7xl',
          containerPadding: 'px-4 sm:px-6 lg:px-8 py-8'
        }
      },
      {
        type: 'RegistrationCTA',
        props: {
          id: registrationCTAId,
          title: "Register now to enjoy exclusive benefits!",
          subtitle: "Don't miss out on this opportunity, join us today!",
          buttonText: "Register Now",
          backgroundColor: "#6938EF",
          textColor: "#ffffff",
          buttonColor: "#6938EF",
          buttonBorderColor: "#8b5cf6"
        }
      },
      {
        type: 'Sponsors',
        props: {
          id: sponsorsId,
          title: "Sponsors",
          sponsors: [
            { id: '1', name: 'Sponsor 1', logoUrl: '' },
            { id: '2', name: 'Sponsor 2', logoUrl: '' },
            { id: '3', name: 'Sponsor 3', logoUrl: '' },
            { id: '4', name: 'Sponsor 4', logoUrl: '' }
          ],
          backgroundColor: "#ffffff",
          textColor: "#1f2937",
          padding: "3rem 2rem"
        }
      },
      {
        type: 'FAQAccordion',
        props: {
          id: faqId,
          title: "Frequently Asked Questions",
          description: "Everything you need to know about the product and billing. Can't find the answer you're looking for? Please chat to our friendly team",
          faqs: [
            {
              id: '1',
              question: 'What is this service about?',
              answer: 'This service provides comprehensive solutions for your business needs.'
            },
            {
              id: '2',
              question: 'How do I get started?',
              answer: 'Simply sign up and follow the onboarding process to get started.'
            },
            {
              id: '3',
              question: 'What are the pricing options?',
              answer: 'We offer flexible pricing plans to suit different needs and budgets.'
            }
          ],
          allowMultiple: false,
          backgroundColor: '#ffffff',
          textColor: '#333333',
          questionColor: '#1f2937',
          answerColor: '#6b7280',
          borderColor: '#e5e7eb',
          padding: '3rem 2rem',
          spacing: '1rem',
          iconColor: '#8b5cf6',
          hoverColor: '#f8fafc',
          containerMaxWidth: 'max-w-7xl',
          containerPadding: 'px-4 sm:px-6 lg:px-8 py-8'
        }
      },
      {
        type: 'ContactFooter',
        props: {
          id: contactFooterId,
          items: [
            {
              id: '1',
              type: 'email',
              title: 'Email',
              description: "Our friendly team is here to help.",
              actionText: 'Send us an email',
              actionEmail: 'contact@example.com'
            },
            {
              id: '2',
              type: 'office',
              title: 'Office',
              description: 'Come and say hello at our office HQ.',
              actionText: 'View on map',
              actionUrl: '#'
            },
            {
              id: '3',
              type: 'phone',
              title: 'Phone',
              description: 'Mon-Fri from 8am to 5pm.',
              actionText: 'Call us now',
              actionPhone: '+1 (555) 000-0000'
            }
          ],
          backgroundColor: "#ffffff",
          textColor: "#1f2937",
          iconColor: "#6938EF",
          buttonColor: "#6938EF",
          padding: "3rem 2rem",
          copyrightText: "Copyright © 2024"
        }
      }
    ],
    root: { props: { title: pageName, pageTitle: pageName } },
    zones: {}
  }
}

export const usePageManagement = () => {
  const { eventData, createdEvent } = useEventForm()
  const lastEventUuidRef = useRef<string | null>(null)
  const getEventUuid = () =>
    createdEvent?.uuid ?? (typeof window !== 'undefined' ? localStorage.getItem('currentEventUuid') : null)
  const getScratchOrigin = () => {
    if (typeof window === 'undefined') return null
    const eventUuid = getEventUuid()
    if (eventUuid) {
      const scoped = localStorage.getItem(`create-from-scratch-origin-${eventUuid}`)
      if (scoped) return scoped
    }
    return localStorage.getItem('create-from-scratch-origin')
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  // Prioritize createdEvent data from API, fallback to eventData from form
  const displayEventData = createdEvent ? {
    eventName: createdEvent.eventName,
    startDate: createdEvent.startDate,
    endDate: createdEvent.endDate,
    location: createdEvent.location,
    banner: eventData?.banner // Banner might still be in eventData as File
  } : eventData
  
  // Check if we're creating from scratch at initialization
  // Check both localStorage flag and URL parameter (mode=blank)
  const isCreateFromScratchMode = typeof window !== 'undefined' && (
    localStorage.getItem('create-from-scratch') === 'true' ||
    (window.location.search && new URLSearchParams(window.location.search).get('mode') === 'blank')
  )
  
  // Initialize with empty data if creating from scratch, otherwise use template
  const getInitialData = () => {
    if (isCreateFromScratchMode) {
      // Return empty Puck data structure for create-from-scratch mode
      return {
        content: [],
        root: {
          props: {
            title: 'Page 1',
            pageTitle: 'Page 1'
          }
        },
        zones: {}
      }
    }
    return getDefaultTemplateData('Page 1', displayEventData)
  }
  
  const defaultPage1Data = getInitialData()
  const [currentData, setCurrentData] = useState<any>(defaultPage1Data)
  const [currentPage, setCurrentPage] = useState('page1')
  const [currentPageName, setCurrentPageName] = useState('Page 1')
  
  // Initialize pages array - only page1 if creating from scratch
  const getInitialPages = (): Page[] => {
    if (isCreateFromScratchMode) {
      return [{
        id: 'page1',
        name: 'Page 1',
        filename: 'page1.json',
        lastModified: new Date().toISOString()
      }]
    }
    return []
  }
  
  const [pages, setPages] = useState<Page[]>(getInitialPages())
  const [showPageManager, setShowPageManager] = useState(false)
  const [showPageNameDialog, setShowPageNameDialog] = useState(false)

  // When switching between events, clear any in-memory pages/data from the previous event.
  // This prevents "pages from another event" leaking into the new event's scratch editor sidebar.
  useEffect(() => {
    const nextUuid = getEventUuid() ?? null
    const prevUuid = lastEventUuidRef.current
    if (!nextUuid) return

    if (prevUuid && prevUuid !== nextUuid) {
      const urlParams = new URLSearchParams(window.location.search)
      const isBlank = urlParams.get('mode') === 'blank'

      // Reset to a clean baseline for the new event
      setCurrentPage('page1')
      setCurrentPageName('Page 1')
      setCurrentData(
        isBlank
          ? {
              content: [],
              root: { props: { title: 'Page 1', pageTitle: 'Page 1' } },
              zones: {}
            }
          : getDefaultTemplateData('Page 1', displayEventData)
      )
      setPages(
        isBlank
          ? [
              {
                id: 'page1',
                name: 'Page 1',
                filename: 'page1.json',
                lastModified: new Date().toISOString()
              }
            ]
          : []
      )
    }

    lastEventUuidRef.current = nextUuid
  }, [createdEvent?.uuid])

  // Function to update HeroSection with eventData and banner
  // Use useCallback to avoid stale closures
  const updateHeroSectionWithEventData = useCallback(() => {
    // Only use a banner from localStorage if it belongs to the current event.
    const currentEventUuid = getEventUuid()
    const bannerUrl =
      currentEventUuid ? localStorage.getItem(`event-form-banner-${currentEventUuid}`) : null
    
    console.log('🖼️ updateHeroSectionWithEventData - bannerUrl in storage:', bannerUrl ? (bannerUrl.startsWith('data:') ? 'data:image...' : bannerUrl.substring(0, 50) + '...') : 'NONE')
    
    setCurrentData((prevData: any) => {
      if (!prevData?.content) return prevData
      
      // Check if we have a HeroSection that needs updating
      const heroSection = prevData.content.find((item: any) => item.type === 'HeroSection')
      if (!heroSection) {
        console.log('🖼️ No HeroSection found in content')
        return prevData
      }
      
      console.log('🖼️ Current HeroSection backgroundImage:', heroSection.props.backgroundImage?.substring(0, 50) + '...')
      
      // If we have a banner for THIS event, use it; otherwise keep the page's own banner image.
      const currentBannerUrl = bannerUrl || heroSection.props.backgroundImage
      
      console.log('🖼️ Will use bannerUrl:', currentBannerUrl ? (currentBannerUrl.startsWith('data:') ? 'data:image...' : currentBannerUrl.substring(0, 50) + '...') : 'NONE')
      
      // Get event data - prioritize createdEvent, then eventData, then existing props or defaults
      const eventName = createdEvent?.eventName || eventData?.eventName || heroSection.props.title || 'Event Title'
      const location = createdEvent?.location || eventData?.location || ''
      const eventDate = formatEventDate(
        createdEvent?.startDate || eventData?.startDate,
        createdEvent?.endDate || eventData?.endDate
      )
      // Match WebsitePreviewPage format: "Location | Date" or just "Date" if no location
      const subtitle = location ? `${location} | ${eventDate}` : (eventDate || 'Location | Date')

      // Check if banner in localStorage is different from what's in the component
      // Force update if there's a banner in localStorage but component has default image
      const hasDefaultImage = heroSection.props.backgroundImage?.includes('unsplash.com/photo-1540575467063')
      const shouldForceBannerUpdate = Boolean(bannerUrl) && (hasDefaultImage || heroSection.props.backgroundImage !== bannerUrl)

      // Check if update is needed
      // Always update if bannerUrl exists in localStorage and is different from current
      const needsUpdate = 
        heroSection.props.title !== eventName ||
        heroSection.props.subtitle !== subtitle ||
        (bannerUrl && heroSection.props.backgroundImage !== bannerUrl) ||
        shouldForceBannerUpdate

      if (!needsUpdate) {
        console.log('🖼️ No update needed - all values match')
        return prevData
      }

      // Log what's being updated
      if (shouldForceBannerUpdate || (bannerUrl && heroSection.props.backgroundImage !== bannerUrl)) {
        console.log('🖼️ FORCING banner update (banner in localStorage):', {
          oldBanner: heroSection.props.backgroundImage?.substring(0, 50) + '...',
          newBanner: currentBannerUrl ? (currentBannerUrl.startsWith('data:') ? 'data:image...' : currentBannerUrl.substring(0, 50) + '...') : 'NONE',
          bannerInStorage: !!bannerUrl,
          hasDefaultImage
        })
      } else {
        console.log('🖼️ Updating HeroSection:', {
          eventName,
          subtitle,
          bannerUrl: currentBannerUrl ? (currentBannerUrl.startsWith('data:') ? 'data:image...' : currentBannerUrl.substring(0, 50) + '...') : 'NONE',
          oldBanner: heroSection.props.backgroundImage?.substring(0, 50) + '...'
        })
      }

      // Update to ensure banner and content are current
      const updatedContent = prevData.content.map((item: any) => {
        if (item.type === 'HeroSection') {
          const updatedProps = {
            ...item.props,
            title: eventName,
            subtitle: subtitle,
            backgroundImage: currentBannerUrl
          }
          
          console.log('🖼️ Setting HeroSection props.backgroundImage to:', currentBannerUrl ? (currentBannerUrl.startsWith('data:') ? 'data:image...' : currentBannerUrl.substring(0, 50) + '...') : 'NONE')
          
          return {
            ...item,
            props: updatedProps
          }
        }
        return item
      })
      
      const updatedData = {
        ...prevData,
        content: updatedContent
      }
      
      const updatedHeroSection = updatedData.content.find((item: any) => item.type === 'HeroSection')
      console.log('🖼️ Updated data - HeroSection backgroundImage:', 
        updatedHeroSection?.props?.backgroundImage ? (updatedHeroSection.props.backgroundImage.startsWith('data:') ? 'data:image...' : updatedHeroSection.props.backgroundImage.substring(0, 50) + '...') : 'NONE')
      
      return updatedData
    })
  }, [eventData, createdEvent]) // Include eventData and createdEvent in dependencies

  // Update currentData when eventData or createdEvent changes or on mount (for banner, title, etc.)
  useEffect(() => {
    // Always run on mount and when dependencies change
    const bannerInStorage = localStorage.getItem('event-form-banner')
    console.log('🖼️ useEffect triggered - Banner in storage:', !!bannerInStorage, 'EventData:', !!eventData, 'CreatedEvent:', !!createdEvent, 'CurrentPage:', currentPage)
    updateHeroSectionWithEventData()
  }, [createdEvent?.eventName, createdEvent?.location, createdEvent?.startDate, eventData?.eventName, eventData?.location, eventData?.startDate, currentData?.content?.length, currentPage, updateHeroSectionWithEventData]) // Trigger when eventData or createdEvent fields change, content changes, or page changes

  // Also run on initial mount to ensure banner is loaded
  useEffect(() => {
    // Small delay to ensure localStorage is accessible
    const timer = setTimeout(() => {
      const bannerInStorage = localStorage.getItem('event-form-banner')
      console.log('🖼️ Initial mount check - Banner in storage:', !!bannerInStorage)
      if (bannerInStorage) {
        updateHeroSectionWithEventData()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [updateHeroSectionWithEventData]) // Run once on mount

  // Listen for localStorage changes (for banner updates)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'event-form-banner') {
        updateHeroSectionWithEventData()
      }
    }

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange)

    // Also check periodically for localStorage changes (same tab)
    // Use a ref to track the last banner URL to detect changes
    let lastBannerUrl = localStorage.getItem('event-form-banner')
    
    const interval = setInterval(() => {
      const currentBannerUrl = localStorage.getItem('event-form-banner')
      if (currentBannerUrl !== lastBannerUrl) {
        lastBannerUrl = currentBannerUrl
        updateHeroSectionWithEventData()
      }
    }, 500) // Check every 500ms

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, []) // Empty deps - function uses setState functional form

  const getPageTitleFromData = (data: any): string | undefined => {
    if (!data || !data.root || !data.root.props) {
      return undefined
    }

    const { pageTitle, title } = data.root.props

    if (typeof pageTitle === 'string' && pageTitle.trim()) {
      return pageTitle.trim()
    }

    if (typeof title === 'string' && title.trim()) {
      return title.trim()
    }

    return undefined
  }

  const getCachedPageData = (pageId: string): any | null => {
    try {
      const cacheKey = `puck-page-${pageId}`
      const cachedString = localStorage.getItem(cacheKey)
      if (!cachedString) {
        return null
      }
      return JSON.parse(cachedString)
    } catch (error) {
      logger.debug('getCachedPageData: Failed to parse cached data for', pageId, error)
      return null
    }
  }

  // Helper function to check if data matches the expected template structure
  const hasCorrectTemplateStructure = (data: any): boolean => {
    if (!data || !data.content || !Array.isArray(data.content)) {
      return false
    }
    
    const contentTypes = data.content.map((c: any) => c.type)
    // New template structure: HeroSection, AboutSection, SpeakersSection, RegistrationCTA, Sponsors, FAQAccordion, ContactFooter
    const expectedTypes = ['HeroSection', 'AboutSection', 'SpeakersSection', 'RegistrationCTA', 'Sponsors', 'FAQAccordion', 'ContactFooter']
    
    // Check if we have at least the expected components
    const hasHero = contentTypes.includes('HeroSection')
    const hasAbout = contentTypes.includes('AboutSection')
    const hasSpeakers = contentTypes.includes('SpeakersSection')
    const hasRegistrationCTA = contentTypes.includes('RegistrationCTA')
    const hasSponsors = contentTypes.includes('Sponsors')
    const hasFAQ = contentTypes.includes('FAQAccordion')
    const hasContactFooter = contentTypes.includes('ContactFooter')
    
    // If we have all expected components, it's the correct template
    if (hasHero && hasAbout && hasSpeakers && hasRegistrationCTA && hasSponsors && hasFAQ && hasContactFooter) {
      return true
    }
    
    // If we have old template components (TwoColumnContent, PricingPlans) or unexpected components, it's not the correct template
    if (contentTypes.includes('TwoColumnContent') || contentTypes.includes('PricingPlans') || contentTypes.includes('HTMLContent') || contentTypes.includes('Heading')) {
      return false
    }
    
    // Otherwise, allow it (might be a custom page)
    return true
  }

  // Helper function to clean duplicate components from data
  const cleanDuplicateComponents = (data: any) => {
    if (!data || !data.content || !Array.isArray(data.content)) {
      return data
    }
    
    // First, remove SchedulePage from non-schedule pages
    // SchedulePage should only appear on pages with pageType='schedule'
    let contentToClean = [...data.content]
    const pageType = data?.root?.props?.pageType
    const isSchedulePage = pageType === 'schedule'
    
    if (!isSchedulePage) {
      const hasSchedulePage = contentToClean.some((item: any) => item.type === 'SchedulePage')
      if (hasSchedulePage) {
        console.log('🔄 cleanDuplicateComponents - Removing SchedulePage from non-schedule page')
        contentToClean = contentToClean.filter((item: any) => item.type !== 'SchedulePage')
      }
    }
    
    // Track seen component IDs and positions to avoid duplicates
    const seenIds = new Set<string>()
    const cleanedContent: any[] = []
    let duplicatesRemoved = 0
    
    contentToClean.forEach((item: any, index: number) => {
      // Use ID if available, otherwise create a unique identifier
      const itemId = item.props?.id || `${item.type}-${index}-${JSON.stringify(item.props).substring(0, 50)}`
      
      // For components without IDs, check if we've seen this exact component before
      // by comparing type and a hash of the props
      if (item.props?.id) {
        // Component has an ID - use it for deduplication
        if (!seenIds.has(itemId)) {
          seenIds.add(itemId)
          cleanedContent.push(item)
        } else {
          console.warn('⚠️ Removing duplicate component with ID:', item.type, itemId)
          duplicatesRemoved++
        }
      } else {
        // Component doesn't have an ID - check for exact duplicates by comparing props
        // For PricingPlans specifically, also check if we already have one
        if (item.type === 'PricingPlans') {
          const hasPricingPlans = cleanedContent.some((existing: any) => existing.type === 'PricingPlans')
          if (hasPricingPlans) {
            console.warn('⚠️ Removing duplicate PricingPlans component (only one allowed)')
            duplicatesRemoved++
            return // Skip this duplicate
          }
        }
        
        const propsHash = JSON.stringify(item.props)
        const existingIndex = cleanedContent.findIndex((existing: any) => 
          existing.type === item.type && 
          JSON.stringify(existing.props) === propsHash
        )
        
        if (existingIndex === -1) {
          // Not a duplicate, add it
          cleanedContent.push(item)
        } else {
          console.warn('⚠️ Removing duplicate component without ID:', item.type, 'at index', index)
          duplicatesRemoved++
        }
      }
    })
    
    // Check for duplicates by type if no IDs
    if (duplicatesRemoved > 0) {
      console.log('🧹 Cleaned', duplicatesRemoved, 'duplicate components')
      console.log('📊 Original types:', contentToClean.map((c: any) => c.type))
      console.log('📊 Cleaned types:', cleanedContent.map((c: any) => c.type))
      
      // Count PricingPlans specifically
      const pricingCount = cleanedContent.filter((c: any) => c.type === 'PricingPlans').length
      if (pricingCount > 1) {
        console.error('❌ ERROR: Still have', pricingCount, 'PricingPlans after cleaning!')
      }
    }
    
    return {
      ...data,
      content: cleanedContent
    }
  }

  const applyServerDataForPage = (pageId: string, serverData: any) => {
    // Remove ScheduleSection from welcome page
    if (pageId === 'welcome' && serverData?.content) {
      serverData = {
        ...serverData,
        content: serverData.content.filter((item: any) => item.type !== 'ScheduleSection')
      }
    }
    if (!serverData) {
      return
    }

    // Clean duplicates from server data before applying
    const cleanedServerData = cleanDuplicateComponents(serverData)

    const cacheKey = `puck-page-${pageId}`
    const cachedData = getCachedPageData(pageId)
    const cachedTitle = getPageTitleFromData(cachedData)

    let mergedDataForCache: any = null
    let resolvedTitle: string | undefined

    setCurrentData((prevData: any) => {
      const prevTitle = getPageTitleFromData(prevData)
      const serverTitle = getPageTitleFromData(cleanedServerData)

      const fallbackTitle = pageId === 'page1'
        ? 'Page 1'
        : pageId
            .replace(/^page-/, '')
            .replace(/-/g, ' ')

      resolvedTitle = cachedTitle || prevTitle || serverTitle || fallbackTitle

      const mergedProps = {
        ...(cleanedServerData?.root?.props || {})
      }

      if (resolvedTitle) {
        mergedProps.pageTitle = resolvedTitle
        if (!mergedProps.title || !mergedProps.title.trim() || mergedProps.title.trim() === serverTitle) {
          mergedProps.title = resolvedTitle
        }
      }

      mergedDataForCache = {
        ...cleanedServerData,
        root: {
          ...cleanedServerData?.root,
          props: mergedProps
        }
      }

      return mergedDataForCache
    })

    if (mergedDataForCache) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(mergedDataForCache))
      } catch (error) {
        logger.debug('applyServerDataForPage: Failed to cache merged data for', pageId, error)
      }
      
      // Update HeroSection with banner from localStorage after applying server data
      setTimeout(() => {
        updateHeroSectionWithEventData()
      }, 0)
    }

    if (resolvedTitle && resolvedTitle !== currentPageName) {
      setCurrentPageName(resolvedTitle)
    }
  }

  // Keep page name state in sync with the currently loaded page data
  useEffect(() => {
    if (!currentPage || !currentData?.root?.props) {
      return
    }

    const rawTitle = currentData.root.props.pageTitle ?? currentData.root.props.title
    if (!rawTitle || typeof rawTitle !== 'string') {
      return
    }

    const normalizedTitle = rawTitle.trim()
    if (!normalizedTitle) {
      return
    }

    if (normalizedTitle !== currentPageName) {
      setCurrentPageName(normalizedTitle)
    }

    setPages(prevPages => {
      const pageId = currentPage
      const filename = pageId.endsWith('.json') ? pageId : `${pageId}.json`

      const existingIndex = prevPages.findIndex(
        page => page.id === pageId || page.filename === filename
      )

      // Guard: when switching pages, `currentPage` can update before `currentData` finishes updating.
      // In that transient state we may see the previous page's title (often "Page 1") and would
      // incorrectly overwrite the newly selected page's name.
      if (pageId !== 'page1' && normalizedTitle === 'Page 1') {
        if (existingIndex === -1) {
          return prevPages
        }
        const existing = prevPages[existingIndex]
        if (existing?.name && existing.name !== 'Page 1') {
          return prevPages
        }
      }

      if (existingIndex === -1) {
        return [
          ...prevPages,
          {
            id: pageId,
            name: normalizedTitle,
            filename,
            lastModified: new Date().toISOString()
          }
        ]
      }

      const existingPage = prevPages[existingIndex]
      if (existingPage.name === normalizedTitle) {
        return prevPages
      }

      const updatedPages = [...prevPages]
      updatedPages[existingIndex] = {
        ...existingPage,
        name: normalizedTitle,
        lastModified: new Date().toISOString()
      }

      return updatedPages
    })
  }, [currentData, currentPage, currentPageName])

  // Function to load all pages from server
  const loadPages = async () => {
    // Skip page API calls if PAGE_API_URL is not configured
    if (!isPageApiAvailable()) {
      logger.debug('Page API URL not configured, skipping server load')
      return
    }

    // Check if we're in create-from-scratch mode (check URL param as flag may be cleared)
    const urlParams = new URLSearchParams(window.location.search)
    const isCreateFromScratchMode = urlParams.get('mode') === 'blank' || 
                                     localStorage.getItem('create-from-scratch') === 'true'
    
    // If in create-from-scratch mode, skip loading backend pages
    // Pages should only come from Puck's internal state
    if (isCreateFromScratchMode) {
      logger.debug('loadPages: Skipping backend page load - create-from-scratch mode')
      return
    }

    // Note: GET_PAGES and GET_PAGE endpoints are not used - webpages are loaded via fetchWebpages() instead
    // This function is kept for backward compatibility but doesn't fetch from server
    // Pages are loaded from localStorage cache or via fetchWebpage() for UUID-based pages
    // The actual webpage list is managed in EventWebsitePage via fetchWebpages() from webpageService
    try {
      // Skip server fetch - pages are loaded via fetchWebpages() in EventWebsitePage
      logger.debug('loadPages: Pages are loaded via fetchWebpages() in EventWebsitePage, not using GET_PAGES endpoint')
      return
      
      // OLD CODE REMOVED - GET_PAGES and GET_PAGE endpoints don't exist (commented out in env.ts)
      // Pages are now loaded via:
      // 1. fetchWebpages() in EventWebsitePage.tsx (for listing all webpages)
      // 2. fetchWebpage() in usePageManagement.ts (for loading individual UUID-based pages)
      // 3. localStorage cache (for non-UUID pages)
    } catch (error) {
      logger.error('Error loading pages:', error)
      // Don't clear pages on error - preserve existing pages
      // setPages([]) // Removed - this was causing pages to disappear
    }
  }

  // Function to load a specific page
  const loadPage = async (filename: string) => {
    logger.debug('loadPage called with filename:', filename)
    logger.debug('loadPage: Current pages array:', pages.map(p => `${p.name} (${p.id}) - ${p.filename}`))
    
    const pageId = filename.replace('.json', '')
    const serverFilename = filename.endsWith('.json') ? filename : `${filename}.json`
    
    // Check if pageId is a REAL UUID (webpage UUID from API).
    // IMPORTANT: local unsaved pages also contain dashes (e.g. "page-page-2-...") and must NOT be treated as UUIDs.
    const isWebpageUuid = uuidRegex.test(pageId)
    
    // If it's a webpage UUID, fetch the webpage data to get the name
    if (isWebpageUuid && createdEvent?.uuid) {
      try {
        logger.debug('loadPage: Detected webpage UUID, fetching webpage data:', pageId)
        const webpageData = await fetchWebpage(pageId, createdEvent.uuid)
        
        // Extract the webpage name
        const webpageName = webpageData.name || pageId
        
        // Convert webpage content to Puck format
        // Webpage content structure: { [key]: { title, slug, data: { [slug]: { root, content, zones } } } }
        let puckData = null
        
        if (webpageData.content && typeof webpageData.content === 'object') {
          // Extract Puck data from nested structure
          const contentKeys = Object.keys(webpageData.content)
          if (contentKeys.length > 0) {
            const firstKey = contentKeys[0]
            const pageContent = webpageData.content[firstKey]
            if (pageContent?.data) {
              // The data object typically has a slug key like '/' or the page slug
              const dataKeys = Object.keys(pageContent.data)
              if (dataKeys.length > 0) {
                puckData = pageContent.data[dataKeys[0]]
              }
            }
          }
        }
        
        // If we still don't have valid Puck data, use default template
        if (!puckData || !puckData.content) {
          logger.warn('loadPage: Webpage content is not in expected format, using default template')
          puckData = getDefaultTemplateData(webpageName, displayEventData)
        }
        
        // Clean any duplicates before setting
        const cleanedData = cleanDuplicateComponents(puckData)
        
        // Update HeroSection banner if needed
        // Priority: localStorage banner > saved page banner > default
        const bannerUrl = localStorage.getItem('event-form-banner')
        if (cleanedData?.content) {
          const heroSection = cleanedData.content.find((item: any) => item.type === 'HeroSection')
          if (heroSection) {
            const savedBanner = heroSection.props.backgroundImage || ''
            const hasDefaultImage = savedBanner.includes('unsplash.com/photo-1540575467063')
            
            // Use localStorage banner if it exists (it's the most current)
            // Otherwise, preserve the saved banner from the page data
            // Only override if saved banner is default image
            if (bannerUrl) {
              // Always use localStorage banner if available (it's the source of truth)
              heroSection.props.backgroundImage = bannerUrl
              console.log('🖼️ loadPage (UUID) - Using banner from localStorage')
            } else if (savedBanner && !hasDefaultImage) {
              // Preserve saved banner if it exists and is not default
              // Also save it to localStorage for consistency
              localStorage.setItem('event-form-banner', savedBanner)
              console.log('🖼️ loadPage (UUID) - Preserving saved banner from page data:', savedBanner.substring(0, 50) + '...')
            } else if (hasDefaultImage) {
              // If saved banner is default, try to get from createdEvent
              if (createdEvent?.banner) {
                let bannerFromApi = createdEvent.banner
                if (bannerFromApi.startsWith('http://')) {
                  bannerFromApi = bannerFromApi.replace('http://', 'https://')
                }
                heroSection.props.backgroundImage = bannerFromApi
                localStorage.setItem('event-form-banner', bannerFromApi)
                console.log('🖼️ loadPage (UUID) - Using banner from createdEvent API')
              }
            }
          }
        }
        
        // Ensure pageTitle is set to the webpage name
        if (!cleanedData.root) {
          cleanedData.root = { props: {} }
        }
        if (!cleanedData.root.props) {
          cleanedData.root.props = {}
        }
        cleanedData.root.props.pageTitle = webpageName
        
        // Set the page data
        setCurrentData(cleanedData)
        setCurrentPage(pageId)
        setCurrentPageName(webpageName)
        setShowPageManager(false)
        
        // Cache the data
        const cachedDataKey = `puck-page-${pageId}`
        localStorage.setItem(cachedDataKey, JSON.stringify(cleanedData))
        
        // Add to pages array if not already there
        // Check for existing page by ID or by name (case-insensitive) to avoid duplicates
        setPages(prevPages => {
          const pageExistsById = prevPages.some(p => p.id === pageId)
          const pageExistsByName = prevPages.some(p => 
            p.name.toLowerCase() === webpageName.toLowerCase()
          )
          
          if (pageExistsById) {
            // Update existing page with same ID
            return prevPages.map(p => 
              p.id === pageId 
                ? { ...p, name: webpageName, lastModified: new Date().toISOString() }
                : p
            )
          } else if (pageExistsByName) {
            // Update existing page with same name (case-insensitive) but different ID
            // This handles the case where we have "Welcome" but webpage has "welcome"
            return prevPages.map(p => 
              p.name.toLowerCase() === webpageName.toLowerCase()
                ? { ...p, id: pageId, name: webpageName, filename: serverFilename, lastModified: new Date().toISOString() }
                : p
            )
          } else {
            // New page, add it
            return [...prevPages, {
              id: pageId,
              name: webpageName,
              filename: serverFilename,
              lastModified: new Date().toISOString()
            }]
          }
        })
        
        return cleanedData
      } catch (error) {
        logger.error('loadPage: Error fetching webpage data:', error)
        // Fall through to normal loading logic
      }
    }
    
    // Check if we're creating from scratch (check both localStorage and URL param)
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const isCreateFromScratch =
      (urlParams?.get('mode') === 'blank') || localStorage.getItem('create-from-scratch') === 'true'
    const emptyPage1DataStr = localStorage.getItem('create-from-scratch-page1')
    const isPage1 = pageId === 'page1' || filename === 'page1.json' || filename === 'page1'
    
    // In create-from-scratch mode, Page 1 must always be clean/empty.
    // Do NOT allow cached `puck-page-page1` to override it on refresh.
    if (isCreateFromScratch && isPage1) {
      let emptyPage1Data: any = null
      if (emptyPage1DataStr) {
        try {
          emptyPage1Data = JSON.parse(emptyPage1DataStr)
        } catch (error) {
          logger.error('loadPage: Error parsing empty page1 data:', error)
          emptyPage1Data = null
        }
      }

      if (!emptyPage1Data) {
        emptyPage1Data = {
          content: [],
          root: { props: { title: 'Page 1', pageTitle: 'Page 1' } },
          zones: {}
        }
      }

      // Keep the scratch page1 seed available for subsequent refreshes.
      try {
        localStorage.setItem('create-from-scratch-page1', JSON.stringify(emptyPage1Data))
      } catch {
        // ignore
      }

      // Overwrite the generic cache key so other code paths can't resurrect old data.
      try {
        localStorage.setItem('puck-page-page1', JSON.stringify(emptyPage1Data))
      } catch {
        // ignore
      }

      logger.debug('loadPage: Loading clean Page1 for create-from-scratch mode')
      setCurrentData(emptyPage1Data)
      setCurrentPage('page1')
      setCurrentPageName('Page 1')
      setShowPageManager(false)
      return
    }
    
    // First, try to find the page in the pages array
    const pageInArray = pages.find(p => 
      p.filename === serverFilename || 
      p.filename === filename ||
      p.id === pageId ||
      p.id === filename
    )
    
    // If page is in array, try to load from localStorage first, then server
    if (pageInArray) {
      logger.debug('loadPage: Page found in array, checking localStorage first')
      
      // Check localStorage for cached data
      const cachedDataKey = `puck-page-${pageId}`
      const cachedData = localStorage.getItem(cachedDataKey)
      
      let initialData = null
      if (cachedData) {
        try {
          initialData = JSON.parse(cachedData)
          logger.debug('loadPage: Found cached data in localStorage')
          console.log('✅ Found cached data in localStorage for:', pageId)
          
          // In scratch mode, do NOT enforce "template structure" (scratch pages are empty by design).
          // Only apply template-structure correction in template mode.
          if (!isCreateFromScratch) {
            if (!hasCorrectTemplateStructure(initialData)) {
              console.warn('⚠️ Cached data does not match expected template structure, replacing with default template')
              console.log('📋 Old template components:', initialData?.content?.map((c: any) => c.type) || [])
              // Clear the old cached data
              localStorage.removeItem(cachedDataKey)
              // Use new default template
              initialData = getDefaultTemplateData(pageInArray.name, eventData)
              // Save the corrected template to cache
              localStorage.setItem(cachedDataKey, JSON.stringify(initialData))
              console.log('✅ Replaced with new template components:', initialData?.content?.map((c: any) => c.type) || [])
            }
          }
        } catch (e) {
          logger.warn('loadPage: Failed to parse cached data:', e)
          // If parsing fails, clear the corrupted cache
          localStorage.removeItem(cachedDataKey)
        }
      }
      
      // If no cached data:
      // - scratch mode: use an empty page (NOT welcome/template)
      // - template mode: use default template
      if (!initialData) {
        if (isCreateFromScratch) {
          initialData = {
            content: [],
            root: { props: { title: pageInArray.name, pageTitle: pageInArray.name } },
            zones: {}
          }
          logger.debug('loadPage: Using empty scratch data for page:', pageInArray.name)
        } else {
          initialData = getDefaultTemplateData(pageInArray.name, eventData)
          logger.debug('loadPage: Using default template data for page:', pageInArray.name)
          console.log('📄 Using default template data for:', pageInArray.name)
        }
      }
      
      // Clean any duplicates before setting
      const cleanedInitialData = cleanDuplicateComponents(initialData)
      
      // Remove SchedulePage from non-schedule pages
      // SchedulePage should only appear on pages with pageType='schedule'
      if (cleanedInitialData?.content) {
        const pageType = cleanedInitialData?.root?.props?.pageType
        const isSchedulePage = pageType === 'schedule'
        
        if (!isSchedulePage) {
          const hasSchedulePage = cleanedInitialData.content.some((item: any) => item.type === 'SchedulePage')
          if (hasSchedulePage) {
            console.log('🔄 Removing SchedulePage from non-schedule page:', pageId)
            cleanedInitialData.content = cleanedInitialData.content.filter((item: any) => item.type !== 'SchedulePage')
          }
        }
      }
      
      // Update HeroSection banner BEFORE setting data
      // Priority: API banner (HTTPS) > localStorage (HTTPS) > saved page banner > localStorage (data URL) > API banner (fallback)
      const bannerUrl = localStorage.getItem('event-form-banner')
      const apiBanner = createdEvent?.banner
      let processedApiBanner = apiBanner
      if (processedApiBanner && processedApiBanner.startsWith('http://')) {
        processedApiBanner = processedApiBanner.replace('http://', 'https://')
      }
      
      if (cleanedInitialData?.content) {
        const heroSection = cleanedInitialData.content.find((item: any) => item.type === 'HeroSection')
        if (heroSection) {
          const savedBanner = heroSection.props.backgroundImage || ''
          const hasDefaultImage = savedBanner.includes('unsplash.com/photo-1540575467063')
          
          let finalBanner: string | null = null
          
          // Priority 1: API banner (if it's an HTTPS URL - the correct uploaded banner)
          if (processedApiBanner && processedApiBanner.startsWith('https://')) {
            finalBanner = processedApiBanner
            localStorage.setItem('event-form-banner', finalBanner)
            console.log('🖼️ loadPage - Using banner from createdEvent API (HTTPS URL)')
          }
          // Priority 2: localStorage banner (if it's an HTTPS URL, not a data URL)
          else if (bannerUrl && bannerUrl.startsWith('https://')) {
            finalBanner = bannerUrl
            console.log('🖼️ loadPage - Using banner from localStorage (HTTPS URL)')
          }
          // Priority 3: Saved page banner (if it's not default and not empty)
          else if (savedBanner && !hasDefaultImage && savedBanner !== '') {
            finalBanner = savedBanner
            // If it's an HTTPS URL, sync to localStorage
            if (savedBanner.startsWith('https://')) {
              localStorage.setItem('event-form-banner', savedBanner)
            }
            console.log('🖼️ loadPage - Preserving saved banner from page data:', savedBanner.substring(0, 50) + '...')
          }
          // Priority 4: localStorage banner (even if data URL - fallback)
          else if (bannerUrl) {
            finalBanner = bannerUrl
            console.log('🖼️ loadPage - Using banner from localStorage (data URL fallback)')
          }
          // Priority 5: API banner (even if not HTTPS - final fallback)
          else if (processedApiBanner) {
            finalBanner = processedApiBanner
            localStorage.setItem('event-form-banner', finalBanner)
            console.log('🖼️ loadPage - Using banner from createdEvent API (fallback)')
          }
          
          if (finalBanner) {
            heroSection.props.backgroundImage = finalBanner
          }
        }
      }
      
      // Switch immediately with cached/default data
      console.log('📄 Setting currentData with template:', {
        contentLength: cleanedInitialData?.content?.length || 0,
        contentTypes: cleanedInitialData?.content?.map((c: any) => c.type) || []
      })
      setCurrentData(cleanedInitialData)
        setCurrentPage(pageId)
        setCurrentPageName(pageInArray.name)
        setShowPageManager(false)
        
        // Update HeroSection with banner from localStorage after setting data (as backup)
        setTimeout(() => {
          updateHeroSectionWithEventData()
        }, 150)
      
      // Note: GET_PAGE endpoint is not used - webpages are loaded via fetchWebpage() for UUID-based pages
      // For non-UUID pages, we use cached/default data
      // Server fetch removed - pages are loaded via fetchWebpages() in EventWebsitePage
      
      return initialData
    }
    
    // Page not in array, try to load from localStorage first, then server
    logger.debug('loadPage: Page not in array, checking localStorage first')
    
    // Check localStorage for cached data
    const cachedDataKey = `puck-page-${pageId}`
    const cachedData = localStorage.getItem(cachedDataKey)
    
    let initialData = null
    if (cachedData) {
      try {
        initialData = JSON.parse(cachedData)
        logger.debug('loadPage: Found cached data in localStorage for page not in array')
        console.log('✅ Found cached data in localStorage for:', pageId)
        
        // Clean any duplicates before setting
        const cleanedCachedData = cleanDuplicateComponents(initialData)
        
        // Remove SchedulePage from non-schedule pages
        // SchedulePage should only appear on pages with pageType='schedule'
        if (cleanedCachedData?.content) {
          const pageType = cleanedCachedData?.root?.props?.pageType
          const isSchedulePage = pageType === 'schedule'
          
          if (!isSchedulePage) {
            const hasSchedulePage = cleanedCachedData.content.some((item: any) => item.type === 'SchedulePage')
            if (hasSchedulePage) {
              console.log('🔄 Removing SchedulePage from non-schedule cached page:', pageId)
              cleanedCachedData.content = cleanedCachedData.content.filter((item: any) => item.type !== 'SchedulePage')
            }
          }
        }
        
        // Update HeroSection banner BEFORE setting data if banner exists in localStorage
        const bannerUrl = localStorage.getItem('event-form-banner')
        if (bannerUrl && cleanedCachedData?.content) {
          const heroSection = cleanedCachedData.content.find((item: any) => item.type === 'HeroSection')
          if (heroSection) {
            const hasDefaultImage = heroSection.props.backgroundImage?.includes('unsplash.com/photo-1540575467063')
            if (hasDefaultImage || heroSection.props.backgroundImage !== bannerUrl) {
              console.log('🖼️ loadPage (cached) - Updating HeroSection banner before setting data')
              heroSection.props.backgroundImage = bannerUrl
            }
          }
        }
        
        // Switch immediately with cached data
        console.log('📄 Setting currentData from localStorage:', {
          contentLength: cleanedCachedData?.content?.length || 0,
          contentTypes: cleanedCachedData?.content?.map((c: any) => c.type) || []
        })
        setCurrentData(cleanedCachedData)
        setCurrentPage(pageId)
        
        // Get page name from the cached data
        const pageTitle = getPageTitleFromData(cleanedCachedData)
        if (pageTitle) {
          setCurrentPageName(pageTitle)
        } else {
          setCurrentPageName(pageId)
        }
        setShowPageManager(false)
        
        // Update HeroSection with banner from localStorage after setting data (as backup)
        setTimeout(() => {
          updateHeroSectionWithEventData()
        }, 150)
      } catch (e) {
        logger.warn('loadPage: Failed to parse cached data:', e)
      }
    }
    

    if (!initialData) {
      if (isCreateFromScratch) {
        // In scratch mode, if a page is selected but no cache exists yet, create an empty page for it.
        // This prevents clicking an unsaved page from "snapping back" to Page 1.
        const nameFromList =
          pages.find((p) => p.id === pageId || p.filename === serverFilename)?.name ??
          (pageId === 'page1'
            ? 'Page 1'
            : pageId
                .replace(/^page-/, '')
                .replace(/-/g, ' '))

        const empty = {
          content: [],
          root: { props: { title: nameFromList, pageTitle: nameFromList } },
          zones: {}
        }

        try {
          localStorage.setItem(`puck-page-${pageId}`, JSON.stringify(empty))
        } catch {
          // ignore
        }

        setCurrentData(empty)
        setCurrentPage(pageId)
        setCurrentPageName(nameFromList)
        setShowPageManager(false)

        // Ensure it exists in the pages list
        setPages((prevPages) => {
          const filename = pageId.endsWith('.json') ? pageId : `${pageId}.json`
          const existingIndex = prevPages.findIndex((p) => p.id === pageId || p.filename === filename)
          if (existingIndex === -1) {
            return [
              ...prevPages,
              { id: pageId, name: nameFromList, filename, lastModified: new Date().toISOString() }
            ]
          }
          const existing = prevPages[existingIndex]
          if (existing.name === nameFromList) return prevPages
          const next = [...prevPages]
          next[existingIndex] = { ...existing, name: nameFromList, lastModified: new Date().toISOString() }
          return next
        })

        return empty
      }
      try {
        logger.debug('No cached data found, using default template for:', serverFilename)
        console.log('📡 No cached data, using default template for:', serverFilename)
        
        // Use default template data instead of fetching from non-existent GET_PAGE endpoint
        const pageName = pageId === 'welcome' ? 'Welcome' : pageId.replace('page-', '').replace(/-/g, ' ')
        const defaultData = getDefaultTemplateData(pageName, eventData)
        
        // Clean any duplicates before setting
        const cleanedData = cleanDuplicateComponents(defaultData)
        
        // Remove SchedulePage from non-schedule pages
        // SchedulePage should only appear on pages with pageType='schedule'
        if (cleanedData?.content) {
          const pageType = cleanedData?.root?.props?.pageType
          const isSchedulePage = pageType === 'schedule'
          
          if (!isSchedulePage) {
            const hasSchedulePage = cleanedData.content.some((item: any) => item.type === 'SchedulePage')
            if (hasSchedulePage) {
              console.log('🔄 Removing SchedulePage from non-schedule default template:', pageId)
              cleanedData.content = cleanedData.content.filter((item: any) => item.type !== 'SchedulePage')
            }
          }
        }
        
        // Update HeroSection banner if needed
        const bannerUrl = localStorage.getItem('event-form-banner')
        if (bannerUrl && cleanedData?.content) {
          const heroSection = cleanedData.content.find((item: any) => item.type === 'HeroSection')
          if (heroSection) {
            const savedBanner = heroSection.props.backgroundImage || ''
            const hasDefaultImage = savedBanner.includes('unsplash.com/photo-1540575467063')
            
            if (bannerUrl && (hasDefaultImage || !savedBanner || savedBanner !== bannerUrl)) {
              heroSection.props.backgroundImage = bannerUrl
              console.log('🖼️ loadPage (default) - Using banner from localStorage')
            } else if (savedBanner && !hasDefaultImage) {
              localStorage.setItem('event-form-banner', savedBanner)
              console.log('🖼️ loadPage (default) - Preserving saved banner from template')
            }
          }
        }
        
        // Apply the default data
        applyServerDataForPage(pageId, cleanedData)
        setCurrentPage(pageId)
        setCurrentPageName(pageName)
        setShowPageManager(false)
        
        // Update HeroSection with banner after setting data
        setTimeout(() => {
          updateHeroSectionWithEventData()
        }, 150)
        
        return cleanedData
      } catch (error) {
        logger.error('Error creating default template (fallback):', error)
        // Fall through to return null
      }
      
      // Fallback: If server load failed, create default template page
      if (!initialData) {
        // Page not in array and couldn't load from server
        logger.warn('loadPage: Page not found in array and server load failed:', serverFilename)
        // Try to create a default template page based on the filename
        const pageName = pageId === 'page1' ? 'Page 1' : pageId.replace('page-', '').replace(/-/g, ' ')
        const defaultData = getDefaultTemplateData(pageName, eventData)
        logger.debug('loadPage: Using default template data for fallback page:', pageName)
        console.log('📄 Using default template data for fallback:', pageName)
        console.log('📄 Template content:', defaultData.content.map((c: any) => c.type).join(', '))
        
        // Clean any duplicates before saving
        const cleanedDefaultData = cleanDuplicateComponents(defaultData)
        
        // Remove ScheduleSection from welcome page
        if (pageId === 'welcome' && cleanedDefaultData?.content) {
          cleanedDefaultData.content = cleanedDefaultData.content.filter((item: any) => item.type !== 'ScheduleSection')
        }
        
        // Remove SchedulePage from non-schedule pages
        // SchedulePage should only appear on pages with pageType='schedule'
        if (cleanedDefaultData?.content) {
          const pageType = cleanedDefaultData?.root?.props?.pageType
          const isSchedulePage = pageType === 'schedule'
          
          if (!isSchedulePage) {
            const hasSchedulePage = cleanedDefaultData.content.some((item: any) => item.type === 'SchedulePage')
            if (hasSchedulePage) {
              console.log('🔄 Removing SchedulePage from non-schedule default template:', pageId)
              cleanedDefaultData.content = cleanedDefaultData.content.filter((item: any) => item.type !== 'SchedulePage')
            }
          }
        }
        
        // Update HeroSection banner BEFORE setting data if banner exists in localStorage
        const bannerUrl = localStorage.getItem('event-form-banner')
        if (bannerUrl && cleanedDefaultData?.content) {
          const heroSection = cleanedDefaultData.content.find((item: any) => item.type === 'HeroSection')
          if (heroSection) {
            const hasDefaultImage = heroSection.props.backgroundImage?.includes('unsplash.com/photo-1540575467063')
            if (hasDefaultImage || heroSection.props.backgroundImage !== bannerUrl) {
              console.log('🖼️ loadPage (fallback) - Updating HeroSection banner before setting data')
              heroSection.props.backgroundImage = bannerUrl
            }
          }
        }
        
        // Save to localStorage so it persists
        const cacheKey = `puck-page-${pageId}`
        localStorage.setItem(cacheKey, JSON.stringify(cleanedDefaultData))
        
        console.log('📄 Setting currentData with cleaned template:', {
          contentLength: cleanedDefaultData?.content?.length || 0,
          contentTypes: cleanedDefaultData?.content?.map((c: any) => c.type) || []
        })
        setCurrentData(cleanedDefaultData)
        setCurrentPage(pageId)
        setCurrentPageName(pageName)
        setShowPageManager(false)
        
        // Update HeroSection with banner from localStorage after setting data (as backup)
        setTimeout(() => {
          updateHeroSectionWithEventData()
        }, 150)
        
        // Add to pages array
        setPages(prevPages => {
          const pageExists = prevPages.some(p => p.id === pageId || p.filename === serverFilename)
          if (!pageExists) {
            const newPage: Page = {
              id: pageId,
              name: pageName,
              filename: serverFilename,
              lastModified: new Date().toISOString()
            }
            return [...prevPages, newPage]
          }
          return prevPages
        })
        
        return defaultData
      }
    }
  }

  // Function to create a new page
  const createNewPage = () => {
    // Calculate the next page number (Page 2, Page 3, etc.)
    setPages(prevPages => {
      logger.debug('createNewPage: Current pages before creating:', prevPages.map(p => `${p.name} (${p.id})`))
      
      // Ensure Page 1 is always in the array (check by ID, not name, since names can be changed)
      const page1Exists = prevPages.some(p => p.id === 'page1' || p.filename === 'page1.json')
      let pagesWithPage1 = prevPages
      if (!page1Exists) {
        // Try to get the actual name from existing page data, or use default
        const existingPage1 = prevPages.find(p => p.id === 'page1' || p.filename === 'page1.json')
        const page1Name = existingPage1?.name || 'Page 1'
        pagesWithPage1 = [...prevPages, {
          id: 'page1',
          name: page1Name,
          filename: 'page1.json',
          lastModified: new Date().toISOString()
        }]
      }
      
      // Find the highest page number
      let maxPageNum = 1
      pagesWithPage1.forEach(page => {
        const match = page.name.match(/^Page (\d+)$/)
        if (match) {
          const pageNum = parseInt(match[1], 10)
          if (pageNum > maxPageNum) {
            maxPageNum = pageNum
          }
        }
      })
      
      const nextPageNum = maxPageNum + 1
      const pageName = `Page ${nextPageNum}`
      const sanitizedName = pageName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const newPageId = `page-${sanitizedName}-${Date.now()}`
      
      // Create the page data
      const newPageData = {
        content: [],
        root: {
          props: {
            title: pageName,
            pageTitle: pageName
          }
        },
        zones: {}
      }

      // Cache immediately so refresh / page switching can restore unsaved pages
      try {
        const cacheKey = `puck-page-${newPageId}`
        localStorage.setItem(cacheKey, JSON.stringify(newPageData))
      } catch {
        // ignore
      }
      
      // Add the new page to the array
      const newPage: Page = {
        id: newPageId,
        name: pageName,
        filename: `${newPageId}.json`,
        lastModified: new Date().toISOString()
      }
      
      const updatedPages = [...pagesWithPage1, newPage]
      logger.debug('createNewPage: Pages after creating:', updatedPages.map(p => `${p.name} (${p.id})`))
      
      // Update other states immediately (React will batch these)
      setCurrentData(newPageData)
      setCurrentPage(newPageId)
      setCurrentPageName(pageName)
      setShowPageManager(false)
      setShowPageNameDialog(false) // Don't show the dialog
      
      // Note: SAVE_PAGE endpoint is not used - pages are saved via createOrUpdateWebpage() in webpageService
      // Pages are saved when user clicks the Save button in the editor
      logger.debug('createNewPage: Page created locally, will be saved via Save button:', `${newPageId}.json`)
      
      return updatedPages
    })
  }

  // Function to confirm new page creation
  const confirmNewPage = (pageName: string) => {
    setCurrentPageName(pageName)
    // Update the current page ID to use the sanitized page name
    const sanitizedName = pageName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const newPageId = `page-${sanitizedName}-${Date.now()}`
    const oldPageId = currentPage
    
    setCurrentPage(newPageId)
    
    // Update the canvas title to match the page name and save to server
    setCurrentData((prevData: any) => {
      const updatedData = {
        ...prevData,
        root: {
          ...prevData.root,
          props: {
            ...prevData.root?.props,
            title: pageName,
            pageTitle: pageName
          }
        }
      }

      // Move cache from old page id to new page id so refresh restores the renamed unsaved page
      try {
        const oldKey = `puck-page-${oldPageId}`
        const newKey = `puck-page-${newPageId}`
        localStorage.setItem(newKey, JSON.stringify(updatedData))
        localStorage.removeItem(oldKey)
      } catch {
        // ignore
      }
      
      // Note: SAVE_PAGE endpoint is not used - pages are saved via createOrUpdateWebpage() in webpageService
      // Pages are saved when user clicks the Save button in the editor
      logger.debug('confirmNewPage: Page updated locally, will be saved via Save button:', `${newPageId}.json`)
      
      return updatedData
    })
    
    // Update the page in the pages array with the new name and ID
    setPages(prevPages => {
      // Remove the old temporary page entry
      const filteredPages = prevPages.filter(p => p.id !== oldPageId)
      
      // Ensure Page 1 is always in the array (check by ID, not name, since names can be changed)
      const page1Exists = filteredPages.some(p => p.id === 'page1' || p.filename === 'page1.json')
      let pagesWithPage1 = filteredPages
      if (!page1Exists) {
        // Try to get the actual name from existing page data, or use default
        const existingPage1 = filteredPages.find(p => p.id === 'page1' || p.filename === 'page1.json')
        const page1Name = existingPage1?.name || 'Page 1'
        pagesWithPage1 = [...filteredPages, {
          id: 'page1',
          name: page1Name,
          filename: 'page1.json',
          lastModified: new Date().toISOString()
        }]
      }
      
      // Add the new page with confirmed name
      const pageExists = pagesWithPage1.some(p => p.id === newPageId)
      if (!pageExists) {
        return [...pagesWithPage1, {
          id: newPageId,
          name: pageName,
          filename: `${newPageId}.json`,
          lastModified: new Date().toISOString()
        }]
      }
      return pagesWithPage1
    })
    
    setShowPageNameDialog(false)
  }

  const createPageFromTemplate = async (templateType: string) => {
    const templateNames: Record<string, string> = {
      'schedule': 'Schedule',
      'sponsor': 'Sponsor',
      'floor-plan': 'Floor plan',
      'lists': 'Lists'
    }
    
    const pageName = templateNames[templateType] || templateType
    const sanitizedName = pageName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const pageId = `page-${sanitizedName}-${Date.now()}`
    
    // Create template-specific content based on template type
    let templateContent: any[] = []
    
    switch (templateType) {
      case 'schedule':
        templateContent = [
          {
            type: 'SchedulePage',
            props: {
              id: generateId('SchedulePage'),
              title: 'Schedule',
              events: [
                {
                  id: "1",
                  title: "Welcome presentation",
                  startTime: "08:00 AM",
                  endTime: "09:00 AM",
                  location: "Room A",
                  type: "In-Person",
                  description: "Welcome presentation for all attendees",
                  participants: "",
                  tags: "",
                  attachments: 1,
                  isCompleted: false,
                  isExpanded: false,
                  parentSessionId: undefined
                }
              ],
              initialDate: new Date().toISOString().split('T')[0]
            }
          }
        ]
        break
      case 'sponsor':
        templateContent = [
          {
            type: 'Sponsors',
            props: {
              id: generateId('Sponsors'),
              title: "Sponsors",
              sponsors: [
                { id: '1', name: 'Sponsor 1', logoUrl: '' },
                { id: '2', name: 'Sponsor 2', logoUrl: '' },
                { id: '3', name: 'Sponsor 3', logoUrl: '' },
                { id: '4', name: 'Sponsor 4', logoUrl: '' }
              ],
              backgroundColor: "#ffffff",
              textColor: "#1f2937",
              padding: "3rem 2rem"
            }
          }
        ]
        break
      case 'floor-plan':
        templateContent = [
          {
            type: 'PdfViewer',
            props: {
              id: generateId('PdfViewer'),
              pdfUrl: '',
              height: 600
            }
          }
        ]
        break
      case 'lists':
        templateContent = [
          {
            type: 'List',
            props: {
              id: generateId('List'),
              items: [
                { id: '1', text: 'List item 1' },
                { id: '2', text: 'List item 2' },
                { id: '3', text: 'List item 3' }
              ],
              listType: 'unordered',
              spacing: 'normal'
            }
          }
        ]
        break
      default:
        templateContent = []
    }
    
    const newPageData = {
      content: templateContent,
      root: {
        props: {
          title: pageName,
          pageTitle: pageName,
          ...(templateType === 'schedule' ? { pageType: 'schedule' } : {})
        }
      },
      zones: {}
    }
    
    setCurrentData(newPageData)
    setCurrentPage(pageId)
    setCurrentPageName(pageName)
    
    const newPage: Page = {
      id: pageId,
      name: pageName,
      filename: `${pageId}.json`,
      lastModified: new Date().toISOString()
    }
    
    // Add the new template page to the pages array, preserving ALL existing pages
    setPages(prev => {
      logger.debug('createPageFromTemplate: Current pages BEFORE adding template:', prev.map(p => `${p.name} (${p.id})`))
      logger.debug('createPageFromTemplate: Current page is:', currentPage, currentPageName)
      
      // Preserve ALL existing pages - don't filter anything out
      // Start with a copy of all existing pages
      const updatedPages = [...prev]
      
      // Ensure Page 1 is always in the array (check by ID only, since names can be changed)
      const page1Exists = updatedPages.some(p => p.id === 'page1' || p.filename === 'page1.json')
      if (!page1Exists) {
        // Try to get the actual name from existing page data, or use default
        const existingPage1 = updatedPages.find(p => p.id === 'page1' || p.filename === 'page1.json')
        const page1Name = existingPage1?.name || 'Page 1'
        updatedPages.push({
          id: 'page1',
          name: page1Name,
          filename: 'page1.json',
          lastModified: new Date().toISOString()
        })
      }
      
      // IMPORTANT: If the current page is not in the array, add it
      // This handles the case where Page 2 was created but not yet in the pages array
      const currentPageExists = updatedPages.some(p => p.id === currentPage || p.name === currentPageName)
      if (!currentPageExists && currentPage && currentPageName) {
        logger.debug('createPageFromTemplate: Current page not in array, adding it:', currentPage, currentPageName)
        updatedPages.push({
          id: currentPage,
          name: currentPageName,
          filename: `${currentPage}.json`,
          lastModified: new Date().toISOString()
        })
      }
      
      // Check if the new template page already exists
      const pageExists = updatedPages.some(p => p.id === pageId)
      if (!pageExists) {
        updatedPages.push(newPage)
      }
      
      logger.debug('createPageFromTemplate: Pages AFTER adding template:', updatedPages.map(p => `${p.name} (${p.id})`))
      return updatedPages
    })
    
    // Note: SAVE_PAGE endpoint is not used - pages are saved via createOrUpdateWebpage() in webpageService
    // Pages are saved when user clicks the Save button in the editor
    logger.debug('createPageFromTemplate: Page created locally, will be saved via Save button:', `${pageId}.json`)
    
    return { pageId, pageName, newPageData }
  }

  useEffect(() => {
    const initializePage = async () => {
      // Check if we're creating from scratch (check both localStorage and URL param)
      const urlParams = new URLSearchParams(window.location.search)
      const isCreateFromScratch = urlParams.get('mode') === 'blank' || 
                                   localStorage.getItem('create-from-scratch') === 'true'
      const emptyPage1DataStr = localStorage.getItem('create-from-scratch-page1')
      // IMPORTANT: scope scratch page cache to a specific event.
      // Do NOT use a shared fallback key, otherwise pages can leak across events.
      const scratchEventUuid = getEventUuid()
      const scratchOrigin = getScratchOrigin()
      const scratchPagesKey =
        scratchEventUuid && scratchOrigin
          ? `scratch-pages-${scratchEventUuid}-${scratchOrigin}`
          : null
      
      // If creating from scratch, skip backend page loading and use clean state
      if (isCreateFromScratch) {
        try {
          // When starting scratch from Event Website, we want a clean single-page editor.
          // Do NOT rehydrate old scratch pages on refresh (users expect only Page 1).
          const isEventWebsiteScratch = scratchOrigin === 'event-website'

          // Use empty Page1 data from localStorage if available, otherwise use current empty state
          const emptyPage1Data = emptyPage1DataStr ? JSON.parse(emptyPage1DataStr) : {
            content: [],
            root: {
              props: {
                title: 'Page 1',
                pageTitle: 'Page 1'
              }
            },
            zones: {}
          }
          
          // Hydrate scratch pages from storage if available (prevents resetting to Page 1 / Page 2 after navigation)
          let storedPages: Page[] | null = null
          try {
            // In event-website scratch flow, always start clean.
            if (isEventWebsiteScratch && scratchPagesKey) {
              localStorage.removeItem(scratchPagesKey)
            }
            const raw = !isEventWebsiteScratch && scratchPagesKey ? localStorage.getItem(scratchPagesKey) : null
            if (raw) {
              const parsed = JSON.parse(raw)
              if (Array.isArray(parsed)) storedPages = parsed
            }
          } catch {
            // ignore
          }

          const ensurePage1 = (list: Page[]) => {
            const hasPage1 = list.some((p) => p?.id === 'page1' || p?.filename === 'page1.json')
            if (hasPage1) return list
            return [
              {
                id: 'page1',
                name: 'Page 1',
                filename: 'page1.json',
                lastModified: new Date().toISOString()
              },
              ...list
            ]
          }

          const normalizedStored = !isEventWebsiteScratch && storedPages
            ? ensurePage1(
                storedPages.filter((p: any) => p && typeof p.id === 'string' && typeof p.name === 'string')
              )
            : null

          setPages((prev) => {
            // Event Website scratch should always be a clean single page.
            if (isEventWebsiteScratch) {
              return [
                {
                  id: 'page1',
                  name: 'Page 1',
                  filename: 'page1.json',
                  lastModified: new Date().toISOString()
                }
              ]
            }

            // If we already have more than page1, don't wipe it.
            if (prev.length > 1) return prev
            if (normalizedStored && normalizedStored.length > 0) return normalizedStored
            return [
              {
                id: 'page1',
                name: 'Page 1',
                filename: 'page1.json',
                lastModified: new Date().toISOString()
              }
            ]
          })

          // Keep the current data/page stable; only fall back to Page 1 if nothing is set.
          setCurrentData((prev: any) => (prev ? prev : emptyPage1Data))
          setCurrentPage((prev) => (prev ? prev : 'page1'))
          setCurrentPageName((prev) => (prev ? prev : 'Page 1'))

          // If the URL points to a specific editor page, restore it on refresh.
          // - UUID pageIds: load from backend via loadPage()
          // - Local scratch ids: load from localStorage cache (or create empty + cache)
          try {
            const match = window.location.pathname.match(/\/event\/website\/editor\/([^/?#]+)/)
            const routePageId = match?.[1] ? decodeURIComponent(match[1]) : null
            if (routePageId && routePageId !== 'page1' && !isEventWebsiteScratch) {
              if (uuidRegex.test(routePageId)) {
                // Only attempt backend UUID load if this uuid belongs to the current event sidebar webpages.
                // This prevents cross-event UUIDs from triggering 404 + toast spam.
                let allowed = false
                try {
                  if (scratchEventUuid) {
                    const raw = localStorage.getItem(`sidebar-webpages-${scratchEventUuid}`)
                    if (raw) {
                      const parsed = JSON.parse(raw)
                      if (Array.isArray(parsed)) {
                        allowed = parsed.some((w: any) => w && w.uuid === routePageId)
                      }
                    }
                  }
                } catch {
                  // ignore
                }

                if (allowed) {
                  await loadPage(`${routePageId}.json`)
                } else {
                  // Fall back to page1 and correct the URL.
                  const url = new URL(window.location.href)
                  url.pathname = `/event/website/editor/page1`
                  url.searchParams.set('mode', 'blank')
                  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
                  setCurrentPage('page1')
                  setCurrentPageName('Page 1')
                  setCurrentData(emptyPage1Data)
                }
              } else {
                const cached = getCachedPageData(routePageId)
                if (cached) {
                  const cleaned = cleanDuplicateComponents(cached)
                  setCurrentData(cleaned)
                  setCurrentPage(routePageId)
                  setCurrentPageName(getPageTitleFromData(cleaned) || routePageId)
                  setShowPageManager(false)
                } else {
                  // Create an empty page in cache so subsequent refreshes keep it
                  const nameFromStored =
                    storedPages?.find((p) => p?.id === routePageId)?.name ??
                    normalizedStored?.find((p) => p?.id === routePageId)?.name ??
                    routePageId
                  const empty = {
                    content: [],
                    root: { props: { title: nameFromStored, pageTitle: nameFromStored } },
                    zones: {}
                  }
                  try {
                    localStorage.setItem(`puck-page-${routePageId}`, JSON.stringify(empty))
                  } catch {
                    // ignore
                  }
                  setCurrentData(empty)
                  setCurrentPage(routePageId)
                  setCurrentPageName(nameFromStored)
                  setShowPageManager(false)
                }
              }
            }
          } catch {
            // ignore
          }
          
          // Clear WebsitePagesContext localStorage to remove any cached welcome pages
          try {
            const websitePagesStorage = localStorage.getItem('website-pages')
            if (websitePagesStorage) {
              const cachedPages = JSON.parse(websitePagesStorage)
              // Remove welcome pages from cache
              const filteredPages = cachedPages.filter((p: any) => 
                p.name?.toLowerCase() !== 'welcome' && p.id?.toLowerCase() !== 'welcome'
              )
              if (filteredPages.length !== cachedPages.length) {
                localStorage.setItem('website-pages', JSON.stringify(filteredPages))
                logger.debug('initializePage: Removed welcome pages from WebsitePagesContext cache')
              }
            }
          } catch (error) {
            logger.error('initializePage: Error clearing WebsitePagesContext cache:', error)
          }
          
          // Clear the flags after using them
          localStorage.removeItem('create-from-scratch')
          // Keep `create-from-scratch-page1` so a refresh in blank mode stays clean.
          
          logger.debug('initializePage: Initialized clean editor state for create-from-scratch mode')
          return // Exit early - don't load backend pages
        } catch (error) {
          logger.error('initializePage: Error parsing empty page1 data:', error)
          // Fall through to normal initialization
        }
      }
      
      // Normal flow: Load pages from server (only if NOT creating from scratch)
      try {
        await loadPages()
        
        // Note: GET_PAGE endpoint is not used - webpages are loaded via fetchWebpages() in EventWebsitePage
        // For page1 initialization, we use the default template data that was already set
        // No need to fetch from server as pages are managed via WEBPAGE API endpoints
        logger.debug('initializePage: Using default template data for page1 (pages loaded via fetchWebpages)')
        
        // Ensure page1 is in the pages array
        setPages(prevPages => {
          logger.debug('initializePage: Ensuring page1 exists. Current pages:', prevPages.map(p => `${p.name} (${p.id})`))
          const pageExists = prevPages.some(p => p.id === 'page1' || p.filename === 'page1.json')
          if (!pageExists) {
            const updated = [...prevPages, {
              id: 'page1',
              name: 'Page 1',
              filename: 'page1.json',
              lastModified: new Date().toISOString()
            }]
            logger.debug('initializePage: Added page1. Updated pages:', updated.map(p => `${p.name} (${p.id})`))
            return updated
          }
          logger.debug('initializePage: page1 already exists')
          return prevPages
        })
        
        // If page1 data wasn't set yet, use default
        if (!currentData || !currentData.content || currentData.content.length === 0) {
          const page1Data = defaultPage1Data
          setCurrentData(page1Data)
          setCurrentPage('page1')
          setCurrentPageName('Page 1')
        }
      } catch (error) {
        logger.error('Error initializing page1:', error)
        // Even if there's an error, ensure page1 is in the pages array
        setPages(prevPages => {
          const pageExists = prevPages.some(p => p.id === 'page1' || p.filename === 'page1.json')
          if (!pageExists) {
            return [...prevPages, {
              id: 'page1',
              name: 'Page 1',
              filename: 'page1.json',
              lastModified: new Date().toISOString()
            }]
          }
          return prevPages
        })
      }
    }
    
    initializePage()
  }, [])

  // Persist scratch pages list while in `mode=blank` so navigation/remount doesn't reset to generic "Page 1 / Page 2"
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    const isCreateFromScratch =
      urlParams.get('mode') === 'blank' || localStorage.getItem('create-from-scratch') === 'true'
    if (!isCreateFromScratch) return
    const scratchEventUuid = getEventUuid()
    if (!scratchEventUuid) return
    const scratchOrigin = getScratchOrigin()
    if (!scratchOrigin) return
    // For Event Website -> Create from scratch, do not persist extra pages.
    // This flow is intentionally a clean single-page editor.
    if (scratchOrigin === 'event-website') return
    const scratchPagesKey = `scratch-pages-${scratchEventUuid}-${scratchOrigin}`
    try {
      const minimal = pages.map((p) => ({
        id: p.id,
        name: p.name,
        filename: p.filename,
        lastModified: p.lastModified
      }))
      localStorage.setItem(scratchPagesKey, JSON.stringify(minimal))
    } catch {
      // ignore
    }
  }, [pages, createdEvent?.uuid])

  // Continuously filter out welcome pages when in create-from-scratch mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const isCreateFromScratch = urlParams.get('mode') === 'blank' || 
                                 localStorage.getItem('create-from-scratch') === 'true'
    
    if (isCreateFromScratch) {
      // Filter out any welcome pages that might have been added
      setPages(prevPages => {
        const hasWelcome = prevPages.some(page => {
          const pageNameLower = page.name.toLowerCase()
          const pageIdLower = page.id.toLowerCase()
          return pageNameLower === 'welcome' || pageIdLower === 'welcome'
        })
        
        // Only update if welcome pages exist
        if (!hasWelcome) {
          return prevPages
        }
        
        const filtered = prevPages.filter(page => {
          const pageNameLower = page.name.toLowerCase()
          const pageIdLower = page.id.toLowerCase()
          return pageNameLower !== 'welcome' && pageIdLower !== 'welcome'
        })
        
        // Ensure page1 exists
        const hasPage1 = filtered.some(p => p.id === 'page1' || p.filename === 'page1.json')
        if (!hasPage1) {
          return [{
            id: 'page1',
            name: 'Page 1',
            filename: 'page1.json',
            lastModified: new Date().toISOString()
          }, ...filtered]
        }
        
        logger.debug('Filtered out welcome pages from pages array:', {
          before: prevPages.map(p => p.name),
          after: filtered.map(p => p.name)
        })
        
        return filtered
      })
    }
  }, []) // Only run once on mount - check URL on mount

  return {
    currentData,
    setCurrentData,
    currentPage,
    setCurrentPage,
    currentPageName,
    setCurrentPageName,
    pages,
    showPageManager,
    setShowPageManager,
    showPageNameDialog,
    setShowPageNameDialog,
    loadPages,
    loadPage,
    createNewPage,
    confirmNewPage,
    createPageFromTemplate
  }
}
