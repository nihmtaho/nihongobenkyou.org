import { expect, test } from '@playwright/test'

const PROTECTED_ROUTES = ['/srs', '/profile', '/settings'] as const

test.describe('Auth guards — protected routes redirect unauthenticated users', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to /auth/login when not authenticated`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/auth\/login/, { timeout: 5000 })
    })
  }
})

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
  })

  test('shows login form with email, password, and submit button', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/mật khẩu/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /đăng nhập/i })).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page, context }) => {
    // Intercept Supabase auth endpoint to simulate invalid credentials
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

  test('redirects to home on successful login', async ({ page, context }) => {
    // Mock Supabase token endpoint with a valid session
    await context.route('**/auth/v1/token**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'test-refresh-token',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            aud: 'authenticated',
            role: 'authenticated',
          },
        }),
      })
    })

    // Mock user info endpoint
    await context.route('**/auth/v1/user**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          aud: 'authenticated',
          role: 'authenticated',
        }),
      })
    })

    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/mật khẩu/i).fill('correctpassword')
    await page.getByRole('button', { name: /đăng nhập/i }).click()

    await expect(page).toHaveURL('/', { timeout: 5000 })
  })

  test('has link to register page', async ({ page }) => {
    await page.getByRole('link', { name: /đăng ký/i }).click()
    await expect(page).toHaveURL(/auth\/register/)
  })

  test('has link to forgot password page', async ({ page }) => {
    await page.getByRole('link', { name: /quên mật khẩu/i }).click()
    await expect(page).toHaveURL(/auth\/forgot-password/)
  })
})

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register')
  })

  test('shows registration form with confirm password field', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^mật khẩu$/i)).toBeVisible()
    await expect(page.getByLabel(/xác nhận mật khẩu/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /tạo tài khoản/i })).toBeVisible()
  })

  test('shows error when passwords do not match', async ({ page }) => {
    await page.getByLabel(/email/i).fill('new@example.com')
    await page.getByLabel(/^mật khẩu$/i).fill('password123')
    await page.getByLabel(/xác nhận mật khẩu/i).fill('different123')
    await page.getByRole('button', { name: /tạo tài khoản/i }).click()

    await expect(page.getByRole('alert')).toContainText('Mật khẩu không khớp')
  })

  test('shows error when password is too short', async ({ page }) => {
    await page.getByLabel(/email/i).fill('new@example.com')
    await page.getByLabel(/^mật khẩu$/i).fill('short')
    await page.getByLabel(/xác nhận mật khẩu/i).fill('short')
    await page.getByRole('button', { name: /tạo tài khoản/i }).click()

    await expect(page.getByRole('alert')).toContainText('ít nhất 8 ký tự')
  })
})
