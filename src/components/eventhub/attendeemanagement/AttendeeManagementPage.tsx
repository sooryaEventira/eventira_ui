import React, { useMemo, useState, useEffect } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import { uploadUserFile, fetchAttendees, searchAttendees, fetchTags, deleteAttendee, updateAttendee, bulkAddAttendeeTag, bulkDeleteAttendees, type AttendeeData } from '../../../services/attendeeService'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import AttendeesTable from './AttendeesTable'
import GroupsTable from './GroupsTable'
import CreateProfileModal from './CreateProfileModal'
import CreateGroupModal from './CreateGroupModal'
import CreateCustomFieldModal from './CreateCustomFieldModal'
import UploadModal from '../../ui/UploadModal'
import { ConfirmDeleteModal } from '../../ui'
import EditGroupModal from '../../ui/EditGroupModal'
import AttendeeDetailsSlideout from './AttendeeDetailsSlideout'
import { Attendee, AttendeeTab, Group, CustomField } from './attendeeTypes'
import { defaultCards, ContentCard } from '../EventHubContent'
import { InfoCircle, CodeBrowser, Globe01 } from '@untitled-ui/icons-react'
import attendeeSpeakerTemplate from '../../../assets/excel/Attendee Speaker template.xlsx?url'
import { writeEventStoreJSON } from '../../../utils/eventLocalStore'
import { setTagPublished, setTagUnpublished, deleteTag, updateTag } from '../../../services/eventTagService'
import { showToast } from '../../../utils/toast'
import { fetchPublishedAttendeeTagIds } from '../../../services/webpageService'

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
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<{ id: string; name: string } | null>(null)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [editGroupTarget, setEditGroupTarget] = useState<{ id: string; name: string } | null>(null)
  const [isEditingGroup, setIsEditingGroup] = useState(false)
  const [isCreateCustomFieldModalOpen, setIsCreateCustomFieldModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isAttendeeSlideoutOpen, setIsAttendeeSlideoutOpen] = useState(false)
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null)
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [builtGroupIds, setBuiltGroupIds] = useState<Set<string>>(new Set())
  const [attendeeCurrentPage, setAttendeeCurrentPage] = useState(1)
  const [attendeeTotalCount, setAttendeeTotalCount] = useState(0)
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('')
  const [filterTagId, setFilterTagId] = useState<string | undefined>(undefined)
  const [attendeeOrdering, setAttendeeOrdering] = useState<string>('name')

  const eventUuid = createdEvent?.uuid || ''

  // Reset built group ids when event changes; actual published state comes from tags (is_published)
  useEffect(() => {
    if (!eventUuid) {
      setBuiltGroupIds(new Set())
      return
    }
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

  // Load attendees from API (or search if query is provided)
  const loadAttendees = async (page = attendeeCurrentPage, query = '', tagId = filterTagId, ordering = attendeeOrdering) => {
    const eventUuid = createdEvent?.uuid

    if (!eventUuid) {
      return
    }

    setIsLoadingAttendees(true)
    try {
      const result = query
        ? await searchAttendees(eventUuid, query, tagId)
        : await fetchAttendees(eventUuid, page, tagId, ordering)
      const attendeesData = result.data
      setAttendeeTotalCount(result.count)

      // Map API response to Attendee interface
      const mappedAttendees: Attendee[] = attendeesData.map((attendeeData: AttendeeData) => {
        const pickStr = (...values: Array<any>) => {
          for (const v of values) {
            const s = typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v)
            const trimmed = s.trim()
            if (trimmed) return trimmed
          }
          return ''
        }

        const rawGroups: any = (attendeeData as any).groups
        const mappedGroups = (Array.isArray(rawGroups) ? rawGroups : [])
          .map((g: any) => {
            if (g === null || g === undefined) return null
            if (typeof g === 'string' || typeof g === 'number') {
              const name = String(g).trim()
              if (!name) return null
              return { id: name, name, variant: 'muted' as const }
            }
            const id = String(g.id || g.uuid || g.value || g.name || '').trim()
            const name = String(g.name || g.title || g.label || id).trim()
            if (!id && !name) return null
            return { id: id || name, name: name || id, variant: (g.variant || 'muted') as any }
          })
          .filter(Boolean) as Attendee['groups']

        const organization = pickStr(
          attendeeData.institute,
          attendeeData.organisation,
          (attendeeData as any).organization
        )
        const post = pickStr(
          attendeeData.post,
          attendeeData.designation,
          (attendeeData as any).title,
          (attendeeData as any).role
        )
        const description = pickStr(
          (attendeeData as any).description,
          (attendeeData as any).bio
        )

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
          groups: mappedGroups,
          tags: tags,
          organization: organization || undefined,
          post: post || undefined,
          description: description || undefined,
          emailVerified: attendeeData.email_verified,
          emailVerifiedDate: attendeeData.email_verified_date,
          feedbackIncomplete: attendeeData.feedback_incomplete,
          customFields: (() => {
            const cf = (attendeeData as any).custom_fields
            if (!cf || typeof cf !== 'object' || Array.isArray(cf)) return undefined
            const entries = Object.entries(cf).map(([label, value]) => ({ label, value: String(value) }))
            return entries.length ? entries : undefined
          })(),
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
      setBuiltGroupIds(new Set())
      return
    }

    setIsLoadingGroups(true)
    try {
      const tagsData = await fetchTags(eventUuid)
      
      // Map API response to Group interface
      // Only include tags that are active (is_active === true)
      const mappedGroups: Group[] = tagsData
        .filter((tag) => tag.is_active !== false) // Only include active tags
        .map((tag) => {
          const count = typeof tag.attendee_count === 'number' ? tag.attendee_count : 0
          return {
            id: tag.uuid,
            name: tag.name,
            attendee_count: count,
            attendeeCount: count
          }
        })

      if (import.meta.env.DEV) {
        console.log('👥 [AttendeeManagement] Groups mapped from tags:', {
          count: mappedGroups.length,
          groups: mappedGroups.map((g) => ({ id: g.id, name: g.name }))
        })
      }
      setGroups(mappedGroups)

      // Ensure Build page checkbox reflects backend is_published flag:
      // any tag with is_published: true will have its checkbox ticked until it becomes false.
      const publishedIds = new Set(
        tagsData
          .filter((tag) => tag.is_published)
          .map((tag) => tag.uuid)
      )
      setBuiltGroupIds(publishedIds)
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
      loadAttendees(1)
      setAttendeeCurrentPage(1)
      loadTags()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdEvent?.uuid])

  const handleAttendeePageChange = (page: number) => {
    setAttendeeCurrentPage(page)
    loadAttendees(page, attendeeSearchQuery, filterTagId, attendeeOrdering)
  }

  const handleFilterTagChange = (tagId: string | undefined) => {
    setFilterTagId(tagId)
    setAttendeeCurrentPage(1)
    loadAttendees(1, attendeeSearchQuery, tagId, attendeeOrdering)
  }

  const handleAttendeeSearchChange = (query: string) => {
    setAttendeeSearchQuery(query)
    setAttendeeCurrentPage(1)
    loadAttendees(1, query, filterTagId, attendeeOrdering)
  }

  const handleServerSortChange = (ordering: string) => {
    setAttendeeOrdering(ordering)
    setAttendeeCurrentPage(1)
    loadAttendees(1, attendeeSearchQuery, filterTagId, ordering)
  }

  const handleCreateProfile = () => {
    setIsCreateProfileModalOpen(true)
  }

  const handleSaveProfile = async (_data: {
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
    // Attendee is created in CreateProfileModal via API; refresh list from DB.
    await loadAttendees()
  }

  const handleEditAttendee = (attendeeId: string) => {
    const attendee = attendees.find((a) => a.id === attendeeId)
    if (attendee) {
      setSelectedAttendee(attendee)
      setIsAttendeeSlideoutOpen(true)
    }
  }

  const handleSaveAttendee = async (updatedAttendee: Attendee) => {
    // Send name for new groups (client-generated id like "1770128330053-1") so backend creates tag with correct name; send id for existing tags
    const isNewGroupId = (id: string) => /^\d+-\d+$/.test(String(id))
    const groupValues = (updatedAttendee.groups || [])
      .map((g) => (isNewGroupId(String(g.id)) ? (g.name || g.id) : (g.id || g.name)))
      .filter(Boolean)

    await updateAttendee(updatedAttendee.id, {
      first_name: updatedAttendee.firstName,
      last_name: updatedAttendee.lastName,
      email: updatedAttendee.email,
      organization: updatedAttendee.organization,
      designation: updatedAttendee.post || undefined,
      description: updatedAttendee.description,
      groups: groupValues.length ? groupValues : undefined,
      custom_fields: updatedAttendee.customFields?.length
        ? Object.fromEntries(updatedAttendee.customFields.map((f) => [f.label, f.value]))
        : undefined,
    })

    setAttendees((prev) => prev.map((a) => (a.id === updatedAttendee.id ? updatedAttendee : a)))
    setSelectedAttendee(updatedAttendee)
    // Refresh groups/tags list so the Groups tab stays in sync after PATCH
    await loadTags()
  }

  const handleDeleteAttendee = async (attendeeId: string) => {
    await deleteAttendee(attendeeId)
    setAttendees((prev) => prev.filter((a) => a.id !== attendeeId))
    setSelectedAttendee((prev) => (prev?.id === attendeeId ? null : prev))
    setIsAttendeeSlideoutOpen((prev) => (selectedAttendee?.id === attendeeId ? false : prev))
  }

  // Bulk delete for selected attendees (uses bulk-delete-attendee endpoint)
  const handleBulkDeleteAttendees = async (attendeeIds: string[]) => {
    const eventUuidForBulk = createdEvent?.uuid
    if (!eventUuidForBulk || !attendeeIds.length) return
    await bulkDeleteAttendees(eventUuidForBulk, attendeeIds)
    setAttendees((prev) => prev.filter((a) => !attendeeIds.includes(a.id)))
    setSelectedAttendee((prev) => (prev && attendeeIds.includes(prev.id) ? null : prev))
    setIsAttendeeSlideoutOpen(false)
  }

  // Bulk add selected attendees to a group/tag (uses bulk-add-tag endpoint)
  const handleAddAttendeesToGroup = async (attendeeIds: string[], groupId: string) => {
    const eventUuidForBulk = createdEvent?.uuid
    if (!eventUuidForBulk || !attendeeIds.length || !groupId) return
    await bulkAddAttendeeTag(eventUuidForBulk, attendeeIds, groupId)
    await loadAttendees()
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
    const target = groups.find((g) => g.id === groupId)
    if (!target) return
    setEditGroupTarget({ id: target.id, name: target.name })
  }

  const handleDeleteGroup = (groupId: string) => {
    const target = groups.find((g) => g.id === groupId)
    if (!target) return
    setDeleteGroupTarget({ id: target.id, name: target.name })
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
            onTabChange={setActiveTab}
            isLoading={isLoadingGroups}
          />
        ) : (
          <AttendeesTable
            attendees={attendees}
            customFields={customFields}
            groups={groups}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onUpload={handleUpload}
            isLoading={isLoadingAttendees}
            onCreateProfile={handleCreateProfile}
            onCreateField={handleCreateField}
            onEditAttendee={handleEditAttendee}
        onDeleteAttendee={handleDeleteAttendee}
        onBulkDeleteAttendees={handleBulkDeleteAttendees}
        onAddToGroup={handleAddAttendeesToGroup}
            onEditCustomField={handleEditCustomField}
            onDeleteCustomField={handleDeleteCustomField}
            onDownload={handleDownload}
            onGridView={handleGridView}
            filterTagId={filterTagId}
            onFilterTagChange={handleFilterTagChange}
            onServerSortChange={handleServerSortChange}
            externalSearchQuery={attendeeSearchQuery}
            onExternalSearchChange={handleAttendeeSearchChange}
            serverSidePagination={{
              totalCount: attendeeTotalCount,
              currentPage: attendeeCurrentPage,
              onPageChange: handleAttendeePageChange,
            }}
          />
        )}
      </div>

      {/* Create Profile Modal */}
      <CreateProfileModal
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

      {/* Edit Group Modal */}
      <EditGroupModal
        isOpen={Boolean(editGroupTarget)}
        groupName={editGroupTarget?.name ?? ''}
        isLoading={isEditingGroup}
        onCancel={() => { if (!isEditingGroup) setEditGroupTarget(null) }}
        onConfirm={async (newName) => {
          if (!editGroupTarget || !eventUuid) return
          setIsEditingGroup(true)
          try {
            await updateTag(editGroupTarget.id, eventUuid, newName)
            setGroups((prev) => prev.map((g) => g.id === editGroupTarget.id ? { ...g, name: newName } : g))
            showToast.success('Group name updated')
            setEditGroupTarget(null)
          } catch (e) {
            showToast.error(e instanceof Error ? e.message : 'Failed to update group name.')
          } finally {
            setIsEditingGroup(false)
          }
        }}
      />

      {/* Delete Group Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteGroupTarget)}
        title="Delete group"
        itemName={deleteGroupTarget?.name}
        isLoading={isDeletingGroup}
        onCancel={() => {
          if (isDeletingGroup) return
          setDeleteGroupTarget(null)
        }}
        onConfirm={async () => {
          if (!deleteGroupTarget || !eventUuid) return
          setIsDeletingGroup(true)
          try {
            await deleteTag(deleteGroupTarget.id, eventUuid)
            setGroups((prev) => prev.filter((g) => g.id !== deleteGroupTarget.id))
            showToast.success('Group deleted')
            setDeleteGroupTarget(null)
          } catch (e) {
            showToast.error(e instanceof Error ? e.message : 'Failed to delete group.')
          } finally {
            setIsDeletingGroup(false)
          }
        }}
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

