import React from 'react'
import type { NavigationItem } from '../../../types/navigation'
import { NAV_ICON_KEYS, renderNavIcon } from '../../../utils/navIcons'
import {
  isFolder,
  isPage,
  loadNavigationConfigFromStorage,
  saveNavigationConfigToStorage,
  upsertMissingPagesToRoot
} from '../../../utils/navigationTree'
import Button from '../../ui/untitled/Button'
import { InfoCircle, CodeBrowser, Globe01, Copy01, Eye, EyeOff, Folder } from '@untitled-ui/icons-react'

interface NavigationTabProps {
  eventUuidForNavigation: string
  navigationTreeItems: NavigationItem[]
  hiddenNavIds: Set<string>
  setHiddenNavIds: React.Dispatch<React.SetStateAction<Set<string>>>
  navigationPreviewActive: string | null
  setNavigationPreviewActive: (id: string | null) => void
  iconPickerForNavId: string | null
  setIconPickerForNavId: (id: string | null) => void
  iconPickerQuery: string
  setIconPickerQuery: (value: string) => void
  iconPickerAnchor: { top: number; left: number; width: number } | null
  setIconPickerAnchor: (value: { top: number; left: number; width: number } | null) => void
  isLoadingIndexWebpages: boolean
  dragOverNavId: string | null
  setDragOverNavId: (id: string | null) => void
  draggingNavId: string | null
  setDraggingNavId: (id: string | null) => void
  setNavTreeRefresh: React.Dispatch<React.SetStateAction<number>>
  getNavigationTreeStorageKey: (eventUuid: string) => string
}

