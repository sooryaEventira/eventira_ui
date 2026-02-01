import React, { useMemo, useState } from 'react'
import { ExternalLink01, Trash03, RefreshCw01 } from '@untitled-ui/icons-react'
import { useEventForm } from '../../../contexts/EventFormContext'
import {
  loadGroupDirectoryPages,
  type GroupDirectoryPageEntry
} from '../../../utils/groupDirectoryPages'
import { removeGroupDirectoryWebpageForGroup } from '../../../services/groupDirectoryPageService'
import { showToast } from '../../../utils/toast'

interface GroupPagesPageProps {
  hideNavbarAndSidebar?: boolean
}

const GroupPagesPage: React.FC<GroupPagesPageProps> = ({ hideNavbarAndSidebar = false }) => {
  void hideNavbarAndSidebar

  const { createdEvent } = useEventForm()
  const eventUuid =
    createdEvent?.uuid ||
    localStorage.getItem('currentEventUuid') ||
    localStorage.getItem('createdEventUuid') ||
    ''

  const [refreshNonce, setRefreshNonce] = useState(0)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const entries = useMemo(() => {
    if (!eventUuid) return [] as GroupDirectoryPageEntry[]
    const map = loadGroupDirectoryPages(eventUuid)
    return Object.values(map).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
  }, [eventUuid, refreshNonce])

  const openPreview = (webpageUuid: string) => {
    window.history.pushState({}, '', `/event/website/preview/${webpageUuid}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const openPublic = (webpageUuid: string) => {
    if (!eventUuid) return
    const url = `${window.location.origin}/events/${eventUuid}/webpages/${webpageUuid}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-8 px-4 pb-12 pt-8 md:px-10 lg:px-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-primary-dark">Group pages</h1>
          <p className="mt-1 text-sm text-slate-600">
            These pages are generated when you check <span className="font-semibold">Build page</span> in any Groups table.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshNonce((x) => x + 1)}
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <RefreshCw01 className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No group pages yet. Go to Attendee/Speaker/Organization → Groups and check <b>Build page</b>.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[1.5fr_1fr_auto] gap-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div>Group</div>
            <div>Webpage</div>
            <div className="text-right">Actions</div>
          </div>
          {entries.map((e) => (
            <div
              key={e.groupId}
              className="grid grid-cols-[1.5fr_1fr_auto] items-center gap-0 border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{e.groupName}</div>
                <div className="truncate text-xs text-slate-500">Group ID: {e.groupId}</div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm text-slate-700">{e.webpageUuid}</div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openPreview(e.webpageUuid)}
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => openPublic(e.webpageUuid)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="Open public page"
                >
                  <ExternalLink01 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!eventUuid) return
                    setIsDeleting(e.groupId)
                    try {
                      await removeGroupDirectoryWebpageForGroup(eventUuid, e.groupId)
                      setRefreshNonce((x) => x + 1)
                    } catch (err) {
                      showToast.error(err instanceof Error ? err.message : 'Failed to remove page')
                    } finally {
                      setIsDeleting(null)
                    }
                  }}
                  disabled={isDeleting === e.groupId}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60 disabled:opacity-50"
                  aria-label="Remove group page"
                >
                  <Trash03 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default GroupPagesPage

