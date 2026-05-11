import { useState, useCallback, useEffect } from 'react'
import type { Communication } from './communicationTypes'
import { fetchCommunications, fetchUserTags } from '../../../services/communicationService'

export function useCommunications(eventUuid: string | undefined) {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [isLoadingCommunications, setIsLoadingCommunications] = useState(false)
  const [optimisticSentIds, setOptimisticSentIds] = useState<Set<string>>(new Set())

  const loadCommunications = useCallback(async () => {
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

      const mappedCommunications: Communication[] = communicationsData.map((commData) => {
        const commId = String(commData.id)

        let status: Communication['status'] = 'sent'
        if (commData.status === 'scheduled' || commData.scheduled_at) {
          status = 'scheduled'
        } else if (commData.status === 'draft') {
          status = 'draft'
        }
        if (optimisticSentIds.has(commId) && status === 'draft') {
          status = 'sent'
        }

        const normalizedChannel = String(commData.channel || '')
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_')
        const type: Communication['type'] = normalizedChannel === 'email' ? 'email' : 'notification'

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
                const variant: 'primary' | 'secondary' =
                  f.type === 'message_status' ? 'secondary' : 'primary'
                return { id: `filter-${commId}-${idx}`, name: label, variant }
              })

        return {
          id: commId,
          title: commData.title || commData.subject || 'Untitled',
          userGroups,
          status,
          type,
          recipients: {
            sent: commData.sent_count ?? commData.total_recipients ?? 0,
            total: commData.total_recipients ?? 0,
          },
          scheduledDate: commData.scheduled_at,
        }
      })

      setCommunications(mappedCommunications)
      setOptimisticSentIds((prev) => {
        if (prev.size === 0) return prev
        const sentInApi = new Set(
          communicationsData.filter((c) => c.status !== 'draft').map((c) => String(c.id))
        )
        const next = new Set(prev)
        let changed = false
        prev.forEach((id) => {
          if (sentInApi.has(id)) { next.delete(id); changed = true }
        })
        return changed ? next : prev
      })
    } catch {
      // toast handled in service; preserve existing state
    } finally {
      setIsLoadingCommunications(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventUuid])

  useEffect(() => {
    if (eventUuid) loadCommunications()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventUuid])

  return {
    communications,
    setCommunications,
    isLoadingCommunications,
    optimisticSentIds,
    setOptimisticSentIds,
    loadCommunications,
  }
}
