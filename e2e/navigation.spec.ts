import { expect, test } from '@playwright/test'

test.describe('navigation', () => {
  test.describe('mobile viewport', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('BottomDock is visible on mobile', async ({ page }) => {
      await page.goto('/')
      const dock = page.locator('.dock')
      await expect(dock).toBeVisible()
    })

    test('Sidebar is hidden on mobile', async ({ page }) => {
      await page.goto('/')
      const sidebar = page.locator('.menu.hidden')
      await expect(sidebar).not.toBeVisible()
    })

    test('active Home tab is highlighted', async ({ page }) => {
      await page.goto('/')
      const homeBtn = page.locator('.dock a[aria-label="Home"]')
      await expect(homeBtn).toHaveClass(/dock-active/)
    })

    test('navigate Home → Books → back via dock', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('h1')).toContainText('NIHONGO.')

      await page.goto('/books')
      await expect(page.locator('h1')).toContainText('BOOKS')

      await page.locator('.dock a[aria-label="Home"]').click()
      await expect(page.locator('h1')).toContainText('NIHONGO.')
    })
  })

  test.describe('desktop viewport', () => {
    test.use({ viewport: { width: 1280, height: 800 } })

    test('Sidebar is visible on desktop', async ({ page }) => {
      await page.goto('/')
      const sidebarLinks = page.locator('.menu.hidden.lg\\:block')
      await expect(sidebarLinks).toBeVisible()
    })

    test('Study link in Sidebar navigates to /srs', async ({ page }) => {
      await page.goto('/')
      await page.locator('.menu a', { hasText: 'Study' }).click()
      await expect(page).toHaveURL('/srs')
    })
  })
})
