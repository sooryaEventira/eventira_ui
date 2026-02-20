import React, { useMemo, useState, useEffect } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import { uploadSpeakerFile, fetchSpeakers, fetchSpeakerTags, updateSpeaker, deleteSpeaker, type SpeakerData } from '../../../services/speakerService'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import SpeakersTable from './SpeakersTable'
import SpeakerGroupsTable from './SpeakerGroupsTable'
import CreateSpeakerModal from './CreateSpeakerModal'
import CreateGroupModal from '../attendeemanagement/CreateGroupModal'
import CreateCustomFieldModal from '../attendeemanagement/CreateCustomFieldModal'
import UploadModal from '../../ui/UploadModal'
import SpeakerDetailsSlideout from './SpeakerDetailsSlideout'
import { Speaker, SpeakerTab, Group, CustomField } from './speakerTypes'
import { defaultCards, ContentCard } from '../EventHubContent'
import { InfoCircle, CodeBrowser, Globe01 } from '@untitled-ui/icons-react'
import attendeeSpeakerTemplate from '../../../assets/excel/Attendee Speaker template.xlsx?url'
import { writeEventStoreJSON } from '../../../utils/eventLocalStore'
import { setTagPublished, setTagUnpublished } from '../../../services/eventTagService'
import { fetchPublishedSpeakerTagIds } from '../../../services/webpageService'

interface SpeakerManagementPageProps {
  eventName?: string
  isDraft?: boolean
  onBackClick?: () => void
  userAvatarUrl?: string
  onCardClick?: (cardId: string) => void
  hideNavbarAndSidebar?: boolean
}

