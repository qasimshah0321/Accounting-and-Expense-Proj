// Service Worker for Web Push Notifications — AccountPro ERP

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'AccountPro', body: event.data ? event.data.text() : '' }
  }

  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    data: data.data || {},
    tag: (data.data?.type || 'general') + '-' + (data.data?.id || Date.now()),
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'AccountPro', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  // Open the app — navigate to the relevant page based on notification data
  const data = event.notification.data || {}
  let url = '/'

  // Could extend this to deep-link to specific orders in the future
  if (data.type === 'sales_order' && data.id) {
    url = '/?panel=SalesOrder'
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url)
    })
  )
})

// Activate immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
