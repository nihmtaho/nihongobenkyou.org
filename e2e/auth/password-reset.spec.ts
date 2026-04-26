import { expect, test } from '@playwright/test'

test.describe('password reset via email (US3)', () => {
  test('forgot-password page shows email form and confirmation message', async ({ page, context }) => {
    // Mock Supabase reset email endpoint
    await context.route('**/auth/v1/recover**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })

    await page.goto('/auth/forgot-password')
    await expect(page.getByLabel(/email/i)).toBeVisible()

    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByRole('button', { name: /gửi/i }).click()

    // Confirmation message shown — never reveals if email exists
    await expect(page.getByText(/kiểm tra hộp thư/i)).toBeVisible()
  })

  test('reset-password page shows expired state when no token in URL', async ({ page }) => {
    await page.goto('/auth/reset-password')
    // No access_token in hash → shows "link expired" view
    await expect(page.getByText(/liên kết hết hạn/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /yêu cầu liên kết mới/i })).toBeVisible()
  })

  test.fixme('full password reset flow: email → link → new password → login', async ({ page, context }) => {
    // Requires real Supabase email delivery + magic link
    await context.route('**/auth/v1/recover**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await context.route('**/auth/v1/user**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'user-id', email: 'test@example.com' }),
      })
    })

    await page.goto('/auth/forgot-password')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByRole('button', { name: /gửi/i }).click()
    await expect(page.getByText(/kiểm tra hộp thư/i)).toBeVisible()
  })
})
