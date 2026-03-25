import type {
  NavigationConfigV1,
  NavigationFolderItem,
  NavigationItem,
  NavigationPageItem,
  PublicNavNode,
} from '../types/navigation'

export const NAVIGATION_CONFIG_VERSION = 1 as const

/** System page ids and labels used for nav index (organizations, speakers, attendees, schedule). */
export const SYSTEM_PAGE_CONFIG = [
  { id: 'system:organizations', label: 'Organizations' },
  { id: 'system:speakers', label: 'Speakers' },
  { id: 'system:attendees', label: 'Attendees' },
  { id: 'system:schedule', label: 'Schedule' },
] as const

export const SYSTEM_PAGE_IDS = SYSTEM_PAGE_CONFIG.map((p) => p.id)

export function isFolder(item: NavigationItem): item is NavigationFolderItem {
  return item.type === 'folder'
}

export function isPage(item: NavigationItem): item is NavigationPageItem {
  return item.type === 'page'
}

export function collectPageIds(items: NavigationItem[]): string[] {
  const out: string[] = []
  const walk = (list: NavigationItem[]) => {
    for (const it of list) {
      if (isPage(it)) out.push(it.pageId)
      else walk(it.children || [])
    }
  }
  walk(items)
  return out
}

export function collectFolders(items: NavigationItem[]): Array<{ id: string; title: string }> {
  const out: Array<{ id: string; title: string }> = []
  const walk = (list: NavigationItem[]) => {
    for (const it of list) {
      if (isFolder(it)) {
        out.push({ id: it.id, title: it.title })
        walk(it.children || [])
      }
    }
  }
  walk(items)
  return out
}

export function upsertMissingPagesToRoot(
  items: NavigationItem[],
  pages: NavigationPageItem[]
): NavigationItem[] {
  const existing = new Set(collectPageIds(items))
  const missing = pages.filter((p) => !existing.has(p.pageId))
  if (missing.length === 0) return items
  return [...items, ...missing]
}

export function pruneHidden(items: NavigationItem[], hiddenIds: Set<string>): NavigationItem[] {
  const walk = (list: NavigationItem[]): NavigationItem[] => {
    const out: NavigationItem[] = []
    for (const it of list) {
      if (hiddenIds.has(it.id)) continue
      if (isFolder(it)) {
        const children = walk(it.children || [])
        if (children.length === 0) continue
        out.push({ ...it, children })
      } else {
        out.push(it)
      }
    }
    return out
  }
  return walk(items)
}

export function loadNavigationConfigFromStorage(key: string): NavigationConfigV1 | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) return null
    return parsed as NavigationConfigV1
  } catch {
    return null
  }
}

export function saveNavigationConfigToStorage(key: string, items: NavigationItem[]) {
  const payload: NavigationConfigV1 = { version: NAVIGATION_CONFIG_VERSION, items }
  localStorage.setItem(key, JSON.stringify(payload))
}

export function mapToPublicNav(
  items: NavigationItem[],
  pagePathById: Map<string, { label: string; path: string }>
): PublicNavNode[] {
  const walk = (list: NavigationItem[]): PublicNavNode[] => {
    const out: PublicNavNode[] = []
    for (const it of list) {
      if (isFolder(it)) {
        const children = walk(it.children || [])
        if (children.length === 0) continue
        out.push({ type: 'folder', id: it.id, label: it.title, children, iconKey: it.iconKey })
        continue
      }

      const mapped = pagePathById.get(it.pageId)
      if (!mapped) continue
      out.push({
        type: 'page',
        id: it.pageId,
        label: mapped.label,
        path: mapped.path,
        iconKey: it.iconKey
      })
    }
    return out
  }
  return walk(items)
}

