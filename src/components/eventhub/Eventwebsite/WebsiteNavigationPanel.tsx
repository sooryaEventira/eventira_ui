import React from 'react'
import { ChevronDown, ChevronUp, Folder, Trash01 } from '@untitled-ui/icons-react'
import type { NavigationItem } from '../../../types/navigation'
import { isFolder, isPage } from '../../../utils/navigationTree'
import { NAV_ICON_KEYS, renderNavIcon, ICONSAX_VARIANTS, buildIconKey, parseIconKey } from '../../../utils/navIcons'
import { saveNavigation, updateNavigationItemIcon } from '../../../services/navigationService'
import { showToast } from '../../../utils/toast'
import Button from '../../ui/untitled/Button'

export interface WebsiteNavigationPanelProps {
  eventUuid: string
  navigationItems: NavigationItem[]
  onNavigationChange: React.Dispatch<React.SetStateAction<NavigationItem[]>>
  onNavSaved: (json: string) => void
  expandedFolderIds: Set<string>
  onExpandedFolderIdsChange: React.Dispatch<React.SetStateAction<Set<string>>>
  hiddenNavIds: Set<string>
  isLoadingNavigation: boolean
  isLoadingIndexWebpages: boolean
  draggingNavId: string | null
  setDraggingNavId: (id: string | null) => void
  dragOverNavId: string | null
  setDragOverNavId: (id: string | null) => void
  dragHalf: 'top' | 'bottom' | null
  setDragHalf: (half: 'top' | 'bottom' | null) => void
  iconPickerForNavId: string | null
  setIconPickerForNavId: (id: string | null) => void
  iconPickerQuery: string
  setIconPickerQuery: (q: string) => void
  iconPickerVariant: string
  setIconPickerVariant: (v: string) => void
  iconPickerAnchor: { top: number; left: number; width: number; maxHeight: number } | null
  setIconPickerAnchor: (anchor: { top: number; left: number; width: number; maxHeight: number } | null) => void
  iconPopoverRef: React.RefObject<HTMLDivElement | null>
  closeIconPicker: () => void
  moveNavigationTreeItem: (dragId: string, targetId: string, insertAfter?: boolean) => void
  removeNavItemLocally: (id: string) => void
  onDeleteFolder: (folder: { id: string; name: string }) => void
  reloadNavigation: () => Promise<void>
}

