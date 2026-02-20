import React, { useState, Suspense, lazy } from 'react'
import { Model } from 'survey-core'
import 'survey-core/survey-core.min.css'

const Survey = lazy(() =>
  import('survey-react-ui').then((module) => ({ default: module.Survey }))
)

const SurveyLoadingFallback = () => (
  <div className="flex items-center justify-center p-8 min-h-[200px]">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8e44ad] border-t-transparent" />
    <span className="ml-3 text-sm text-slate-600">Loading form...</span>
  </div>
)

interface FeedbackFormProps {
  title?: string
  subtitle?: string
  backgroundColor?: string
  textColor?: string
  padding?: string
  onDataSubmit?: (data: any) => void
  saveEndpoint?: string
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  title = 'Event Feedback Form',
  subtitle = 'We value your feedback! Please take a moment to share your thoughts about the event.',
  backgroundColor = '#ffffff',
  textColor = '#2c3e50',
  padding = '2rem',
  onDataSubmit,
  saveEndpoint
}) => {
  // Survey state management
  const [surveyData, setSurveyData] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const surveyJson = {
    title: title,
    description: subtitle,
    logoPosition: 'right',
    pages: [
      {
        name: 'page1',
        elements: [
          {
            type: 'rating',
            name: 'overall_satisfaction',
            title: 'How would you rate your overall satisfaction with the event?',
            isRequired: true,
            rateMin: 1,
            rateMax: 5,
            minRateDescription: 'Very Dissatisfied',
            maxRateDescription: 'Very Satisfied',
            rateStep: 1,
            displayMode: 'buttons',
            colorMode: 'scale'
          },
          {
            type: 'rating',
            name: 'speaker_quality',
            title: 'How would you rate the quality of our speakers?',
            isRequired: true,
            rateMin: 1,
            rateMax: 5,
            minRateDescription: 'Poor',
            maxRateDescription: 'Excellent',
            rateStep: 1,
            displayMode: 'buttons',
            colorMode: 'scale'
          },
          {
            type: 'rating',
            name: 'venue_rating',
            title: 'How would you rate the venue and facilities?',
            isRequired: true,
            rateMin: 1,
            rateMax: 5,
            minRateDescription: 'Poor',
            maxRateDescription: 'Excellent',
            rateStep: 1,
            displayMode: 'buttons',
            colorMode: 'scale'
          }
        ]
      },
      {
        name: 'page2',
        elements: [
          {
            type: 'radiogroup',
            name: 'recommend_event',
            title: 'Would you recommend this event to others?',
            isRequired: true,
            choices: [
                { value: 'definitely', text: 'Definitely' },
                { value: 'probably', text: 'Probably' },
                { value: 'maybe', text: 'Maybe' },
                { value: 'probably_not', text: 'Probably Not' },
                { value: 'definitely_not', text: 'Definitely Not' }
            ],
            colCount: 1
          },
          {
            type: 'checkbox',
            name: 'favorite_aspects',
            title: 'What were your favorite aspects of the event? (Select all that apply)',
            choices: [
              { value: 'speakers', text: 'Speakers' },
              { value: 'networking', text: 'Networking' },
              { value: 'content', text: 'Content' },
              { value: 'venue', text: 'Venue' },
              { value: 'organization', text: 'Organization' },
              { value: 'food_drinks', text: 'Food & Drinks' }
            ],
            colCount: 2
          }
        ]
      },
      {
        name: 'page3',
        elements: [
          {
            type: 'comment',
            name: 'improvements',
            title: 'What could we improve for future events?',
            rows: 4
          },
          {
            type: 'comment',
            name: 'additional_comments',
            title: 'Any additional comments or feedback?',
            rows: 4
          },
          {
            type: 'text',
            name: 'name',
            title: 'Your Name',
            isRequired: false,
            maxLength: 100
          },
          {
            type: 'text',
            name: 'email',
            title: 'Email Address',
            isRequired: false,
            inputType: 'email',
            validators: [
              {
                type: 'email'
              }
            ]
          }
        ]
      }
    ],
    showProgressBar: 'top',
    progressBarType: 'buttons',
    showQuestionNumbers: 'off',
    showCompletedPage: true,
    completedHtml: `
      <div style="text-align: center; padding: 2rem;">
        <div id="completion-icon" style="font-size: 4rem; margin-bottom: 1rem; color: #8e44ad;">⏳</div>
        <h3 id="completion-title" style="color: #8e44ad; margin-bottom: 1rem;">Saving your feedback...</h3>
        <p id="completion-message" style="color: #666; font-size: 1.1rem; margin-bottom: 2rem;">
          Please wait while we save your response.
        </p>
        <button id="submit-another-btn" onclick="window.location.reload()" style="
          background-color: #8e44ad;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: none;
        " onmouseover="this.style.backgroundColor='#7d3c98'" onmouseout="this.style.backgroundColor='#8e44ad'">
          Submit Another Feedback
        </button>
      </div>
    `
  }

  const survey = new Model(surveyJson)

  // Apply custom purple theme using SurveyJS theme system
  survey.applyTheme({
    cssVariables: {
      "--sjs-primary-color": "#8e44ad",
      "--sjs-primary-color-hover": "#7d3c98",
      "--sjs-primary-color-light": "#a044ad",
      "--sjs-primary-color-foreground": "#ffffff",
      "--sjs-general-backcolor": backgroundColor,
      "--sjs-general-forecolor": textColor,
      "--sjs-font-family": '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      "--sjs-border-radius": "8px",
      "--sjs-border-width": "2px"
    },
    themeName: "custom-purple",
    colorPalette: "light",
    isPanelless: false
  })

  // Utility functions to retrieve saved data
  const getSavedFeedbackData = () => {
    try {
      const data = localStorage.getItem('feedbackData')
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error retrieving feedback data:', error)
      return []
    }
  }

  const getFeedbackByDateRange = (startDate: string, endDate: string) => {
    const allData = getSavedFeedbackData()
    return allData.filter((item: any) => {
      const itemDate = new Date(item.timestamp)
      return itemDate >= new Date(startDate) && itemDate <= new Date(endDate)
    })
  }

  const getFeedbackStats = () => {
    const allData = getSavedFeedbackData()
    const stats = {
      totalResponses: allData.length,
      averageSatisfaction: 0,
      averageSpeakerQuality: 0,
      averageVenueRating: 0,
      recommendations: {
        definitely: 0,
        probably: 0,
        maybe: 0,
        probablyNot: 0,
        definitelyNot: 0
      }
    }

    if (allData.length > 0) {
      let totalSatisfaction = 0
      let totalSpeakerQuality = 0
      let totalVenueRating = 0

      allData.forEach((item: any) => {
        if (item.overall_satisfaction) totalSatisfaction += parseInt(item.overall_satisfaction)
        if (item.speaker_quality) totalSpeakerQuality += parseInt(item.speaker_quality)
        if (item.venue_rating) totalVenueRating += parseInt(item.venue_rating)
        
        if (item.recommend_event && stats.recommendations[item.recommend_event as keyof typeof stats.recommendations] !== undefined) {
          stats.recommendations[item.recommend_event as keyof typeof stats.recommendations]++
        }
      })

      stats.averageSatisfaction = Math.round((totalSatisfaction / allData.length) * 10) / 10
      stats.averageSpeakerQuality = Math.round((totalSpeakerQuality / allData.length) * 10) / 10
      stats.averageVenueRating = Math.round((totalVenueRating / allData.length) * 10) / 10
    }

    return stats
  }

  const updateCompletionPage = (success: boolean) => {
    const icon = document.getElementById('completion-icon')
    const title = document.getElementById('completion-title')
    const message = document.getElementById('completion-message')
    const button = document.getElementById('submit-another-btn')

    if (success) {
      if (icon) icon.textContent = '✅'
      if (title) title.textContent = 'Thank You!'
      if (message) message.textContent = 'Your feedback has been submitted successfully. We appreciate you taking the time to help us improve our events.'
      if (button) button.style.display = 'block'
    } else {
      if (icon) icon.textContent = '❌'
      if (title) title.textContent = 'Error Saving Feedback'
      if (message) message.textContent = 'There was an error saving your feedback. Please try again or contact support.'
      if (button) button.style.display = 'block'
    }
  }

  const saveFeedbackData = async (data: any) => {
    try {
      setIsSubmitting(true)
      
      // Add timestamp to the data
      const feedbackData = {
        ...data,
        timestamp: new Date().toISOString(),
        formType: 'event-feedback'
      }

      if (saveEndpoint) {
        // Save to external endpoint
        const response = await fetch(saveEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feedbackData)
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log('Data saved successfully:', result)
      } else {
        // Save to localStorage as fallback
        const existingData = JSON.parse(localStorage.getItem('feedbackData') || '[]')
        existingData.push(feedbackData)
        localStorage.setItem('feedbackData', JSON.stringify(existingData))
        console.log('Data saved to localStorage:', feedbackData)
      }

      // Call custom callback if provided
      if (onDataSubmit) {
        onDataSubmit(feedbackData)
      }

      // Update completion page to show success
      updateCompletionPage(true)

    } catch (error) {
      console.error('Error saving feedback data:', error)
      // Update completion page to show error
      updateCompletionPage(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onComplete = (survey: any) => {
    setSurveyData(survey.data)
    console.log('Survey completed:', survey.data)
    
    // Save the data
    saveFeedbackData(survey.data)
  }

  const onCurrentPageChanged = (survey: any) => {
    console.log('Current page changed:', survey.currentPageNo)
  }

  survey.onComplete.add(onComplete)
  survey.onCurrentPageChanged.add(onCurrentPageChanged)

  // Additional custom styling to complement the theme
  React.useEffect(() => {
    const customCss = `
      .sv_main .sv_body {
        background-color: ${backgroundColor};
        color: ${textColor};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      .sv_main .sv_body .sv_p_root {
        padding: ${padding};
      }
      
      .sv_main .sv_body .sv_p_root .sv_p_title {
        color: #8e44ad;
        font-size: 2.5rem;
        font-weight: 700;
        text-align: center;
        margin-bottom: 0.5rem;
        background: linear-gradient(45deg, #8e44ad, #a044ad);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      .sv_main .sv_body .sv_p_root .sv_p_description {
        color: ${textColor};
        font-size: 1.1rem;
        text-align: center;
        margin-bottom: 2rem;
      }
      
      .sv_main .sv_body .sv_q_title {
        color: ${textColor};
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
      }
        .sd-progress-buttons__button-content{
          color: ${textColor} !important;
    `

    const style = document.createElement('style')
    style.textContent = customCss
    document.head.appendChild(style)
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [backgroundColor, textColor, padding])

  return (
    <div style={{
      backgroundColor: backgroundColor,
      borderRadius: '16px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                width: '100%',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <Suspense fallback={<SurveyLoadingFallback />}>
        <Survey model={survey} />
      </Suspense>
    </div>
  )
}

// Export utility functions for accessing saved data
export const FeedbackDataUtils = {
  // Get all saved feedback data
  getAllFeedback: () => {
    try {
      const data = localStorage.getItem('feedbackData')
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error retrieving feedback data:', error)
      return []
    }
  },

  // Get feedback data by date range
  getFeedbackByDateRange: (startDate: string, endDate: string) => {
    const allData = FeedbackDataUtils.getAllFeedback()
    return allData.filter((item: any) => {
      const itemDate = new Date(item.timestamp)
      return itemDate >= new Date(startDate) && itemDate <= new Date(endDate)
    })
  },

  // Get feedback statistics
  getFeedbackStats: () => {
    const allData = FeedbackDataUtils.getAllFeedback()
    const stats = {
      totalResponses: allData.length,
      averageSatisfaction: 0,
      averageSpeakerQuality: 0,
      averageVenueRating: 0,
      recommendations: {
        definitely: 0,
        probably: 0,
        maybe: 0,
        probablyNot: 0,
        definitelyNot: 0
      }
    }

    if (allData.length > 0) {
      let totalSatisfaction = 0
      let totalSpeakerQuality = 0
      let totalVenueRating = 0

      allData.forEach((item: any) => {
        if (item.overall_satisfaction) totalSatisfaction += parseInt(item.overall_satisfaction)
        if (item.speaker_quality) totalSpeakerQuality += parseInt(item.speaker_quality)
        if (item.venue_rating) totalVenueRating += parseInt(item.venue_rating)
        
        if (item.recommend_event && stats.recommendations[item.recommend_event as keyof typeof stats.recommendations] !== undefined) {
          stats.recommendations[item.recommend_event as keyof typeof stats.recommendations]++
        }
      })

      stats.averageSatisfaction = Math.round((totalSatisfaction / allData.length) * 10) / 10
      stats.averageSpeakerQuality = Math.round((totalSpeakerQuality / allData.length) * 10) / 10
      stats.averageVenueRating = Math.round((totalVenueRating / allData.length) * 10) / 10
    }

    return stats
  },

  // Clear all feedback data
  clearAllFeedback: () => {
    localStorage.removeItem('feedbackData')
  },

  // Export data as JSON
  exportData: () => {
    const data = FeedbackDataUtils.getAllFeedback()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feedback-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export default FeedbackForm
