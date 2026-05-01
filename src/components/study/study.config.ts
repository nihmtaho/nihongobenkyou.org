export type ActiveTab = 'vocab' | 'kanji' | 'decks'

export const TABS = [
  { id: 'vocab' as const, jp: '単語', label: 'TỪ VỰNG' },
  { id: 'kanji' as const, jp: '漢字', label: 'HÁN TỰ' },
  { id: 'decks' as const, jp: 'デッキ', label: 'BỘ THẺ' },
] as const
