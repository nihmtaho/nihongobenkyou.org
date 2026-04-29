import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrokeOrderAnimation } from './StrokeOrderAnimation'

const mockStrokes = [
  { stroke_index: 0, path: 'M10 10 L50 50', stroke_type_ja: '㇐', stroke_type_vi: 'nét ngang' },
  { stroke_index: 1, path: 'M10 50 L50 10', stroke_type_ja: '㇑', stroke_type_vi: 'nét sổ' },
  { stroke_index: 2, path: 'M30 10 L30 50', stroke_type_ja: '㇒', stroke_type_vi: 'nét phẩy' },
]

// Mock Web Animations API
const mockAnimation = {
  finished: Promise.resolve(undefined),
  pause: vi.fn(),
  play: vi.fn(),
  cancel: vi.fn(),
  currentTime: 0,
  playbackRate: 1,
}

beforeEach(() => {
  // jsdom has SVGPathElement but doesn't implement getTotalLength — patch it
  if (window.SVGPathElement?.prototype) {
    Object.defineProperty(window.SVGPathElement.prototype, 'getTotalLength', {
      value: () => 100,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window.SVGPathElement.prototype, 'animate', {
      value: () => ({ ...mockAnimation, finished: Promise.resolve(undefined) }),
      configurable: true,
      writable: true,
    })
  }
  // Also patch SVGElement (parent class)
  const svgProto = window.SVGElement?.prototype as unknown as Record<string, unknown> | undefined
  if (svgProto && !svgProto.getTotalLength) {
    Object.defineProperty(window.SVGElement.prototype, 'getTotalLength', {
      value: () => 100,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window.SVGElement.prototype, 'animate', {
      value: () => ({ ...mockAnimation, finished: Promise.resolve(undefined) }),
      configurable: true,
      writable: true,
    })
  }
  void svgProto
  // Mock HTMLElement.animate for all elements
  Object.defineProperty(window.HTMLElement.prototype, 'animate', {
    value: () => ({ ...mockAnimation, finished: Promise.resolve(undefined) }),
    configurable: true,
    writable: true,
  })
  localStorage.clear()
})

afterEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('strokeOrderAnimation', () => {
  it('renders nothing when strokes array is empty', () => {
    const { container } = render(<StrokeOrderAnimation strokes={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the SVG with correct stroke count', () => {
    render(<StrokeOrderAnimation strokes={mockStrokes} />)
    // Component starts in "done" state — all strokes visible
    expect(screen.getByText('3 / 3 strokes')).toBeTruthy()
  })

  it('renders PLAY, PREV, NEXT, RESET buttons', () => {
    render(<StrokeOrderAnimation strokes={mockStrokes} />)
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Previous stroke' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next stroke' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeTruthy()
  })

  it('renders speed selector buttons', () => {
    render(<StrokeOrderAnimation strokes={mockStrokes} />)
    expect(screen.getByText('0.5×')).toBeTruthy()
    expect(screen.getByText('1×')).toBeTruthy()
    expect(screen.getByText('2×')).toBeTruthy()
  })

  it('persists speed selection to localStorage', async () => {
    const user = userEvent.setup()
    render(<StrokeOrderAnimation strokes={mockStrokes} />)
    await user.click(screen.getByText('2×'))
    expect(localStorage.getItem('kanji-stroke-speed')).toBe('2')
  })

  it('reads speed from localStorage on mount', () => {
    localStorage.setItem('kanji-stroke-speed', '0.5')
    render(<StrokeOrderAnimation strokes={mockStrokes} />)
    const halfButton = screen.getByText('0.5×')
    expect(halfButton.closest('button')?.className).toContain('btn-primary')
  })

  it('rESET returns stroke count display to 0', async () => {
    const user = userEvent.setup()
    render(<StrokeOrderAnimation strokes={mockStrokes} />)

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(screen.getByText('0 / 3 strokes')).toBeTruthy()
  })
})
