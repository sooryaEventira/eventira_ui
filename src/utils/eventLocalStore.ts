export type EventStoreKey =
  | 'organizations'
  | 'speakers'
  | 'attendees'
  | 'participants'
  | 'schedule'
  | 'sessions'

const PREFIX = 'eventita'

export function makeEventStoreKey(eventUuid: string, key: EventStoreKey) {
  return `${PREFIX}:event:${eventUuid}:${key}`
}

export function readEventStoreJSON<T>(eventUuid: string, key: EventStoreKey, fallback: T): T {
  try {
    const raw = localStorage.getItem(makeEventStoreKey(eventUuid, key))
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeEventStoreJSON(eventUuid: string, key: EventStoreKey, value: unknown) {
  try {
    localStorage.setItem(makeEventStoreKey(eventUuid, key), JSON.stringify(value))
  } catch {
    // ignore storage errors
  }
}

