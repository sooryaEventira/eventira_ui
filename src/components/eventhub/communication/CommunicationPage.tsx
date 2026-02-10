import React, { useMemo, useEffect } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import CommunicationsTable from './CommunicationsTable'
import BroadcastTypeModal from './BroadcastTypeModal'
import BroadcastComposer from './BroadcastComposer'
import CreateMacroModal from './CreateMacroModal'
import { Communication, Macro } from './communicationTypes'
import type { BroadcastType } from './BroadcastTypeModal'
import { defaultCards, ContentCard } from '../EventHubContent'
import { InfoCircle, CodeBrowser, Globe01 } from '@untitled-ui/icons-react'
import { fetchCommunications } from '../../../services/communicationService'
import { fetchTags } from '../../../services/attendeeService'

interface CommunicationPageProps {
  eventName?: string
  isDraft?: boolean
  onBackClick?: () => void
  userAvatarUrl?: string
  onCardClick?: (cardId: string) => void
  hideNavbarAndSidebar?: boolean
}

const CommunicationPage: React.FC<CommunicationPageProps> = ({
  eventName: propEventName,
  isDraft: propIsDraft,
  onBackClick,
  userAvatarUrl,
  onCardClick,
  hideNavbarAndSidebar = false
}) => {
  // Get eventData and createdEvent from context to maintain consistency with EventHubPage navbar
  const { eventData, createdEvent } = useEventForm()
  
  // Prioritize createdEvent data from API (set when clicking event from dashboard), 
  // fallback to eventData from form, then props
  const eventName = createdEvent?.eventName || eventData?.eventName || propEventName || 'Highly important conference of 2025'
  const isDraft = propIsDraft !== undefined ? propIsDraft : true
  const handleSearchClick = () => {
    console.log('Search clicked')
  }

  const handleNotificationClick = () => {
    console.log('Notification clicked')
  }

  const handleProfileClick = () => {
    console.log('Profile clicked')
  }

  // Convert cards to sidebar sub-items
  const sidebarItems = useMemo(() => {
    const eventHubSubItems = defaultCards.map((card: ContentCard) => ({
      id: card.id,
      label: card.title,
      icon: card.icon
    }))

    return [
      { id: 'summary', label: 'Summary', icon: <InfoCircle className="h-5 w-5" /> },
      { id: 'event-website', label: 'Event website', icon: <CodeBrowser className="h-5 w-5" /> },
      {
        id: 'event-hub',
        label: 'Event Hub',
        icon: <Globe01 className="h-5 w-5" />,
        subItems: eventHubSubItems
      }
    ]
  }, [])

  const handleSidebarItemClick = (itemId: string) => {
    console.log('Sidebar item clicked:', itemId)
    
    // If clicking on event-hub, navigate back to event hub page
    if (itemId === 'event-hub' && onBackClick) {
      onBackClick()
      return
    }
    
    // If clicking on a different card, navigate to it
    if (itemId !== 'communications') {
      const isCardId = defaultCards.some((card) => card.id === itemId)
      if (isCardId && onCardClick) {
        onCardClick(itemId)
      }
    }
  }

  const [communications, setCommunications] = React.useState<Communication[]>([])
  const [isLoadingCommunications, setIsLoadingCommunications] = React.useState(false)

  // Load communications from API
  const loadCommunications = async () => {
    const eventUuid = createdEvent?.uuid
    
    if (!eventUuid) {
      setCommunications([])
      return
    }

    setIsLoadingCommunications(true)
    try {
      const [communicationsData, tagsData] = await Promise.all([
        fetchCommunications(eventUuid),
        fetchTags(eventUuid).catch(() => []) // Fetch tags, return empty array on error
      ])
      
      // Console log the API response
      console.log('=== Communication List API Response ===')
      console.log('Communications Data:', JSON.stringify(communicationsData, null, 2))
      console.log('Tags Data:', JSON.stringify(tagsData, null, 2))
      console.log('========================================')
      
      // Create a map of tag UUID to tag name for quick lookup
      const tagMap = new Map<string, string>()
      tagsData.forEach((tag) => {
        if (tag.is_active !== false) {
          tagMap.set(tag.uuid, tag.name)
        }
      })
      
      // Map API response to Communication interface
      const mappedCommunications: Communication[] = communicationsData.map((commData) => {
        // Log each communication item
        console.log('Processing Communication:', {
          id: commData.id,
          subject: commData.subject,
          tag_uuids: commData.tag_uuids,
          total_recipients: commData.total_recipients,
          status: commData.status,
          channel: commData.channel
        })
        // Determine status based on API response
        let status: Communication['status'] = 'sent'
        if (commData.status === 'scheduled' || commData.scheduled_at) {
          status = 'scheduled'
        } else if (commData.status === 'draft') {
          status = 'draft'
        }

        // Determine type based on channel
        const type: Communication['type'] = commData.channel === 'email' ? 'email' : 'notification'

        // Map tag_uuids to userGroups
        const userGroups = (commData.tag_uuids || [])
          .map((tagUuid) => {
            const tagName = tagMap.get(tagUuid)
            return tagName
              ? {
                  id: tagUuid,
                  name: tagName,
                  variant: 'primary' as const
                }
              : null
          })
          .filter((group): group is NonNullable<typeof group> => group !== null)

        return {
          id: String(commData.id),
          title: commData.subject || 'Untitled',
          userGroups: userGroups,
          status: status,
          type: type,
          recipients: {
            sent: commData.total_recipients || 0,
            total: commData.total_recipients || 0 // TODO: Update when API provides separate sent/total counts
          },
          scheduledDate: commData.scheduled_at
        }
      })

      console.log('=== Mapped Communications ===')
      console.log('Mapped Communications:', JSON.stringify(mappedCommunications, null, 2))
      console.log('==============================')
      
      setCommunications(mappedCommunications)
    } catch (error) {
      // Error is already handled in fetchCommunications with toast
      // Set empty array on error to prevent UI issues
      setCommunications([])
    } finally {
      setIsLoadingCommunications(false)
    }
  }

  // Load communications on mount and when event changes
  useEffect(() => {
    if (createdEvent?.uuid) {
      loadCommunications()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdEvent?.uuid])

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = React.useState(false)
  const [isCreateMacroModalOpen, setIsCreateMacroModalOpen] = React.useState(false)
  const [showComposer, setShowComposer] = React.useState(false)
  const [selectedBroadcastType, setSelectedBroadcastType] = React.useState<BroadcastType | null>(null)
  const [currentDraftId, setCurrentDraftId] = React.useState<string | null>(null)

  const [macros, setMacros] = React.useState<Macro[]>([
    {
      id: 'email',
      macro: '{{email}}',
      column: 'Email'
    },
    {
      id: 'last_name',
      macro: '{{last_name}}',
      column: 'Last Name'
    },
    {
      id: 'first_name',
      macro: '{{first_name}}',
      column: 'First Name'
    },
    {
      id: 'event_name',
      macro: '{{event_name}}',
      column: 'Event Name'
    }
  ])

  const handleCreateBroadcast = () => {
    setIsBroadcastModalOpen(true)
  }

  const handleCreateMacro = () => {
    setIsCreateMacroModalOpen(true)
  }

  const handleCreateMacroConfirm = (data: { name: string; source: string }) => {
    const newMacro: Macro = {
      id: Date.now().toString(),
      macro: `{{${data.name.toLowerCase()}}}`,
      column: data.name
    }
    setMacros((prev) => [...prev, newMacro])
    setIsCreateMacroModalOpen(false)
  }

  const handleBroadcastTypeSelect = (type: BroadcastType) => {
    setSelectedBroadcastType(type)
    setIsBroadcastModalOpen(false)
    setShowComposer(true)
    setCurrentDraftId(null) // Reset draft ID when creating new
  }

  const handleComposerCancel = () => {
    setShowComposer(false)
    setSelectedBroadcastType(null)
    setCurrentDraftId(null)
  }

  const handleComposerSave = (data: { subject: string; message: string; templateType?: string }) => {
    if (currentDraftId) {
      // Update existing draft
      setCommunications((prev) =>
        prev.map((comm) =>
          comm.id === currentDraftId
            ? {
                ...comm,
                title: data.subject,
                // Keep other fields as is
              }
            : comm
        )
      )
    } else {
      // Create new draft
      const newId = Date.now().toString()
      const newCommunication: Communication = {
        id: newId,
        title: data.subject,
        userGroups: [], // Will be set when user selects groups
        status: 'draft',
        type: selectedBroadcastType === 'email' ? 'email' : 'notification',
        recipients: { sent: 0, total: 0 }
      }
      setCommunications((prev) => [...prev, newCommunication])
      setCurrentDraftId(newId)
    }
    // Don't close the composer here, let it switch to view mode
  }

  const handleEditCommunication = (communicationId: string) => {
    console.log('Edit communication:', communicationId)
    // TODO: Implement edit communication functionality
  }

  return (
    <div className={hideNavbarAndSidebar ? "" : "min-h-screen overflow-x-hidden bg-white"}>
      {!hideNavbarAndSidebar && (
        <>
          {/* Navbar */}
          <EventHubNavbar
            eventName={eventName}
            isDraft={isDraft}
            onBackClick={onBackClick}
            onSearchClick={handleSearchClick}
            onNotificationClick={handleNotificationClick}
            onProfileClick={handleProfileClick}
            userAvatarUrl={userAvatarUrl}
          />

          {/* Sidebar */}
          <EventHubSidebar
            items={sidebarItems}
            activeItemId="communications"
            onItemClick={handleSidebarItemClick}
          />
        </>
      )}

      {/* Communication Content */}
      <div className={hideNavbarAndSidebar ? "" : "md:pl-[250px]"}>
        {showComposer ? (
          <BroadcastComposer
            onCancel={handleComposerCancel}
            onSave={handleComposerSave}
            onSend={async (_data) => {
                // Reload communications from API after sending
                await loadCommunications()
                setShowComposer(false)
                setSelectedBroadcastType(null)
                setCurrentDraftId(null)
            }}
            macros={macros}
            templateType="late-message"
            type={selectedBroadcastType || 'email'}
          />
        ) : (
          <CommunicationsTable
            communications={communications}
            macros={macros}
            onCreateBroadcast={handleCreateBroadcast}
            onCreateMacro={handleCreateMacro}
            onEditCommunication={handleEditCommunication}
            isLoading={isLoadingCommunications}
            onEditMacro={(macroId) => {
              console.log('Edit macro:', macroId)
              // TODO: Implement edit macro functionality
            }}
            onDeleteMacro={(macroId) => {
              setMacros((prev) => prev.filter((m) => m.id !== macroId))
            }}
          />
        )}
      </div>

      {/* Broadcast Type Modal */}
      <BroadcastTypeModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        onSelect={handleBroadcastTypeSelect}
      />

      <CreateMacroModal
        isOpen={isCreateMacroModalOpen}
        onClose={() => setIsCreateMacroModalOpen(false)}
        onConfirm={handleCreateMacroConfirm}
      />
    </div>
  )
}

export default CommunicationPage

