import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging'
import { env } from '../config/env'

const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
  measurementId: env.FIREBASE_MEASUREMENT_ID,
}

const hasFirebaseConfig = () =>
  Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      env.FIREBASE_VAPID_KEY
  )

const getFirebaseApp = (): FirebaseApp => {
  const existing = getApps()
  if (existing.length > 0) return existing[0]
  return initializeApp(firebaseConfig)
}

const getPublicMessagingSwRegistration = async (): Promise<ServiceWorkerRegistration> => {
  const swUrl = '/firebase-messaging-sw.js'
  return navigator.serviceWorker.register(swUrl)
}

export const getPublicFcmToken = async (): Promise<string | null> => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null
  if (!hasFirebaseConfig()) return null
  const supported = await isSupported().catch(() => false)
  if (!supported) return null
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const app = getFirebaseApp()
  const messaging = getMessaging(app)
  const swRegistration = await getPublicMessagingSwRegistration()
  const token = await getToken(messaging, {
    vapidKey: env.FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: swRegistration,
  })
  return token || null
}

export const onPublicFcmForegroundMessage = async (
  callback: (payload: any) => void
): Promise<(() => void) | null> => {
  if (!hasFirebaseConfig()) return null
  const supported = await isSupported().catch(() => false)
  if (!supported) return null
  const app = getFirebaseApp()
  const messaging: Messaging = getMessaging(app)
  return onMessage(messaging, callback)
}

export const isPublicFcmConfigured = (): boolean => hasFirebaseConfig()

export const getMissingPublicFcmConfigKeys = (): string[] => {
  const missing: string[] = []
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY')
  if (!firebaseConfig.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN')
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID')
  if (!firebaseConfig.messagingSenderId) missing.push('VITE_FIREBASE_MESSAGING_SENDER_ID')
  if (!firebaseConfig.appId) missing.push('VITE_FIREBASE_APP_ID')
  if (!env.FIREBASE_VAPID_KEY) missing.push('VITE_FIREBASE_VAPID_KEY')
  return missing
}
