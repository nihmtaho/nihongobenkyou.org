import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSyncStatus } from './useSyncStatus'

// useLiveQuery (pendingCount) depends on Dexie — mock the module so the hook
// can be tested in isolation without a real IndexedDB environment.
vi.mock('../db/schema', () => ({
  db: {
    srs_cards: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue(0),
        }),
      }),
    },
  },
}))

// useLiveQuery is a thin Dexie liveQuery subscription wrapper.
// We replace it with a simple useState-based stub so we can control pendingCount.
function stubLiveQuery() {
  return 0
}
vi.mock('../lib/use-live-query', () => ({
  useLiveQuery: stubLiveQuery,
}))

describe('useSyncStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns default state', () => {
    const { result } = renderHook(() => useSyncStatus())
    expect(result.current.isSyncing).toBe(false)
    expect(result.current.lastError).toBeNull()
    expect(result.current.syncJustCompleted).toBe(false)
    expect(result.current.pendingCount).toBe(0)
  })

  it('sets isSyncing=true on sync-start event', () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      window.dispatchEvent(new Event('sync-start'))
    })

    expect(result.current.isSyncing).toBe(true)
    expect(result.current.lastError).toBeNull()
  })

  it('sets isSyncing=false on sync-complete event', () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      window.dispatchEvent(new Event('sync-start'))
    })
    expect(result.current.isSyncing).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('sync-complete'))
    })
    expect(result.current.isSyncing).toBe(false)
  })

  it('sets syncJustCompleted=true on sync-complete and resets after 3s', () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      window.dispatchEvent(new Event('sync-complete'))
    })
    expect(result.current.syncJustCompleted).toBe(true)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.syncJustCompleted).toBe(false)
  })

  it('sets isSyncing=false and lastError on sync-error event', () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      window.dispatchEvent(new Event('sync-start'))
    })
    expect(result.current.isSyncing).toBe(true)

    act(() => {
      window.dispatchEvent(
        new CustomEvent('sync-error', { detail: { message: 'Network timeout' } }),
      )
    })

    expect(result.current.isSyncing).toBe(false)
    expect(result.current.lastError).toBe('Network timeout')
  })

  it('clears lastError on the next sync-start', () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      window.dispatchEvent(
        new CustomEvent('sync-error', { detail: { message: 'Some error' } }),
      )
    })
    expect(result.current.lastError).toBe('Some error')

    act(() => {
      window.dispatchEvent(new Event('sync-start'))
    })
    expect(result.current.lastError).toBeNull()
  })

  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useSyncStatus())

    unmount()

    const removedNames = removeEventListenerSpy.mock.calls.map(c => c[0])
    expect(removedNames).toContain('sync-start')
    expect(removedNames).toContain('sync-complete')
    expect(removedNames).toContain('sync-error')
  })
})
