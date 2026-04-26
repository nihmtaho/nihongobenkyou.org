import { expect, test } from '@playwright/test'

test.describe('study session — listening mode', () => {
  test('navigating directly to /study/listening shows empty session screen', async ({ page }) => {
    await page.goto('/study/listening')
    await expect(page.locator('text=/redirecting|go to books/i')).toBeVisible({ timeout: 5000 })
  })

  // Golden path — requires: authenticated user, lesson with audio_filename populated
  test.fixme('authenticated user can complete a listening mode session', async ({ page }) => {
    await page.goto('/books/minna_shokyuu_1/1')
    await page.locator('button', { hasText: 'STUDY' }).click()
    await expect(page.locator('.modal')).toBeVisible()

    await page.locator('button', { hasText: 'Nghe hiểu' }).click()
    await page.locator('button', { hasText: 'Start' }).click()

    await expect(page).toHaveURL(/\/study\/listening/)
    await expect(page.locator('text=1 /')).toBeVisible()

    // Options are shown with ??? labels before answer
    await expect(page.locator('text=???').first()).toBeVisible()

    // Select the first option
    await page.locator('text=???').first().click()

    // Word text is revealed after selection
    await expect(page.locator('text=???')).not.toBeVisible()

    // Rating bar appears
    await expect(page.locator('button[aria-label="good"]')).toBeVisible()

    // Override rating and confirm
    await page.locator('button[aria-label="good"]').click()
    await expect(page.locator('text=2 /')).toBeVisible({ timeout: 3000 })
  })

  // Edge case: audio unavailable — graceful notice, rating still works
  test.fixme('shows audio-not-available notice when audio_filename is null', async ({ page }) => {
    // Navigate to a lesson where all audio is null (current dataset state)
    await page.goto('/books/minna_shokyuu_1/1')
    await page.locator('button', { hasText: 'STUDY' }).click()
    await page.locator('button', { hasText: 'Nghe hiểu' }).click()
    await page.locator('button', { hasText: 'Start' }).click()

    await expect(page).toHaveURL(/\/study\/listening/)

    // Card shows unavailability notice
    await expect(page.locator('text=/audio not available/i')).toBeVisible()

    // Fallback rating bar is still functional
    await expect(page.locator('button[aria-label="good"]')).toBeVisible()
    await page.locator('button[aria-label="good"]').click()
    await expect(page.locator('text=2 /')).toBeVisible({ timeout: 3000 })
  })

  // Speed control
  test.fixme('playback speed selector changes rate for subsequent audio plays', async ({ page }) => {
    await page.goto('/books/minna_shokyuu_1/1')
    await page.locator('button', { hasText: 'STUDY' }).click()
    await page.locator('button', { hasText: 'Nghe hiểu' }).click()
    await page.locator('button', { hasText: 'Start' }).click()

    await expect(page).toHaveURL(/\/study\/listening/)

    // Speed selector renders with 0.75x / 1x / 1.25x options
    await expect(page.locator('button', { hasText: '0.75x' })).toBeVisible()
    await expect(page.locator('button', { hasText: '1x' })).toBeVisible()
    await expect(page.locator('button', { hasText: '1.25x' })).toBeVisible()

    // Click 0.75x — button becomes active (btn-primary class)
    await page.locator('button', { hasText: '0.75x' }).click()
    await expect(page.locator('button.btn-primary', { hasText: '0.75x' })).toBeVisible()
  })
})
