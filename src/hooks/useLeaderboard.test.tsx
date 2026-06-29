import type { LeaderboardEntry } from '../types/user'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fetchLeaderboard, subscribeToLeaderboardChanges } from '../api/leaderboard'

import { useLeaderboard } from './useLeaderboard'

vi.mock('../api/leaderboard')

const mockFetch = vi.mocked(fetchLeaderboard)
// subscribeToLeaderboardChanges must return a cleanup fn; return a no-op in tests
vi.mocked(subscribeToLeaderboardChanges).mockReturnValue(() => {})

const MOCK_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, user_id: 'u1', display_name: 'Alice', avatar_url: null, cards_reviewed: 100, is_current_user: false },
  { rank: 2, user_id: 'u2', display_name: 'Bob', avatar_url: null, cards_reviewed: 80, is_current_user: false },
  { rank: 3, user_id: 'me', display_name: 'Me', avatar_url: null, cards_reviewed: 60, is_current_user: true },
]

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useLeaderboard', () => {
  it('returns isLoading true before data resolves', () => {
    mockFetch.mockResolvedValue([])
    const { result } = renderHook(() => useLeaderboard(), { wrapper: createWrapper() })
    expect(result.current.isLoading).toBe(true)
  })

  it('returns entries after successful fetch', async () => {
    mockFetch.mockResolvedValue(MOCK_ENTRIES)
    const { result } = renderHook(() => useLeaderboard(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.entries).toHaveLength(3)
    expect(result.current.entries[0].rank).toBe(1)
  })

  it('splits podium (top 3) and rest entries correctly', async () => {
    const entries: LeaderboardEntry[] = [
      ...MOCK_ENTRIES,
      { rank: 4, user_id: 'u4', display_name: 'Dan', avatar_url: null, cards_reviewed: 40, is_current_user: false },
    ]
    mockFetch.mockResolvedValue(entries)
    const { result } = renderHook(() => useLeaderboard(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.podium).toHaveLength(3)
    expect(result.current.rest).toHaveLength(1)
    expect(result.current.rest[0].rank).toBe(4)
  })

  it('myEntry is null when current user is in top 3', async () => {
    mockFetch.mockResolvedValue(MOCK_ENTRIES) // me is rank 3
    const { result } = renderHook(() => useLeaderboard(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    // me is in podium (rank 3 ≤ 3), so myEntry should NOT appear as sticky footer
    expect(result.current.myEntry).toBeNull()
  })

  it('myEntry is set when current user is outside top 3', async () => {
    const entries: LeaderboardEntry[] = [
      { rank: 1, user_id: 'u1', display_name: 'Alice', avatar_url: null, cards_reviewed: 100, is_current_user: false },
      { rank: 2, user_id: 'u2', display_name: 'Bob', avatar_url: null, cards_reviewed: 80, is_current_user: false },
      { rank: 3, user_id: 'u3', display_name: 'Carol', avatar_url: null, cards_reviewed: 60, is_current_user: false },
      { rank: 21, user_id: 'me', display_name: 'Me', avatar_url: null, cards_reviewed: 5, is_current_user: true },
    ]
    mockFetch.mockResolvedValue(entries)
    const { result } = renderHook(() => useLeaderboard(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.myEntry?.rank).toBe(21)
  })

  it('isError is true on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useLeaderboard(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
