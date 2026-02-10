import { useState, useImperativeHandle, forwardRef } from 'react'
import FileUpload from './FileUpload'
import type { EventFormData } from '../NewEventForm'
import { createEvent } from '../../../services/eventService'
import { useEventForm } from '../../../contexts/EventFormContext'

interface FileUploadStepProps {
  formData: EventFormData
  updateFormData: (updates: Partial<EventFormData>) => void
  onSuccess: () => void
  onSubmittingChange?: (isSubmitting: boolean) => void
}

export interface FileUploadStepRef {
  submit: () => void
  isSubmitting: boolean
}

const FileUploadStep = forwardRef<FileUploadStepRef, FileUploadStepProps>(({ 
  formData, 
  updateFormData,
  onSuccess,
  onSubmittingChange
}, ref) => {
  const { setCreatedEvent } = useEventForm()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Convert date strings to ISO format with time
  const formatDateToISO = (dateString: string, isEndDate: boolean = false): string => {
    // If dateString is already in ISO format with time, return it
    if (dateString.includes('T')) {
      return dateString
    }
    
    // Parse the date string (format: YYYY-MM-DD)
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      // If invalid, try to create a date from the string
      return dateString
    }
    
    // Set time: start date at 00:00:00, end date at 23:59:59
    if (isEndDate) {
      date.setHours(23, 59, 59, 999)
    } else {
      date.setHours(0, 0, 0, 0)
    }
    
    return date.toISOString()
  }

  // Expose submit function and loading state via ref
  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
    isSubmitting
  }))

  const validateForm = (): boolean => {
    const errors: string[] = []
    
    // All required fields from step 1 should already be validated
    // But we can double-check here
    if (!formData.eventName) {
      errors.push('Event name is required')
    }
    if (!formData.startDate) {
      errors.push('Start date is required')
    }
    if (!formData.endDate) {
      errors.push('End date is required')
    }
    if (!formData.timezone) {
      errors.push('Timezone is required')
    }
    if (!formData.location) {
      errors.push('Location is required')
    }
    if (!formData.attendees || formData.attendees <= 0) {
      errors.push('Attendees count must be greater than 0')
    }
    if (!formData.eventExperience) {
      errors.push('Event experience is required')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSubmit = async () => {
    console.log('🚀 [FileUploadStep] Submit button clicked - starting event creation process')
    
    // Validate form before submission
    if (!validateForm()) {
      console.warn('⚠️ [FileUploadStep] Form validation failed')
      return
    }
    console.log('✅ [FileUploadStep] Form validation passed')

    // Check authentication before submitting
    const accessToken = localStorage.getItem('accessToken')
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
    
    console.log('🔐 [FileUploadStep] Authentication check:', {
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken?.length || 0,
      isAuthenticated,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'none'
    })
    
    if (!accessToken) {
      let errorMessage = 'Authentication token is missing. '
      
      if (isAuthenticated) {
        errorMessage += 'Your session may have expired. Please refresh the page and login again to continue.'
        // Clear the invalid authentication state
        console.warn('Clearing invalid authentication state - isAuthenticated is true but no accessToken found')
        localStorage.removeItem('isAuthenticated')
      } else {
        errorMessage += 'You must be logged in to create an event. Please complete the login process.'
      }
      
      setValidationErrors([errorMessage])
      console.error('No access token found. Authentication state:', {
        isAuthenticated,
        hasAccessToken: false,
        availableKeys: Object.keys(localStorage).filter(key => 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('auth') ||
          key.toLowerCase().includes('user')
        )
      })
      return
    }

    setIsSubmitting(true)
    onSubmittingChange?.(true)
    setValidationErrors([])

    console.log('📝 [FileUploadStep] Preparing event data for submission...')

    try {
      // Prepare the request payload
      // Parse dates to extract date and time components
      const startDateObj = new Date(formData.startDate + 'T00:00:00')
      const endDateObj = new Date(formData.endDate + 'T23:59:59')
      
      // Format date as YYYY-MM-DD
      const formatDateOnly = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      // Format time as HH:mm (24-hour format)
      const formatTime = (date: Date) => {
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
      }
      
      const startDate = formatDateOnly(startDateObj)
      const startTime = formatTime(startDateObj) // Default to 00:00 for start
      const endDate = formatDateOnly(endDateObj)
      const endTime = formatTime(endDateObj) // Default to 23:59 for end
      
      const startDateTimeISO = formatDateToISO(formData.startDate, false)
      const endDateTimeISO = formatDateToISO(formData.endDate, true)

      console.log('📅 [FileUploadStep] Date conversion:', {
        startDate: formData.startDate,
        startDateFormatted: startDate,
        startTime,
        startDateTimeISO,
        endDate: formData.endDate,
        endDateFormatted: endDate,
        endTime,
        endDateTimeISO
      })

      // formData.timezone is already a UUID (from TimezoneSelector)
      console.log('📋 [FileUploadStep] Using timezone UUID:', formData.timezone)

      const eventRequest = {
        eventName: formData.eventName,
        startDate,
        startDateTimeISO,
        startTime,
        endDate,
        endDateTimeISO,
        endTime,
        timezoneId: formData.timezone, // Already a UUID from TimezoneSelector
        location: formData.location,
        attendees: formData.attendees,
        eventExperience: formData.eventExperience as 'in-person' | 'virtual' | 'hybrid',
        logo: formData.logo,
        banner: formData.banner,
        fixTimezoneForAttendees: formData.fixTimezoneForAttendees ?? true,
      }

      console.log('📤 [FileUploadStep] Submitting event creation request:', {
        eventName: eventRequest.eventName,
        startDate: eventRequest.startDate,
        startDateTimeISO: eventRequest.startDateTimeISO,
        startTime: eventRequest.startTime,
        endDate: eventRequest.endDate,
        endDateTimeISO: eventRequest.endDateTimeISO,
        endTime: eventRequest.endTime,
        timezoneId: eventRequest.timezoneId,
        location: eventRequest.location,
        attendees: eventRequest.attendees,
        eventExperience: eventRequest.eventExperience,
        logo: eventRequest.logo ? `${eventRequest.logo.name} (${eventRequest.logo.size} bytes)` : null,
        banner: eventRequest.banner ? `${eventRequest.banner.name} (${eventRequest.banner.size} bytes)` : null,
        fixTimezoneForAttendees: eventRequest.fixTimezoneForAttendees,
      })

      // Make API call
      console.log('🌐 [FileUploadStep] Calling createEvent API...')
      const createdEventData = await createEvent(eventRequest)

      // Log the full API response
      console.log('📥 [FileUploadStep] Full API Response:', JSON.stringify(createdEventData, null, 2))
      console.log('📥 [FileUploadStep] API Response Details:', {
        uuid: createdEventData.uuid,
        eventName: createdEventData.eventName,
        banner: createdEventData.banner,
        logo: createdEventData.logo,
        location: createdEventData.location,
        startDate: createdEventData.startDate,
        endDate: createdEventData.endDate,
        attendees: createdEventData.attendees,
        eventExperience: createdEventData.eventExperience,
        status: createdEventData.status,
        event_id: createdEventData.event_id
      })

      // Store the created event in context first
      console.log('💾 [FileUploadStep] Storing created event in context:', {
        uuid: createdEventData.uuid,
        eventName: createdEventData.eventName,
        banner: createdEventData.banner ? 'present' : 'missing',
        logo: createdEventData.logo ? 'present' : 'missing'
      })
      setCreatedEvent(createdEventData)

      // Save banner to localStorage only if API didn't return banner URL (fallback)
      // If API returns banner URL, we'll use that directly from createdEvent
      if (!createdEventData.banner && formData.banner && formData.banner instanceof File) {
        await new Promise<void>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          localStorage.setItem('event-form-banner', dataUrl)
            console.log('💾 [FileUploadStep] Banner saved to localStorage (API did not return banner URL)')
            resolve()
        }
        reader.onerror = () => {
          console.error('❌ [FileUploadStep] Error saving banner to localStorage')
            // Continue even if banner save fails
            resolve()
        }
          reader.readAsDataURL(formData.banner as File)
        })
      } else if (createdEventData.banner) {
        console.log('✅ [FileUploadStep] Banner URL received from API, using that instead of localStorage')
      }

      // Save logo to localStorage only if API didn't return logo URL (fallback)
      if (!createdEventData.logo && formData.logo && formData.logo instanceof File) {
        await new Promise<void>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result as string
            localStorage.setItem('event-form-logo', dataUrl)
            console.log('💾 [FileUploadStep] Logo saved to localStorage (API did not return logo URL)')
            resolve()
          }
          reader.onerror = () => {
            console.error('❌ [FileUploadStep] Error saving logo to localStorage')
            resolve()
          }
          reader.readAsDataURL(formData.logo as File)
        })
      } else if (createdEventData.logo) {
        console.log('✅ [FileUploadStep] Logo URL received from API, using that instead of localStorage')
      }

      console.log('✅ [FileUploadStep] Event created successfully!', createdEventData)

      // Call success callback (which will navigate to template selection)
      // All data is now ready in context and localStorage
      console.log('🎯 [FileUploadStep] Navigating to template selection...')
      onSuccess()
    } catch (error) {
      console.error('❌ [FileUploadStep] Error creating event:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create event. Please try again.'
      setValidationErrors([errorMessage])
    } finally {
      setIsSubmitting(false)
      onSubmittingChange?.(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</div>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Logo Upload */}
      <FileUpload
        label="Logo"
        accept="image/*"
        maxSize="500×500px"
        value={formData.logo}
        onChange={(file) => updateFormData({ logo: file })}
        maxWidth="500"
        maxHeight="500"
      />

      {/* Banner Upload */}
      <FileUpload
        label="Banner"
        accept="image/*"
        maxSize="800×400px"
        value={formData.banner}
        onChange={(file) => updateFormData({ banner: file })}
        maxWidth="800"
        maxHeight="400"
      />

    </div>
  )
})

FileUploadStep.displayName = 'FileUploadStep'

export default FileUploadStep

