import React from 'react'
import {
  MessageChatSquare,
  Folder,
  Users01,
  Calendar,
  BarChart07,
  Globe01,
  Microphone01,
  Building01
} from '@untitled-ui/icons-react'

export interface CardItem {
  label: string
  value?: string
}

export interface ContentCard {
  id: string
  title: string
  items: CardItem[]
  icon?: React.ReactNode
}

interface EventHubContentProps {
  title?: string
  cards?: ContentCard[]
  onCardClick?: (cardId: string) => void
}

export const defaultCards: ContentCard[] = [
  {
    id: 'communications',
    title: 'Communications',
    icon: <MessageChatSquare className="h-5 w-5" aria-hidden="true" />,
    items: [
      { label: 'Send broadcasts, announcements, and updates to keep attendees informed throughout the event.' }
    ]
  },
  {
    id: 'resource-management',
    title: 'Resource Management',
    icon: <Folder className="h-5 w-5" aria-hidden="true" />,
    items: [
      { label: 'Organize and share event materials, documents, and files with your team and attendees.' }
    ]
  },
  {
    id: 'attendee-management',
    title: 'Attendee Management',
    icon: <Users01 className="h-5 w-5" aria-hidden="true" />,
    items: [
      { label: 'Track registrations, manage check-ins, and monitor attendee engagement in real-time.' }
    ]
  },
  {
    id: 'speaker-management',
    title: 'Speaker Management',
    icon: <Microphone01 className="h-5 w-5" aria-hidden="true" />,
    items: [
      { label: 'Manage speaker profiles, sessions, and presentations for your event.' }
    ]
  },
  {
    id: 'organization-management',
    title: 'Organization Management',
    icon: <Building01 className="h-5 w-5" aria-hidden="true" />,
    items: [
      { label: 'Manage organizations, their details, and logos for your event.' }
    ]
  },
  {
    id: 'schedule-session',
    title: 'Schedule/Session',
    icon: <Calendar className="h-5 w-5" aria-hidden="true" />,
    items: [
      { label: 'Create event schedules, manage sessions, and help attendees plan their experience.' }
    ]
  },
  {
    id: 'registration-form',
    title: 'Registration form',
    icon: <Folder className="h-5 w-5" aria-hidden="true" />,
    items: [
      { label: 'Configure and preview the registration form used for event signups.' }
    ]
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: <BarChart07 className="h-5 w-5" aria-hidden="true" />,
    items: [
      { label: 'View attendance metrics, engagement data, and insights to measure event success.', value: '+12%' }
    ]
  },
  {
    id: 'website-settings',
    title: 'Website Settings',
    icon: <Globe01 className="h-5 w-5" aria-hidden="true" />,
    items: [
      { label: 'Customize your event website, branding, and public-facing pages.' }
    ]
  }
]

const EventHubContent: React.FC<EventHubContentProps> = ({
  title = 'Event Hub',
  cards = defaultCards,
  onCardClick
}) => {
  return (
    <main className="mt-16 min-h-[calc(100vh-4rem)] bg-white px-4 pb-10 pt-8 md:px-8">
      <h1 className="mb-8 text-3xl font-bold text-primary-dark md:text-[32px] ">{title}</h1>
      {/* <div className="mx-auto grid w-full max-w-[1400px] gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onCardClick?.(card.id)}
            className="group flex h-[152px] w-full flex-col justify-self-center rounded-[20px] border border-slate-200 bg-white p-6 text-left shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="mb-4 flex items-center justify-between gap-3 -mt-2">
              <h3 className="max-w-[277.33px] min-h-[28px] text-lg font-semibold leading-7 text-slate-700">
                {card.title}
              </h3>
              {card.icon && (
                <span className="inline-flex h-10 w-10 items-center justify-center  text-slate-500">
                  {card.icon}
                </span>
              )}
            </div>
            <div className="-mt-2 flex flex-col gap-1">
              {card.items.map((item, index) => (
                <span
                  key={index}
                  className="max-w-[317.33px] min-h-[72px] text-base font-normal leading-6 text-slate-500 -mt-1"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </button> 
        ))}
      </div> */}
    </main>
  )
}

export default EventHubContent

