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
})