const SpeakerManagementPage: React.FC<SpeakerManagementPageProps> = ({
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
    if (itemId !== 'speaker-management') {
      const isCardId = defaultCards.some((card) => card.id === itemId)
      if (isCardId && onCardClick) {
        onCardClick(itemId)
      }
    }
  }

  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [activeTab, setActiveTab] = useState<SpeakerTab>('user')
  const [isCreateProfileModalOpen, setIsCreateProfileModalOpen] = useState(false)
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false)
  const [isCreateCustomFieldModalOpen, setIsCreateCustomFieldModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isSpeakerSlideoutOpen, setIsSpeakerSlideoutOpen] = useState(false)
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null)
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [builtGroupIds, setBuiltGroupIds] = useState<Set<string>>(new Set())

  const eventUuid = createdEvent?.uuid || ''

  // Load published tag IDs from website index so Build page checkbox stays checked for published tags
  useEffect(() => {
    if (!eventUuid) {
      setBuiltGroupIds(new Set())
      return
    }
    let cancelled = false
    fetchPublishedSpeakerTagIds(eventUuid).then((ids) => {
      if (!cancelled) setBuiltGroupIds(ids)
    })
    return () => { cancelled = true }
  }, [eventUuid])

  // Refresh builtGroupIds when webpage-saved fires (e.g. after publishing from this page)
  useEffect(() => {
    const handler = () => {
      if (eventUuid) fetchPublishedSpeakerTagIds(eventUuid).then(setBuiltGroupIds)
    }
    window.addEventListener('webpage-saved', handler as EventListener)
    return () => window.removeEventListener('webpage-saved', handler as EventListener)
  }, [eventUuid])

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
      console.log('📤 SpeakerManagementPage: Uploading file:', file.name)
      try {
        const response = await uploadSpeakerFile(file, eventUuid)
        console.log('🧾 Speaker Excel Import (create) response:', response)
        console.log('✅ SpeakerManagementPage: Upload response:', JSON.stringify(response, null, 2))
      } catch (error) {
        console.error('❌ SpeakerManagementPage: Upload error:', error)
        throw error
      }
    }

    // Refresh speakers list after upload
    await loadSpeakers()
    
    setIsUploadModalOpen(false)
  }

  // Load speakers from API
  const loadSpeakers = async () => {
    const eventUuid = createdEvent?.uuid
    
    if (!eventUuid) {
      console.log('No event UUID available, skipping speaker load')
      return
    }

    setIsLoadingSpeakers(true)
    try {
      const speakersData = await fetchSpeakers(eventUuid)
      console.log('🧾 Speaker Excel Import (list) response:', {
        count: speakersData.length,
        speakers: speakersData
      })
      
      // Map API response to Speaker interface
      const mappedSpeakers: Speaker[] = speakersData.map((speakerData: SpeakerData, idx: number) => {
        const profile: any = (speakerData as any).profile
        const user: any = (speakerData as any).user

        // Email can come in different shapes depending on backend
        const email =
          (speakerData.email ||
            (speakerData as any).user_email ||
            (speakerData as any).userEmail ||
            profile?.email ||
            user?.email ||
            '') as string

        // Ensure we always have a stable non-empty ID for table row keys/selection
        const rawId =
          (speakerData as any).id ||
          (speakerData as any).uuid ||
          profile?.id ||
          profile?.uuid ||
          user?.id ||
          user?.uuid ||
          ''
        const id = String(rawId || email || `speaker-${idx}`).trim()

        const titleCaseFromEmail = (rawEmail: string) => {
          const local = (rawEmail || '').split('@')[0] || ''
          if (!local) return ''
          const parts = local
            .replace(/[._-]+/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 4)
          return parts
            .map((p) => (p.length <= 2 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1).toLowerCase()))
            .join(' ')
        }

        const pickStr = (...vals: any[]) => {
          for (const v of vals) {
            if (typeof v === 'string' && v.trim()) return v.trim()
          }
          return ''
        }

        // Name can be nested or split into first/last
        const firstName = pickStr(
          (speakerData as any).first_name,
          (speakerData as any).firstName,
          profile?.first_name,
          profile?.firstName,
          user?.first_name,
          user?.firstName
        )
        const lastName = pickStr(
          (speakerData as any).last_name,
          (speakerData as any).lastName,
          profile?.last_name,
          profile?.lastName,
          user?.last_name,
          user?.lastName
        )

        const fullNameFromParts = `${firstName} ${lastName}`.trim()
        let name = pickStr(
          speakerData.name,
          (speakerData as any).full_name,
          (speakerData as any).fullName,
          profile?.name,
          profile?.full_name,
          profile?.fullName,
          user?.name,
          user?.full_name,
          user?.fullName,
          fullNameFromParts
        )
        if (!name) name = titleCaseFromEmail(email)
        if (!name) name = 'Unknown'
        
        // Get phone number from direct field
        const phoneNumber =
          (speakerData as any).phone_number ||
          (speakerData as any).phoneNumber ||
          profile?.phone_number ||
          profile?.phoneNumber ||
          user?.phone_number ||
          user?.phoneNumber ||
          ''

        // Invite code can come in different shapes depending on backend
        const inviteCodeRaw =
          (speakerData as any).invite_code ||
          (speakerData as any).inviteCode ||
          (speakerData as any).invitecode ||
          (speakerData as any).invite ||
          (speakerData as any).code ||
          (speakerData as any).invite_token ||
          (speakerData as any).inviteToken ||
          (speakerData as any).invitation_code ||
          (speakerData as any).invitation_code ||
          (speakerData as any).invitationCode ||
          (speakerData as any).invitationCode ||
          (speakerData as any).invitation?.code ||
          (speakerData as any).invitation?.invite_code ||
          (speakerData as any).invitation?.inviteCode ||
          profile?.invite_code ||
          profile?.inviteCode ||
          user?.invite_code ||
          user?.inviteCode ||
          ''
        const inviteCode = inviteCodeRaw ? String(inviteCodeRaw) : ''

        // Map groups/tags if backend provides them
        const rawGroupsValue =
          (speakerData as any).groups ??
          (speakerData as any).group ??
          (speakerData as any).tags ??
          (speakerData as any).tag ??
          (speakerData as any).tag_ids ??
          (speakerData as any).tagIds ??
          (speakerData as any).group_ids ??
          (speakerData as any).groupIds ??
          (speakerData as any).user_tags ??
          (speakerData as any).userTags ??
          profile?.groups ??
          profile?.tags ??
          user?.groups ??
          user?.tags ??
          []

        const rawGroups: any[] = (() => {
          if (rawGroupsValue === null || typeof rawGroupsValue === 'undefined') return []
          if (Array.isArray(rawGroupsValue)) return rawGroupsValue
          if (typeof rawGroupsValue === 'string') {
            const parts = rawGroupsValue
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)
            return parts
          }
          // Single object or number/string id
          return [rawGroupsValue]
        })()

        const groupNameById = (id: string) => {
          const match = groups.find((g) => String(g.id) === String(id))
          return match?.name || ''
        }

        const mappedSpeakerGroups = rawGroups
          .map((g: any) => {
            if (g === null || g === undefined) return null

            // Case 1: backend sends IDs as strings/numbers
            if (typeof g === 'string' || typeof g === 'number') {
              const id = String(g)
              const resolvedName = groupNameById(id)
              return { id, name: resolvedName || id, variant: 'muted' }
            }

            // Case 2: backend sends objects
            const id = String(
              g.id ||
                g.uuid ||
                g.tag_uuid ||
                g.tagUuid ||
                g.group_uuid ||
                g.groupUuid ||
                g.value ||
                g.name ||
                ''
            )
            const name = String(g.name || g.title || g.label || '').trim() || groupNameById(id)
            if (!id && !name) return null
            return { id: id || name, name: name || id, variant: g.variant || 'muted' }
          })
          .filter((x: any) => x && x.name) as Speaker['groups']

        const normalizeStatus = (raw: any): Speaker['status'] => {
          const s = String(raw || '').trim().toLowerCase()
          if (!s) return 'active'
          // backend often uses invited/pending-like statuses
          if (s === 'invited' || s === 'pending' || s === 'awaiting' || s === 'requested') return 'pending'
          if (s === 'inactive' || s === 'disabled' || s === 'blocked') return 'inactive'
          if (s === 'active' || s === 'approved' || s === 'confirmed') return 'active'
          // fallback to active for unknown values to avoid breaking UI
          return 'active'
        }

        const designation =
          pickStr(
            (speakerData as any).designation,
            (speakerData as any).title,
            (speakerData as any).role,
            profile?.designation,
            profile?.title,
            profile?.role,
            user?.designation,
            user?.title,
            user?.role
          ) || ''

        const organization =
          pickStr(
            (speakerData as any).organisation,
            (speakerData as any).organization,
            profile?.organisation,
            profile?.organization,
            user?.organisation,
            user?.organization
          ) || ''
        
        return {
          id,
          name: name,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email: email,
          phoneNumber: phoneNumber,
          inviteCode: inviteCode || undefined,
          // Keep both role & title populated so existing UI columns work.
          role: designation || '',
          avatarUrl:
            (speakerData as any).avatar_url ||
            (speakerData as any).image ||
            profile?.avatar_url ||
            (profile as any)?.image ||
            user?.avatar_url ||
            (user as any)?.image,
          bannerUrl: undefined,
          status: normalizeStatus((speakerData as any).status ?? profile?.status ?? user?.status),
          bio: pickStr((speakerData as any).bio, profile?.bio, user?.bio) || undefined,
          organization: organization || undefined,
          title: designation || undefined,
          groups: mappedSpeakerGroups,
          sessions: undefined,
          socialLinks: undefined
        }
      })

      console.log('✅ SpeakerManagementPage: Mapped speakers:', mappedSpeakers)
      setSpeakers(mappedSpeakers)
    } catch (error) {
      // Error is already handled in fetchSpeakers with toast, but log for debugging
      console.error('Failed to load speakers:', error)
      // Don't re-throw to prevent unhandled promise rejection
      // The toast notification from the service should inform the user
    } finally {
      setIsLoadingSpeakers(false)
    }
  }

  // Persist speakers for public pages (no new API on public site)
  useEffect(() => {
    const eventUuidForStore = createdEvent?.uuid || localStorage.getItem('createdEventUuid') || 'unknown-event'
    writeEventStoreJSON(eventUuidForStore, 'speakers', speakers)
  }, [createdEvent?.uuid, speakers])

  // Load tags from API
  const loadTags = async () => {
    const eventUuid = createdEvent?.uuid
    
    if (!eventUuid) {
      setGroups([])
      return
    }

    setIsLoadingGroups(true)
    try {
      const tagsData = await fetchSpeakerTags(eventUuid)
      
      // Map API response to Group interface
      // Only include tags that are active (is_active !== false)
      const mappedGroups: Group[] = tagsData
        .filter((tag) => tag.is_active !== false) // Only include active tags
        .map((tag) => ({
          id: tag.uuid,
          name: tag.name,
          speakerCount: 0 // TODO: Calculate speaker count if available from API
        }))

      if (import.meta.env.DEV) {
        console.log('👥 [SpeakerManagement] Groups mapped from tags:', {
          count: mappedGroups.length,
          groups: mappedGroups.map((g) => ({ id: g.id, name: g.name }))
        })
      }
      setGroups(mappedGroups)
    } catch (error) {
      // If it's a 404, tags endpoint might not exist yet - set empty array
      // Other errors are already handled in fetchSpeakerTags with toast
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

  // When groups (tags) load, refresh speaker group names if we only had IDs before.
  useEffect(() => {
    if (!groups.length) return
    setSpeakers((prev) =>
      prev.map((s) => {
        if (!s.groups?.length) return s
        const nextGroups = s.groups
          .map((g) => {
            const match = groups.find((x) => String(x.id) === String(g.id))
            if (!match) return g
            // If we were showing the raw id as the name, replace with real name
            if (!g.name || g.name === g.id) {
              return { ...g, name: match.name }
            }
            return g
          })
          .filter((g) => g.name)
        return { ...s, groups: nextGroups }
      })
    )
  }, [groups])

  // Load speakers on mount and when event changes
  useEffect(() => {
    if (createdEvent?.uuid) {
      loadSpeakers()
      loadTags()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdEvent?.uuid])

  const handleCreateProfile = () => {
    setIsCreateProfileModalOpen(true)
  }

  const handleSaveProfile = async (_data: {
    firstName: string
    lastName: string
    email: string
    organization?: string
    role?: string
    bio?: string
    group?: string
    avatarUrl?: string
    customFields?: Array<{ label: string; value: string; hideFromProfile?: boolean }>
  }) => {
    // Speaker is created in CreateSpeakerModal via API; refresh list from DB.
    await loadSpeakers()
  }

  const handleEditSpeaker = (speakerId: string) => {
    const speaker = speakers.find((s) => s.id === speakerId)
    if (speaker) {
      setSelectedSpeaker(speaker)
      setIsSpeakerSlideoutOpen(true)
    }
  }

  const handleSaveSpeaker = async (
    updatedSpeaker: Speaker,
    options?: { profileImageFile?: File }
  ) => {
    const designation = updatedSpeaker.role || updatedSpeaker.title || ''
    const isNewGroupId = (id: string) => /^\d+-\d+$/.test(String(id))
    const groupValues = (updatedSpeaker.groups || [])
      .map((g) => (isNewGroupId(String(g.id)) ? (g.name || g.id) : (g.id || g.name)))
      .filter(Boolean)

    const response = await updateSpeaker(updatedSpeaker.id, {
      first_name: updatedSpeaker.firstName,
      last_name: updatedSpeaker.lastName,
      email: updatedSpeaker.email,
      organization: updatedSpeaker.organization,
      designation: designation || undefined,
      bio: updatedSpeaker.bio,
      groups: groupValues.length ? groupValues : undefined,
      image: options?.profileImageFile,
    })

    // Use image URL from PATCH response so avatar shows the uploaded image
    const imageUrl =
      (response as any)?.data?.image ??
      (response as any)?.image ??
      (response as any)?.data?.avatar_url ??
      (response as any)?.avatar_url
    const speakerWithAvatar: Speaker =
      typeof imageUrl === 'string' && imageUrl
        ? { ...updatedSpeaker, avatarUrl: imageUrl }
        : updatedSpeaker

    await loadTags()

    setSpeakers((prev) => prev.map((s) => (s.id === updatedSpeaker.id ? speakerWithAvatar : s)))
    setSelectedSpeaker(speakerWithAvatar)
  }

  const handleDeleteSpeaker = async (speakerId: string) => {
    await deleteSpeaker(speakerId)

    setSpeakers((prev) => prev.filter((s) => s.id !== speakerId))
    setSelectedSpeaker((prev) => (prev?.id === speakerId ? null : prev))
    setIsSpeakerSlideoutOpen((prev) => (selectedSpeaker?.id === speakerId ? false : prev))
  }

  const handleAddSpeakersToGroup = async (_speakerIds: string[], _groupId: string) => {
    // TODO: Call API to add selected speakers to the chosen group when available
    await loadSpeakers()
  }

  const handleCreateGroup = () => {
    setIsCreateGroupModalOpen(true)
  }

  const handleSaveGroup = async (_groupName?: string) => {
    // Reload tags from API after creation
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
    if (checked) {
      setBuiltGroupIds((prev) => {
        const next = new Set(prev)
        next.add(group.id)
        return next
      })
      try {
        await setTagPublished(group.id, eventUuid)
      } catch {
        setBuiltGroupIds((prev) => {
          const next = new Set(prev)
          next.delete(group.id)
          return next
        })
      }
    } else {
      setBuiltGroupIds((prev) => {
        const next = new Set(prev)
        next.delete(group.id)
        return next
      })
      try {
        await setTagUnpublished(group.id, eventUuid)
      } catch {
        setBuiltGroupIds((prev) => {
          const next = new Set(prev)
          next.add(group.id)
          return next
        })
      }
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
            activeItemId="speaker-management"
            onItemClick={handleSidebarItemClick}
            isModalOpen={isCreateProfileModalOpen || isCreateGroupModalOpen || isCreateCustomFieldModalOpen || isUploadModalOpen || isSpeakerSlideoutOpen}
          />
        </>
      )}

      {/* Speaker Management Content */}
      <div className={hideNavbarAndSidebar ? "" : "md:pl-[250px]"}>
        {activeTab === 'groups' ? (
          <SpeakerGroupsTable
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
          <SpeakersTable
            speakers={speakers}
            customFields={customFields}
            groups={groups}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onUpload={handleUpload}
            isLoading={isLoadingSpeakers}
            onCreateProfile={handleCreateProfile}
            onCreateField={handleCreateField}
            onEditSpeaker={handleEditSpeaker}
            onDeleteSpeaker={handleDeleteSpeaker}
            onAddToGroup={handleAddSpeakersToGroup}
            onEditCustomField={handleEditCustomField}
            onDeleteCustomField={handleDeleteCustomField}
            onDownload={handleDownload}
            onGridView={handleGridView}
            onFilter={handleFilter}
          />
        )}
      </div>

      {/* Create Profile Modal */}
      <CreateSpeakerModal
        isOpen={isCreateProfileModalOpen}
        onClose={() => setIsCreateProfileModalOpen(false)}
        eventUuid={createdEvent?.uuid}
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
        title="Upload speakers"
        description="XLSX files only"
        instructions={[
          'Step 1: Download template',
          'Step 2: Fill in the data with the required columns',
          'Step 3: Upload the Excel file'
        ]}
        onDownloadTemplate={handleDownloadTemplate}
      />

      {/* Speaker Details Slideout */}
      <SpeakerDetailsSlideout
        isOpen={isSpeakerSlideoutOpen}
        onClose={() => {
          setIsSpeakerSlideoutOpen(false)
          setSelectedSpeaker(null)
        }}
        speaker={selectedSpeaker}
        onSave={handleSaveSpeaker}
      />
    </div>
  )
}

export default SpeakerManagementPage
