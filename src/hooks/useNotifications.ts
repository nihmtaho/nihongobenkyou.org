import { useCallback, useState } from 'react'
import { supabase } from '../api/supabase'
import { useSettingsStore } from '../stores/settingsStore'

export function useNotifications() {
  const {
    notificationsEnabled,
    reminderTime,
    dailyTarget,
    setNotificationsEnabled,
    setReminderTime,
    setDailyTarget,
  } = useSettingsStore()

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  )
  // Computed once at hook initialisation — serviceWorker/PushManager availability is static.
  const [supported] = useState(
    () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window,
  )

  const enable = useCallback(async () => {
    // Read at call time so test env stubs are picked up
    const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
    if (!supported || !vapidPublic)
      return
    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== 'granted')
      return
    try {
      const reg = await navigator.serviceWorker.register('/push-worker.js')
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublic,
      })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user)
        return
      await supabase.from('user_push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
      }, { onConflict: 'user_id,endpoint' })
      setNotificationsEnabled(true)
    }
    catch (err) {
      console.error('Push subscription failed', err)
    }
  }, [supported, setNotificationsEnabled])

  const disable = useCallback(async () => {
    setNotificationsEnabled(false)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/push-worker.js')
      if (!reg)
        return
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('user_push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', sub.endpoint)
        }
      }
    }
    catch (err) {
      console.error('Push unsubscribe failed', err)
    }
  }, [setNotificationsEnabled])

  const toggle = useCallback(() => {
    if (notificationsEnabled)
      disable()
    else
      enable()
  }, [notificationsEnabled, enable, disable])

  return {
    supported,
    permission,
    notificationsEnabled,
    reminderTime,
    dailyTarget,
    toggle,
    updateTime: setReminderTime,
    updateTarget: setDailyTarget,
  }
}
