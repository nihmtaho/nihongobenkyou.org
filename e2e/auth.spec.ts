import { expect, test } from '@playwright/test'

// Phase 1: All users are authenticated as anonymous (crypto.randomUUID stored in Dexie).
// These redirect tests describe Phase 2 behavior (Supabase Auth).
// Re-enable when Supabase Auth is wired up.
test.describe('Auth guards — protected routes redirect unauthenticated users', () => {
  const PROTECTED_ROUTES = ['/srs', '/profile', '/settings'] as const
  for (const route of PROTECTED_ROUTES) {
    test.fixme(`${route} redirects to /auth/login when not authenticated`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/auth\/login/, { timeout: 5000 })
    })
  }
})

// Phase 1: /auth/login redirects to / for anonymous (isAuthenticated = true).
// These tests require a real unauthenticated state (Phase 2).
test.describe('Login page', () => {
  test.fixme('shows login form with email, password, and submit button', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/mật khẩu/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /đăng nhập/i })).toBeVisible()
  })

  test.fixme('shows error for invalid credentials', async ({ page, context }) => {
    await page.goto('/auth/login')
    await context.route('**/auth/v1/token**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
      })
    })
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/mật khẩu/i).fill('wrongpassword')
    await page.getByRole('button', { name: /đăng nhập/i }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('alert')).toContainText('Email hoặc mật khẩu không đúng')
  })

  test.fixme('redirects to home on successful login', async ({ page, context }) => {
    await page.goto('/auth/login')
    await context.route('**/auth/v1/token**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'test-refresh-token',
          user: { id: 'test-user-id', email: 'test@example.com', aud: 'authenticated', role: 'authenticated' },
        }),
      })
    })
    await context.route('**/auth/v1/user**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-user-id', email: 'test@example.com', aud: 'authenticated', role: 'authenticated' }),
      })
    })
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/mật khẩu/i).fill('correctpassword')
    await page.getByRole('button', { name: /đăng nhập/i }).click()
    await expect(page).toHaveURL('/', { timeout: 5000 })
  })

  test.fixme('has link to register page', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('link', { name: /đăng ký/i }).click()
    await expect(page).toHaveURL(/auth\/register/)
  })

  test.fixme('has link to forgot password page', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('link', { name: /quên mật khẩu/i }).click()
    await expect(page).toHaveURL(/auth\/forgot-password/)
  })
})

test.describe('Register page', () => {
  test.fixme('shows registration form with confirm password field', async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^mật khẩu$/i)).toBeVisible()
    await expect(page.getByLabel(/xác nhận mật khẩu/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /tạo tài khoản/i })).toBeVisible()
  })

  test.fixme('shows error when passwords do not match', async ({ page }) => {
    await page.goto('/auth/register')
    await page.getByLabel(/email/i).fill('new@example.com')
    await page.getByLabel(/^mật khẩu$/i).fill('password123')
    await page.getByLabel(/xác nhận mật khẩu/i).fill('different123')
    await page.getByRole('button', { name: /tạo tài khoản/i }).click()
    await expect(page.getByRole('alert')).toContainText('Mật khẩu không khớp')
  })

  test.fixme('shows error when password is too short', async ({ page }) => {
    await page.goto('/auth/register')
    await page.getByLabel(/email/i).fill('new@example.com')
    await page.getByLabel(/^mật khẩu$/i).fill('short')
    await page.getByLabel(/xác nhận mật khẩu/i).fill('short')
    await page.getByRole('button', { name: /tạo tài khoản/i }).click()
    await expect(page.getByRole('alert')).toContainText('ít nhất 8 ký tự')
  })
})
