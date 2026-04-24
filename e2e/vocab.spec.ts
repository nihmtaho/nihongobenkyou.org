import { expect, test } from '@playwright/test'

test.describe('vocabulary browsing', () => {
  test('Books page renders dataset cards', async ({ page }) => {
    await page.goto('/books')
    await expect(page.locator('h1')).toContainText('BOOKS')
    await expect(page.locator('.card')).toBeVisible()
  })

  test('lesson page renders with heading when dataset is seeded', async ({ page }) => {
    await page.goto('/books/minna_shokyuu_1/1')
    // Lesson heading should always be rendered regardless of data
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
  })
})
