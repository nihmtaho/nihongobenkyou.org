import type { SRSRating } from '../types/srs'
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStudyKeyboard } from './useStudyKeyboard'

describe('useStudyKeyboard', () => {
  let onRateMock: ReturnType<typeof vi.fn> & ((r: SRSRating) => void)

  beforeEach(() => {
    onRateMock = vi.fn() as ReturnType<typeof vi.fn> & ((r: SRSRating) => void)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function fireKey(key: string, options: Partial<KeyboardEventInit> = {}) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }))
  }

  it('calls onRate with the correct rating when phase is reviewing and bare key 1-4 is pressed', () => {
    renderHook(() => useStudyKeyboard('reviewing', onRateMock))

    fireKey('1')
    fireKey('2')
    fireKey('3')
    fireKey('4')

    expect(onRateMock).toHaveBeenCalledTimes(4)
    expect(onRateMock).toHaveBeenNthCalledWith(1, 1 as SRSRating)
    expect(onRateMock).toHaveBeenNthCalledWith(2, 2 as SRSRating)
    expect(onRateMock).toHaveBeenNthCalledWith(3, 3 as SRSRating)
    expect(onRateMock).toHaveBeenNthCalledWith(4, 4 as SRSRating)
  })

  it('does not fire when metaKey is held', () => {
    renderHook(() => useStudyKeyboard('reviewing', onRateMock))
    fireKey('1', { metaKey: true })
    expect(onRateMock).not.toHaveBeenCalled()
  })

  it('does not fire when ctrlKey is held', () => {
    renderHook(() => useStudyKeyboard('reviewing', onRateMock))
    fireKey('2', { ctrlKey: true })
    expect(onRateMock).not.toHaveBeenCalled()
  })

  it('does not fire when altKey is held', () => {
    renderHook(() => useStudyKeyboard('reviewing', onRateMock))
    fireKey('3', { altKey: true })
    expect(onRateMock).not.toHaveBeenCalled()
  })

  it('does not fire when phase is not reviewing', () => {
    renderHook(() => useStudyKeyboard('input', onRateMock))
    fireKey('1')
    expect(onRateMock).not.toHaveBeenCalled()
  })

  it('does not fire when phase is loading', () => {
    renderHook(() => useStudyKeyboard('loading', onRateMock))
    fireKey('4')
    expect(onRateMock).not.toHaveBeenCalled()
  })

  it('does not fire for keys outside 1-4', () => {
    renderHook(() => useStudyKeyboard('reviewing', onRateMock))
    fireKey('0')
    fireKey('5')
    fireKey('a')
    expect(onRateMock).not.toHaveBeenCalled()
  })

  it('cleans up listener on unmount', () => {
    const { unmount } = renderHook(() => useStudyKeyboard('reviewing', onRateMock))
    unmount()
    fireKey('1')
    expect(onRateMock).not.toHaveBeenCalled()
  })

  it('does not fire when active element is an input', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    renderHook(() => useStudyKeyboard('reviewing', onRateMock))
    fireKey('1')

    expect(onRateMock).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('does not fire when active element is a textarea', () => {
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    renderHook(() => useStudyKeyboard('reviewing', onRateMock))
    fireKey('2')

    expect(onRateMock).not.toHaveBeenCalled()
    document.body.removeChild(textarea)
  })

  it('does not fire when active element is a select', () => {
    const select = document.createElement('select')
    document.body.appendChild(select)
    select.focus()

    renderHook(() => useStudyKeyboard('reviewing', onRateMock))
    fireKey('3')

    expect(onRateMock).not.toHaveBeenCalled()
    document.body.removeChild(select)
  })
})
