import { useEffect, useRef, useState } from 'react'
import * as Ably from 'ably'
import { fetchAblyToken } from '../services/publicSessionCommentServices'

function extractPresenceId(msg: Ably.PresenceMessage): string | null {
  const data = msg.data as { uuid?: string } | null
  return data?.uuid || msg.clientId || null
}

function destroyClient(client: Ably.Realtime, channelName: string) {
  try {
    const channel = client.channels.get(channelName)
    channel.presence.leave().catch(() => {})
    channel.presence.unsubscribe()
  } catch { /* ignore */ }
  client.close()
}

export function useAblyPresence(channelName: string, myId?: string): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const clientRef = useRef<Ably.Realtime | null>(null)
  const myIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const accessToken = localStorage.getItem('pub_accessToken')
    if (!accessToken || !channelName) return

    // clientId is locked at instantiation — if myId changed, destroy and recreate
    if (clientRef.current && myIdRef.current === myId) return
    if (clientRef.current) {
      destroyClient(clientRef.current, channelName)
      clientRef.current = null
    }

    // Don't connect without a known identity
    if (!myId) {
      console.log('[useAblyPresence] skipping — myId is empty')
      return
    }

    console.log('[useAblyPresence] connecting with clientId:', myId)
    myIdRef.current = myId

    const client = new Ably.Realtime({
      disconnectedRetryTimeout: 5000,
      suspendedRetryTimeout: 10000,
      authCallback: (_tokenParams, callback) => {
        fetchAblyToken(channelName)
          .then((token) => callback(null, token as unknown as Ably.TokenDetails | Ably.TokenRequest | string))
          .catch((err) => callback(String((err as Error)?.message ?? err), null as unknown as string))
      },
    })
    clientRef.current = client

    const channel = client.channels.get(channelName)

    channel.presence.enter({ uuid: myId })
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
  }, [channelName, myId])

  // True cleanup — only on full unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        destroyClient(clientRef.current, channelName)
        clientRef.current = null
      }
      setOnlineIds(new Set())
    }
  }, [])

  return onlineIds
}
