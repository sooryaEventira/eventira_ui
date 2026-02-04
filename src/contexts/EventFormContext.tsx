import React, { createContext, useContext, useState, ReactNode } from 'react'
import { EventFormData } from '../components/dashboard/NewEventForm'
import { CreateEventResponseData } from '../services/eventService'

interface EventFormContextType {
  eventData: EventFormData | null
  setEventData: (data: EventFormData) => void
  clearEventData: () => void
  createdEvent: CreateEventResponseData | null
  setCreatedEvent: (event: CreateEventResponseData) => void
  clearCreatedEvent: () => void
}

const EventFormContext = createContext<EventFormContextType | undefined>(undefined)

export const EventFormProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [eventData, setEventDataState] = useState<EventFormData | null>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('event-form-data')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Convert File objects back (they won't be preserved, but we handle it)
        return parsed
      } catch {
        return null
      }
    }
    return null
  })

  const [createdEvent, setCreatedEventState] = useState<CreateEventResponseData | null>(() => {
    const stored = localStorage.getItem('created-event')
    if (stored) {
      try {
        return JSON.parse(stored) as CreateEventResponseData
      } catch {
        return null
      }
    }
    return null
  })

  const setEventData = (data: EventFormData) => {
    setEventDataState(data)
    // Store in localStorage (files won't be serialized, handle separately)
    const dataToStore = {
      ...data,
      logo: data.logo ? 'file://logo' : null,
      banner: data.banner ? 'file://banner' : null,
    }
    localStorage.setItem('event-form-data', JSON.stringify(dataToStore))
    // Store files separately
    if (data.logo) {
      const reader = new FileReader()
      reader.onload = () => {
        localStorage.setItem('event-form-logo', reader.result as string)
      }
      reader.readAsDataURL(data.logo)
    }
    if (data.banner) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        // Store globally for immediate use during creation flow…
        localStorage.setItem('event-form-banner', dataUrl)
        // …and also store per-event when we know the event UUID.
        const eventUuid = localStorage.getItem('currentEventUuid')
        if (eventUuid) {
          localStorage.setItem(`event-form-banner-${eventUuid}`, dataUrl)
        }
      }
      reader.readAsDataURL(data.banner)
    }
  }

  const clearEventData = () => {
    setEventDataState(null)
    localStorage.removeItem('event-form-data')
    localStorage.removeItem('event-form-logo')
    localStorage.removeItem('event-form-banner')
    const eventUuid = localStorage.getItem('currentEventUuid')
    if (eventUuid) {
      localStorage.removeItem(`event-form-banner-${eventUuid}`)
    }
  }

  const setCreatedEvent = (event: CreateEventResponseData) => {
    if (!event || !event.uuid) return
    setCreatedEventState(event)

    try {
      localStorage.setItem('created-event', JSON.stringify(event))
      // Also store the UUID separately for easy access
      localStorage.setItem('currentEventUuid', event.uuid)

      // If this event has NO uploaded banner, do not reuse a banner from another event.
      // Let HeroSection's own default image render.
      if (!event.banner) {
        localStorage.removeItem('event-form-banner')
        localStorage.removeItem(`event-form-banner-${event.uuid}`)
      } else {
        // If backend provides a banner URL, store it per-event as well (normalized to https).
        let bannerUrl = event.banner
        if (typeof bannerUrl === 'string' && bannerUrl.startsWith('http://')) {
          bannerUrl = bannerUrl.replace('http://', 'https://')
        }
        if (typeof bannerUrl === 'string' && bannerUrl.trim()) {
          localStorage.setItem(`event-form-banner-${event.uuid}`, bannerUrl)
          localStorage.setItem('event-form-banner', bannerUrl)
        }
      }
    } catch (error) {
      // Error writing to localStorage
    }
  }

  const clearCreatedEvent = () => {
    const prevUuid = localStorage.getItem('currentEventUuid')
    setCreatedEventState(null)
    localStorage.removeItem('created-event')
    localStorage.removeItem('currentEventUuid')
    if (prevUuid) {
      localStorage.removeItem(`event-form-banner-${prevUuid}`)
    }
  }

  return (
    <EventFormContext.Provider value={{ 
      eventData, 
      setEventData, 
      clearEventData,
      createdEvent,
      setCreatedEvent,
      clearCreatedEvent
    }}>
      {children}
    </EventFormContext.Provider>
  )
}

export const useEventForm = () => {
  const context = useContext(EventFormContext)
  if (context === undefined) {
    throw new Error('useEventForm must be used within an EventFormProvider')
  }
  return context
}

/** Use when component may render outside EventFormProvider (e.g. HeroSection on public page). Returns null if outside provider. */
export const useOptionalEventForm = (): EventFormContextType | null => {
  const context = useContext(EventFormContext)
  return context ?? null
}
