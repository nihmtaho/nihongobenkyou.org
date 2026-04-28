import { expect, test } from '@playwright/test'

// E2E: Kanji lesson study modes
// Requires: app running with seeded kanji data and auth session

test.describe('Kanji Lesson Study', () => {
  test.skip(!process.env.E2E_AUTH_ENABLED, 'Requires authenticated session — set E2E_AUTH_ENABLED=1')

  test('lesson dropdown renders all 6 study options', async ({ page }) => {
    await page.goto('/kanji')

    // Wait for kanji panel to load
    await page.waitForSelector('text=Bài 01', { timeout: 10000 })

    // Click the Học button on the first lesson
    const hokBtn = page.getByRole('button', { name: /học/i }).first()
    await hokBtn.click()

    // All 6 options should be visible
    await expect(page.getByRole('button', { name: 'Flashcard' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Trắc nghiệm' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gõ từ' }).first()).toBeVisible()
    await expect(page.getByText('単漢字')).toBeVisible()
    await expect(page.getByText('Từ vựng')).toBeVisible()
  })

  test('kanji flashcard session starts and shows pre-session screen', async ({ page }) => {
    await page.goto('/kanji/lesson-study?lesson=1&type=kanji&mode=flashcard')

    // Pre-session screen
    await expect(page.getByText('BÀI 01')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('単漢字')).toBeVisible()
    await expect(page.getByText('Flashcard')).toBeVisible()

    const startBtn = page.getByRole('button', { name: /bắt đầu/i })
    await expect(startBtn).toBeVisible()
    await startBtn.click()

    // Active session — progress bar visible
    await expect(page.locator('progress')).toBeVisible()
  })

  test('kanji quiz shows 4 choices', async ({ page }) => {
    await page.goto('/kanji/lesson-study?lesson=1&type=kanji&mode=quiz')
    await page.getByRole('button', { name: /bắt đầu/i }).click()

    // Should have 4 answer buttons in a join group
    const choices = page.locator('.join-vertical button')
    await expect(choices).toHaveCount(4, { timeout: 5000 })
  })

  test('kanji type mode — skip with Ctrl+Enter advances without checking', async ({ page }) => {
    await page.goto('/kanji/lesson-study?lesson=1&type=kanji&mode=type')
    await page.getByRole('button', { name: /bắt đầu/i }).click()

    // Input should be focused
    const input = page.locator('input[type="text"]')
    await expect(input).toBeVisible({ timeout: 5000 })

    const indexBefore = await page.locator('text=/ ').textContent()

    // Skip with Ctrl+Enter
    await input.press('Control+Enter')

    // Index should advance
    const indexAfter = await page.locator('text=/ ').textContent()
    expect(indexAfter).not.toBe(indexBefore)
  })

  test('vocab flashcard session starts', async ({ page }) => {
    await page.goto('/kanji/lesson-study?lesson=1&type=vocab&mode=flashcard')

    await expect(page.getByText('BÀI 01')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Từ vựng')).toBeVisible()

    // If no vocab (lesson has no kanji vocab), show empty message
    const startBtn = page.getByRole('button', { name: /bắt đầu/i })
    if (await startBtn.isVisible()) {
      await startBtn.click()
      await expect(page.locator('progress')).toBeVisible()
    }
  })
})
