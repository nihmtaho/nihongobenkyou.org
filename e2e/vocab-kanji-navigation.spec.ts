import { expect, test } from '@playwright/test'

// E2E: 2-way navigation between vocabulary and kanji — SC-006
// Requires: app running with seeded kanji + vocab data and auth session

test.describe('Vocab ↔ Kanji Navigation (SC-006)', () => {
  test.skip(!process.env.E2E_AUTH_ENABLED, 'Requires authenticated session — set E2E_AUTH_ENABLED=1')

  test('VocabCard shows "漢字" button for words containing kanji', async ({ page }) => {
    // Navigate to a lesson that contains vocabulary with kanji
    await page.goto('/books/mnn1/3')

    // Find a vocabulary card with the kanji button
    const kanjiButton = page.locator('button[aria-label^="View kanji"]').first()
    await expect(kanjiButton).toBeVisible({ timeout: 5000 })
  })

  test('clicking 漢字 button navigates to kanji detail', async ({ page }) => {
    await page.goto('/books/mnn1/3')

    const kanjiButton = page.locator('button[aria-label^="View kanji"]').first()
    await expect(kanjiButton).toBeVisible({ timeout: 5000 })
    await kanjiButton.click()

    // Should land on a kanji detail page
    await expect(page).toHaveURL(/\/kanji\/.+/)
    await expect(page.locator('text=N5').first()).toBeVisible()
  })

  test('kanji detail shows related vocabulary section', async ({ page }) => {
    await page.goto('/kanji/食')

    // Related vocabulary section should appear
    await expect(page.locator('text=Related Vocabulary').first()).toBeVisible({ timeout: 5000 })
  })
})
