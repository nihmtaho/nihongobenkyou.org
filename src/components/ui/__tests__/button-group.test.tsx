import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '../button'
import { ButtonGroup } from '../button-group'

describe('buttonGroup', () => {
  it('renders children', () => {
    render(
      <ButtonGroup>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('applies flex layout class', () => {
    const { container } = render(
      <ButtonGroup>
        <Button>A</Button>
      </ButtonGroup>,
    )
    expect(container.firstChild).toHaveClass('flex')
  })

  it('forwards className prop', () => {
    const { container } = render(
      <ButtonGroup className="w-full">
        <Button>A</Button>
      </ButtonGroup>,
    )
    expect(container.firstChild).toHaveClass('w-full')
  })
})
