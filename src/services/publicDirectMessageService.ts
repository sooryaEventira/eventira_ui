import * as Ably from 'ably'
import { API_ENDPOINTS } from '../config/env'

export interface DirectMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
}

/** Returns a stable DM room name — identical for both participants regardless of who opens first.
 *  Format matches the backend capability: dm:<lower_id>_<higher_id>
 */
export function getDmChannelName(idA: string, idB: string): string {
  const [a, b] = [idA, idB].sort()
  return `dm:${a}_${b}`
}

export interface DmConnection {
  channel: Ably.RealtimeChannel
  destroy: () => void
}

/**
 * Creates an Ably Realtime client, attaches to the DM channel,
 * and subscribes to incoming messages.
 *
 * Uses `rewind: 100` so Ably replays the last 100 messages through the
 * subscription on attach — works even if persisted history is disabled,
 * as long as the channel is still warm. Also fetches explicit history
 * as a belt-and-braces measure for persisted channels.
 */
export function createDmConnection(
  channelName: string,
  onMessage: (msg: DirectMessage) => void,
  onReady: () => void
): DmConnection {
  const client = new Ably.Realtime({
    disconnectedRetryTimeout: 5000,
    suspendedRetryTimeout: 10000,
    authCallback: (_tokenParams, callback) => {
      const pubToken = localStorage.getItem('pub_accessToken')
      fetch(API_ENDPOINTS.PUBLIC.ABLY_TOKEN_DM(channelName), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(pubToken ? { Authorization: `Bearer ${pubToken}` } : {}),
        },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to fetch DM Ably token.')
          let data = await res.json()
          // Unwrap up to 3 levels of { status, data } envelope
          for (let i = 0; i < 3; i++) {
            if (data && typeof data === 'object' && 'data' in data) data = data.data
            else break
          }
          // Extract the JWT string — do NOT pass the full object (Ably won't recognise snake_case fields)
          const token = (data && typeof data === 'object' ? data.token ?? data : data) ?? null
          if (!token) throw new Error('Ably DM token missing in response.')
          callback(null, token as unknown as Ably.TokenDetails)
        })
        .catch((err: Error) => callback(String(err?.message ?? err), null as unknown as string))
    },
  })

  // rewind: replay last 100 messages through subscription on attach
  const channel = client.channels.get(channelName, {
    params: { rewind: '100' },
  })

  channel.subscribe((msg: Ably.Message) => {
    const data = msg.data as DirectMessage
    if (!data?.id) return
    onMessage(data)
  })

  channel.once('attached', async () => {
    // Fetch explicit history for persisted channels.
    // Must use direction: 'backwards' with untilAttach (Ably requirement), then reverse for chronological order.
    try {
      const page = await channel.history({ limit: 100, direction: 'backwards', untilAttach: true })
      const historical = [...page.items].reverse()
      historical.forEach((msg) => {
        const data = msg.data as DirectMessage
        if (data?.id) onMessage(data)
      })
    } catch {
      // history unavailable — rewind already covered replay
    }
    onReady()
  })

  channel.attach().catch(() => {})

  const destroy = () => {
    channel.unsubscribe()
    client.close()  // closing the client automatically detaches all channels
  }

  return { channel, destroy }
}

/**
 * Publishes a DirectMessage on the given channel.
 * Throws if publish fails.
 */
export async function publishDirectMessage(
  channel: Ably.RealtimeChannel,
  msg: DirectMessage
): Promise<void> {
  await channel.publish('message', msg)
}
