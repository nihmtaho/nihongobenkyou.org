import { expect, test } from '@playwright/test'

test.describe('user profile — avatar upload and account deletion (US4)', () => {
  test.fixme('avatar shows immediately after upload, and persists after page refresh', async ({ page, context }) => {
    // Requires real Supabase Storage + Auth session
    await context.route('**/storage/v1/object/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await context.route('**/storage/v1/object/sign/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ signedURL: 'https://example.com/avatar.jpg' }),
      })
    })

    await page.goto('/profile')
    // Upload a test file — provide a real JPEG path in CI fixture directory
    await page.getByRole('button', { name: /đổi ảnh/i }).click()

    // Confirm upload
    await page.getByRole('button', { name: 'Xác nhận' }).click()
    await expect(page.locator('img[alt="Avatar"]')).toBeVisible()

    // Refresh — avatar should still show (regenerated from storage path)
    await page.reload()
    await expect(page.locator('img[alt="Avatar"]')).toBeVisible()
  })

  test('account deletion modal requires typing XÓA to confirm', async ({ page, context }) => {
    // Mock profile route to bypass auth redirect
    await context.route('**/rest/v1/profiles**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user_id: 'test-user', display_name: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null }),
      })
    })

    await page.goto('/profile')

    // Open deletion modal
    await page.getByRole('button', { name: /xóa tài khoản/i }).first().click()
    await expect(page.getByText('Xác nhận xóa tài khoản')).toBeVisible()

    // Delete button disabled until correct phrase typed
    const confirmBtn = page.getByRole('button', { name: /xóa tài khoản/i }).last()
    await expect(confirmBtn).toBeDisabled()

    // Type the wrong phrase — still disabled
    await page.getByPlaceholder('XÓA').fill('xoa')
    await expect(confirmBtn).toBeDisabled()

    // Type the correct phrase — enabled
    await page.getByPlaceholder('XÓA').fill('XÓA')
    await expect(confirmBtn).toBeEnabled()
  })

  test.fixme('account deletion: redirects to login, reactivation shows banner on re-login', async ({ page, context }) => {
    // Requires real Supabase Auth session + profiles table
    await context.route('**/rest/v1/profiles**', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      }
      else {
        await route.continue()
      }
    })

    await page.goto('/profile')
    await page.getByRole('button', { name: /xóa tài khoản/i }).first().click()
    await page.getByPlaceholder('XÓA').fill('XÓA')
    await page.getByRole('button', { name: /xóa tài khoản/i }).last().click()

    await expect(page).toHaveURL('/auth/login')

    // Log back in during grace period — reactivation banner should appear
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/mật khẩu/i).fill('testpassword123')
    await page.getByRole('button', { name: /đăng nhập/i }).click()
    await expect(page.getByText(/tài khoản đã được khôi phục/i)).toBeVisible()
  })
})
