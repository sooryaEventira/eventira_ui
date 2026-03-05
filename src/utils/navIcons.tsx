import React from 'react'
import * as IconsaxIcons from 'iconsax-react'
import { ICONSAX_ICON_NAMES } from './iconsaxIconNames'

type AnyIconComponent = React.ComponentType<{ className?: string; size?: number | string; [key: string]: any }>

// Use explicit list — ESM namespace from iconsax-react is not enumerable (Object.keys is empty).
export const NAV_ICON_KEYS: string[] = [...ICONSAX_ICON_NAMES].sort((a, b) => a.localeCompare(b))

const DEFAULT_ICON_KEY = NAV_ICON_KEYS.includes('Document')
  ? 'Document'
  : NAV_ICON_KEYS.includes('Folder')
    ? 'Folder'
    : NAV_ICON_KEYS[0] ?? null

export function renderNavIcon(iconKey?: string, className: string = 'h-4 w-4') {
  // Map old stored key 'file' to a reasonable default, but do NOT show any
  // placeholder when there is no iconKey at all.
  const key = iconKey === 'file' || iconKey === '' ? DEFAULT_ICON_KEY : iconKey
  if (!key) return null
  const Icon = (IconsaxIcons as any)[key] as AnyIconComponent | undefined
  if (!Icon) {
    const Fallback = DEFAULT_ICON_KEY ? (IconsaxIcons as any)[DEFAULT_ICON_KEY] as AnyIconComponent : undefined
    return Fallback ? <Fallback className={className} size={16} aria-hidden="true" /> : null
  }
  return <Icon className={className} size={16} aria-hidden="true" />
}
