export const formatDateRange = (startISO: string, endISO: string) => {
  const start = new Date(startISO)
  const end = new Date(endISO)
  const df = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—'
  return `${df.format(start)} – ${df.format(end)}`
}

export const splitName = (full: string) => {
  const parts = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}
