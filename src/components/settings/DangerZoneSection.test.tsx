import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/schema'
import { useAuthStore } from '../../stores/authStore'
import { DangerZoneSection } from './DangerZoneSection'

const { mockMarkProgressReset, mockSupabaseEq, mockSupabaseMaybySingle } = vi.hoisted(() => ({
  mockMarkProgressReset: vi.fn().mockResolvedValue(undefined),
  mockSupabaseEq: vi.fn().mockResolvedValue({ error: null }),
  mockSupabaseMaybySingle: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

vi.mock('../../api/profiles', () => ({
  markProgressReset: mockMarkProgressReset,
}))

vi.mock('../../api/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({ eq: mockSupabaseEq })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: mockSupabaseMaybySingle,
            })),
          })),
        })),
      })),
    })),
  },
}))

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

const SEED_CARD = {
  userId: 'u1',
  vocabId: 'mnn1_abc123',
  interval_days: 1,
  ease_factor: 2.5,
  due_date: '2026-01-01T00:00:00.000Z',
  review_count: 1,
  last_rating: null as null,
  pending_sync: false,
  updated_at: '2026-01-01T00:00:00.000Z',
  is_known: false,
  consecutive_correct: 0,
}

const SEED_ACTIVE_VOCAB_SRS = {
  userId: 'u1',
  vocabId: 'mnn1_abc123',
  interval_days: 1,
  ease_factor: 2.5,
  due_date: '2026-01-01',
  review_count: 0,
  last_rating: null as null,
  updated_at: '2026-01-01T00:00:00.000Z',
}

beforeEach(async () => {
  await db.user_cards.clear()
  await db.kanji_cards.clear()
  await db.active_vocab_srs.clear()
  await db.active_kanji_srs.clear()
  await db.streaks.clear()
  await db.review_log.clear()
  await db.sync_queue.clear()
  await db.settings.clear()
  vi.clearAllMocks()
})

afterEach(async () => {
  await db.user_cards.clear()
  await db.kanji_cards.clear()
  await db.active_vocab_srs.clear()
  await db.active_kanji_srs.clear()
  await db.streaks.clear()
  await db.review_log.clear()
  await db.sync_queue.clear()
  await db.settings.clear()
})

describe('dangerZoneSection — guest user (userId: null)', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: null, email: null, isAuthenticated: false })
  })

  it('renders section heading and reset button', () => {
    render(<DangerZoneSection />, { wrapper: makeWrapper() })
    expect(screen.getByText('DANGER ZONE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /đặt lại tiến trình/i })).toBeInTheDocument()
  })

  it('opens confirm dialog when button clicked', async () => {
    const user = userEvent.setup()
    render(<DangerZoneSection />, { wrapper: makeWrapper() })
    await user.click(screen.getByRole('button', { name: /đặt lại tiến trình/i }))
    expect(screen.getByText('ĐẶT LẠI TIẾN TRÌNH')).toBeInTheDocument()
  })

  it('confirm button is disabled until phrase matches', async () => {
    const user = userEvent.setup()
    render(<DangerZoneSection />, { wrapper: makeWrapper() })
    await user.click(screen.getByRole('button', { name: /đặt lại tiến trình/i }))
    const confirmBtn = screen.getByRole('button', { name: /xác nhận đặt lại/i })
    expect(confirmBtn).toBeDisabled()
    await user.type(screen.getByPlaceholderText('ĐẶT LẠI'), 'ĐẶT LẠI')
    expect(confirmBtn).not.toBeDisabled()
  })

  it('does not show Supabase bullet in dialog', async () => {
    const user = userEvent.setup()
    render(<DangerZoneSection />, { wrapper: makeWrapper() })
    await user.click(screen.getByRole('button', { name: /đặt lại tiến trình/i }))
    expect(screen.queryByText(/dữ liệu đồng bộ trên supabase/i)).not.toBeInTheDocument()
  })

  it('clears Dexie tables and skips markProgressReset', async () => {
    await db.user_cards.put(SEED_CARD)
    await db.active_vocab_srs.put(SEED_ACTIVE_VOCAB_SRS)
    const user = userEvent.setup()
    render(<DangerZoneSection />, { wrapper: makeWrapper() })
    await user.click(screen.getByRole('button', { name: /đặt lại tiến trình/i }))
    await user.type(screen.getByPlaceholderText('ĐẶT LẠI'), 'ĐẶT LẠI')
    await user.click(screen.getByRole('button', { name: /xác nhận đặt lại/i }))
    await waitFor(() =>
      expect(screen.queryByText('ĐẶT LẠI TIẾN TRÌNH')).not.toBeInTheDocument(),
    )
    expect(await db.user_cards.count()).toBe(0)
    expect(await db.active_vocab_srs.count()).toBe(0)
    expect(mockMarkProgressReset).not.toHaveBeenCalled()
  })
})

describe('dangerZoneSection — authenticated user', () => {
  const userId = 'auth-user-xyz'

  beforeEach(() => {
    useAuthStore.setState({ userId, email: 'test@example.com', isAuthenticated: true })
  })

  it('shows Supabase bullet in dialog', async () => {
    const user = userEvent.setup()
    render(<DangerZoneSection />, { wrapper: makeWrapper() })
    await user.click(screen.getByRole('button', { name: /đặt lại tiến trình/i }))
    expect(screen.getByText(/dữ liệu đồng bộ trên supabase/i)).toBeInTheDocument()
  })

  it('clears Dexie by userId and calls markProgressReset', async () => {
    await db.user_cards.put({ ...SEED_CARD, userId })
    const user = userEvent.setup()
    render(<DangerZoneSection />, { wrapper: makeWrapper() })
    await user.click(screen.getByRole('button', { name: /đặt lại tiến trình/i }))
    await user.type(screen.getByPlaceholderText('ĐẶT LẠI'), 'ĐẶT LẠI')
    await user.click(screen.getByRole('button', { name: /xác nhận đặt lại/i }))
    await waitFor(() =>
      expect(screen.queryByText('ĐẶT LẠI TIẾN TRÌNH')).not.toBeInTheDocument(),
    )
    expect(await db.user_cards.count()).toBe(0)
    expect(mockMarkProgressReset).toHaveBeenCalledWith(userId)
  })
})
