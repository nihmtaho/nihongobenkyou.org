import { renderHook } from '@testing-library/react'
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

  it('returns "top" initially', () => {
    const { result } = renderHook(() => useScrollDirection())
    expect(result.current).toBe('top')
  })

  it('returns "top" when scrollY is below threshold', async () => {
    const { result } = renderHook(() => useScrollDirection(10))
    Object.defineProperty(window, 'scrollY', { writable: true, value: 5 })
    window.dispatchEvent(new Event('scroll'))
    await vi.runAllTimersAsync()
    expect(result.current).toBe('top')
  })

  it('returns "down" when scrolled past threshold then further down', async () => {
    const { result } = renderHook(() => useScrollDirection(10))
    Object.defineProperty(window, 'scrollY', { writable: true, value: 20 })
    window.dispatchEvent(new Event('scroll'))
    await vi.runAllTimersAsync()
    Object.defineProperty(window, 'scrollY', { writable: true, value: 40 })
    window.dispatchEvent(new Event('scroll'))
    await vi.runAllTimersAsync()
    expect(result.current).toBe('down')
  })

  it('returns "up" when scrolled down then back up (above threshold)', async () => {
    const { result } = renderHook(() => useScrollDirection(10))
    Object.defineProperty(window, 'scrollY', { writable: true, value: 50 })
    window.dispatchEvent(new Event('scroll'))
    await vi.runAllTimersAsync()
    Object.defineProperty(window, 'scrollY', { writable: true, value: 30 })
    window.dispatchEvent(new Event('scroll'))
    await vi.runAllTimersAsync()
    expect(result.current).toBe('up')
  })

  it('returns "top" when scrolled back to top', async () => {
    const { result } = renderHook(() => useScrollDirection(10))
    Object.defineProperty(window, 'scrollY', { writable: true, value: 50 })
    window.dispatchEvent(new Event('scroll'))
    await vi.runAllTimersAsync()
    Object.defineProperty(window, 'scrollY', { writable: true, value: 3 })
    window.dispatchEvent(new Event('scroll'))
    await vi.runAllTimersAsync()
    expect(result.current).toBe('top')
  })
})
