import { createClient } from 'npm:@supabase/supabase-js@2'
import webPush from 'npm:web-push'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webPush.setVapidDetails('mailto:notifications@nihongobenkyou.org', VAPID_PUBLIC, VAPID_PRIVATE)

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: subs, error } = await supabase
    .from('user_push_subscriptions')
    .select('*')

  if (error || !subs) {
    return new Response(JSON.stringify({ error: error?.message }), { status: 500 })
  }

  // TODO: Once settings sync to Supabase is implemented, filter by user reminder_time.
  // Currently sends to all subscriptions — the cron is scheduled at the desired time.
  const payload = JSON.stringify({
    title: '🗓️ Nhắc nhở học tiếng Nhật',
    body: 'Đã đến giờ ôn tập rồi! Hãy vào ứng dụng để học nhé.',
    url: '/',
  })

  const results = await Promise.allSettled(
    subs.map(sub =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ),
    ),
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