const NavigationTab: React.FC<NavigationTabProps> = ({
  eventUuidForNavigation,
  navigationTreeItems,
  hiddenNavIds,
  setHiddenNavIds,
  navigationPreviewActive,
  setNavigationPreviewActive,
  iconPickerForNavId,
  setIconPickerForNavId,
  iconPickerQuery,
  setIconPickerQuery,
  iconPickerAnchor,
  setIconPickerAnchor,
  isLoadingIndexWebpages,
  dragOverNavId,
  setDragOverNavId,
  draggingNavId,
  setDraggingNavId,
  setNavTreeRefresh,
  getNavigationTreeStorageKey
}) => {
  const eventUuid = eventUuidForNavigation

  const flatten = (list: NavigationItem[], depth = 0): Array<{ item: NavigationItem; depth: number }> => {
    const out: Array<{ item: NavigationItem; depth: number }> = []
    for (const it of list) {
      out.push({ item: it, depth })
      if (isFolder(it) && Array.isArray(it.children) && it.children.length) {
        out.push(...flatten(it.children, depth + 1))
      }
    }
    return out
  }

  const items = navigationTreeItems

  const applyHiddenKeepEmptyFolders = (list: NavigationItem[]): NavigationItem[] => {
    const out: NavigationItem[] = []
    for (const it of list) {
      if (hiddenNavIds.has(it.id)) continue
      if (isFolder(it)) {
        out.push({ ...it, children: applyHiddenKeepEmptyFolders(it.children || []) })
      } else {
        out.push(it)
      }
    }
    return out
  }

  const visibleTree = applyHiddenKeepEmptyFolders(items)
  const flat = flatten(items)
  const visibleFlat = flatten(visibleTree)
  const activeId = navigationPreviewActive ?? visibleFlat[0]?.item?.id ?? null

  const setNavItemIcon = (targetId: string, iconKey?: string) => {
    if (!eventUuid) return
    const treeKey = getNavigationTreeStorageKey(eventUuid)
    const stored = loadNavigationConfigFromStorage(treeKey)
    const current =
      stored?.items && Array.isArray(stored.items)
        ? (stored.items as NavigationItem[])
        : items

    const walk = (list: NavigationItem[]): NavigationItem[] =>
      list.map((it) => {
        if (isFolder(it)) {
          return { ...it, children: walk(it.children || []) }
        }
        if (it.id !== targetId) return it
        return { ...it, iconKey: iconKey || undefined }
      })

    const next = walk(current)
    try {
      saveNavigationConfigToStorage(treeKey, next)
    } catch {
      // ignore
    }
    setNavTreeRefresh((x) => x + 1)
  }

  const findNavItemById = (list: NavigationItem[], id: string): NavigationItem | null => {
    for (const it of list) {
      if (it.id === id) return it
      if (isFolder(it)) {
        const nested = findNavItemById(it.children || [], id)
        if (nested) return nested
      }
    }
    return null
  }

  const removeNavItemById = (
    list: NavigationItem[],
    id: string
  ): { item: NavigationItem | null; next: NavigationItem[] } => {
    let found: NavigationItem | null = null
    const next: NavigationItem[] = []
    for (const it of list) {
      if (it.id === id) {
        found = it
        continue
      }
      if (isFolder(it)) {
        const res = removeNavItemById(it.children || [], id)
        if (res.item) {
          found = res.item
          next.push({ ...it, children: res.next })
        } else {
          next.push(it)
        }
      } else {
        next.push(it)
      }
    }
    return { item: found, next }
  }

  const insertNavItemIntoFolder = (
    list: NavigationItem[],
    folderId: string,
    toInsert: NavigationItem
  ): { inserted: boolean; next: NavigationItem[] } => {
    let inserted = false
    const next = list.map((it) => {
      if (isFolder(it)) {
        if (it.id === folderId) {
          inserted = true
          return { ...it, children: [...(it.children || []), toInsert] }
        }
        const res = insertNavItemIntoFolder(it.children || [], folderId, toInsert)
        if (res.inserted) {
          inserted = true
          return { ...it, children: res.next }
        }
      }
      return it
    })
    return { inserted, next }
  }

  const moveNavPageIntoFolder = (dragId: string, folderId: string) => {
    if (!eventUuid) return
    if (!dragId || !folderId || dragId === folderId) return

    const treeKey = getNavigationTreeStorageKey(eventUuid)
    const stored = loadNavigationConfigFromStorage(treeKey)
    const current =
      stored?.items && Array.isArray(stored.items)
        ? (stored.items as NavigationItem[])
        : items

    const draggedItem = findNavItemById(current, dragId)
    if (!draggedItem || !isPage(draggedItem)) return

    const { item: removed, next: removedTree } = removeNavItemById(current, dragId)
    if (!removed) return

    const insertedRes = insertNavItemIntoFolder(removedTree, folderId, removed)
    if (!insertedRes.inserted) return

    try {
      saveNavigationConfigToStorage(treeKey, insertedRes.next)
    } catch {
      // ignore
    }
    setNavTreeRefresh((x) => x + 1)
  }

  const filteredIconKeys = (() => {
    const q = iconPickerQuery.trim().toLowerCase()
    if (!q) return NAV_ICON_KEYS
    return NAV_ICON_KEYS.filter((k) => k.toLowerCase().includes(q))
  })()

  const limitedIconKeys = filteredIconKeys

  const moveNavigationTreeItem = (dragId: string, targetId: string | null) => {
    if (!eventUuid || !dragId || dragId === targetId) return

    const treeKey = getNavigationTreeStorageKey(eventUuid)
    const stored = loadNavigationConfigFromStorage(treeKey)
    const current =
      stored?.items && Array.isArray(stored.items)
        ? (stored.items as NavigationItem[])
        : items

    const without: NavigationItem[] = []
    let dragged: NavigationItem | null = null
    for (const it of current) {
      if (it.id === dragId) {
        dragged = it
        continue
      }
      without.push(it)
    }
    if (!dragged) return

    const next: NavigationItem[] = []
    let inserted = false
    for (const it of without) {
      if (it.id === targetId) {
        next.push(it)
        next.push(dragged)
        inserted = true
      } else {
        next.push(it)
      }
    }
    if (!inserted) {
      next.push(dragged)
    }

    try {
      saveNavigationConfigToStorage(treeKey, next)
    } catch {
      // ignore
    }
    setNavTreeRefresh((x) => x + 1)
  }

  const toggleHidden = (id: string) => {
    setHiddenNavIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (!eventUuid) return next
      try {
        const hiddenKey = `navigation-hidden-${eventUuid}`
        window.localStorage.setItem(hiddenKey, JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
      return next
    })
  }

  if (!eventUuid) return null

  return (
    <div className="flex flex-col gap-6 min-h-[520px]">
      <div className="space-y-2 flex-1">
        <div className="text-sm font-semibold text-slate-900">Menu items</div>
        <div className="text-sm text-slate-600">
          These are the pages that will appear in the published website navbar.
        </div>

        <div className="space-y-0 border border-slate-200 rounded-lg bg-white">
          {isLoadingIndexWebpages ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <p>Loading index pages...</p>
            </div>
          ) : flat.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <p>No menu items yet. Create pages or folders to see them here.</p>
            </div>
          ) : (
            flat.map(({ item, depth }) => {
              const folder = isFolder(item)
              const page = isPage(item)
              const isSystemPage = page && String(item.pageId).startsWith('system:')
              const isWebpage = page && !isSystemPage
              const isWelcome = isWebpage && String(item.title || '').toLowerCase() === 'welcome'
              const isHidden = hiddenNavIds.has(item.id)
              const currentIcon = page ? (item as any).iconKey : undefined
              const publicUrl =
                !eventUuid || !page
                  ? ''
                  : isWebpage
                    ? `${window.location.origin}/events/${eventUuid}/webpages/${item.pageId}`
                    : item.pageId === 'system:organizations'
                      ? `${window.location.origin}/events/${eventUuid}/organizations`
                      : item.pageId === 'system:speakers'
                        ? `${window.location.origin}/events/${eventUuid}/speakers`
                        : item.pageId === 'system:attendees'
                          ? `${window.location.origin}/events/${eventUuid}/attendees`
                          : item.pageId === 'system:schedule'
                            ? `${window.location.origin}/events/${eventUuid}/schedule`
                            : `${window.location.origin}/events/${eventUuid}/sessions`

              return (
                <div
                  key={item.id}
                  onDragOver={(e) => {
                    if (folder) {
                      e.preventDefault()
                      if (dragOverNavId !== item.id) setDragOverNavId(item.id)
                      return
                    }
                    if (depth !== 0) return
                    e.preventDefault()
                    if (dragOverNavId !== item.id) setDragOverNavId(item.id)
                  }}
                  onDragLeave={() => {
                    if (dragOverNavId === item.id) {
                      setDragOverNavId(null)
                    }
                  }}
                  onDrop={(e) => {
                    if (folder) {
                      e.preventDefault()
                      if (draggingNavId) moveNavPageIntoFolder(draggingNavId, item.id)
                      setDraggingNavId(null)
                      setDragOverNavId(null)
                      return
                    }
                    if (depth !== 0) return
                    e.preventDefault()
                    if (draggingNavId) moveNavigationTreeItem(draggingNavId, item.id)
                    setDraggingNavId(null)
                    setDragOverNavId(null)
                  }}
                  className={[
                    'flex items-center justify-between gap-3 py-2 px-4 border-b border-slate-200 last:border-b-0 transition-colors',
                    dragOverNavId === item.id ? 'bg-violet-50' : 'hover:bg-slate-50'
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3 min-w-0" style={{ paddingLeft: depth * 16 }}>
                    <span
                      className="text-slate-400 cursor-grab select-none"
                      aria-hidden="true"
                      draggable
                      onDragStart={(e) => {
                        setDraggingNavId(item.id)
                        try {
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', item.id)
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      ⋮⋮
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      {folder ? (
                        <Folder className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        renderNavIcon(currentIcon)
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {item.title || 'Untitled'}
                          </span>
                          {isWelcome && (
                            <span className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                              Auto generated
                            </span>
                          )}
                        </div>
                        {!folder && publicUrl && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Globe01 className="h-3 w-3" />
                            <span className="truncate">{publicUrl.replace(/^https?:\/\//, '')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!folder && (
                      <Button
                        variant="tertiary"
                        size="sm"
                        className="flex items-center gap-1 text-[11px] px-2"
                        onClick={() => {
                          if (!publicUrl) return
                          try {
                            void navigator.clipboard.writeText(publicUrl)
                            // eslint-disable-next-line no-console
                            console.log('Copied URL to clipboard', publicUrl)
                          } catch {
                            // ignore
                          }
                        }}
                        iconLeading={<Copy01 className="h-3 w-3" />}
                      >
                        Copy link
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleHidden(item.id)}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50 gap-1"
                    >
                      {isHidden ? (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Hidden
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" />
                          Visible
                        </>
                      )}
                    </button>
                    {!folder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                          setIconPickerForNavId(item.id)
                          setIconPickerAnchor({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX,
                            width: rect.width
                          })
                        }}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50 gap-1"
                      >
                        <InfoCircle className="h-3 w-3" />
                        Icon
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {activeId && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-900">Preview</div>
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 text-sm text-slate-700 flex items-center gap-3">
            <Globe01 className="h-4 w-4 text-slate-500" />
            <span>
              Preview for <span className="font-medium">{activeId}</span> will be shown here in a future update.
            </span>
          </div>
        </div>
      )}

      {iconPickerForNavId && iconPickerAnchor && (
        <div
          style={{
            position: 'absolute',
            top: iconPickerAnchor.top,
            left: iconPickerAnchor.left,
            width: Math.max(iconPickerAnchor.width, 260),
            zIndex: 50
          }}
          className="mt-2 rounded-lg border border-slate-200 bg-white shadow-lg p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-slate-700">Select icon</div>
            <button
              type="button"
              onClick={() => {
                setIconPickerForNavId(null)
                setIconPickerQuery('')
              }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>
          <input
            type="text"
            value={iconPickerQuery}
            onChange={(e) => setIconPickerQuery(e.target.value)}
            placeholder="Search icons..."
            className="w-full mb-2 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto pr-1">
            {limitedIconKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setNavItemIcon(iconPickerForNavId, key)
                  setIconPickerForNavId(null)
                  setIconPickerQuery('')
                }}
                className="flex items-center justify-center w-7 h-7 rounded border border-slate-200 hover:bg-slate-50"
              >
                {renderNavIcon(key)}
              </button>
            ))}
            {limitedIconKeys.length === 0 && (
              <div className="text-xs text-slate-500 col-span-8 text-center py-4">
                No icons match your search.
              </div>
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-700"
              onClick={() => {
                setNavItemIcon(iconPickerForNavId, undefined)
                setIconPickerForNavId(null)
                setIconPickerQuery('')
              }}
            >
              Remove icon
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NavigationTab

