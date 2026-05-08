import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScrollDirection } from './useScrollDirection'

describe('useScrollDirection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'scrollY', { writable: true, value: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function scroll(y: number) {
    Object.defineProperty(window, 'scrollY', { writable: true, value: y })
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      await vi.runAllTimersAsync()
    })
  }

  it('returns "top" initially', () => {
    const { result } = renderHook(() => useScrollDirection())
    expect(result.current).toBe('top')
  })

  it('returns "top" when scrollY is below threshold', async () => {
    const { result } = renderHook(() => useScrollDirection(10))
    await scroll(5)
    expect(result.current).toBe('top')
  })

  it('returns "down" when scrolled past threshold', async () => {
    const { result } = renderHook(() => useScrollDirection(10))
    await scroll(20)
    expect(result.current).toBe('down')
  })

  it('returns "up" when scrolled down then back up', async () => {
    const { result } = renderHook(() => useScrollDirection(10))
    await scroll(50)
    await scroll(30)
    expect(result.current).toBe('up')
  })

  it('returns "top" when scrolled back to top', async () => {
    const { result } = renderHook(() => useScrollDirection(10))
    await scroll(50)
    await scroll(3)
    expect(result.current).toBe('top')
  })

  it('stops updating after unmount', async () => {
    const { result, unmount } = renderHook(() => useScrollDirection())
    unmount()
    await scroll(50)
    expect(result.current).toBe('top')
  })
})
