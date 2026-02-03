import React, { useState, useRef } from 'react'
import logoImage from '../../assets/images/Logo.png'
import { ProgressSteps } from '../ui/untitled'
import EventDetailsStep from './NewEventForm/EventDetailsStep'
import FileUploadStep, { FileUploadStepRef } from './NewEventForm/FileUploadStep'
import { useEventForm } from '../../contexts/EventFormContext'

interface NewEventFormProps {
  onClose: () => void
  onSubmit: (data: EventFormData) => void
}

export interface EventFormData {
  // Step 1 - Event Details
  eventName: string
  startDate: string
  endDate: string
  /** When true, user picks one date and start/end are the same. */
  isSingleDayEvent: boolean
  timezone: string
  fixTimezoneForAttendees: boolean
  location: string
  attendees: number
  eventExperience: 'in-person' | 'virtual' | 'hybrid' | ''
  
  // Step 2 - Design
  logo: File | null
  banner: File | null
}

// Total steps - update this as you add more steps
// Currently: Step 1 (Event Details), Step 2 (File Upload)
const TOTAL_STEPS = 2

const NewEventForm: React.FC<NewEventFormProps> = ({ onClose, onSubmit }) => {
  const { setEventData } = useEventForm()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<EventFormData>({
    eventName: '',
    startDate: '',
    endDate: '',
    isSingleDayEvent: false,
    timezone: '', // Will be auto-detected by TimezoneSelector component
    fixTimezoneForAttendees: true,
    location: '',
    attendees: 0,
    eventExperience: '',
    logo: null,
    banner: null
  })
  
  // Ref to access FileUploadStep's submit function
  const fileUploadStepRef = useRef<FileUploadStepRef>(null)

  const updateFormData = (updates: Partial<EventFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const handleNext = () => {
    console.log(`🔄 [NewEventForm] handleNext called - currentStep: ${currentStep}`)
    
    if (currentStep === 1) {
      // Validate step 1 - all required fields must be filled
      console.log('📝 [NewEventForm] Validating step 1 data:', {
        eventName: formData.eventName,
        startDate: formData.startDate,
        endDate: formData.endDate,
        timezone: formData.timezone,
        location: formData.location,
        attendees: formData.attendees,
        eventExperience: formData.eventExperience
      })
      
      const step1Valid =
        formData.eventName &&
        formData.startDate &&
        formData.timezone &&
        formData.location &&
        formData.attendees > 0 &&
        formData.eventExperience
      const endDateValid = formData.isSingleDayEvent || (formData.endDate && formData.endDate > formData.startDate)
      if (step1Valid && endDateValid) {
        // For single-day events, ensure endDate = startDate before storing
        const dataToStore = formData.isSingleDayEvent
          ? { ...formData, endDate: formData.startDate }
          : formData
        console.log('💾 [NewEventForm] Storing form data in context and moving to step 2')
        setEventData(dataToStore)
        setFormData((prev) => (formData.isSingleDayEvent ? { ...prev, endDate: prev.startDate } : prev))
        setCurrentStep(2)
      } else {
        console.warn('⚠️ [NewEventForm] Step 1 validation failed - missing required fields')
      }
    } else if (currentStep === TOTAL_STEPS) {
      // Step 2 (File Upload) - Trigger API call via FileUploadStep
      console.log('🚀 [NewEventForm] Step 2 - Triggering event creation via FileUploadStep')
      if (fileUploadStepRef.current) {
        fileUploadStepRef.current.submit()
      } else {
        console.error('❌ [NewEventForm] FileUploadStep ref is not available')
      }
    } else {
      // Intermediate steps - move to next step
      console.log(`➡️ [NewEventForm] Moving to next step: ${currentStep + 1}`)
      setCurrentStep(currentStep + 1)
    }
  }

  const handleEventCreated = () => {
    // Navigate to template selection page after successful event creation
    window.history.pushState({}, '', '/event/create/template')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isStep1Valid = () => {
    const hasRequired = !!(
      formData.eventName &&
      formData.startDate &&
      formData.timezone &&
      formData.location &&
      formData.attendees > 0 &&
      formData.eventExperience
    )
    const dateValid = formData.isSingleDayEvent || (!!formData.endDate && formData.endDate > formData.startDate)
    return hasRequired && dateValid
  }

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header with Logo */}
        <div className="flex justify-center pt-6 pb-4">
          <img src={logoImage} alt="Logo" className="h-12 w-12 object-contain" />
        </div>
        
        {/* Title */}
        <div className="text-center mb-6">
          {currentStep === 1 ? (
            <h1 className="text-2xl font-semibold text-slate-900">Set up your event details.</h1>
          ) : (
            <h1 className="text-2xl font-semibold text-slate-900">Upload your event assets.</h1>
          )}
        </div>

        {/* Step Indicator */}
        <div className="px-6 mb-6">
          <ProgressSteps
            steps={[
              { title: 'Event details', description: 'Name, date, and location' },
              { title: 'File upload', description: 'Logo and banner' }
            ]}
            currentStep={currentStep}
          />
        </div>

        {/* Form Content */}
        <div className="px-6 pb-6">
          {currentStep === 1 ? (
            <EventDetailsStep
              formData={formData}
              updateFormData={updateFormData}
            />
          ) : (
            <FileUploadStep
              ref={fileUploadStepRef}
              formData={formData}
              updateFormData={updateFormData}
              onSuccess={handleEventCreated}
              onSubmittingChange={setIsSubmitting}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={currentStep === 1 ? onClose : handlePrevious}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={
              (currentStep === 1 && !isStep1Valid()) ||
              (currentStep === TOTAL_STEPS && isSubmitting)
            }
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#6938EF] hover:bg-[#5925DC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6938EF] flex items-center gap-2"
          >
            {currentStep === TOTAL_STEPS ? (
              <>
                {isSubmitting && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSubmitting ? 'Creating Event...' : 'Create Event'}
              </>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NewEventForm

