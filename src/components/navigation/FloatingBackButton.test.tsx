import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FloatingBackButton } from './FloatingBackButton'

describe('floatingBackButton', () => {
  it('calls onBack when clicked', async () => {
    const onBack = vi.fn()
    render(<FloatingBackButton visible onBack={onBack} label="BOOKS" />)
    await userEvent.click(screen.getByRole('button', { name: /back to books/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('is not interactive when not visible', () => {
    const onBack = vi.fn()
    const { container } = render(<FloatingBackButton visible={false} onBack={onBack} label="BOOKS" />)
    const btn = container.querySelector('button')
    expect(btn).toHaveClass('pointer-events-none')
  })
})
