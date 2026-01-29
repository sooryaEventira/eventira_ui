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
import CreateOrganizationModal from './CreateOrganizationModal'
import { createExhibitor, deleteExhibitor, fetchExhibitors, importExhibitors } from '../../../services/exhibitorService'
import { ConfirmDeleteModal } from '../../ui'
import { writeEventStoreJSON } from '../../../utils/eventLocalStore'

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

  // Sidebar config (only used when not embedded inside EventHubPage)
  const sidebarItems = useMemo(() => {
    const eventHubSubItems = defaultCards.map((card: ContentCard) => ({
      id: card.id,
      label: card.title,
      icon: card.icon
    }))
    return [
      { id: 'overview', label: 'Overview', icon: <InfoCircle className="h-5 w-5" /> },
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

  const eventUuid = useMemo(() => {
    return createdEvent?.uuid || localStorage.getItem('currentEventUuid') || localStorage.getItem('createdEventUuid') || ''
  }, [createdEvent?.uuid])

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

  const handleEdit = (organizationId: string) => {
    setEditingOrgId(organizationId)
    setIsCreateModalOpen(true)
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
    if (editingOrgId) {
      setOrganizations((prev) =>
        prev.map((o) =>
          o.id === editingOrgId
            ? { ...o, ...data }
            : o
        )
      )
      showToast.success('Organization updated')
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
            isModalOpen={isUploadModalOpen || isCreateModalOpen}
          />
        </>
      )}

      <div className={hideNavbarAndSidebar ? '' : 'md:pl-[250px]'}>
        <OrganizationsTable
          organizations={organizations}
          isLoading={isLoadingOrganizations}
          onUpload={handleUpload}
          onCreateOrganization={handleCreate}
          onEditOrganization={handleEdit}
          onDeleteOrganization={handleRequestDelete}
        />
      </div>

      <ConfirmDeleteModal
        isVisible={isDeleteModalOpen}
        onClose={() => {
          if (isDeletingOrganization) return
          setIsDeleteModalOpen(false)
          setDeleteTarget(null)
        }}
        title="Delete organization"
        itemLabel={deleteTarget?.name}
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
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (isSavingOrganization) return
          setIsCreateModalOpen(false)
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
                description: editingOrg.description,
                logoLink: editingOrg.logoLink,
                stallNumber: editingOrg.stallNumber
              }
            : undefined
        }
        onSave={handleSaveOrganization}
      />
    </div>
  )
}

export default OrganizationManagementPage

