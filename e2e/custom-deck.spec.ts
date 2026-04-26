import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const MOCK_DECK_ID = 'deck-00000000-0000-0000-0000-000000000001'
const MOCK_SHARE_CODE = 'AbCd1234'

const MOCK_DECK = {
  id: MOCK_DECK_ID,
  user_id: 'anon-user-00000000-0000-0000-0000-000000000001',
  title: 'Từ vựng công việc',
  description: 'Từ liên quan đến công việc văn phòng',
  is_public: false,
  share_code: MOCK_SHARE_CODE,
  word_count: 2,
  created_at: '2026-04-26T00:00:00Z',
  updated_at: '2026-04-26T00:00:00Z',
}

const MOCK_PUBLIC_DECK = { ...MOCK_DECK, is_public: true }

const MOCK_WORDS = [
  {
    id: 'word-00000000-0000-0000-0000-000000000001',
    deck_id: MOCK_DECK_ID,
    user_id: MOCK_DECK.user_id,
    kana: 'かいぎ',
    kanji: '会議',
    meaning_vi: 'cuộc họp',
    meaning_en: 'meeting',
    pitch_pattern: 1,
    source: 'manual',
    created_at: '2026-04-26T00:00:00Z',
  },
  {
    id: 'word-00000000-0000-0000-0000-000000000002',
    deck_id: MOCK_DECK_ID,
    user_id: MOCK_DECK.user_id,
    kana: 'しごと',
    kanji: '仕事',
    meaning_vi: 'công việc',
    meaning_en: 'work',
    pitch_pattern: 0,
    source: 'manual',
    created_at: '2026-04-26T00:00:01Z',
  },
]

// ---------------------------------------------------------------------------
// 1. Navigation
// ---------------------------------------------------------------------------

