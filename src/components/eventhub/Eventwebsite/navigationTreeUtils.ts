import type { NavigationItem } from '../../../types/navigation'
import { isFolder } from '../../../utils/navigationTree'

export function removeNavItemById(
  list: NavigationItem[],
  id: string
): { item: NavigationItem | null; next: NavigationItem[] } {
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
