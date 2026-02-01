import React from 'react'
import * as UntitledIcons from '@untitled-ui/icons-react'

type AnyIconComponent = React.ComponentType<{ className?: string; [key: string]: any }>

// Expose a large list of available icon component names from @untitled-ui/icons-react.
// NOTE: This intentionally enables "many icons" selection, at the cost of bundling more icons.
export const NAV_ICON_KEYS: string[] = Object.keys(UntitledIcons)
  .filter((key) => {
    if (!key) return false
    // filter out non-component exports (if any)
    const value = (UntitledIcons as any)[key]
    return typeof value === 'function'
  })
  .sort((a, b) => a.localeCompare(b))

export function renderNavIcon(iconKey?: string, className: string = 'h-4 w-4') {
  if (!iconKey) return null
  const Icon = (UntitledIcons as any)[iconKey] as AnyIconComponent | undefined
  if (!Icon) return null
  return <Icon className={className} aria-hidden="true" />
}

