/**
 * Parse Excel file and store session parent map in localStorage for import matching.
 * Uses dynamic xlsx import. Requires columns: title, date, start time, end time (location, parent session optional).
 */
import {
  parseExcelDateKey,
  parseExcelTimeToMinutes,
  minutesToTimePeriod,
  buildSessionSignature
} from './sessionUtils'

export type ExcelSessionMapEntry = {
  signature: string
  title: string
  dateKey: string
  location: string
  startTime: string
  startPeriod: 'AM' | 'PM'
  endTime: string
  endPeriod: 'AM' | 'PM'
  sessionType: 'parent' | 'child'
  parentTitle: string | null
}

const STORAGE_KEY_PREFIX = 'session-import-map'

/**
 * Parse the first sheet of an Excel file and store entries in localStorage
 * under key `session-import-map:${eventUuid}:${scheduleUuid}`.
 */
export async function storeExcelParentMap(
  file: File,
  eventUuid: string,
  scheduleUuid: string
): Promise<void> {
  try {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheetName = wb.SheetNames?.[0]
    if (!sheetName) return
    const ws = wb.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][]
    if (!rows || rows.length < 2) return

    const header = (rows[0] || []).map((h) => String(h ?? '').trim().toLowerCase())
    const idx = (name: string) => header.findIndex((h) => h === name)
    const titleIdx = idx('title')
    const parentIdx = idx('parent session')
    const dateIdx = idx('date')
    const startIdx = idx('start time')
    const endIdx = idx('end time')
    const locationIdx = idx('location')

    if (titleIdx === -1 || dateIdx === -1 || startIdx === -1 || endIdx === -1) {
      console.log('⚠️ [Sessions] Excel parse: required columns not found', { header })
      return
    }

    const entries: ExcelSessionMapEntry[] = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || []
      const title = String(row[titleIdx] ?? '').trim()
      if (!title) continue
      const dateKey = parseExcelDateKey(row[dateIdx], XLSX)
      if (!dateKey) continue
      const startMin = parseExcelTimeToMinutes(row[startIdx])
      const endMinRaw = parseExcelTimeToMinutes(row[endIdx])
      if (startMin === null || endMinRaw === null) continue

      const endMin = endMinRaw < startMin ? endMinRaw + 24 * 60 : endMinRaw
      const start = minutesToTimePeriod(startMin)
      const end = minutesToTimePeriod(endMin)
      const location = locationIdx !== -1 ? String(row[locationIdx] ?? '').trim() : ''
      const parentTitle =
        parentIdx !== -1 && String(row[parentIdx] ?? '').trim()
          ? String(row[parentIdx]).trim()
          : null
      const sessionType: 'parent' | 'child' = parentTitle ? 'child' : 'parent'

      const signature = buildSessionSignature({
        dateKey,
        title,
        location,
        startTime: start.time,
        startPeriod: start.period,
        endTime: end.time,
        endPeriod: end.period
      })

      entries.push({
        signature,
        title,
        dateKey,
        location,
        startTime: start.time,
        startPeriod: start.period,
        endTime: end.time,
        endPeriod: end.period,
        sessionType,
        parentTitle
      })
    }

    const key = `${STORAGE_KEY_PREFIX}:${eventUuid}:${scheduleUuid}`
    localStorage.setItem(key, JSON.stringify({ version: 1, entries, savedAt: Date.now() }))
    console.log('💾 [Sessions] Stored Excel parent map:', { key, count: entries.length })
  } catch (e) {
    console.log('⚠️ [Sessions] Failed to parse/store Excel map:', e)
  }
}
