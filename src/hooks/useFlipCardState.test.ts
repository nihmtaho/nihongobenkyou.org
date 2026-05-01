import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFlipCardState } from './useFlipCardState'

describe('useFlipCardState', () => {
  describe('initial state', () => {
    it('starts with isFlipped=false', () => {
      const { result } = renderHook(() => useFlipCardState(vi.fn()))
      expect(result.current.isFlipped).toBe(false)
    })
  })

  describe('setIsFlipped', () => {
    it('flips to true', () => {
      const { result } = renderHook(() => useFlipCardState(vi.fn()))
      act(() => result.current.setIsFlipped(true))
      expect(result.current.isFlipped).toBe(true)
    })

    it('toggles back to false', () => {
      const { result } = renderHook(() => useFlipCardState(vi.fn()))
      act(() => result.current.setIsFlipped(true))
      act(() => result.current.setIsFlipped(false))
      expect(result.current.isFlipped).toBe(false)
    })
  })

  describe('handleDragEnd', () => {
    it('calls onRate(2) when drag offset.x > 100', () => {
      const mockOnRate = vi.fn()
      const { result } = renderHook(() => useFlipCardState(mockOnRate))
      act(() => result.current.setIsFlipped(true))
      act(() => result.current.handleDragEnd({}, { offset: { x: 150 } }))
      expect(mockOnRate).toHaveBeenCalledWith(2)
    })

    it('calls onRate(0) when drag offset.x < -100', () => {
      const mockOnRate = vi.fn()
      const { result } = renderHook(() => useFlipCardState(mockOnRate))
      act(() => result.current.setIsFlipped(true))
      act(() => result.current.handleDragEnd({}, { offset: { x: -150 } }))
      expect(mockOnRate).toHaveBeenCalledWith(0)
    })

    it('does not call onRate when card is not flipped', () => {
      const mockOnRate = vi.fn()
      const { result } = renderHook(() => useFlipCardState(mockOnRate))
      act(() => result.current.handleDragEnd({}, { offset: { x: 150 } }))
      expect(mockOnRate).not.toHaveBeenCalled()
    })

    it('does not call onRate when drag within threshold', () => {
      const mockOnRate = vi.fn()
      const { result } = renderHook(() => useFlipCardState(mockOnRate))
      act(() => result.current.setIsFlipped(true))
      act(() => result.current.handleDragEnd({}, { offset: { x: 50 } }))
      act(() => result.current.handleDragEnd({}, { offset: { x: -50 } }))
      expect(mockOnRate).not.toHaveBeenCalled()
    })
  })

  describe('motion values', () => {
    it('returns x and rotate motion values', () => {
      const { result } = renderHook(() => useFlipCardState(vi.fn()))
      expect(result.current.x).toBeDefined()
      expect(result.current.rotate).toBeDefined()
    })
  })
})