test.describe('Custom Deck — navigation', () => {
  test.describe('desktop viewport', () => {
    test.use({ viewport: { width: 1280, height: 800 } })

    test('sidebar shows "My Decks" link', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.menu a', { hasText: 'My Decks' })).toBeVisible()
    })

    test('"My Decks" sidebar link navigates to /custom', async ({ page }) => {
      await page.goto('/')
      await page.locator('.menu a', { hasText: 'My Decks' }).click()
      await expect(page).toHaveURL('/custom')
    })
  })

  test('/custom route renders without crashing', async ({ page }) => {
    await page.goto('/custom')
    await expect(page).toHaveURL('/custom')
    // Page should not show a full-screen error boundary
    await expect(page.getByRole('alert').filter({ hasText: /lỗi|error/i })).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 2. Deck list page — empty and populated states
// ---------------------------------------------------------------------------

test.describe('Custom Deck — deck list page', () => {
  test('shows empty state CTA when no decks exist', async ({ page }) => {
    await page.goto('/custom')
    await expect(
      page.getByRole('button', { name: /tạo bộ từ vựng đầu tiên/i }),
    ).toBeVisible({ timeout: 5000 })
  })

  test('renders deck card with title and word count when mocked', async ({ page, context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_DECK]),
      })
    })
    await page.goto('/custom')
    await expect(page.getByText('Từ vựng công việc')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('2 từ')).toBeVisible()
  })

  test('shows "Công khai" badge on public decks', async ({ page, context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_PUBLIC_DECK]),
      })
    })
    await page.goto('/custom')
    await expect(page.getByText('Công khai')).toBeVisible({ timeout: 5000 })
  })

  test('clicking a deck card navigates to the deck detail page', async ({ page, context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_DECK]),
      })
    })
    await context.route('**/rest/v1/custom_vocabulary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.goto('/custom')
    await page.getByText('Từ vựng công việc').click()
    await expect(page).toHaveURL(`/custom/${MOCK_DECK_ID}`, { timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// 3. Create deck modal
// ---------------------------------------------------------------------------

test.describe('Custom Deck — create deck modal', () => {
  test('"+ Tạo mới" button opens the create deck modal', async ({ page, context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_DECK]),
      })
    })
    await page.goto('/custom')
    await page.getByText('Từ vựng công việc').waitFor({ timeout: 5000 })
    await page.getByRole('button', { name: /tạo mới/i }).click()
    await expect(page.locator('.modal-open')).toBeVisible()
    await expect(page.getByText('Tạo bộ từ vựng mới')).toBeVisible()
  })

  test('empty state CTA button opens the create deck modal', async ({ page }) => {
    await page.goto('/custom')
    const ctaBtn = page.getByRole('button', { name: /tạo bộ từ vựng đầu tiên/i })
    await expect(ctaBtn).toBeVisible({ timeout: 5000 })
    await ctaBtn.click()
    await expect(page.locator('.modal-open')).toBeVisible()
  })

  test('modal has title input and description textarea', async ({ page }) => {
    await page.goto('/custom')
    const cta = page.getByRole('button', { name: /tạo bộ từ vựng đầu tiên/i })
    await expect(cta).toBeVisible({ timeout: 5000 })
    await cta.click()
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('"Hủy" closes the modal', async ({ page }) => {
    await page.goto('/custom')
    await page.getByRole('button', { name: /tạo bộ từ vựng đầu tiên/i }).click({ timeout: 5000 })
    await expect(page.locator('.modal-open')).toBeVisible()
    await page.getByRole('button', { name: /hủy/i }).click()
    await expect(page.locator('.modal-open')).not.toBeVisible()
  })

  test.fixme('creating a deck calls Supabase POST and updates the deck list', async ({ page, context }) => {
    const newDeck = { ...MOCK_DECK, title: 'Bộ mới', id: 'deck-new' }
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newDeck) })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.goto('/custom')
    await page.getByRole('button', { name: /tạo bộ từ vựng đầu tiên/i }).click({ timeout: 5000 })
    await page.locator('input[type="text"]').first().fill('Bộ mới')
    await page.getByRole('button', { name: /lưu/i }).click()
    await expect(page.getByText('Bộ mới')).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// 4. Deck detail page
// ---------------------------------------------------------------------------

test.describe('Custom Deck — deck detail page', () => {
  test.beforeEach(async ({ context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_DECK]),
      })
    })
    await context.route('**/rest/v1/custom_vocabulary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORDS),
      })
    })
  })

  test('shows deck title and back navigation', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await expect(page.getByText('Từ vựng công việc')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('← Bộ từ vựng')).toBeVisible()
  })

  test('renders word table with kana and meaning columns', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await expect(page.getByRole('cell', { name: 'かいぎ' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('cell', { name: 'cuộc họp' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'しごと' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'công việc', exact: true })).toBeVisible()
  })

  test('kanji column renders correctly', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await expect(page.getByText('会議')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('仕事')).toBeVisible()
  })

  test('"Thêm từ mới" section with word entry form is visible', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await expect(page.getByText('Thêm từ mới')).toBeVisible({ timeout: 5000 })
    await expect(page.getByPlaceholder('かいぎ')).toBeVisible()
    await expect(page.getByPlaceholder('会議')).toBeVisible()
    await expect(page.getByPlaceholder('cuộc họp')).toBeVisible()
  })

  test('"Nhập CSV" toggle shows the CSV import section', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await page.getByRole('button', { name: /nhập csv/i }).click()
    // CSV import section shows file format hint
    await expect(page.getByText(/kana/)).toBeVisible({ timeout: 3000 })
  })

  test('share section has public/private toggle', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await expect(page.getByText('Chia sẻ bộ từ vựng')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="checkbox"].toggle')).toBeVisible()
  })

  test('share URL appears when deck is toggled public', async ({ page, context }) => {
    // Override with a public deck for this test
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PUBLIC_DECK),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_PUBLIC_DECK]),
      })
    })
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    // Deck already public — share URL input should be visible
    await expect(page.locator('input[readonly]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[readonly]')).toHaveValue(
      new RegExp(MOCK_SHARE_CODE),
    )
  })

  test('"Chỉnh sửa" button opens the deck editor modal', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await page.getByRole('button', { name: /chỉnh sửa/i }).click()
    await expect(page.locator('.modal-open')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Chỉnh sửa bộ từ vựng')).toBeVisible()
  })

  test('back navigation returns to /custom', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await page.getByText('← Bộ từ vựng').click()
    await expect(page).toHaveURL('/custom', { timeout: 5000 })
  })

  test('shows "Không tìm thấy" when deckId does not match any deck', async ({ page }) => {
    // Decks list returns MOCK_DECK but route param is a different ID
    await page.goto('/custom/non-existent-deck-id')
    await expect(page.getByText(/không tìm thấy bộ từ vựng/i)).toBeVisible({ timeout: 5000 })
  })

  test.fixme('adding a word shows pitch loading indicator then resolves', async ({ page }) => {
    // Pitch lookup edge function would need to be mocked
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await page.getByPlaceholder('かいぎ').fill('にほんご')
    await page.getByPlaceholder('cuộc họp').fill('tiếng Nhật')
    await page.getByRole('button', { name: /thêm từ/i }).click()
    await expect(page.getByText(/đang tra pitch/i)).toBeVisible({ timeout: 3000 })
  })

  test.fixme('deleting a word removes it from the table', async ({ page, context }) => {
    await context.route('**/rest/v1/custom_vocabulary*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_WORDS) })
    })
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await expect(page.getByText('かいぎ')).toBeVisible({ timeout: 5000 })
    // Click delete button for first word (×)
    await page.locator('button.text-error').first().click()
    await expect(page.getByText('かいぎ')).not.toBeVisible({ timeout: 3000 })
  })
})

