import React, { useMemo, useState, useEffect } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import {
  fetchParticipants,
  searchParticipants,
  fetchParticipantTags,
  getParticipant,
  updateParticipant,
  deleteParticipant,
  bulkAddParticipantTag,
  bulkDeleteParticipants,
  uploadParticipantFile,
} from '../../../services/participantService'
import type { ParticipantData } from '../../../services/participantService'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import UserTable from './UserTable'
import UserGroupsTable from './UserGroupsTable'
import CreateParticipantModal from './CreateParticipantModal'
import CreateGroupModal from './CreateGroupModal'
import CreateCustomFieldModal from './CreateCustomFieldModal'
import UploadModal from '../../ui/UploadModal'
import { ConfirmDeleteModal } from '../../ui'
import EditGroupModal from '../../ui/EditGroupModal'
import ParticipantDetailsSlideout from './ParticipantDetailsSlideout'
import type { Participant, Group, CustomField, AttendeeTab } from './participantTypes'
import { defaultCards, ContentCard } from '../EventHubContent'
import { InfoCircle, CodeBrowser, Globe01 } from '@untitled-ui/icons-react'
import attendeeSpeakerTemplate from '../../../assets/excel/Attendee Speaker template.xlsx?url'
import { setTagPublished, setTagUnpublished, deleteTag, updateTag } from '../../../services/eventTagService'
import { showToast } from '../../../utils/toast'

interface UserManagementPageProps {
  eventName?: string
  isDraft?: boolean
  onBackClick?: () => void
  userAvatarUrl?: string
  onCardClick?: (cardId: string) => void
  hideNavbarAndSidebar?: boolean
}

