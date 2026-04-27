/* eslint-disable no-restricted-globals */
// Keep this service worker intentionally minimal to ensure stable registration in all environments.
// FCM token generation only needs an active service worker registration.

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const clickUrl = (event.notification && event.notification.data && event.notification.data.clickUrl) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(clickUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(clickUrl)
      return undefined
    })
  )
})
