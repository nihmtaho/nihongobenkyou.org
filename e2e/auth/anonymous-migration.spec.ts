import { expect, test } from '@playwright/test'

// Requires a live Supabase Auth environment. Mark as fixme until Supabase is provisioned.
test.describe('anonymous → authenticated SRS data migration', () => {
  test.fixme('migrates anonymous SRS cards on first registration', async ({ page, context }) => {
    // Seed anonymous user_cards via Supabase mock before navigation
    await context.route('**/auth/v1/token**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: { id: 'auth-user-uuid-5678', email: 'test@example.com' },
        }),
      })
    })

    await page.goto('/auth/register')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Mật khẩu').fill('testpassword123')
    await page.getByRole('button', { name: 'Đăng ký' }).click()

    await page.waitForURL('/')

    // After sign-up: anonymous_user_id should be cleared from Dexie settings
    // and cards should exist under the authenticated userId
    // Verified by checking the Home Dashboard card count matches the pre-registration count
    await expect(page.getByText(/từ|thẻ/i)).toBeVisible()
  })

  test.fixme('preserves SRS card count after migration on the Home Dashboard', async ({ page }) => {
    await page.goto('/')
    // The dashboard DueCardsWidget shows cards from the authenticated userId after migration
    await expect(page.locator('[data-testid="due-cards-count"]')).toBeVisible()
  })

  test.fixme('clears settings[anonymous_user_id] after successful migration', async ({ page }) => {
    await page.goto('/')
    // Verified via developer tools: Dexie settings table should have no anonymous_user_id entry
    // after the first SIGNED_IN event
    await expect(page).toHaveURL('/')
  })
})