// ---------------------------------------------------------------------------
// 5. Offline behavior
// ---------------------------------------------------------------------------

test.describe('Custom Deck — offline behavior', () => {
  test('word entry form is disabled and shows warning when offline', async ({ page, context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_DECK]) })
    })
    await context.route('**/rest/v1/custom_vocabulary*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await expect(page.getByText('Thêm từ mới')).toBeVisible({ timeout: 5000 })

    await context.setOffline(true)

    await expect(
      page.getByText(/bạn đang ngoại tuyến.*không thể thêm từ/i),
    ).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /thêm từ/i })).toBeDisabled()
  })

  test('CSV import section shows offline warning when offline', async ({ page, context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_DECK]) })
    })
    await context.route('**/rest/v1/custom_vocabulary*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await page.getByRole('button', { name: /nhập csv/i }).click()
    await context.setOffline(true)

    await expect(
      page.getByText(/bạn đang ngoại tuyến.*không thể nhập csv/i),
    ).toBeVisible({ timeout: 3000 })
  })

  test('deck editor modal shows offline warning when offline', async ({ page, context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_DECK]) })
    })
    await context.route('**/rest/v1/custom_vocabulary*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await page.getByRole('button', { name: /chỉnh sửa/i }).click()
    await expect(page.locator('.modal-open')).toBeVisible({ timeout: 3000 })

    await context.setOffline(true)

    await expect(
      page.getByText(/bạn đang ngoại tuyến.*vui lòng kết nối/i),
    ).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /lưu/i })).toBeDisabled()
  })

  // Service Worker not active in Vite dev mode — page.reload() while offline blocks on app shell fetch.
  // This test exercises the offline-first Dexie fallback within a single page session instead.
  test.fixme('deck list page still renders cached decks after offline reload', async ({ page, context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_DECK]) })
    })
    await page.goto('/custom')
    await expect(page.getByText('Từ vựng công việc')).toBeVisible({ timeout: 5000 })
    await context.setOffline(true)
    await page.reload()
    await expect(page.getByText('Từ vựng công việc')).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// 6. CSV import
// ---------------------------------------------------------------------------

