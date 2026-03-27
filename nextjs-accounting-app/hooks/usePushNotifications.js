import { useState, useEffect, useCallback, useRef } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

/**
 * Convert a base64 URL-encoded string to a Uint8Array (for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Hook for managing Web Push Notification subscriptions.
 *
 * Usage:
 *   const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications()
 */
export default function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState('default')
  const [loading, setLoading] = useState(false)
  const registrationRef = useRef(null)

  // Check support and existing subscription on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false)
      return
    }
    setIsSupported(true)
    setPermission(Notification.permission)

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      registrationRef.current = reg
      return reg.pushManager.getSubscription()
    }).then((sub) => {
      setIsSubscribed(!!sub)
    }).catch(() => {})
  }, [])

  /**
   * Register the service worker (if not already registered) and subscribe to push.
   */
  const subscribe = useCallback(async () => {
    if (!isSupported) return false
    setLoading(true)
    try {
      // 1. Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      registrationRef.current = registration

      // 2. Request notification permission
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setLoading(false)
        return false
      }

      // 3. Get VAPID public key from backend
      const vapidRes = await fetch(`${API_BASE}/push/vapid-public-key`)
      const vapidData = await vapidRes.json()
      const vapidPublicKey = vapidData?.data?.vapid_public_key
      if (!vapidPublicKey) {
        console.error('No VAPID public key from server')
        setLoading(false)
        return false
      }

      // 4. Subscribe to push via the browser
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      // 5. Send subscription to backend
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`${API_BASE}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subscription: {
            endpoint: pushSubscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(pushSubscription.getKey('p256dh')))),
              auth: btoa(String.fromCharCode(...new Uint8Array(pushSubscription.getKey('auth')))),
            },
          },
        }),
      })

      if (res.ok) {
        setIsSubscribed(true)
        setLoading(false)
        return true
      } else {
        console.error('Failed to save push subscription to server')
        setLoading(false)
        return false
      }
    } catch (err) {
      console.error('Push subscription error:', err)
      setLoading(false)
      return false
    }
  }, [isSupported])

  /**
   * Unsubscribe from push notifications.
   */
  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false
    setLoading(true)
    try {
      const registration = registrationRef.current || await navigator.serviceWorker.ready
      const pushSubscription = await registration.pushManager.getSubscription()
      if (pushSubscription) {
        const endpoint = pushSubscription.endpoint

        // Unsubscribe from browser
        await pushSubscription.unsubscribe()

        // Remove from backend
        const token = localStorage.getItem('auth_token')
        await fetch(`${API_BASE}/push/unsubscribe`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ endpoint }),
        })
      }
      setIsSubscribed(false)
      setLoading(false)
      return true
    } catch (err) {
      console.error('Push unsubscribe error:', err)
      setLoading(false)
      return false
    }
  }, [isSupported])

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  }
}
