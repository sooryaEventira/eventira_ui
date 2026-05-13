import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import { defaultCards, ContentCard } from '../EventHubContent'
import { InfoCircle, CodeBrowser, Globe01 } from '@untitled-ui/icons-react'
import UploadModal from '../../ui/UploadModal'
import { showToast } from '../../../utils/toast'
import type { Organization } from './organizationTypes'
import OrganizationsTable from './OrganizationsTable'
import OrganizationGroupsTable, {
  type OrganizationGroup,
  type OrganizationManagementTab
} from './OrganizationGroupsTable'
import CreateOrganizationModal from './CreateOrganizationModal'
import EditOrganizationSlideout from './EditOrganizationSlideout'
import { createExhibitor, deleteExhibitor, fetchExhibitors, importExhibitors, updateExhibitor } from '../../../services/exhibitorService'
import { ConfirmDeleteModal } from '../../ui'
import { writeEventStoreJSON } from '../../../utils/eventLocalStore'
import CreateGroupModal from '../usermanagement/CreateGroupModal'
import { fetchTags, type TagData } from '../../../services/attendeeService'
import { setTagPublished, setTagUnpublished } from '../../../services/eventTagService'
import { fetchPublishedAttendeeTagIds } from '../../../services/webpageService'
import { getDescriptionHtml } from '../../../utils/organizationDescriptionHtml'

interface OrganizationManagementPageProps {
  eventName?: string
  isDraft?: boolean
  onBackClick?: () => void
  userAvatarUrl?: string
  hideNavbarAndSidebar?: boolean
}

