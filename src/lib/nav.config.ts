import {
  BookOpen,
  BrainCircuit,
  Home,
  Languages,
  LayoutGrid,
  Settings,
  Trophy,
} from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/books', label: 'Books', Icon: BookOpen },
  { to: '/kanji', label: 'Kanji', Icon: Languages },
  { to: '/study', label: 'Study', Icon: BrainCircuit },
  { to: '/custom', label: 'My Decks', Icon: LayoutGrid },
  { to: '/leaderboard', label: 'Bảng xếp hạng', Icon: Trophy },
  { to: '/settings', label: 'Settings', Icon: Settings },
] as const
