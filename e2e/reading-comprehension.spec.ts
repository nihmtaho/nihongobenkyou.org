import { expect, test } from '@playwright/test'

test.describe('study session — reading comprehension mode', () => {
  test('navigating directly to /study/reading-comprehension shows empty session screen', async ({ page }) => {
    await page.goto('/study/reading-comprehension')
    await expect(page.locator('text=/redirecting|go to books/i')).toBeVisible({ timeout: 5000 })
  })

  // Golden path — requires: authenticated user, lesson with passages[] populated in dataset
  test.fixme('authenticated user can complete a reading comprehension session', async ({ page }) => {
    await page.goto('/books/minna_shokyuu_1/3')
    await page.locator('button', { hasText: 'STUDY' }).click()
    await expect(page.locator('.modal')).toBeVisible()

    await page.locator('button', { hasText: 'Đọc hiểu' }).click()
    await page.locator('button', { hasText: 'Start' }).click()

    await expect(page).toHaveURL(/\/study\/reading-comprehension/)
    await expect(page.locator('text=1 /')).toBeVisible()

    // Reading phase: passage text visible, "Trả lời" button shown
    await expect(page.locator('button', { hasText: 'Trả lời' })).toBeVisible()

    // Tap Trả lời to reveal questions
    await page.locator('button', { hasText: 'Trả lời' }).click()
    await expect(page.locator('text=Câu hỏi 1')).toBeVisible()

    // Answer all questions (select first option for each)
    const optionButtons = page.locator('.btn-outline.btn-sm')
    const count = await optionButtons.count()
    for (let i = 0; i < count; i++) {
      const btn = optionButtons.nth(i)
      if (await btn.isEnabled()) {
        await btn.click()
        break
      }
    }

    // After all questions answered, "Xem kết quả" button appears
    await expect(page.locator('button', { hasText: 'Xem kết quả' })).toBeVisible({ timeout: 2000 })
    await page.locator('button', { hasText: 'Xem kết quả' }).click()

    // Results phase: rating bar visible
    await expect(page.locator('button[aria-label="good"]')).toBeVisible()
    await page.locator('button[aria-label="good"]').click()

    // Session advances
    await expect(page.locator('text=2 /')).toBeVisible({ timeout: 3000 })
  })

  // Fallback: no passages for lesson → sentence flashcard fallback (no crash)
  test.fixme('falls back to sentence flashcard when no passages exist for the lesson', async ({ page }) => {
    // Current dataset has no passages (passages[] is empty for all lessons)
    await page.goto('/books/minna_shokyuu_1/1')
    await page.locator('button', { hasText: 'STUDY' }).click()
    await page.locator('button', { hasText: 'Đọc hiểu' }).click()
    await page.locator('button', { hasText: 'Start' }).click()

    await expect(page).toHaveURL(/\/study\/reading-comprehension/)

    // Fallback: renders SentenceFlashcard (flip button visible, no Trả lời button)
    await expect(page.locator('[role="button"][aria-label="flip"]')).toBeVisible()
    await expect(page.locator('button', { hasText: 'Trả lời' })).not.toBeVisible()
    await expect(page.locator('text=/error|crash/i')).not.toBeVisible()
  })
})
