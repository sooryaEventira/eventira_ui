import { useEffect, useRef, useState } from 'react'
import * as Ably from 'ably'
import { fetchAblyToken } from '../services/publicSessionCommentServices'

function getUserUuid(): string {
  // Prefer the attendee UUID stored after profile fetch (matches attendee list IDs)
  const stored = localStorage.getItem('pub_attendeeUuid')
  if (stored) return stored
  try {
    const token = localStorage.getItem('pub_accessToken')
    if (!token) return ''
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    return String(payload?.uuid ?? payload?.user_uuid ?? payload?.sub ?? payload?.user_id ?? payload?.id ?? '')
  } catch { return '' }
}

function extractPresenceId(msg: Ably.PresenceMessage): string | null {
  const data = msg.data as { uuid?: string } | null
  return data?.uuid || msg.clientId || null
}

export function useAblyPresence(channelName: string): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const clientRef = useRef<Ably.Realtime | null>(null)

  // Init effect — guarded by clientRef to prevent StrictMode double-invoke
  useEffect(() => {
    const accessToken = localStorage.getItem('pub_accessToken')
    if (!accessToken || !channelName) return
    if (clientRef.current) return

    const client = new Ably.Realtime({
      disconnectedRetryTimeout: 5000,
      suspendedRetryTimeout: 10000,
      authCallback: (_tokenParams, callback) => {
        fetchAblyToken()
          .then((token) => callback(null, token as unknown as Ably.TokenDetails | Ably.TokenRequest | string))
          .catch((err) => callback(String((err as Error)?.message ?? err), null as unknown as string))
      },
    })
    clientRef.current = client

    const channel = client.channels.get(channelName)
    const myUuid = getUserUuid()

    channel.presence.enter(myUuid ? { uuid: myUuid } : undefined)
      .then(() => channel.presence.get())
      .then((members) => {
        const ids = members.map(extractPresenceId).filter(Boolean) as string[]
        setOnlineIds(new Set(ids))
      })
      .catch(() => { /* presence is non-critical */ })

    channel.presence.subscribe((msg) => {
      const id = extractPresenceId(msg)
      if (!id) return
      setOnlineIds((prev) => {
        const next = new Set(prev)
        if (msg.action === 'enter' || msg.action === 'update' || msg.action === 'present') {
          next.add(id)
        } else if (msg.action === 'leave') {
          next.delete(id)
        }
        return next
      })
    })

    return () => {}
  }, [channelName])

  // True cleanup — only on full unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        try {
          const channel = clientRef.current.channels.get(channelName)
          channel.presence.leave().catch(() => {})
          channel.presence.unsubscribe()
          channel.detach().catch(() => {})
        } catch { /* ignore */ }
        clientRef.current.close()
        clientRef.current = null
      }
      setOnlineIds(new Set())
    }
  }, [])

  return onlineIds
}
