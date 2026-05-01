import {
  BookOpen,
  BrainCircuit,
  Home,
  Languages,
  LayoutGrid,
  Settings,
} from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/books', label: 'Books', Icon: BookOpen },
  { to: '/kanji', label: 'Kanji', Icon: Languages },
  { to: '/study', label: 'Study', Icon: BrainCircuit },
  { to: '/custom', label: 'My Decks', Icon: LayoutGrid },
  { to: '/settings', label: 'Settings', Icon: Settings },
] as const
