import type { LeaderboardEntry } from '../../types/user'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LeaderboardHeader } from './LeaderboardHeader'
import { LeaderboardList } from './LeaderboardList'
import { LeaderboardMyRank } from './LeaderboardMyRank'
import { LeaderboardPodium } from './LeaderboardPodium'

const TOP3: LeaderboardEntry[] = [
  { rank: 1, user_id: 'u1', display_name: 'Nguyễn An', avatar_url: null, cards_reviewed: 247, is_current_user: false },
  { rank: 2, user_id: 'u2', display_name: 'Bảo Linh', avatar_url: null, cards_reviewed: 198, is_current_user: false },
  { rank: 3, user_id: 'u3', display_name: 'Minh Hoàng', avatar_url: null, cards_reviewed: 175, is_current_user: false },
]

const REST: LeaderboardEntry[] = [
  { rank: 4, user_id: 'u4', display_name: 'Thanh Tùng', avatar_url: null, cards_reviewed: 143, is_current_user: false },
  { rank: 5, user_id: 'u5', display_name: 'Lan Anh', avatar_url: null, cards_reviewed: 121, is_current_user: false },
]

const MY_RANK: LeaderboardEntry = {
  rank: 21,
  user_id: 'me',
  display_name: 'Tôi',
  avatar_url: null,
  cards_reviewed: 42,
  is_current_user: true,
}

describe('leaderboardPodium', () => {
  it('renders crown emoji on rank 1 entry', () => {
    render(<LeaderboardPodium entries={TOP3} />)
    expect(screen.getByText('👑')).toBeInTheDocument()
  })

  it('renders all 3 display names', () => {
    render(<LeaderboardPodium entries={TOP3} />)
    expect(screen.getByText('Nguyễn An')).toBeInTheDocument()
    expect(screen.getByText('Bảo Linh')).toBeInTheDocument()
    expect(screen.getByText('Minh Hoàng')).toBeInTheDocument()
  })

  it('shows cards_reviewed count for each entry', () => {
    render(<LeaderboardPodium entries={TOP3} />)
    expect(screen.getByText('247')).toBeInTheDocument()
  })

  it('renders nothing when entries is empty', () => {
    const { container } = render(<LeaderboardPodium entries={[]} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('leaderboardList', () => {
  it('renders rank numbers for each entry', () => {
    render(<LeaderboardList entries={REST} />)
    expect(screen.getByText('#4')).toBeInTheDocument()
    expect(screen.getByText('#5')).toBeInTheDocument()
  })

  it('renders display names', () => {
    render(<LeaderboardList entries={REST} />)
    expect(screen.getByText('Thanh Tùng')).toBeInTheDocument()
  })

  it('renders nothing when entries is empty', () => {
    const { container } = render(<LeaderboardList entries={[]} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('leaderboardMyRank', () => {
  it('renders the user rank and score', () => {
    render(<LeaderboardMyRank entry={MY_RANK} />)
    expect(screen.getByText('#21')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders the display name', () => {
    render(<LeaderboardMyRank entry={MY_RANK} />)
    expect(screen.getByText('Tôi')).toBeInTheDocument()
  })
})

describe('leaderboardHeader', () => {
  it('renders the title', () => {
    render(
      <LeaderboardHeader
        weekStart="2026-05-25"
        weekEnd="2026-05-31"
        daysUntilReset={5}
        isStale={false}
      />,
    )
    expect(screen.getByText(/Bảng Xếp Hạng/)).toBeInTheDocument()
  })

  it('shows offline badge when isStale is true', () => {
    render(
      <LeaderboardHeader
        weekStart="2026-05-25"
        weekEnd="2026-05-31"
        daysUntilReset={5}
        isStale={true}
      />,
    )
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })

  it('shows days until reset', () => {
    render(
      <LeaderboardHeader
        weekStart="2026-05-25"
        weekEnd="2026-05-31"
        daysUntilReset={3}
        isStale={false}
      />,
    )
    expect(screen.getByText(/3 ngày/)).toBeInTheDocument()
  })
})
