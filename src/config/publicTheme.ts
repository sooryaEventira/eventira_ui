// Default published-site brand color.
// Matches the app primary used across the admin UI.
export const PUBLIC_PRIMARY_HEX_DEFAULT = '#6938EF'

const isHexColor = (value: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test((value || '').trim())

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const v = (hex || '').trim()
  if (!isHexColor(v)) return null
  const normalized =
    v.length === 4
      ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
      : v
  const n = parseInt(normalized.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

// Simple mix toward black to derive a "dark" variant from a single primary hex.
const darkenHex = (hex: string, amount: number) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const a = Math.min(1, Math.max(0, amount))
  const r = Math.round(rgb.r * (1 - a))
  const g = Math.round(rgb.g * (1 - a))
  const b = Math.round(rgb.b * (1 - a))
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

const toRgbTriplet = (hex: string): string | null => {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return `${rgb.r} ${rgb.g} ${rgb.b}`
}

export const buildPublicThemeVars = (primaryHex?: string) => {
  const primary = isHexColor(primaryHex || '') ? (primaryHex as string).trim() : PUBLIC_PRIMARY_HEX_DEFAULT
  const dark = darkenHex(primary, 0.42) || '#000000'

  const primaryTriplet = toRgbTriplet(primary) || '0 0 0'
  const darkTriplet = toRgbTriplet(dark) || '0 0 0'

  return {
    // Tailwind uses these via tailwind.config.js colors.primary
    ['--color-primary' as any]: primaryTriplet,
    ['--color-primary-dark' as any]: darkTriplet,
  } as Record<string, string>
}