test.describe('Custom Deck — CSV import', () => {
  test.beforeEach(async ({ context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_DECK]) })
    })
    await context.route('**/rest/v1/custom_vocabulary*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([]) })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
  })

  test('CSV import section is toggled by "Nhập CSV" button', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await expect(page.getByText('Thêm từ mới')).toBeVisible({ timeout: 5000 })
    // Initially shows WordEntry, not CsvImport
    await expect(page.getByPlaceholder('かいぎ')).toBeVisible()
    // Toggle to CSV
    await page.getByRole('button', { name: /nhập csv/i }).click()
    await expect(page.getByPlaceholder('かいぎ')).not.toBeVisible()
    // Toggle back
    await page.getByRole('button', { name: /ẩn/i }).click()
    await expect(page.getByPlaceholder('かいぎ')).toBeVisible()
  })

  test('CSV import shows file input with .csv accept', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await page.getByRole('button', { name: /nhập csv/i }).click()
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await expect(fileInput).toBeVisible({ timeout: 3000 })
  })

  test.fixme('valid CSV upload shows row count preview and confirm button', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await page.getByRole('button', { name: /nhập csv/i }).click()

    const csvContent = 'kana,meaning_vi\nにほんご,tiếng Nhật\nえいご,tiếng Anh'
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent, 'utf-8'),
    })

    await expect(page.getByText(/2 hàng sẵn sàng nhập/)).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /xác nhận nhập/i })).toBeVisible()
  })

  test.fixme('invalid CSV (missing kana column) shows error message', async ({ page }) => {
    await page.goto(`/custom/${MOCK_DECK_ID}`)
    await page.getByRole('button', { name: /nhập csv/i }).click()

    const badCsv = 'kanji,meaning_vi\n会議,cuộc họp'
    await page.locator('input[type="file"]').setInputFiles({
      name: 'bad.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(badCsv, 'utf-8'),
    })

    await expect(page.getByText(/kana/i)).toBeVisible({ timeout: 3000 })
  })
})

// ---------------------------------------------------------------------------
// 7. Public shared deck (no auth required)
// ---------------------------------------------------------------------------

test.describe('Custom Deck — public shared deck', () => {
  test('shows "Không tìm thấy" when share code returns no deck', async ({ page, context }) => {
    // Supabase returns null (or is unreachable) — component shows not-found state
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'null',
      })
    })
    await page.goto(`/custom/shared/InvalidCode`)
    await expect(
      page.getByText(/không tìm thấy bộ từ vựng/i),
    ).toBeVisible({ timeout: 5000 })
  })

  test('renders public deck title and word list with mocked data', async ({ page, context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PUBLIC_DECK),
      })
    })
    await context.route('**/rest/v1/custom_vocabulary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORDS),
      })
    })
    await page.goto(`/custom/shared/${MOCK_SHARE_CODE}`)
    await expect(page.getByText('Từ vựng công việc')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('CHIA SẺ')).toBeVisible()
    await expect(page.getByText('かいぎ')).toBeVisible()
    await expect(page.getByText('cuộc họp')).toBeVisible()
  })

  test('shared deck page shows "2 từ" word count', async ({ page, context }) => {
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PUBLIC_DECK),
      })
    })
    await context.route('**/rest/v1/custom_vocabulary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORDS),
      })
    })
    await page.goto(`/custom/shared/${MOCK_SHARE_CODE}`)
    await expect(page.getByText(/2\s*từ/)).toBeVisible({ timeout: 5000 })
  })

  test('shows "Thêm vào bộ của tôi" button for authenticated users', async ({ page, context }) => {
    // Phase 1: all users are anonymous = isAuthenticated true
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PUBLIC_DECK),
      })
    })
    await context.route('**/rest/v1/custom_vocabulary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORDS),
      })
    })
    await page.goto(`/custom/shared/${MOCK_SHARE_CODE}`)
    await expect(
      page.getByRole('button', { name: /thêm vào bộ của tôi/i }),
    ).toBeVisible({ timeout: 5000 })
  })

  test('shared deck page is accessible without navigating through auth routes', async ({ page, context }) => {
    // Verify /custom/shared/* does not redirect to /auth/login
    await context.route('**/rest/v1/custom_decks*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
    })
    await page.goto(`/custom/shared/SomeCode`)
    await expect(page).toHaveURL(/\/custom\/shared\/SomeCode/)
    await expect(page).not.toHaveURL(/auth\/login/)
  })
})