/** Map raw ParticipantData → Participant */
function mapParticipantToAttendee(p: ParticipantData): Participant {
  const mappedGroups: Participant['groups'] = (() => {
    // Detail API returns group_names: string[]
    if (Array.isArray((p as any).group_names) && (p as any).group_names.length > 0) {
      return (p as any).group_names.map((name: string) => ({ id: name, name, variant: 'muted' as const }))
    }
    // API returns groups as string[] of names
    if (Array.isArray(p.groups) && p.groups.length > 0) {
      return p.groups.map((name: string) => ({ id: name, name, variant: 'muted' as const }))
    }
    // Fallback: tag_uuids + tag_names
    if (Array.isArray(p.tag_uuids) && p.tag_uuids.length > 0) {
      const tagNames: string[] = Array.isArray(p.tag_names) ? p.tag_names : []
      return p.tag_uuids.map((uuid: string, idx: number) => ({
        id: uuid,
        name: tagNames[idx] || uuid,
        variant: 'muted' as const,
      }))
    }
    return []
  })()

  const pickStr = (...vals: any[]) => {
    for (const v of vals) {
      const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
      if (s) return s
    }
    return ''
  }

  return {
    // Prefer uuid as stable cross-page identity; numeric id can be page-local in some APIs.
    id: p.uuid || p.id || '',
    name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
    firstName: p.first_name,
    lastName: p.last_name,
    email: p.email || (p as any).user_email,
    avatarUrl: p.avatar_url || (p as any).image,
    bannerUrl: p.banner_url,
    status: (p.status as Participant['status']) || 'sent',
    role: (p.role as Participant['role']) || 'attendee',
    inviteCode: p.invite_code,
    groups: mappedGroups,
    organization: pickStr(p.institute, p.organisation, p.organization) || undefined,
    post: pickStr(p.post, p.designation) || undefined,
    description: pickStr(p.description, p.bio) || undefined,
    emailVerified: p.email_verified,
    emailVerifiedDate: p.email_verified_date,
    feedbackIncomplete: p.feedback_incomplete,
    customFields: (() => {
      const cf = p.custom_fields
      if (!cf || typeof cf !== 'object' || Array.isArray(cf)) return undefined
      const entries = Object.entries(cf).map(([label, value]) => ({ label, value: String(value) }))
      return entries.length ? entries : undefined
    })(),
  }
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({
  eventName: propEventName,
  isDraft: propIsDraft,
  onBackClick,
  userAvatarUrl,
  onCardClick,
  hideNavbarAndSidebar = false
}) => {
  const { eventData, createdEvent } = useEventForm()
  const eventName = createdEvent?.eventName || eventData?.eventName || propEventName || ''
  const isDraft = propIsDraft !== undefined ? propIsDraft : true
  const eventStatus = (createdEvent as { status?: string } | null)?.status ?? (eventData as { status?: string } | null)?.status
  const eventUuid =
    createdEvent?.uuid ||
    (eventData as { uuid?: string } | null)?.uuid ||
    (() => {
      try {
        const stored = localStorage.getItem('created-event')
        return stored ? JSON.parse(stored)?.uuid || '' : ''
      } catch {
        return ''
      }
    })()

  // ---------- Tab ----------
  const [activeTab, setActiveTab] = useState<AttendeeTab>('user')

  // ---------- Data ----------
  const [participants, setParticipants] = useState<Participant[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [builtGroupIds, setBuiltGroupIds] = useState<Set<string>>(new Set())

  // ---------- Loading ----------
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)

  // ---------- Pagination / search / sort ----------
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTagId, setFilterTagId] = useState<string | undefined>(undefined)
  const [ordering, setOrdering] = useState<string>('name')
  const normalizeOrdering = (ord?: string) => {
    const allowed = new Set(['name', '-name', 'designation', '-designation'])
    return ord && allowed.has(ord) ? ord : 'name'
  }

  // ---------- Modals ----------
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false)
  const [isCreateCustomFieldModalOpen, setIsCreateCustomFieldModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isSlideoutOpen, setIsSlideoutOpen] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<{ id: string; name: string } | null>(null)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [editGroupTarget, setEditGroupTarget] = useState<{ id: string; name: string } | null>(null)
  const [isEditingGroup, setIsEditingGroup] = useState(false)

  // ---------- Sidebar ----------
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
    if (itemId === 'event-hub' && onBackClick) { onBackClick(); return }
    if (itemId !== 'user-management') {
      const isCardId = defaultCards.some((card) => card.id === itemId)
      if (isCardId && onCardClick) onCardClick(itemId)
    }
  }

  // ---------- Load participants ----------
  const loadParticipants = async (
    page = currentPage,
    query = searchQuery,
    tagId = filterTagId,
    ord = ordering
  ) => {
    if (!eventUuid) return
    setIsLoadingParticipants(true)
    try {
      const result = query
        ? await searchParticipants(eventUuid, query, tagId)
        : await fetchParticipants(eventUuid, page, tagId, normalizeOrdering(ord))
      setTotalCount(result.count)
      setParticipants(result.data.map(mapParticipantToAttendee))
      return result
    } catch (err) {
      console.error('Failed to load participants:', err)
      return null
    } finally {
      setIsLoadingParticipants(false)
    }
  }

  // ---------- Load groups/tags ----------
  const loadGroups = async () => {
    if (!eventUuid) { setGroups([]); return }
    setIsLoadingGroups(true)
    try {
      const tagsData = await fetchParticipantTags(eventUuid)
      const mapped: Group[] = tagsData
        .map((t: any) => {
          const count =
            typeof t.user_count === 'number' ? t.user_count :
            typeof t.participant_count === 'number' ? t.participant_count :
            typeof t.attendee_count === 'number' ? t.attendee_count : 0
          return { id: t.uuid, name: t.name, attendee_count: count, attendeeCount: count }
        })
      setGroups(mapped)
      setBuiltGroupIds(new Set(tagsData.filter((t: any) => t.is_published).map((t: any) => t.uuid)))
    } catch {
      setGroups([])
    } finally {
      setIsLoadingGroups(false)
    }
  }

  useEffect(() => {
    if (createdEvent?.uuid) {
      loadParticipants(1)
      setCurrentPage(1)
      loadGroups()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdEvent?.uuid])

  // ---------- Handlers ----------
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadParticipants(page, searchQuery, filterTagId, normalizeOrdering(ordering))
  }

  const handleFilterTagChange = (tagId: string | undefined) => {
    setFilterTagId(tagId)
    setCurrentPage(1)
    loadParticipants(1, searchQuery, tagId, normalizeOrdering(ordering))
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
    loadParticipants(1, query, filterTagId, normalizeOrdering(ordering))
  }

  const handleSortChange = (ord: string) => {
    const nextOrdering = normalizeOrdering(ord)
    setOrdering(nextOrdering)
    setCurrentPage(1)
    loadParticipants(1, searchQuery, filterTagId, nextOrdering)
  }

  const handleUploadFiles = async (files: File[]) => {
    if (!eventUuid) throw new Error('Event UUID is required.')
    for (const file of files) {
      await uploadParticipantFile(file, eventUuid)
    }
    await loadParticipants()
  }

  const handleDownloadTemplate = () => {
    const link = document.createElement('a')
    link.href = attendeeSpeakerTemplate
    link.download = 'Attendee Speaker template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleEditParticipant = async (id: string) => {
    const listParticipant = participants.find((a) => a.id === id)
    if (!eventUuid) return
    try {
      const detail = await getParticipant(id, eventUuid)
      const mapped = mapParticipantToAttendee(detail)
      setSelectedParticipant(mapped)
      setIsSlideoutOpen(true)
    } catch (err) {
      // Fallback to already loaded row data if detail endpoint fails.
      if (listParticipant) {
        setSelectedParticipant(listParticipant)
        setIsSlideoutOpen(true)
      }
      showToast.error(err instanceof Error ? err.message : 'Failed to load participant details.')
    }
  }

  const handleSaveParticipant = async (updated: Participant) => {
    if (!eventUuid || !updated.id) {
      showToast.error('Unable to save user details. Missing participant or event id.')
      return
    }
    const tagNames = (updated.groups || []).map((g) => g.name || g.id).filter(Boolean)
    const imageFile = (updated as Participant & { imageFile?: File | null }).imageFile
    await updateParticipant(updated.id, eventUuid, {
      first_name: updated.firstName,
      last_name: updated.lastName,
      email: updated.email,
      image: imageFile || undefined,
      avatar_url: imageFile ? undefined : updated.avatarUrl || undefined,
      organisation: updated.organization,
      designation: updated.post || undefined,
      description: updated.description,
      // Backend responses expose `group_names`; send both keys for compatibility.
      group_names: tagNames.length ? tagNames : undefined,
      tag_names: tagNames.length ? tagNames : undefined,
      custom_fields: updated.customFields?.length
        ? Object.fromEntries(updated.customFields.map((f) => [f.label, f.value]))
        : undefined,
    })
    setSelectedParticipant(updated)
    await loadParticipants()
    await loadGroups()
  }

  const handleDeleteParticipant = async (id: string) => {
    await deleteParticipant(id, eventUuid)
    const result = await loadParticipants(currentPage, searchQuery, filterTagId, normalizeOrdering(ordering))
    if (currentPage > 1 && result && result.data.length === 0) {
      const previousPage = currentPage - 1
      setCurrentPage(previousPage)
      await loadParticipants(previousPage, searchQuery, filterTagId, normalizeOrdering(ordering))
    }
    if (selectedParticipant?.id === id) { setSelectedParticipant(null); setIsSlideoutOpen(false) }
  }

  const resolveAllFilteredParticipantIds = async (): Promise<string[]> => {
    if (!eventUuid) return []
    const collected = new Set<string>()
    if (searchQuery.trim()) {
      const result = await searchParticipants(eventUuid, searchQuery, filterTagId)
      result.data.forEach((p) => {
        const pid = p.uuid || p.id
        if (pid) collected.add(pid)
      })
      return Array.from(collected)
    }
    const pageSize = 100
    let page = 1
    let hasMore = true
    while (hasMore) {
      const result = await fetchParticipants(eventUuid, page, filterTagId, normalizeOrdering(ordering), pageSize)
      result.data.forEach((p) => {
        const pid = p.uuid || p.id
        if (pid) collected.add(pid)
      })
      hasMore = Boolean(result.next)
      page += 1
    }
    return Array.from(collected)
  }

  const handleBulkDelete = async (ids: string[], selectAll?: boolean) => {
    if (!eventUuid) return
    const targetIds = selectAll ? await resolveAllFilteredParticipantIds() : ids
    if (!targetIds.length) return
    await bulkDeleteParticipants(eventUuid, targetIds)
    const result = await loadParticipants(currentPage, searchQuery, filterTagId, normalizeOrdering(ordering))
    if (currentPage > 1 && result && result.data.length === 0) {
      const previousPage = currentPage - 1
      setCurrentPage(previousPage)
      await loadParticipants(previousPage, searchQuery, filterTagId, normalizeOrdering(ordering))
    }
    setIsSlideoutOpen(false)
  }

  const handleAddToGroup = async (ids: string[], groupId: string, selectAll?: boolean) => {
    if (!eventUuid || !groupId) return
    const targetIds = selectAll ? await resolveAllFilteredParticipantIds() : ids
    if (!targetIds.length) return
    await bulkAddParticipantTag(eventUuid, targetIds, groupId)
    await loadParticipants()
  }

  const handleTabChange = (tab: AttendeeTab) => {
    setActiveTab(tab)
    if (tab === 'groups') loadGroups()
  }

  const handleToggleBuildPage = async (group: { id: string; name: string }, checked: boolean) => {
    if (!eventUuid) return
    if (checked) {
      setBuiltGroupIds((prev) => { const n = new Set(prev); n.add(group.id); return n })
      try { await setTagPublished(group.id, eventUuid) }
      catch { setBuiltGroupIds((prev) => { const n = new Set(prev); n.delete(group.id); return n }) }
    } else {
      setBuiltGroupIds((prev) => { const n = new Set(prev); n.delete(group.id); return n })
      try { await setTagUnpublished(group.id, eventUuid) }
      catch { setBuiltGroupIds((prev) => { const n = new Set(prev); n.add(group.id); return n }) }
    }
  }

  const handleSaveCustomField = (data: { fieldName: string; fieldType: 'Text' | 'Dropdown' | 'PDF'; visibility: 'Visible to users' | 'Invisible' }) => {
    const visibility = data.visibility === 'Visible to users' ? 'Visible to attendees' : data.visibility
    setCustomFields((prev) => [...prev, { id: Date.now().toString(), fieldName: data.fieldName, fieldType: data.fieldType, visibility, users: 0 }])
  }

  return (
    <div className={hideNavbarAndSidebar ? '' : 'min-h-screen overflow-x-hidden bg-white'}>
      {!hideNavbarAndSidebar && (
        <>
          <EventHubNavbar
            eventName={eventName}
            isDraft={isDraft}
            eventStatus={eventStatus}
            onBackClick={onBackClick}
            onSearchClick={() => {}}
            onNotificationClick={() => {}}
            onProfileClick={() => {}}
            userAvatarUrl={userAvatarUrl}
          />
          <EventHubSidebar
            items={sidebarItems}
            activeItemId="user-management"
            onItemClick={handleSidebarItemClick}
            isModalOpen={isCreateModalOpen || isCreateGroupModalOpen || isCreateCustomFieldModalOpen || isUploadModalOpen || isSlideoutOpen}
          />
        </>
      )}

      <div className={hideNavbarAndSidebar ? '' : 'md:pl-[250px]'}>
        {activeTab === 'groups' ? (
          <UserGroupsTable
            groups={groups}
            onCreateGroup={() => setIsCreateGroupModalOpen(true)}
            onEditGroup={(id) => {
              const t = groups.find((g) => g.id === id)
              if (t) setEditGroupTarget({ id: t.id, name: t.name })
            }}
            onDeleteGroup={(id) => {
              const t = groups.find((g) => g.id === id)
              if (t) setDeleteGroupTarget({ id: t.id, name: t.name })
            }}
            builtGroupIds={builtGroupIds}
            onToggleBuildPage={handleToggleBuildPage}
            onTabChange={handleTabChange}
            isLoading={isLoadingGroups}
          />
        ) : (
          <UserTable
            users={participants}
            customFields={customFields}
            groups={groups}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onUpload={() => setIsUploadModalOpen(true)}
            isLoading={isLoadingParticipants}
            onCreateUser={() => setIsCreateModalOpen(true)}
            onCreateField={() => setIsCreateCustomFieldModalOpen(true)}
            onEditUser={handleEditParticipant}
            onDeleteUser={handleDeleteParticipant}
            onBulkDeleteUsers={handleBulkDelete}
            onAddToGroup={handleAddToGroup}
            onEditCustomField={() => {}}
            onDeleteCustomField={(id) => setCustomFields((prev) => prev.filter((f) => f.id !== id))}
            onDownload={() => {}}
            filterTagId={filterTagId}
            onFilterTagChange={handleFilterTagChange}
            onServerSortChange={handleSortChange}
            externalSearchQuery={searchQuery}
            onExternalSearchChange={handleSearchChange}
            serverSidePagination={{ totalCount, currentPage, onPageChange: handlePageChange }}
          />
        )}
      </div>

      {/* Create User Modal */}
      <CreateParticipantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        eventUuid={eventUuid}
        onSave={async () => { await loadParticipants() }}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onConfirm={async () => { await loadGroups() }}
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

      {/* Delete Group Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteGroupTarget)}
        title="Delete group"
        itemName={deleteGroupTarget?.name}
        isLoading={isDeletingGroup}
        onCancel={() => { if (!isDeletingGroup) setDeleteGroupTarget(null) }}
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
        title="Upload users"
        description="XLSX files only"
        instructions={['Step 1: Download template', 'Step 2: Upload users']}
        onDownloadTemplate={handleDownloadTemplate}
      />

      {/* Participant Details Slideout */}
      <ParticipantDetailsSlideout
        isOpen={isSlideoutOpen}
        onClose={() => { setIsSlideoutOpen(false); setSelectedParticipant(null) }}
        attendee={selectedParticipant}
        onSave={handleSaveParticipant}
        eventUuid={eventUuid}
      />
    </div>
  )
}

export default UserManagementPage
