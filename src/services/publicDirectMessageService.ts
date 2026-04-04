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
 * @param channelName  - channel to attach (from getDmChannelName)
 * @param onMessage    - called for every incoming DirectMessage
 * @param onReady      - called once the channel is attached and ready to publish
 * @returns DmConnection with the channel ref and a destroy() teardown
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

  const channel = client.channels.get(channelName)

  channel.subscribe((msg: Ably.Message) => {
    const data = msg.data as DirectMessage
    if (!data?.id) return
    onMessage(data)
  })

  channel.once('attached', async () => {
    // Fetch last 100 messages from Ably history so they survive page refresh
    try {
      const page = await channel.history({ limit: 100, direction: 'forwards' })
      page.items.forEach((msg) => {
        const data = msg.data as DirectMessage
        if (data?.id) onMessage(data)
      })
    } catch {
      // history unavailable — silently continue
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
