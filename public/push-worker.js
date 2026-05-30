/* eslint-disable no-restricted-globals, no-undef */
// Service worker: must use `self` and `clients` globals — not regular JS globals.
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'Study Reminder'
  const options = {
    body: data.body ?? 'Time to review your cards!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: data.url ?? '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url ?? '/'))
})
