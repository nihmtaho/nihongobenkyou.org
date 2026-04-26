import { expect, test } from '@playwright/test'

test.describe('study session — sentence flashcard mode', () => {
  test('navigating directly to /study/sentence-flashcard shows empty session screen', async ({ page }) => {
    await page.goto('/study/sentence-flashcard')
    // No active session → shows redirect screen or empty state
    await expect(page.locator('text=/redirecting|go to books/i')).toBeVisible({ timeout: 5000 })
  })

  test.fixme('/study/sentence-flashcard is not a redirect for unauthenticated users in Phase 1 (anonymous = authenticated)', async ({ page }) => {
    await page.goto('/study/sentence-flashcard')
    await expect(page).not.toHaveURL(/\/auth\/login/)
  })

  // Golden path — requires: authenticated user, lesson 5 seeded, dataset built with example sentences
  test.fixme('authenticated user can complete a sentence flashcard session', async ({ page }) => {
    await page.goto('/books/minna_shokyuu_1/5')
    await page.locator('button', { hasText: 'STUDY' }).click()
    await expect(page.locator('.modal')).toBeVisible()

    // Select sentence-flashcard mode
    await page.locator('button', { hasText: 'Thẻ câu' }).click()
    await page.locator('button', { hasText: 'Start' }).click()

    await expect(page).toHaveURL(/\/study\/sentence-flashcard/)
    await expect(page.locator('text=1 /')).toBeVisible()

    // Card shows Japanese text (sentence or word fallback)
    const card = page.locator('[role="button"][aria-label="flip"]')
    await expect(card).toBeVisible()

    // Flip the card
    await card.click()

    // Rating bar appears after flip
    await expect(page.locator('button[aria-label="good"]')).toBeVisible()
    await page.locator('button[aria-label="good"]').click()

    // Session advances
    await expect(page.locator('text=2 /')).toBeVisible({ timeout: 3000 })
  })

  // Edge case: word without example sentence falls back gracefully (no crash)
  test.fixme('sentence flashcard renders word-only fallback when no example sentence exists', async ({ page }) => {
    await page.goto('/books/minna_shokyuu_1/1')
    await page.locator('button', { hasText: 'STUDY' }).click()
    await page.locator('button', { hasText: 'Thẻ câu' }).click()
    await page.locator('button', { hasText: 'Start' }).click()

    await expect(page).toHaveURL(/\/study\/sentence-flashcard/)

    // Card renders without errors (fallback to word display)
    await expect(page.locator('[role="button"][aria-label="flip"]')).toBeVisible()
    await expect(page.locator('text=/error|crash/i')).not.toBeVisible()
  })
})
