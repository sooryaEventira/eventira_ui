import { API_ENDPOINTS } from '../config/env'

const getPubToken = () => localStorage.getItem('pub_accessToken') ?? ''

export const addBookmark = async (eventUuid: string, sessionUuid: string): Promise<void> => {
  const token = getPubToken()
  const url = API_ENDPOINTS.PUBLIC.SESSION_BOOKMARKS.ADD(eventUuid, sessionUuid)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ is_bookmarked: true }),
  })
  if (!response.ok) throw new Error(`Bookmark add failed: ${response.status}`)
}

export const removeBookmark = async (eventUuid: string, sessionUuid: string): Promise<void> => {
  const token = getPubToken()
  const url = API_ENDPOINTS.PUBLIC.SESSION_BOOKMARKS.REMOVE(eventUuid, sessionUuid)
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) throw new Error(`Bookmark remove failed: ${response.status}`)
}
