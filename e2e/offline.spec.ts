import { expect, test } from '@playwright/test'

test.describe('Offline indicator', () => {
  test('appears within 1 second of going offline', async ({ page, context }) => {
    await page.goto('/')

    // Verify online state — no banner initially
    await expect(page.getByRole('alert').filter({ hasText: /ngoại tuyến/i })).not.toBeVisible()

    await context.setOffline(true)

    await expect(
      page.getByRole('alert').filter({ hasText: /ngoại tuyến/i }),
    ).toBeVisible({ timeout: 1000 })
  })

  test('disappears when coming back online', async ({ page, context }) => {
    await page.goto('/')

    await context.setOffline(true)
    await expect(
      page.getByRole('alert').filter({ hasText: /ngoại tuyến/i }),
    ).toBeVisible({ timeout: 1000 })

    await context.setOffline(false)
    await expect(
      page.getByRole('alert').filter({ hasText: /ngoại tuyến/i }),
    ).not.toBeVisible({ timeout: 2000 })
  })

  test('offline banner is accessible (has role=alert)', async ({ page, context }) => {
    await page.goto('/')
    await context.setOffline(true)

    const banner = page.getByRole('alert').filter({ hasText: /ngoại tuyến/i })
    await expect(banner).toBeVisible({ timeout: 1000 })
    await expect(banner).toHaveAttribute('role', 'alert')
  })

  // Offline study flow: requires an authenticated session with seeded vocab.
  // Full implementation needs Playwright auth fixtures. Documented here for future CI.
  test.fixme('offline: rating a card sets pending_sync=true in IndexedDB', async ({ page, context }) => {
    // 1. Authenticate and navigate to /study/review
    await page.goto('/study/review?filter=vocab')

    // 2. Go offline — Supabase sync should be blocked
    await context.setOffline(true)

    // 3. Rate the current card (press key '3' for Good)
    await page.waitForSelector('[data-testid="srs-header"]')
    await page.keyboard.press('Space') // flip card
    await page.keyboard.press('3') // rate Good

    // 4. Go back online
    await context.setOffline(false)

    // 5. Wait for sync to complete — pending badge should disappear
    await expect(page.getByTestId('pending-sync-count')).not.toBeVisible({ timeout: 10_000 })
  })

  test.fixme('offline: sync completes and pending_sync resets after reconnect', async ({ page, context }) => {
    // Prerequisites: same as above — authenticated session, seeded vocab
    await page.goto('/')

    // Mock Supabase to fail (offline)
    await context.route('**/rest/v1/**', route => route.abort())

    // Navigate to study, rate a card (via keyboard)
    await page.goto('/study/review?filter=vocab')
    await page.keyboard.press('Space')
    await page.keyboard.press('3')

    // Remove mock — allow Supabase again
    await context.unroute('**/rest/v1/**')

    // Trigger manual sync and verify
    await page.goto('/settings')
    await page.getByRole('button', { name: /đồng bộ/i }).click()

    await expect(page.getByText(/pending/i)).not.toBeVisible({ timeout: 15_000 })
  })
})
