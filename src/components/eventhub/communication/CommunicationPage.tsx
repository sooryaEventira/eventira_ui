import React, { useMemo, useEffect } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import CommunicationsTable from './CommunicationsTable'
import BroadcastTypeModal from './BroadcastTypeModal'
import BroadcastComposer from './BroadcastComposer'
import PushNotificationMakerPage from './PushNotificationMakerPage'
import CreateMacroModal from './CreateMacroModal'
import { Communication, Macro } from './communicationTypes'
import type { BroadcastType } from './BroadcastTypeModal'
import { defaultCards, ContentCard } from '../EventHubContent'
import { InfoCircle, CodeBrowser, Globe01 } from '@untitled-ui/icons-react'
import { fetchCommunications, fetchUserTags } from '../../../services/communicationService'

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
  const eventStatus = (createdEvent as { status?: string } | null)?.status ?? (eventData as { status?: string } | null)?.status
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
  const [optimisticSentIds, setOptimisticSentIds] = React.useState<Set<string>>(new Set())

  // Load communications from API
  const loadCommunications = async () => {
    const eventUuid = createdEvent?.uuid
    
    if (!eventUuid) {
      setCommunications([])
      return
    }

    setIsLoadingCommunications(true)
    try {
      const communicationsData = await fetchCommunications(eventUuid)
      const needsGroupNameLookup = communicationsData.some((comm) =>
        Array.isArray(comm.recipient_filters) &&
        comm.recipient_filters.some((f) => f?.type === 'group' && !!f?.value)
      )
      const userTags = needsGroupNameLookup
        ? await fetchUserTags(eventUuid).catch(() => [])
        : []
      const groupNameByUuid = new Map(userTags.map((t) => [t.uuid, t.name]))
      
      // Console log the API response
      console.log('=== Communication List API Response ===')
      console.log('Communications Data:', JSON.stringify(communicationsData, null, 2))
      console.log('========================================')
      
      // Map API response to Communication interface
      const mappedCommunications: Communication[] = communicationsData.map((commData) => {
        const commId = String(commData.id)
        // Log each communication item
        console.log('Processing Communication:', {
          id: commId,
          subject: commData.subject,
          tags: commData.tags,
          total_recipients: commData.total_recipients,
          sent_count: commData.sent_count,
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
        if (optimisticSentIds.has(commId) && status === 'draft') {
          status = 'sent'
        }

        // Determine type based on channel (backend can vary casing/format)
        const normalizedChannel = String(commData.channel || '')
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_')
        const type: Communication['type'] = normalizedChannel === 'email' ? 'email' : 'notification'

        // Map Groups column from tags first, then recipient_filters.
        const tagsSource = commData.tags ?? []
        const recipientFilters = commData.recipient_filters ?? []

        const userGroups = tagsSource.length > 0
          ? tagsSource
              .map((t) => {
                const id = t.uuid ?? String(t.id ?? '')
                const name = t.name ?? ''
                return name ? { id, name, variant: 'primary' as const } : null
              })
              .filter((g): g is NonNullable<typeof g> => g !== null)
          : recipientFilters
              .filter((f) => !!f?.value)
              .map((f, idx) => {
                const rawValue = String(f.value ?? '')
                const resolvedGroupName =
                  f.type === 'group' ? (groupNameByUuid.get(rawValue) ?? rawValue) : rawValue
                const prettyValue = rawValue.replace(/_/g, ' ')
                const label = f.type === 'message_status'
                  ? prettyValue.charAt(0).toUpperCase() + prettyValue.slice(1)
                  : resolvedGroupName
                return {
                  id: `filter-${commId}-${idx}`,
                  name: label,
                  variant: (f.type === 'message_status' ? 'secondary' : 'primary') as const
                }
              })

        return {
          id: commId,
          title: commData.subject || 'Untitled',
          userGroups,
          status,
          type,
          recipients: {
            sent: commData.sent_count ?? commData.total_recipients ?? 0,
            total: commData.total_recipients ?? 0,
          },
          scheduledDate: commData.scheduled_at
        }
      })

      console.log('=== Mapped Communications ===')
      console.log('Mapped Communications:', JSON.stringify(mappedCommunications, null, 2))
      console.log('==============================')
      
      setCommunications(mappedCommunications)
      setOptimisticSentIds((prev) => {
        if (prev.size === 0) return prev
        const sentInApi = new Set(
          communicationsData
            .filter((c) => c.status !== 'draft')
            .map((c) => String(c.id))
        )
        const next = new Set(prev)
        let changed = false
        prev.forEach((id) => {
          if (sentInApi.has(id)) {
            next.delete(id)
            changed = true
          }
        })
        return changed ? next : prev
      })
    } catch (error) {
      // Error is already handled in fetchCommunications with toast
      // Preserve existing state so locally-added drafts remain visible
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
  const [initialBroadcastTitle, setInitialBroadcastTitle] = React.useState<string>('')
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
    setInitialBroadcastTitle('')
    setIsBroadcastModalOpen(false)
    setShowComposer(true)
    setCurrentDraftId(null)
  }

  const handleBroadcastSubmit = (data: { title: string; type: BroadcastType }) => {
    setSelectedBroadcastType(data.type)
    setInitialBroadcastTitle(data.title)
    setIsBroadcastModalOpen(false)
    setShowComposer(true)
    setCurrentDraftId(null)
  }

  const handleComposerCancel = () => {
    setShowComposer(false)
    setSelectedBroadcastType(null)
    setInitialBroadcastTitle('')
    setCurrentDraftId(null)
    loadCommunications()
  }

  const handleComposerSave = (data: { subject: string; message: string; templateType?: string }) => {
    if (currentDraftId) {
      setCommunications((prev) =>
        prev.map((comm) =>
          comm.id === currentDraftId ? { ...comm, title: data.subject } : comm
        )
      )
    } else {
      const newId = Date.now().toString()
      setCommunications((prev) => [
        ...prev,
        {
          id: newId,
          title: data.subject,
          userGroups: [],
          status: 'draft',
          type: selectedBroadcastType === 'email' ? 'email' : 'notification',
          recipients: { sent: 0, total: 0 },
        },
      ])
      setCurrentDraftId(newId)
    }
    loadCommunications()
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
            eventStatus={eventStatus}
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
          selectedBroadcastType === 'push-notification' ? (
            <PushNotificationMakerPage
              macros={macros}
              broadcastTitle={initialBroadcastTitle}
              onCancel={handleComposerCancel}
              onSave={(data) => {
                handleComposerSave({ subject: data.title, message: data.message })
              }}
              onSend={async (data) => {
                const sentId = data.communicationId != null ? String(data.communicationId) : null
                if (sentId) {
                  setOptimisticSentIds((prev) => {
                    const next = new Set(prev)
                    next.add(sentId)
                    return next
                  })
                  setCommunications((prev) =>
                    prev.map((comm) =>
                      comm.id === sentId ? { ...comm, status: 'sent', type: 'notification' } : comm
                    )
                  )
                }
                setShowComposer(false)
                setSelectedBroadcastType(null)
                setCurrentDraftId(null)
                await new Promise((resolve) => setTimeout(resolve, 1200))
                await loadCommunications()
              }}
            />
          ) : (
            <BroadcastComposer
              onCancel={handleComposerCancel}
              onSave={handleComposerSave}
              onSend={async (data) => {
                const sentId = data.communicationId != null ? String(data.communicationId) : null
                if (sentId) {
                  setOptimisticSentIds((prev) => {
                    const next = new Set(prev)
                    next.add(sentId)
                    return next
                  })
                }
                setCommunications((prev) => {
                  let next = [...prev]
                  // Remove local temporary draft row immediately to avoid showing stale "draft".
                  if (currentDraftId) {
                    next = next.filter((comm) => comm.id !== currentDraftId)
                  }
                  // If API draft row already exists in table, mark it as sent optimistically.
                  if (sentId) {
                    next = next.map((comm) => (comm.id === sentId ? { ...comm, status: 'sent', type: 'email' } : comm))
                  }
                  return next
                })
                // Give backend list endpoint a brief window to reflect sent status.
                await new Promise((resolve) => setTimeout(resolve, 1200))
                await loadCommunications()
                setShowComposer(false)
                setSelectedBroadcastType(null)
                setCurrentDraftId(null)
              }}
              macros={macros}
              templateType="late-message"
              type={selectedBroadcastType || 'email'}
              broadcastTitle={initialBroadcastTitle}
            />
          )
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
        onSubmit={handleBroadcastSubmit}
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

