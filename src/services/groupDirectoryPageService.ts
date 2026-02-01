import { createWebpage, deleteWebpage, type CreateWebpageRequest } from './webpageService'
import { showToast } from '../utils/toast'
import {
  getGroupDirectoryPage,
  removeGroupDirectoryPage,
  setGroupDirectoryPage,
} from '../utils/groupDirectoryPages'

const slugify = (s: string) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function buildGroupDirectoryWebpageRequest(
  eventUuid: string,
  groupId: string,
  groupName: string
): CreateWebpageRequest {
  const safeGroupName = String(groupName || '').trim() || 'Group'
  const pageName = `${safeGroupName} group`
  const pageSlug = slugify(safeGroupName) || 'group'

  // Webpage content format expected by PublicWebpageRenderer + WebsitePreviewPage
  // Keep a single key to avoid ambiguity.
  return {
    event_uuid: eventUuid,
    name: pageName,
    content: {
      [pageSlug]: {
        title: pageName,
        slug: pageSlug,
        data: {
          [pageSlug]: {
            root: {
              props: {
                title: pageName,
                pageTitle: pageName,
                pageType: 'group-directory',
                groupId,
                groupName: safeGroupName
              }
            },
            content: [
              {
                type: 'GroupDirectory',
                props: {
                  groupId,
                  groupName: safeGroupName,
                  title: `${safeGroupName} directory`,
                  showAttendees: true,
                  showSpeakers: true,
                  showOrganizations: true,
                }
              }
            ],
            zones: {}
          }
        }
      }
    }
  }
}

export async function ensureGroupDirectoryWebpage(
  eventUuid: string,
  groupId: string,
  groupName: string
): Promise<{ webpageUuid: string }> {
  const existing = getGroupDirectoryPage(eventUuid, groupId)
  if (existing?.webpageUuid) {
    return { webpageUuid: existing.webpageUuid }
  }

  const request = buildGroupDirectoryWebpageRequest(eventUuid, groupId, groupName)
  const created = await createWebpage(request)

  setGroupDirectoryPage(eventUuid, {
    groupId,
    groupName: String(groupName || '').trim() || created.name,
    webpageUuid: created.uuid,
    createdAt: new Date().toISOString()
  })

  // Refresh website pages list
  window.dispatchEvent(
    new CustomEvent('webpage-saved', { detail: { eventUuid } })
  )
  showToast.success('Group page created')
  return { webpageUuid: created.uuid }
}

export async function removeGroupDirectoryWebpageForGroup(
  eventUuid: string,
  groupId: string
): Promise<void> {
  const existing = getGroupDirectoryPage(eventUuid, groupId)
  if (!existing?.webpageUuid) {
    removeGroupDirectoryPage(eventUuid, groupId)
    return
  }

  await deleteWebpage(existing.webpageUuid, eventUuid)
  removeGroupDirectoryPage(eventUuid, groupId)
  window.dispatchEvent(
    new CustomEvent('webpage-saved', { detail: { eventUuid } })
  )
  showToast.success('Group page removed')
}