const WebsiteNavigationPanel: React.FC<WebsiteNavigationPanelProps> = ({
  eventUuid,
  navigationItems,
  onNavigationChange,
  onNavSaved,
  expandedFolderIds,
  onExpandedFolderIdsChange,
  hiddenNavIds,
  isLoadingNavigation,
  isLoadingIndexWebpages,
  draggingNavId,
  setDraggingNavId,
  dragOverNavId,
  setDragOverNavId,
  dragHalf,
  setDragHalf,
  iconPickerForNavId,
  setIconPickerForNavId,
  iconPickerQuery,
  setIconPickerQuery,
  iconPickerVariant,
  setIconPickerVariant,
  iconPickerAnchor,
  setIconPickerAnchor,
  iconPopoverRef,
  closeIconPicker,
  moveNavigationTreeItem,
  removeNavItemLocally,
  onDeleteFolder,
  reloadNavigation,
}) => {
  
    // eventUuid from props
    const flatten = (
      list: NavigationItem[],
      depth = 0,
      parentId: string | null = null,
      parentIsGroup = false
    ): Array<{ item: NavigationItem; depth: number; parentId: string | null; parentIsGroup: boolean }> => {
      const out: Array<{ item: NavigationItem; depth: number; parentId: string | null; parentIsGroup: boolean }> = []
      for (const it of list) {
        out.push({ item: it, depth, parentId, parentIsGroup })

        if (isFolder(it) && Array.isArray(it.children) && it.children.length && expandedFolderIds.has(it.id)) {
          // Prevent folder appearing as its own child (e.g. group name === item name causing duplicate render).
          // Deduplicate by id so the same node is never shown twice when expand/collapse or API returns duplicates.
          const seenChildIds = new Set<string>()
          const seenChildKeys = new Set<string>()
          const dedupedChildren = (it.children || []).filter((child) => {
            if (child.id === it.id) return false
            if (seenChildIds.has(child.id)) return false
            seenChildIds.add(child.id)
            let key: string | undefined
            if (isFolder(child)) {
              key = `folder:${child.id}`
            } else {
              const pageId = (child as any).pageId as string | undefined
              const slug = (child as any).slug as string | undefined
              const title = child.title
              key = `page:${pageId || slug || title}`
            }
            if (!key || seenChildKeys.has(key)) return false
            seenChildKeys.add(key)
            return true
          })

          const isGroupFolder = String((it as any).originalItemType ?? 'folder').endsWith('_group')
          out.push(...flatten(dedupedChildren, depth + 1, it.id, isGroupFolder))
        }
      }
      return out
    }

    const items = navigationItems
    const flat = flatten(items)


    const setNavItemIcon = async (targetId: string, iconKey?: string) => {
      if (!eventUuid) return
      const walk = (list: NavigationItem[]): NavigationItem[] =>
        list.map((it) => {
          if (it.id === targetId) return { ...it, iconKey: iconKey || undefined } as any
          if (isFolder(it)) return { ...it, children: walk(it.children || []) }
          return it
        })
      const prev = items
      const next = walk(prev)
      onNavigationChange(next)

      // Detect if the target item is a child of a group folder (speaker_group, etc.)
      const findItemAndParent = (list: NavigationItem[], parent: NavigationItem | null = null): { item: NavigationItem; parent: NavigationItem | null } | null => {
        for (const it of list) {
          if (it.id === targetId) return { item: it, parent }
          if (isFolder(it)) {
            const found = findItemAndParent(it.children || [], it)
            if (found) return found
          }
        }
        return null
      }
      const found = findItemAndParent(items)
      const parentItem = found?.parent
      const isGroupChild = !!(
        parentItem &&
        isFolder(parentItem) &&
        String((parentItem as any).originalItemType ?? 'folder').endsWith('_group')
      )

      try {
        if (isGroupChild && parentItem) {
          // API: URL = parent group's nav UUID, body child_uuid = child's own UUID
          await updateNavigationItemIcon(eventUuid, parentItem.id, iconKey ?? null, targetId)
        }
        await saveNavigation(eventUuid, next)
        onNavSaved(JSON.stringify(next))
        await reloadNavigation()
      } catch (e: any) {
        onNavigationChange(prev)
        showToast.error(e?.message ?? 'Failed to update icon')
      }
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

    const toggleFolderExpanded = (folderId: string) => {
      onExpandedFolderIdsChange((prev) => {
        const next = new Set(prev)
        if (next.has(folderId)) next.delete(folderId)
        else next.add(folderId)
        return next
      })
    }

    const moveNavPageIntoFolder = (dragId: string, folderId: string) => {
      if (!eventUuid) return
      if (!dragId || !folderId || dragId === folderId) return

      const draggedItem = findNavItemById(items, dragId)
      if (!draggedItem || !isPage(draggedItem)) return

      const { item: removed, next: removedTree } = removeNavItemById(items, dragId)
      if (!removed) return

      const insertedRes = insertNavItemIntoFolder(removedTree, folderId, removed)
      if (!insertedRes.inserted) return

      onNavigationChange(insertedRes.next)
      onExpandedFolderIdsChange((prev) => {
        const next = new Set(prev)
        next.add(folderId)
        return next
      })
    }

    const filteredIconKeys = (() => {
      const q = iconPickerQuery.trim().toLowerCase()
      if (!q) return NAV_ICON_KEYS
      return NAV_ICON_KEYS.filter((k) => k.toLowerCase().includes(q))
    })()

    const hasQuery = iconPickerQuery.trim().length > 0
    const limitedIconKeys = hasQuery ? filteredIconKeys : filteredIconKeys.slice(0, 200)

    return (
      <div className="flex flex-col gap-6 min-h-[520px]">
        {/* List of menu items (webpages) that will appear in published navbar */}
        <div className="space-y-2 flex-1">
          <div className="text-sm font-semibold text-slate-900">Menu items</div>
          <div className="text-sm text-slate-600">
            These are the pages that will appear in the published website navbar.
          </div>

          <div className="space-y-0 border border-slate-200 rounded-lg bg-white">
            {isLoadingNavigation || isLoadingIndexWebpages ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <p>Loading navigation...</p>
              </div>
            ) : flat.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <p>No menu items yet. Create pages or folders to see them here.</p>
              </div>
            ) : (
              flat.map(({ item, depth }, flatIndex) => {
                const folder = isFolder(item)
                const page = isPage(item)
                const isGroupFolder = folder && String((item as any).originalItemType ?? 'folder').endsWith('_group')
                const isSystemPage = page && String(item.pageId).startsWith('system:')
                const isWebpage = page && !isSystemPage
                const isWelcome = isWebpage && String(item.title || '').toLowerCase() === 'welcome'
                const isHidden = hiddenNavIds.has(item.id)
                const currentIcon = (item as any).iconKey as string | undefined
                return (
                  <div
                    key={`nav-${flatIndex}-${item.id}`}
                    onClick={() => {
                      if (folder) {
                        toggleFolderExpanded(item.id)
                      }
                    }}
                    onDragOver={(e) => {
                      if (depth !== 0 && !folder) return
                      const isGroupFolder = folder && String((item as any).originalItemType ?? 'folder').endsWith('_group')
                      if (folder && !isGroupFolder && depth !== 0) return
                      e.preventDefault()
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      const half = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom'
                      if (dragOverNavId !== item.id) setDragOverNavId(item.id)
                      if (dragHalf !== half) setDragHalf(half)
                    }}
                    onDragLeave={() => {
                      if (dragOverNavId === item.id) setDragOverNavId(null)
                      setDragHalf(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const isGroupFolder = folder && String((item as any).originalItemType ?? 'folder').endsWith('_group')
                      if (depth !== 0 && !folder) { setDraggingNavId(null); setDragOverNavId(null); setDragHalf(null); return }
                      if (folder && !isGroupFolder && depth !== 0) { setDraggingNavId(null); setDragOverNavId(null); setDragHalf(null); return }
                      if (draggingNavId) {
                        const draggedItem = findNavItemById(items, draggingNavId)
                        const isFolder_ = draggedItem && isFolder(draggedItem)
                        const half = dragHalf
                        if (half === 'top' || isGroupFolder || !folder || isFolder_) {
                          // Insert before (top half of any item, or group folder, or dragging a folder)
                          moveNavigationTreeItem(draggingNavId, item.id, false)
                        } else if (folder && !isGroupFolder && half === 'bottom') {
                          // Insert into user-created folder (bottom half)
                          moveNavPageIntoFolder(draggingNavId, item.id)
                        }
                      }
                      setDraggingNavId(null)
                      setDragOverNavId(null)
                      setDragHalf(null)
                    }}
                    className={[
                      'flex items-center justify-between gap-3 py-2 px-4 border-b border-slate-200 last:border-b-0 transition-colors cursor-pointer',
                      dragOverNavId === item.id && dragHalf === 'top'
                        ? 'border-t-2 border-t-violet-500 bg-slate-50'
                        : dragOverNavId === item.id && dragHalf === 'bottom' && folder && !String((item as any).originalItemType ?? 'folder').endsWith('_group')
                          ? 'bg-violet-50'
                          : dragOverNavId === item.id
                            ? 'border-b-2 border-b-violet-500 bg-slate-50'
                            : 'hover:bg-slate-50'
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3 min-w-0" style={{ paddingLeft: depth * 16 }}>
                      <span
                        className="text-slate-400 cursor-grab select-none p-1"
                        aria-hidden="true"
                        draggable
                        onClick={(e) => e.stopPropagation()}
                        onDragStart={(e) => {
                          setDraggingNavId(item.id)
                          try {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', item.id)
                          } catch {
                            // ignore
                          }
                        }}
                        onDragEnd={() => {
                          setDraggingNavId(null)
                          setDragOverNavId(null)
                        }}
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
                        </svg>
                      </span>
                      {folder ? (
                        <span className={`shrink-0 ${isHidden ? 'text-slate-300' : 'text-slate-500'}`} aria-hidden="true">
                          {currentIcon
                            ? renderNavIcon(currentIcon, 'h-4 w-4')
                            : <Folder className="h-4 w-4" />}
                        </span>
                      ) : page ? (
                        <span className={`shrink-0 ${isHidden ? 'text-slate-300' : 'text-slate-500'}`} aria-hidden="true">
                          {renderNavIcon(currentIcon, 'h-4 w-4')}
                        </span>
                      ) : null}
                      <span className={`text-sm font-medium capitalize truncate ${isHidden ? 'text-slate-400' : 'text-slate-900'}`}>
                        {item.title}
                      </span>
                      {folder && !isGroupFolder ? (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">
                          <Folder className="h-3 w-3" />
                          folder
                        </span>
                      ) : null}
                      {folder && (item.children || []).length > 0 ? (
                        <button
                          type="button"
                          className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFolderExpanded(item.id)
                          }}
                          aria-label={expandedFolderIds.has(item.id) ? 'Collapse folder' : 'Expand folder'}
                        >
                          {expandedFolderIds.has(item.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      {(page || folder) ? (
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            const popoverWidth = 380
                            const margin = 12
                            const left = Math.min(
                              Math.max(rect.left, margin),
                              window.innerWidth - popoverWidth - margin
                            )
                            const spaceBelow = window.innerHeight - rect.bottom - margin
                            const spaceAbove = rect.top - margin
                            const useBelow = spaceBelow >= spaceAbove || spaceBelow >= 280
                            const availableHeight = useBelow ? spaceBelow : spaceAbove
                            const maxHeight = Math.min(480, Math.max(availableHeight - 8, 280))
                            const top = useBelow
                              ? rect.bottom + 8
                              : rect.top - 8 - maxHeight
                            setIconPickerAnchor({ top, left, width: popoverWidth, maxHeight })
                            setIconPickerForNavId(item.id)
                            setIconPickerQuery('')
                            setIconPickerVariant(currentIcon ? parseIconKey(currentIcon).variant : 'Linear')
                          }}
                          className="px-2"
                        >
                          {currentIcon ? 'Update icon' : 'Add icon'}
                        </Button>
                      ) : null}

                      {isWebpage ? (
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={() => removeNavItemLocally(item.id)}
                          className={`p-2 hover:text-red-600 ${
                            isWelcome ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-400'
                          }`}
                          aria-label="Delete"
                          disabled={isWelcome}
                          iconLeading={<Trash01 className="h-4 w-4" />}
                        />
                      ) : null}
                      {folder ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteFolder({ id: item.id, name: item.title || 'Untitled' })
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 rounded transition-colors"
                          aria-label="Delete folder"
                        >
                          <Trash01 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {iconPickerForNavId && iconPickerAnchor ? (
          <div
            className="fixed inset-0 z-[10000]"
            aria-hidden="true"
          >
            <div
              ref={iconPopoverRef as any}
              className="fixed rounded-xl border border-slate-200 bg-white p-3 shadow-xl flex flex-col"
              style={{
                top: iconPickerAnchor.top,
                left: iconPickerAnchor.left,
                width: iconPickerAnchor.width,
                maxHeight: iconPickerAnchor.maxHeight,
                overflow: 'hidden'
              }}
              role="dialog"
              aria-label="Choose an icon"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">Choose an icon</div>
                <button
                  type="button"
                  onClick={closeIconPicker}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>

              <div className="mt-2">
                <input
                  value={iconPickerQuery}
                  onChange={(e) => setIconPickerQuery(e.target.value)}
                  placeholder="Search iconsâ€¦"
                  className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>

              {/* Variant tabs */}
              <div className="mt-2 flex flex-wrap gap-1">
                {ICONSAX_VARIANTS.filter((v) => v === 'Outline' || v === 'Bold').map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setIconPickerVariant(v)}
                    className={[
                      'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                      iconPickerVariant === v
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    ].join(' ')}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {hasQuery
                    ? `${limitedIconKeys.length} results`
                    : `Showing ${limitedIconKeys.length} of ${NAV_ICON_KEYS.length} â€” search to filter`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNavItemIcon(iconPickerForNavId, undefined)
                    closeIconPicker()
                  }}
                  className="rounded-md px-2 py-1 font-semibold text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  Remove
                </button>
              </div>

              <div className="mt-2 overflow-auto pr-1 flex-1 min-h-0">
                <div className="grid grid-cols-4 gap-2">
                  {limitedIconKeys.map((key) => {
                    const compositeKey = buildIconKey(key, iconPickerVariant)
                    const found = flat.find((x) => x.item.id === iconPickerForNavId)
                    const isSelected = (found?.item as any)?.iconKey === compositeKey
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setNavItemIcon(iconPickerForNavId, compositeKey)
                          closeIconPicker()
                        }}
                        className={[
                          'flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors',
                          isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'
                        ].join(' ')}
                        title={`${key} (${iconPickerVariant})`}
                      >
                        <span className="text-slate-700">{renderNavIcon(compositeKey, 'h-5 w-5')}</span>
                        <span className="w-full truncate text-[10px] text-slate-600">{key}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Demo navbar preview: show folders with their children nested under the folder */}
        {/* <div className="space-y-2 mt-auto">
          <div className="text-sm font-semibold text-slate-900">Preview</div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 overflow-x-auto">
              {visibleTree.length === 0 ? (
                <span className="text-sm text-slate-500">No menu items to preview.</span>
              ) : (
                visibleTree.map((item) => {
                  if (isFolder(item)) {
                    const children = item.children || []
                    return (
                      <div key={item.uuid} className="inline-flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-slate-500  tracking-wide">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {children.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">(empty)</span>
                          ) : (
                            children.map((child) => {
                              const isActive = child.id === activeId
                              const iconKey = isPage(child) ? (child as any).iconKey : undefined
                              return (
                                <button
                                  key={child.id}
                                  type="button"
                                  onClick={() => setNavigationPreviewActive(child.id)}
                                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    isActive
                                      ? 'bg-violet-100 text-violet-700'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    {renderNavIcon(iconKey, 'h-3.5 w-3.5')}
                                    <span>{child.title}</span>
                                  </span>
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  }
                  const isActive = item.uuid === activeId
                  const iconKey = isPage(item) ? (item as any).iconKey : undefined
                  return (
                    <button
                      key={item.uuid}
                      type="button"
                      onClick={() => setNavigationPreviewActive(item.uuid)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {renderNavIcon(iconKey, 'h-4 w-4')}
                        <span>{item.title}</span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div> */}
      </div>
    )
}

export default WebsiteNavigationPanel

