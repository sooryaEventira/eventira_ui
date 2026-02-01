import React, { useMemo, useState, useEffect } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import { uploadUserFile, fetchAttendees, fetchTags, type AttendeeData } from '../../../services/attendeeService'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import AttendeesTable from './AttendeesTable'
import GroupsTable from './GroupsTable'
import CreateProfileModal from './CreateProfileModal'
import CreateGroupModal from './CreateGroupModal'
import CreateCustomFieldModal from './CreateCustomFieldModal'
import UploadModal from '../../ui/UploadModal'
import AttendeeDetailsSlideout from './AttendeeDetailsSlideout'
import { Attendee, AttendeeTab, Group, CustomField } from './attendeeTypes'
import { defaultCards, ContentCard } from '../EventHubContent'
import { InfoCircle, CodeBrowser, Globe01 } from '@untitled-ui/icons-react'
import attendeeSpeakerTemplate from '../../../assets/excel/Attendee Speaker template.xlsx?url'
import { writeEventStoreJSON } from '../../../utils/eventLocalStore'
import { listBuiltGroupIds } from '../../../utils/groupDirectoryPages'
import {
  ensureGroupDirectoryWebpage,
  removeGroupDirectoryWebpageForGroup
} from '../../../services/groupDirectoryPageService'

interface AttendeeManagementPageProps {
  eventName?: string
  isDraft?: boolean
  onBackClick?: () => void
  userAvatarUrl?: string
  onCardClick?: (cardId: string) => void
  hideNavbarAndSidebar?: boolean
}

