/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

const params = new URL(self.location.href).searchParams
const firebaseConfig = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  storageBucket: params.get('storageBucket') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || '',
  measurementId: params.get('measurementId') || '',
}

if (
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
) {
  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()
  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title || payload?.data?.title || 'New notification'
    const body = payload?.notification?.body || payload?.data?.body || ''
    const icon = payload?.notification?.icon || '/favicon.ico'
    const clickUrl = payload?.data?.click_action || payload?.fcmOptions?.link || '/'
    self.registration.showNotification(title, {
      body,
      icon,
      data: { clickUrl },
    })
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const clickUrl = event?.notification?.data?.clickUrl || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(clickUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(clickUrl)
      return undefined
    })
  )
})
