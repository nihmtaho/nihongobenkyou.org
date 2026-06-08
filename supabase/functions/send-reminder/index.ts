import { createClient } from 'npm:@supabase/supabase-js@2'
import webPush from 'npm:web-push'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webPush.setVapidDetails('mailto:notifications@nihongobenkyou.org', VAPID_PUBLIC, VAPID_PRIVATE)

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Current hour in Vietnam time (UTC+7), zero-padded
  const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000)
  const currentHour = String(nowVN.getUTCHours()).padStart(2, '0')

  // Only notify users whose reminder_time matches the current hour
  const { data: subs, error } = await supabase
    .from('user_push_subscriptions')
    .select('*')
    .like('reminder_time', `${currentHour}:%`)

  if (error || !subs) {
    return new Response(JSON.stringify({ error: error?.message }), { status: 500 })
  }

  const payload = JSON.stringify({
    title: '🗓️ Nhắc nhở học tiếng Nhật',
    body: 'Đã đến giờ ôn tập rồi! Hãy vào ứng dụng để học nhé.',
    url: '/',
  })

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      }
      catch (err: unknown) {
        // Remove stale subscriptions (410 Gone / 404 Not Found = endpoint no longer valid)
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          await supabase
            .from('user_push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
        }
        throw err
      }
    }),
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return new Response(JSON.stringify({ sent, failed, hour: currentHour }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
