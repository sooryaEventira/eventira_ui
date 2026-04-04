import { useEffect, useState } from 'react'
import * as Ably from 'ably'
import { fetchAblyToken } from '../services/publicSessionCommentServices'

/**
 * Connects to an Ably channel, enters presence as the current user,
 * and returns a Set of clientIds (user UUIDs) that are currently online.
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
            fetchAblyToken(channelName)
              .then((token) => callback(null, token as unknown as Ably.TokenDetails | Ably.TokenRequest | string))
              .catch((err) => callback(String((err as Error)?.message ?? err), null as unknown as string))
          },
        })

        const channel = client.channels.get(channelName)

        // Enter presence so others see this user as online
        await channel.presence.enter()

        if (cancelled) {
          channel.presence.leave().catch(() => {})
          channel.detach().catch(() => {})
          client.close()
          return
        }

        // Fetch current members
        const members = await channel.presence.get()
        if (!cancelled) {
          setOnlineIds(new Set(members.map((m) => m.clientId).filter(Boolean) as string[]))
        }

        // Subscribe to presence changes
        channel.presence.subscribe((msg) => {
          if (cancelled) return
          setOnlineIds((prev) => {
            const next = new Set(prev)
            const id = msg.clientId
            if (!id) return prev
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
