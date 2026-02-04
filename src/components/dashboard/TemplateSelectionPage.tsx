import React, { useState, useEffect } from 'react'
import { useEventForm } from '../../contexts/EventFormContext'
import { createWebpage } from '../../services/webpageService'
import { showToast } from '../../utils/toast'
import HeroSection from '../advanced/HeroSection'
import AboutSection from '../advanced/AboutSection'
import SpeakersSection from '../advanced/SpeakersSection'
import RegistrationCTA from '../advanced/RegistrationCTA'
import Sponsors from '../advanced/Sponsors'
import FAQAccordion from '../advanced/FAQAccordion'
import ContactFooter from '../advanced/ContactFooter'

const TemplateSelectionPage: React.FC = () => {
  const { eventData, createdEvent } = useEventForm()
  const [bannerUrl, setBannerUrl] = useState<string>('')
  const [isLoadingBanner, setIsLoadingBanner] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // Prioritize createdEvent data from API, fallback to eventData from form
  const displayEventName = createdEvent?.eventName || eventData?.eventName
  const displayStartDate = createdEvent?.startDate || eventData?.startDate
  const displayLocation = createdEvent?.location || eventData?.location

  // Load banner from context: Priority 1 = API response (createdEvent), Priority 2 = localStorage, Priority 3 = eventData File
  useEffect(() => {
    // Priority 1: Check API response first (createdEvent.banner from API)
    if (createdEvent?.banner) {
      console.log('✅ TemplateSelectionPage: Banner found in API response:', createdEvent.banner)
      
      // Convert http to https to avoid redirect issues
      let bannerUrl = createdEvent.banner
      if (bannerUrl.startsWith('http://')) {
        bannerUrl = bannerUrl.replace('http://', 'https://')
        console.log('🔒 TemplateSelectionPage: Converted http to https')
      }
      
      setBannerUrl(bannerUrl)
      setIsLoadingBanner(false)
      console.log('✅ TemplateSelectionPage: Banner URL set:', bannerUrl)
      return
    }

    // Priority 2: Check localStorage (where banner is stored during event creation as fallback)
    const storedBanner = localStorage.getItem('event-form-banner')
    if (storedBanner) {
      console.log('✅ TemplateSelectionPage: Banner loaded from localStorage')
      setBannerUrl(storedBanner)
      setIsLoadingBanner(false)
      return
    }

    // Priority 3: Try to get banner from eventData (if it's a File)
    if (eventData?.banner && eventData.banner instanceof File) {
      console.log('📁 TemplateSelectionPage: Reading banner from eventData File')
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        setBannerUrl(dataUrl)
        localStorage.setItem('event-form-banner', dataUrl)
        setIsLoadingBanner(false)
        console.log('✅ TemplateSelectionPage: Banner loaded from eventData File and saved to localStorage')
      }
      reader.onerror = () => {
        console.error('❌ TemplateSelectionPage: Error reading banner file')
        setIsLoadingBanner(false)
      }
      reader.readAsDataURL(eventData.banner)
      return
    }

    console.log('⚠️ TemplateSelectionPage: No banner found in API response, context or localStorage')
    setIsLoadingBanner(false)
  }, [createdEvent, eventData])

  const handlePrevious = () => {
    // Navigate back to dashboard and reopen form at step 2
    window.history.pushState({}, '', '/dashboard')
    // Store flag to reopen form at step 2
    localStorage.setItem('reopen-event-form-step', '2')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // Generate default template data structure
  const getDefaultTemplateData = () => {
    // Get banner image from state or localStorage or use default
    const bannerImage = bannerUrl || localStorage.getItem('event-form-banner') || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80'
    
    // Get event data values
    const eventName = displayEventName || 'Event Title'
    const location = displayLocation || 'Location'
    const eventDate = formatEventDate()
    const subtitle = `${location} | ${eventDate}`
    
    // Generate unique IDs for each component
    const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    return {
      content: [
        {
          type: 'HeroSection',
          props: {
            id: generateId('HeroSection'),
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
            textColor: '#FFFFFF',
            backgroundImage: bannerImage,
            height: '500px',
            alignment: 'center',
            overlayOpacity: 0.4
          }
        },
        {
          type: 'AboutSection',
          props: {
            id: generateId('AboutSection'),
            leftTitle: 'About Event',
            leftText: 'We are dedicated to providing innovative solutions that help our clients achieve their goals and drive success in their respective industries.'
          }
        },
        {
          type: 'SpeakersSection',
          props: {
            id: generateId('SpeakersSection'),
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
            containerMaxWidth: 'max-w-7xl',
            containerPadding: 'px-4 sm:px-6 lg:px-8 py-8'
          }
        },
        {
          type: 'RegistrationCTA',
          props: {
            id: generateId('RegistrationCTA'),
            title: "Register now to enjoy exclusive benefits!",
            subtitle: "Don't miss out on this opportunity, join us today!",
            buttonText: "Register Now"
          }
        },
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
            ]
          }
        },
        {
          type: 'FAQAccordion',
          props: {
            id: generateId('FAQAccordion'),
            title: "Frequently Asked Questions",
            description: "Everything you need to know about the product and billing. Can't find the answer you're looking for? Please chat to our friendly team",
            containerMaxWidth: 'max-w-7xl',
            containerPadding: 'px-4 sm:px-6 lg:px-8 py-8'
          }
        },
        {
          type: 'ContactFooter',
          props: {
            id: generateId('ContactFooter'),
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
            ]
          }
        }
      ],
      root: { props: { title: 'Welcome', pageTitle: 'Welcome' } },
      zones: {}
    }
  }

  const handleNext = async () => {
    // Check if event is created
    if (!createdEvent?.uuid) {
      showToast.error('Event not found. Please create an event first.')
      return
    }

    setIsSaving(true)

    try {
      // Get default template data
      const templateData = getDefaultTemplateData()

      // Format data according to API structure
      // The content object uses the page key (e.g., "welcome") and each page has title, slug, and data
      const webpageRequest = {
        event_uuid: createdEvent.uuid,
        name: 'welcome',
        content: {
          welcome: {
            title: 'Welcome',
            slug: '/',
            data: {
              '/': {
                root: templateData.root,
                content: templateData.content,
                zones: templateData.zones
              }
            }
          }
        }
      }

      // Save webpage to backend
      const response = await createWebpage(webpageRequest)
      
      console.log('✅ Webpage created successfully:', response)
      
      // Clear create-from-scratch flag to indicate default template was selected
      localStorage.removeItem('create-from-scratch')
      
      // Navigate to Event Hub with event-website section
      window.history.pushState({ section: 'event-website' }, '', '/event/hub?section=event-website')
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (error) {
      // Error is already handled in createWebpage with toast
      console.error('❌ Failed to create webpage:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateFromScratch = () => {
    // Create empty Page1 data structure
    const emptyPage1Data = {
      content: [],
      root: {
        props: {
          title: 'Page 1',
          pageTitle: 'Page 1'
        }
      },
      zones: {}
    }
    
    // Store empty Page1 data in localStorage
    localStorage.setItem('create-from-scratch-page1', JSON.stringify(emptyPage1Data))
    
    // Set flag to indicate we're creating from scratch (this will trigger custom sidebar)
    localStorage.setItem('create-from-scratch', 'true')
    // Track where scratch flow started (for back navigation behavior)
    localStorage.setItem('create-from-scratch-origin', 'template-selection')
    // Also store origin per-event to avoid cross-event/refresh issues
    try {
      const eventUuid = createdEvent?.uuid ?? localStorage.getItem('currentEventUuid')
      if (eventUuid) {
        localStorage.setItem(`create-from-scratch-origin-${eventUuid}`, 'template-selection')
      }
    } catch {
      // ignore
    }
    
    // Navigate to editor with Page1 and mode=blank query param
    window.history.pushState({}, '', '/event/website/editor/page1?mode=blank')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // Parse as local calendar date (no UTC shift) so date matches Schedule/HeroSection after navigation
  const parseLocalDate = (raw: string | undefined): Date | null => {
    const r = (raw ?? '').trim()
    if (!r) return null
    const datePart = r.slice(0, 10)
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
    if (match) {
      const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10))
      return Number.isNaN(d.getTime()) ? null : d
    }
    const d = new Date(r)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const formatEventDate = () => {
    const displayEndDate = createdEvent?.endDate || eventData?.endDate
    const start = parseLocalDate(displayStartDate)
    const end = parseLocalDate(displayEndDate)
    if (!start && !end) return 'Jan 13, 2025'
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const fmtMonth = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' })
    if (start && !end) return fmt(start)
    if (end && !start) return fmt(end)
    if (start!.toDateString() === end!.toDateString()) return fmt(start!)
    if (start!.getFullYear() === end!.getFullYear() && start!.getMonth() === end!.getMonth()) {
      return `${fmtMonth(start!)} ${start!.getDate()}-${end!.getDate()}, ${start!.getFullYear()}`
    }
    if (start!.getFullYear() === end!.getFullYear()) {
      return `${fmtMonth(start!)} ${start!.getDate()} - ${fmtMonth(end!)} ${end!.getDate()}, ${start!.getFullYear()}`
    }
    return `${fmt(start!)} - ${fmt(end!)}`
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

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Header with Create from scratch button */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="text-xl font-semibold text-slate-900">
          Customize your design.
        </div>
        <button
          onClick={handleCreateFromScratch}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#6938EF] hover:bg-[#5925DC] transition-colors"
        >
          + Create from scratch
        </button>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-24 w-full overflow-x-hidden bg-white">
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
            backgroundImage={isLoadingBanner ? '' : (bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80')}
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
      </main>

      {/* Footer with Previous and Next buttons */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
        <button
          onClick={handlePrevious}
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#6938EF] hover:bg-[#5925DC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Next'}
        </button>
      </footer>
    </div>
  )
}

export default TemplateSelectionPage
