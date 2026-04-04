import * as Ably from 'ably'
import { fetchAblyToken } from './publicSessionCommentServices'

export interface DirectMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
}

/** Returns a stable DM channel name — identical for both participants regardless of who opens first. */
export function getDmChannelName(idA: string, idB: string): string {
  const [a, b] = [idA, idB].sort()
  return `dm-${a}-${b}`
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
      fetchAblyToken()
        .then((token) => callback(null, token as unknown as Ably.TokenDetails))
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
    // Also fetch explicit history (works if persisted history is enabled in Ably dashboard)
    // untilAttach: true ensures no overlap with live messages
    try {
      const page = await channel.history({ limit: 100, direction: 'forwards', untilAttach: true })
      page.items.forEach((msg) => {
        const data = msg.data as DirectMessage
        if (data?.id) onMessage(data)
      })
    } catch {
      // history unavailable — rewind already covered replay
    }
    onReady()
  })

  channel.attach()

  const destroy = () => {
    channel.unsubscribe()
    channel.detach().catch(() => {})
    client.close()
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
