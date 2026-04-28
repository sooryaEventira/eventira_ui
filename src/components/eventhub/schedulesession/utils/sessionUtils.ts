/** Utility functions for session date/time parsing and formatting */

/**
 * Parse Excel date value to ISO date string (YYYY-MM-DD)
 */
export const parseExcelDateKey = (value: any, xlsxLib?: typeof import('xlsx')): string | null => {
  if (value === null || value === undefined) return null
  // Date object
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  // Excel date number - requires xlsx library
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (!xlsxLib) {
      // If xlsx not loaded, try to parse as regular date (might not work for Excel dates)
      return null
    }
    try {
      const d = xlsxLib.SSF.parse_date_code(value)
      if (!d || !d.y || !d.m || !d.d) return null
      const mm = String(d.m).padStart(2, '0')
      const dd = String(d.d).padStart(2, '0')
      return `${d.y}-${mm}-${dd}`
    } catch {
      return null
    }
  }
  const raw = String(value).trim()
  if (!raw) return null
  // Try parseable string date
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

/**
 * Parse Excel time value to minutes since midnight
 */
export const parseExcelTimeToMinutes = (value: any): number | null => {
  if (value === null || value === undefined) return null
  // Excel time number (fraction of day) or full datetime number
  if (typeof value === 'number' && Number.isFinite(value)) {
    // If it's a fraction-of-day time, keep fractional part
    const fractional = value % 1
    const minutes = Math.round(fractional * 24 * 60)
    return minutes >= 0 && minutes < 24 * 60 ? minutes : null
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getHours() * 60 + value.getMinutes()
  }
  const raw = String(value).trim()
  if (!raw) return null
  // "09:00" or "9:00" or "09:00 AM"
  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (ampm) {
    let h = Number(ampm[1])
    const m = Number(ampm[2])
    const p = ampm[3].toUpperCase()
    if (p === 'PM' && h !== 12) h += 12
    if (p === 'AM' && h === 12) h = 0
    return h * 60 + m
  }
  const h24 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (h24) {
    const h = Number(h24[1])
    const m = Number(h24[2])
    return h * 60 + m
  }
  return null
}

/**
 * Convert minutes since midnight to time string and AM/PM period
 */
export const minutesToTimePeriod = (minutes: number): { time: string; period: 'AM' | 'PM' } => {
  const m = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60)
  const hours24 = Math.floor(m / 60)
  const mins = String(m % 60).padStart(2, '0')
  const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
  let hours12 = hours24 % 12
  if (hours12 === 0) hours12 = 12
  const hh = String(hours12).padStart(2, '0')
  return { time: `${hh}:${mins}`, period }
}

/**
 * Build a unique signature for a session based on its key properties
 */
export const buildSessionSignature = (input: {
  dateKey: string
  title: string
  location: string
  startTime: string
  startPeriod: 'AM' | 'PM'
  endTime: string
  endPeriod: 'AM' | 'PM'
}): string => {
  return [
    input.dateKey,
    input.title.trim(),
    input.location.trim(),
    `${input.startTime} ${input.startPeriod}`,
    `${input.endTime} ${input.endPeriod}`
  ].join('||')
}

/**
 * Convert date + time string + AM/PM to ISO string while preserving
 * the entered wall-clock time (no local timezone shift).
 */
export const toUTCISO = (date: Date, time: string, period: 'AM' | 'PM'): string => {
  const [h, m] = time.split(':').map(Number)
  let hours = h
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  const y = date.getFullYear()
  const mo = date.getMonth()
  const d = date.getDate()
  return new Date(Date.UTC(y, mo, d, hours, m || 0, 0, 0)).toISOString()
}

/**
 * Convert date + 24-hour time string to ISO string while preserving
 * the entered wall-clock time (no local timezone shift).
 */
export const toUTCISOFrom24h = (date: Date, time24: string): string => {
  const [h, m] = time24.split(':').map(Number)
  const y = date.getFullYear()
  const mo = date.getMonth()
  const d = date.getDate()
  return new Date(Date.UTC(y, mo, d, h || 0, m || 0, 0, 0)).toISOString()
}

/**
 * Parse event date from various formats
 */
export const parseEventDate = (raw: unknown): Date | null => {
  if (!raw) return null
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw
  const str = String(raw).trim()
  if (!str) return null
  const d = new Date(str)
  return !Number.isNaN(d.getTime()) ? d : null
}
