import { expect, test } from '@playwright/test'

test.describe('offline JWT continuation (US5)', () => {
  test.fixme('authenticated user stays on /srs when going offline mid-session', async ({ page, context }) => {
    // Requires real Supabase auth session
    await page.goto('/srs')
    await page.waitForLoadState('networkidle')

    await context.setOffline(true)

    // Should remain on /srs — not redirected to /auth/login
    await expect(page).not.toHaveURL('/auth/login')
    await page.waitForTimeout(1000)
    await expect(page).not.toHaveURL('/auth/login')
  })

  test.fixme('shows OfflineAuthNotice banner when offline and JWT is expired', async ({ page, context }) => {
    // Requires real Supabase session with a near-expiry JWT
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Simulate JWT expiry
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (key) {
        const raw = localStorage.getItem(key)
        if (!raw)
          return
        const session = JSON.parse(raw)
        session.expires_at = Math.floor(Date.now() / 1000) - 10
        localStorage.setItem(key, JSON.stringify(session))
      }
    })

    await context.setOffline(true)
    await page.reload()

    await expect(
      page.getByRole('alert').filter({ hasText: 'Kết nối lại để tiếp tục đồng bộ' }),
    ).toBeVisible()
  })

  test.fixme('banner disappears automatically after TOKEN_REFRESHED when back online', async ({ page, context }) => {
    await page.goto('/')
    await context.setOffline(true)
    await context.setOffline(false)

    await expect(
      page.getByRole('alert').filter({ hasText: 'Kết nối lại' }),
    ).not.toBeVisible()
  })
})
