export type NavigationItem = NavigationPageItem | NavigationFolderItem

/**
 * A navigation page item. This can represent:
 * - a CMS webpage (pageId = webpage uuid)
 * - a system page like Speakers/Attendees (pageId = "system:speakers")
 *
 * Note: keep `id === pageId` to make hide/order lists easy to persist.
 */
export interface NavigationPageItem {
  id: string
  type: 'page'
  title: string
  slug: string
  pageId: string
  /** The actual webpage UUID to be sent in the save navigation API payload */
  webpageUuid?: string
  /**
   * Optional icon identifier to render alongside the label in navbars.
   * The actual icon rendering is handled by a shared icon registry in code.
   */
  iconKey?: string
}

/**
 * A navigation folder item (not a page).
 * It has no route; it only exists to group items in the navbar.
 */
export interface NavigationFolderItem {
  id: string
  type: 'folder'
  title: string
  children: NavigationItem[]
  /** Original item_type from the API (e.g. 'folder', 'speaker_group', 'attendee_group', 'schedule_group') */
  originalItemType?: string
}

export interface NavigationConfigV1 {
  version: 1
  items: NavigationItem[]
}

export type PublicNavNode = PublicNavPageNode | PublicNavFolderNode

export interface PublicNavPageNode {
  type: 'page'
  id: string
  label: string
  path: string
  iconKey?: string
}

export interface PublicNavFolderNode {
  type: 'folder'
  id: string
  label: string
  children: PublicNavNode[]
}