const OrganizationManagementPage: React.FC<OrganizationManagementPageProps> = ({
  eventName: propEventName,
  isDraft: propIsDraft,
  onBackClick,
  userAvatarUrl,
  hideNavbarAndSidebar = false
}) => {
  const { eventData, createdEvent } = useEventForm()

  const eventName = useMemo(() => {
    return createdEvent?.eventName || eventData?.eventName || propEventName || 'Highly important conference of 2025'
  }, [createdEvent?.eventName, createdEvent?.uuid, eventData?.eventName, propEventName])

  const isDraft = propIsDraft !== undefined ? propIsDraft : true
  const eventStatus = (createdEvent as { status?: string } | null)?.status ?? (eventData as { status?: string } | null)?.status

  // Sidebar config (only used when not embedded inside EventHubPage)
  const sidebarItems = useMemo(() => {
    const eventHubSubItems = defaultCards.map((card: ContentCard) => ({
      id: card.id,
      label: card.title,
      icon: card.icon
    }))
    return [
      { id: 'summary', label: 'Summary', icon: <InfoCircle className="h-5 w-5" /> },
      { id: 'event-website', label: 'Event website', icon: <CodeBrowser className="h-5 w-5" /> },
      { id: 'event-hub', label: 'Event Hub', icon: <Globe01 className="h-5 w-5" />, subItems: eventHubSubItems }
    ]
  }, [])

  const handleSidebarItemClick = useCallback((itemId: string) => {
    const newUrl = itemId === 'event-hub' ? '/event/hub' : `/event/hub?section=${itemId}`
    window.history.pushState({ section: itemId }, '', newUrl)
    window.location.reload()
  }, [])

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false)
  const [activeTab, setActiveTab] = useState<OrganizationManagementTab>('organizations')
  const [tags, setTags] = useState<TagData[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false)
  const [builtGroupIds, setBuiltGroupIds] = useState<Set<string>>(new Set())

  const eventUuid = useMemo(() => {
    return createdEvent?.uuid || localStorage.getItem('currentEventUuid') || localStorage.getItem('createdEventUuid') || ''
  }, [createdEvent?.uuid])

  // Load published tag IDs from website index so Build page checkbox stays checked for published tags
  useEffect(() => {
    if (!eventUuid) {
      setBuiltGroupIds(new Set())
      return
    }
    let cancelled = false
    fetchPublishedAttendeeTagIds(eventUuid).then((ids) => {
      if (!cancelled) setBuiltGroupIds(ids)
    })
    return () => { cancelled = true }
  }, [eventUuid])

  // Refresh builtGroupIds when webpage-saved fires (e.g. after publishing from this page)
  useEffect(() => {
    const handler = () => {
      if (eventUuid) fetchPublishedAttendeeTagIds(eventUuid).then(setBuiltGroupIds)
    }
    window.addEventListener('webpage-saved', handler as EventListener)
    return () => window.removeEventListener('webpage-saved', handler as EventListener)
  }, [eventUuid])

  const mapExhibitorToOrganization = useCallback((raw: any): Organization => {
    const id = String(raw?.uuid ?? raw?.id ?? raw?.pk ?? raw?._id ?? `org-${Date.now()}-${Math.random()}`)
    const name = String(raw?.name ?? raw?.company_name ?? raw?.companyName ?? raw?.title ?? 'Unknown')
    return {
      id,
      name,
      website: raw?.website ?? raw?.site ?? undefined,
      linkedin: raw?.linkedin ?? raw?.linkedin_url ?? undefined,
      groups: raw?.groups ?? raw?.group ?? undefined,
      description: raw?.description ?? raw?.about ?? undefined,
      logoLink: raw?.logo_link ?? raw?.logo_url ?? raw?.logo ?? raw?.logoLink ?? undefined,
      stallNumber: raw?.stall_number ?? raw?.stallNumber ?? undefined
    }
  }, [])

  const loadOrganizations = useCallback(async () => {
    if (!eventUuid) {
      setOrganizations([])
      return
    }
    setIsLoadingOrganizations(true)
    try {
      const list = await fetchExhibitors(eventUuid)
      const mapped = Array.isArray(list) ? list.map(mapExhibitorToOrganization) : []
      setOrganizations(mapped)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load organizations.'
      showToast.error(msg)
    } finally {
      setIsLoadingOrganizations(false)
    }
  }, [eventUuid, mapExhibitorToOrganization])

  useEffect(() => {
    loadOrganizations()
  }, [loadOrganizations])

  const loadTags = useCallback(async () => {
    if (!eventUuid) {
      setTags([])
      return
    }

    setIsLoadingGroups(true)
    try {
      const list = await fetchTags(eventUuid)
      // Only keep active tags (consistent with attendee/speaker)
      const activeOnly = (list || []).filter((t) => t.is_active !== false)
      setTags(activeOnly)
    } catch (e) {
      // fetchTags already toasts; keep UI safe
      setTags([])
    } finally {
      setIsLoadingGroups(false)
    }
  }, [eventUuid])


  const organizationGroups = useMemo<OrganizationGroup[]>(() => {
    const norm = (s: string) => s.trim().toLowerCase()
    const split = (raw?: string) =>
      String(raw || '')
        .split(',')
        .map((x) => norm(x))
        .filter(Boolean)

    return tags.map((t) => {
      const tagName = String(t.name || '').trim()
      const tagNameNorm = norm(tagName)
      const count = organizations.reduce((sum, org) => {
        const groups = split(org.groups)
        return groups.includes(tagNameNorm) ? sum + 1 : sum
      }, 0)
      return { id: t.uuid, name: tagName, organizationCount: count }
    })
  }, [tags, organizations])

  // Persist organizations for published website navigation + list page
  useEffect(() => {
    const eventUuidForStore =
      createdEvent?.uuid ||
      localStorage.getItem('currentEventUuid') ||
      localStorage.getItem('createdEventUuid') ||
      'unknown-event'
    writeEventStoreJSON(eventUuidForStore, 'organizations', organizations)
  }, [createdEvent?.uuid, organizations])

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditSlideoutOpen, setIsEditSlideoutOpen] = useState(false)
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null)
  const [isSavingOrganization, setIsSavingOrganization] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeletingOrganization, setIsDeletingOrganization] = useState(false)

  const editingOrg = useMemo(() => {
    if (!editingOrgId) return null
    return organizations.find((o) => o.id === editingOrgId) || null
  }, [editingOrgId, organizations])

  const handleUpload = () => {
    setIsUploadModalOpen(true)
  }

  const handleCreate = () => {
    setEditingOrgId(null)
    setIsCreateModalOpen(true)
  }

  const handleCreateGroup = () => {
    setIsCreateGroupModalOpen(true)
  }

  const handleSaveGroup = async () => {
    await loadTags()
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

  const handleEdit = (organizationId: string) => {
    setEditingOrgId(organizationId)
    setIsEditSlideoutOpen(true)
  }

  const handleRequestDelete = (organizationId: string) => {
    const target = organizations.find((o) => o.id === organizationId) || null
    if (!target) return
    setDeleteTarget(target)
    setIsDeleteModalOpen(true)
  }

  const handleSaveOrganization = async (data: {
    name: string
    website?: string
    linkedin?: string
    groups?: string
    description?: string
    logoLink?: string
    stallNumber?: string
  }) => {
    if (editingOrgId && eventUuid) {
      setIsSavingOrganization(true)
      try {
        await updateExhibitor(eventUuid, editingOrgId, {
          name: data.name,
          website: data.website,
          linkedin: data.linkedin,
          groups: data.groups,
          description: data.description,
          logo_link: data.logoLink,
          stall_number: data.stallNumber
        })
        showToast.success('Organization updated')
        setIsEditSlideoutOpen(false)
        setEditingOrgId(null)
        await loadOrganizations()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to update organization.'
        showToast.error(msg)
      } finally {
        setIsSavingOrganization(false)
      }
    } else if (editingOrgId && !eventUuid) {
      showToast.error('Event UUID is missing. Please select an event first.')
    } else {
      if (!eventUuid) {
        showToast.error('Event UUID is missing. Please select an event first.')
        return
      }
      setIsSavingOrganization(true)
      try {
        await createExhibitor(eventUuid, {
          name: data.name,
          website: data.website,
          linkedin: data.linkedin,
          groups: data.groups,
          description: data.description,
          logo_link: data.logoLink,
          stall_number: data.stallNumber
        })
        showToast.success('Organization created')
        setIsCreateModalOpen(false)
        setEditingOrgId(null)
        await loadOrganizations()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to create organization.'
        showToast.error(msg)
      } finally {
        setIsSavingOrganization(false)
      }
    }
  }

  const handleUploadFiles = async (files: File[]) => {
    const file = files?.[0]
    if (!file) return
    if (!eventUuid) {
      showToast.error('Event UUID is missing. Please select an event first.')
      return
    }
    try {
      await importExhibitors(file, eventUuid)
      showToast.success('Organizations uploaded successfully')
      setIsUploadModalOpen(false)
      await loadOrganizations()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to upload organizations.'
      showToast.error(msg)
    }
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
            activeItemId="organization-management"
            onItemClick={handleSidebarItemClick}
            isModalOpen={isUploadModalOpen || isCreateModalOpen || isEditSlideoutOpen || isCreateGroupModalOpen}
          />
        </>
      )}

      <div className={hideNavbarAndSidebar ? '' : 'md:pl-[250px]'}>
        {activeTab === 'groups' ? (
          <OrganizationGroupsTable
            groups={organizationGroups}
            onCreateGroup={handleCreateGroup}
            onEditGroup={() => {
              // UI only for now (same as attendee/speaker)
            }}
            onDeleteGroup={(groupId) => {
              // UI only for now: remove from local list for this session
              setTags((prev) => prev.filter((t) => t.uuid !== groupId))
            }}
            builtGroupIds={builtGroupIds}
            onToggleBuildPage={handleToggleBuildPage}
            onFilter={() => {
              // UI only for now
            }}
            onTabChange={setActiveTab}
            isLoading={isLoadingGroups}
          />
        ) : (
          <OrganizationsTable
            organizations={organizations}
            isLoading={isLoadingOrganizations}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onUpload={handleUpload}
            onCreateOrganization={handleCreate}
            onEditOrganization={handleEdit}
            onDeleteOrganization={handleRequestDelete}
          />
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onCancel={() => {
          if (isDeletingOrganization) return
          setIsDeleteModalOpen(false)
          setDeleteTarget(null)
        }}
        title="Delete organization"
        itemName={deleteTarget?.name}
        isLoading={isDeletingOrganization}
        onConfirm={async () => {
          if (!deleteTarget?.id) return
          setIsDeletingOrganization(true)
          try {
            await deleteExhibitor(deleteTarget.id)
            showToast.success('Organization deleted')
            setIsDeleteModalOpen(false)
            setDeleteTarget(null)
            await loadOrganizations()
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to delete organization.'
            showToast.error(msg)
            throw e
          } finally {
            setIsDeletingOrganization(false)
          }
        }}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadFiles}
        title="Upload organizations"
        description="XLSX files only"
        showTemplate={false}
        instructions={[
          'Step 1: Prepare Excel with columns: Name, Website, Description, Logo link',
          'Step 2: Upload the Excel file'
        ]}
        buttonText="Upload file"
        multiple={false}
      />

      <CreateOrganizationModal
        key="new"
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (isSavingOrganization) return
          setIsCreateModalOpen(false)
        }}
        isSaving={isSavingOrganization}
        onSave={handleSaveOrganization}
      />

      <EditOrganizationSlideout
        key={editingOrgId ?? 'edit'}
        isOpen={isEditSlideoutOpen}
        onClose={() => {
          if (isSavingOrganization) return
          setIsEditSlideoutOpen(false)
          setEditingOrgId(null)
        }}
        isSaving={isSavingOrganization}
        initialValues={
          editingOrg
            ? {
                name: editingOrg.name,
                website: editingOrg.website,
                linkedin: editingOrg.linkedin,
                groups: editingOrg.groups,
                description: getDescriptionHtml(editingOrg.description || '') || editingOrg.description,
                logoLink: editingOrg.logoLink,
                stallNumber: editingOrg.stallNumber
              }
            : undefined
        }
        onSave={handleSaveOrganization}
      />

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onConfirm={() => void handleSaveGroup()}
      />
    </div>
  )
}

export default OrganizationManagementPage

