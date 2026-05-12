import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { updateStore } from '../../stores/updateStore'
import { UpdateProgressModal } from './UpdateProgressModal'

vi.mock('../../db/seed', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
  seedKanji: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  updateStore.getState().reset()
})

afterEach(() => {
  cleanup()
  updateStore.getState().reset()
})

describe('updateProgressModal', () => {
  it('renders nothing when phase is idle', () => {
    const { container } = render(<UpdateProgressModal />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders modal when phase is updating', () => {
    updateStore.getState().startUpdate(false, true, false)
    render(<UpdateProgressModal />)
    expect(screen.getByText('Đang tải phiên bản mới...')).toBeInTheDocument()
  })

  it('shows only non-skipped steps', () => {
    // sw is skipped (swWaiting=false), dataset is shown (datasetOutdated=true)
    updateStore.getState().startUpdate(false, true, false)
    render(<UpdateProgressModal />)
    expect(screen.getByText('Tải dữ liệu từ vựng')).toBeInTheDocument()
    expect(screen.queryByText('Cập nhật ứng dụng')).not.toBeInTheDocument()
  })

  it('shows "Hoàn tất ✓" when phase is done', () => {
    updateStore.getState().startUpdate(false, true, false)
    updateStore.getState().finish()
    render(<UpdateProgressModal />)
    expect(screen.getByText('Hoàn tất ✓')).toBeInTheDocument()
  })

  it('shows progress bar and filename during dataset step', () => {
    updateStore.getState().startUpdate(false, true, false)
    updateStore.getState().setStepActive('dataset')
    updateStore.getState().setProgress('lesson-07.json', 28)
    render(<UpdateProgressModal />)
    expect(screen.getAllByText('lesson-07.json').length).toBeGreaterThan(0)
  })

  it('shows error message and retry button when error is set', () => {
    updateStore.getState().startUpdate(false, true, false)
    updateStore.getState().setError('Không thể tải dữ liệu')
    render(<UpdateProgressModal />)
    expect(screen.getByText('Không thể tải dữ liệu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bỏ qua/i })).toBeInTheDocument()
  })

  it('clicking "Bỏ qua lần này" resets the store to idle', async () => {
    updateStore.getState().startUpdate(false, true, false)
    updateStore.getState().setError('Network error')
    render(<UpdateProgressModal />)

    await userEvent.click(screen.getByRole('button', { name: /bỏ qua/i }))

    expect(updateStore.getState().phase).toBe('idle')
  })
})
