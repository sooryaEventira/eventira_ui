import { useEffect, useState } from 'react'
import * as Ably from 'ably'
import { fetchAblyToken } from '../services/publicSessionCommentServices'

function getUserUuid(): string {
  try {
    const token = localStorage.getItem('pub_accessToken')
    if (!token) return ''
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    return String(payload?.uuid ?? payload?.user_uuid ?? payload?.sub ?? payload?.user_id ?? payload?.id ?? '')
  } catch { return '' }
}

function extractPresenceId(msg: Ably.PresenceMessage): string | null {
  // Backend clientId is numeric; attendee IDs are UUIDs.
  // We enter presence with { uuid } so peers can match by UUID.
  const data = msg.data as { uuid?: string } | null
  return data?.uuid || msg.clientId || null
}

/**
 * Connects to an Ably channel, enters presence as the current user,
 * and returns a Set of attendee UUIDs that are currently online.
 * Returns an empty Set if the user is not authenticated.
 */
export function useAblyPresence(channelName: string): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const accessToken = localStorage.getItem('pub_accessToken')
    if (!accessToken || !channelName) return

    let client: Ably.Realtime | null = null
    let cancelled = false

    const init = async () => {
      try {
        client = new Ably.Realtime({
          disconnectedRetryTimeout: 5000,
          suspendedRetryTimeout: 10000,
          authCallback: (_tokenParams, callback) => {
            fetchAblyToken()
              .then((token) => callback(null, token as unknown as Ably.TokenDetails | Ably.TokenRequest | string))
              .catch((err) => callback(String((err as Error)?.message ?? err), null as unknown as string))
          },
        })

        const channel = client.channels.get(channelName)

        // Enter presence with our UUID as data so others can match by attendee UUID
        const myUuid = getUserUuid()
        await channel.presence.enter(myUuid ? { uuid: myUuid } : undefined)

        if (cancelled) {
          channel.presence.leave().catch(() => {})
          channel.detach().catch(() => {})
          client.close()
          return
        }

        // Fetch current members — collect UUIDs from presence data
        const members = await channel.presence.get()
        if (!cancelled) {
          const ids = members.map(extractPresenceId).filter(Boolean) as string[]
          setOnlineIds(new Set(ids))
        }

        // Subscribe to presence changes
        channel.presence.subscribe((msg) => {
          if (cancelled) return
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
      } catch {
        // Silently ignore — presence is non-critical
      }
    }

    init()

    return () => {
      cancelled = true
      if (client) {
        try {
          const channel = client.channels.get(channelName)
          channel.presence.leave().catch(() => {})
          channel.presence.unsubscribe()
          channel.detach().catch(() => {})
        } catch { /* ignore */ }
        client.close()
        client = null
      }
      setOnlineIds(new Set())
    }
  }, [channelName])

  return onlineIds
}