const AttendeeManagementPage: React.FC<AttendeeManagementPageProps> = ({
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
      { id: 'overview', label: 'Overview', icon: <InfoCircle className="h-5 w-5" /> },
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
    if (itemId !== 'attendee-management') {
      const isCardId = defaultCards.some((card) => card.id === itemId)
      if (isCardId && onCardClick) {
        onCardClick(itemId)
      }
    }
  }

  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [activeTab, setActiveTab] = useState<AttendeeTab>('user')
  const [isCreateProfileModalOpen, setIsCreateProfileModalOpen] = useState(false)
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false)
  const [isCreateCustomFieldModalOpen, setIsCreateCustomFieldModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isAttendeeSlideoutOpen, setIsAttendeeSlideoutOpen] = useState(false)
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null)
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [builtGroupIds, setBuiltGroupIds] = useState<Set<string>>(new Set())

  const eventUuid = createdEvent?.uuid || ''

  useEffect(() => {
    if (!eventUuid) {
      setBuiltGroupIds(new Set())
      return
    }
    setBuiltGroupIds(listBuiltGroupIds(eventUuid))
  }, [eventUuid])

  // Persist attendees for public pages (no new API on public site)
  useEffect(() => {
    const eventUuidForStore = createdEvent?.uuid || localStorage.getItem('createdEventUuid') || 'unknown-event'
    writeEventStoreJSON(eventUuidForStore, 'attendees', attendees)
  }, [createdEvent?.uuid, attendees])

  const handleUpload = () => {
    setIsUploadModalOpen(true)
  }

  const handleDownloadTemplate = () => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a')
    link.href = attendeeSpeakerTemplate
    link.download = 'Attendee Speaker template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleUploadFiles = async (files: File[]) => {
    // Get event UUID from context
    const eventUuid = createdEvent?.uuid
    
    if (!eventUuid) {
      throw new Error('Event UUID is required. Please select an event first.')
    }

    // Upload each file
    for (const file of files) {
      await uploadUserFile(file, eventUuid)
    }

    // Refresh attendees list after upload
    await loadAttendees()
  }

  // Load attendees from API
  const loadAttendees = async () => {
    const eventUuid = createdEvent?.uuid
    
    if (!eventUuid) {
      return
    }

    setIsLoadingAttendees(true)
    try {
      const attendeesData = await fetchAttendees(eventUuid)
      
      // Map API response to Attendee interface
      const mappedAttendees: Attendee[] = attendeesData.map((attendeeData: AttendeeData) => {
        // Handle tags - can be string, array, or undefined
        let tags: string[] | undefined
        if (attendeeData.tags) {
          if (Array.isArray(attendeeData.tags)) {
            tags = attendeeData.tags
          } else if (typeof attendeeData.tags === 'string') {
            // Split comma-separated tags or use as single tag
            tags = attendeeData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
          }
        }
        
        return {
          id: attendeeData.id || attendeeData.uuid || '',
          name: attendeeData.name || `${attendeeData.first_name || ''} ${attendeeData.last_name || ''}`.trim() || 'Unknown',
          firstName: attendeeData.first_name,
          lastName: attendeeData.last_name,
          email: attendeeData.email,
          avatarUrl: attendeeData.avatar_url,
          bannerUrl: attendeeData.banner_url,
          status: (attendeeData.status as Attendee['status']) || 'sent',
          inviteCode: attendeeData.invite_code,
          groups: attendeeData.groups || [],
          tags: tags,
          institute: attendeeData.institute,
          post: attendeeData.post,
          emailVerified: attendeeData.email_verified,
          emailVerifiedDate: attendeeData.email_verified_date,
          feedbackIncomplete: attendeeData.feedback_incomplete,
        }
      })

      setAttendees(mappedAttendees)
    } catch (error) {
      // Error is already handled in fetchAttendees with toast
      console.error('Failed to load attendees:', error)
    } finally {
      setIsLoadingAttendees(false)
    }
  }

  // Load tags from API
  const loadTags = async () => {
    const eventUuid = createdEvent?.uuid
    
    if (!eventUuid) {
      setGroups([])
      return
    }

    setIsLoadingGroups(true)
    try {
      const tagsData = await fetchTags(eventUuid)
      
      // Map API response to Group interface
      // Only include tags that are active (is_active === true)
      const mappedGroups: Group[] = tagsData
        .filter((tag) => tag.is_active !== false) // Only include active tags
        .map((tag) => ({
          id: tag.uuid,
          name: tag.name,
          attendeeCount: 0 // TODO: Calculate attendee count if available from API
        }))

      if (import.meta.env.DEV) {
        console.log('👥 [AttendeeManagement] Groups mapped from tags:', {
          count: mappedGroups.length,
          groups: mappedGroups.map((g) => ({ id: g.id, name: g.name }))
        })
      }
      setGroups(mappedGroups)
    } catch (error) {
      // If it's a 404, tags endpoint might not exist yet - set empty array
      // Other errors are already handled in fetchTags with toast
      if (error instanceof Error && error.message.includes('not found')) {
        setGroups([])
      } else {
        // For other errors, set empty array to prevent stale data
        setGroups([])
      }
    } finally {
      setIsLoadingGroups(false)
    }
  }

  // Load attendees on mount and when event changes
  useEffect(() => {
    if (createdEvent?.uuid) {
      loadAttendees()
      loadTags()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdEvent?.uuid])

  const handleCreateProfile = () => {
    setIsCreateProfileModalOpen(true)
  }

  const handleSaveProfile = (data: {
    firstName: string
    lastName: string
    email: string
    organization?: string
    role?: string
    group?: string
    description?: string
    avatarUrl?: string
    customFields?: Array<{ label: string; value: string }>
  }) => {
    const newAttendee: Attendee = {
      id: Date.now().toString(),
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      avatarUrl: data.avatarUrl,
      status: 'sent',
      inviteCode: undefined,
      institute: data.organization,
      post: data.role,
      groups: data.group
        ? [
            {
              id: Date.now().toString(),
              name: data.group,
              variant: 'primary'
            }
          ]
        : [],
      customFields: data.customFields
    }
    setAttendees((prev) => [...prev, newAttendee])
  }

  const handleEditAttendee = (attendeeId: string) => {
    const attendee = attendees.find((a) => a.id === attendeeId)
    if (attendee) {
      setSelectedAttendee(attendee)
      setIsAttendeeSlideoutOpen(true)
    }
  }

  const handleSaveAttendee = (updatedAttendee: Attendee) => {
    setAttendees((prev) =>
      prev.map((a) => (a.id === updatedAttendee.id ? updatedAttendee : a))
    )
    setSelectedAttendee(null)
  }

  const handleDeleteAttendee = (attendeeId: string) => {
    setAttendees((prev) => prev.filter((a) => a.id !== attendeeId))
  }

  const handleCreateGroup = () => {
    setIsCreateGroupModalOpen(true)
  }

  const handleSaveGroup = async (_groupName?: string) => {
    // Refresh tags list from API after successful creation
    // The createTag function already handles the API call and shows success/error toasts
    // We just need to refresh the list here
    // Note: groupName parameter is kept for interface compatibility but not used
    await loadTags()
  }

  const handleCreateField = () => {
    setIsCreateCustomFieldModalOpen(true)
  }

  const handleSaveCustomField = (data: {
    fieldName: string
    fieldType: 'Text' | 'Dropdown' | 'PDF'
    visibility: 'Visible to attendees' | 'Invisible'
  }) => {
    const newCustomField: CustomField = {
      id: Date.now().toString(),
      fieldName: data.fieldName,
      fieldType: data.fieldType,
      visibility: data.visibility,
      users: 0
    }
    setCustomFields((prev) => [...prev, newCustomField])
  }

  const handleEditGroup = (groupId: string) => {
    console.log('Edit group:', groupId)
    // TODO: Implement edit group functionality
  }

  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
  }

  const handleToggleBuildPage = async (
    group: { id: string; name: string },
    checked: boolean
  ) => {
    if (!eventUuid) return
    try {
      if (checked) {
        await ensureGroupDirectoryWebpage(eventUuid, group.id, group.name)
        setBuiltGroupIds((prev) => {
          const next = new Set(prev)
          next.add(group.id)
          return next
        })
      } else {
        await removeGroupDirectoryWebpageForGroup(eventUuid, group.id)
        setBuiltGroupIds((prev) => {
          const next = new Set(prev)
          next.delete(group.id)
          return next
        })
      }
    } catch {
      // Toasts handled by service layer; keep UI stable
    }
  }

  const handleEditCustomField = (customFieldId: string) => {
    console.log('Edit custom field:', customFieldId)
    // TODO: Implement edit custom field functionality
  }

  const handleDeleteCustomField = (customFieldId: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== customFieldId))
  }

  const handleDownload = () => {
    console.log('Download clicked')
    // TODO: Implement download functionality
  }

  const handleGridView = () => {
    console.log('Grid view clicked')
    // TODO: Implement grid view functionality
  }

  const handleFilter = () => {
    console.log('Filter clicked')
    // TODO: Implement filter functionality
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
            activeItemId="attendee-management"
            onItemClick={handleSidebarItemClick}
            isModalOpen={isCreateProfileModalOpen || isCreateGroupModalOpen || isCreateCustomFieldModalOpen || isUploadModalOpen || isAttendeeSlideoutOpen}
          />
        </>
      )}

      {/* Attendee Management Content */}
      <div className={hideNavbarAndSidebar ? "" : "md:pl-[250px]"}>
        {activeTab === 'groups' ? (
          <GroupsTable
            groups={groups}
            onCreateGroup={handleCreateGroup}
            onEditGroup={handleEditGroup}
            onDeleteGroup={handleDeleteGroup}
            builtGroupIds={builtGroupIds}
            onToggleBuildPage={handleToggleBuildPage}
            onFilter={handleFilter}
            onTabChange={setActiveTab}
            isLoading={isLoadingGroups}
          />
        ) : (
          <AttendeesTable
            attendees={attendees}
            customFields={customFields}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onUpload={handleUpload}
            isLoading={isLoadingAttendees}
            onCreateProfile={handleCreateProfile}
            onCreateField={handleCreateField}
            onEditAttendee={handleEditAttendee}
            onDeleteAttendee={handleDeleteAttendee}
            onEditCustomField={handleEditCustomField}
            onDeleteCustomField={handleDeleteCustomField}
            onDownload={handleDownload}
            onGridView={handleGridView}
            onFilter={handleFilter}
          />
        )}
      </div>

      {/* Create Profile Modal */}
      <CreateProfileModal
        isOpen={isCreateProfileModalOpen}
        onClose={() => setIsCreateProfileModalOpen(false)}
        onSave={handleSaveProfile}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onConfirm={handleSaveGroup}
      />

      {/* Create Custom Field Modal */}
      <CreateCustomFieldModal
        isOpen={isCreateCustomFieldModalOpen}
        onClose={() => setIsCreateCustomFieldModalOpen(false)}
        onConfirm={handleSaveCustomField}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadFiles}
        title="Upload attendees"
        description="XLSX files only"
        instructions={[
          'Step 1: Download template',
          'Step 2: Upload attendees'
        ]}
        onDownloadTemplate={handleDownloadTemplate}
      />

      {/* Attendee Details Slideout */}
      <AttendeeDetailsSlideout
        isOpen={isAttendeeSlideoutOpen}
        onClose={() => {
          setIsAttendeeSlideoutOpen(false)
          setSelectedAttendee(null)
        }}
        attendee={selectedAttendee}
        onSave={handleSaveAttendee}
      />
    </div>
  )
}

export default AttendeeManagementPage

