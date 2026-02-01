export type GroupDirectoryPageEntry = {
  groupId: string
  groupName: string
  webpageUuid: string
  createdAt: string
}

export type GroupDirectoryPagesMap = Record<string, GroupDirectoryPageEntry>

const storageKey = (eventUuid: string) => `group-directory-pages-${eventUuid}`

export function loadGroupDirectoryPages(eventUuid: string): GroupDirectoryPagesMap {
  if (!eventUuid) return {}
  try {
    const raw = localStorage.getItem(storageKey(eventUuid))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as GroupDirectoryPagesMap
  } catch {
    return {}
  }
}

export function saveGroupDirectoryPages(eventUuid: string, map: GroupDirectoryPagesMap) {
  if (!eventUuid) return
  localStorage.setItem(storageKey(eventUuid), JSON.stringify(map || {}))
}

export function getGroupDirectoryPage(eventUuid: string, groupId: string): GroupDirectoryPageEntry | null {
  if (!eventUuid || !groupId) return null
  const map = loadGroupDirectoryPages(eventUuid)
  return map[groupId] || null
}

export function setGroupDirectoryPage(eventUuid: string, entry: GroupDirectoryPageEntry) {
  if (!eventUuid || !entry?.groupId) return
  const map = loadGroupDirectoryPages(eventUuid)
  map[entry.groupId] = entry
  saveGroupDirectoryPages(eventUuid, map)
}

export function removeGroupDirectoryPage(eventUuid: string, groupId: string) {
  if (!eventUuid || !groupId) return
  const map = loadGroupDirectoryPages(eventUuid)
  if (!map[groupId]) return
  delete map[groupId]
  saveGroupDirectoryPages(eventUuid, map)
}

export function listBuiltGroupIds(eventUuid: string): Set<string> {
  const map = loadGroupDirectoryPages(eventUuid)
  return new Set(Object.keys(map))
}

