import React from 'react'
import * as IconsaxIcons from 'iconsax-react'
import { ICONSAX_ICON_NAMES, ICONSAX_VARIANTS } from './iconsaxIconNames'

export { ICONSAX_VARIANTS }

type AnyIconComponent = React.ComponentType<{ className?: string; size?: number | string; variant?: string; [key: string]: any }>

// Use explicit list — ESM namespace from iconsax-react is not enumerable (Object.keys is empty).
export const NAV_ICON_KEYS: string[] = [...ICONSAX_ICON_NAMES].sort((a, b) => a.localeCompare(b))

const DEFAULT_ICON_KEY = NAV_ICON_KEYS.includes('Document')
  ? 'Document'
  : NAV_ICON_KEYS.includes('Folder')
    ? 'Folder'
    : NAV_ICON_KEYS[0] ?? null

/** Parse "Name:Variant" or plain "Name" iconKey. Returns { name, variant }. */
export function parseIconKey(iconKey: string): { name: string; variant: string } {
  const colon = iconKey.indexOf(':')
  if (colon === -1) return { name: iconKey, variant: 'Linear' }
  return { name: iconKey.slice(0, colon), variant: iconKey.slice(colon + 1) }
}

/** Build a "Name:Variant" key. Omits variant suffix when it's the default Linear. */
export function buildIconKey(name: string, variant: string): string {
  return variant && variant !== 'Linear' ? `${name}:${variant}` : name
}

export function renderNavIcon(iconKey?: string, className: string = 'h-4 w-4') {
  // Map old stored key 'file' to a reasonable default, but do NOT show any
  // placeholder when there is no iconKey at all.
  const raw = iconKey === 'file' || iconKey === '' ? DEFAULT_ICON_KEY : iconKey
  if (!raw) return null
  const { name, variant } = parseIconKey(raw)
  const Icon = (IconsaxIcons as any)[name] as AnyIconComponent | undefined
  if (!Icon) {
    const Fallback = DEFAULT_ICON_KEY ? (IconsaxIcons as any)[DEFAULT_ICON_KEY] as AnyIconComponent : undefined
    return Fallback ? <Fallback className={className} size={16} aria-hidden="true" /> : null
  }
  return <Icon className={className} size={16} variant={variant} aria-hidden="true" />
}
