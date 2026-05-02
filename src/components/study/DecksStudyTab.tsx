import type { CustomDeck } from '../../types/custom-deck'

import { Link } from '@tanstack/react-router'

import { useCustomDecks } from '../../hooks/useCustomDecks'
import { EmptyState } from './shared/EmptyState'
import { SectionLabel } from './shared/SectionLabel'
import { SkeletonRows } from './shared/SkeletonRows'

export function DecksStudyTab({ userId }: { userId: string }) {
  const { data: decks, isLoading } = useCustomDecks(userId)

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 xl:p-8 max-w-5xl mx-auto">
        <SkeletonRows count={3} />
      </div>
    )
  }

  if (!decks?.length) {
    return (
      <div className="p-4 lg:p-6 xl:p-8 max-w-5xl mx-auto">
        <EmptyState
          jp="デッキがありません"
          label="Chưa có bộ thẻ nào"
          hint="Tạo bộ thẻ của riêng bạn hoặc nhập từ CSV"
          cta="TẠO BỘ THẺ"
          ctaLink="/custom"
        />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 max-w-5xl mx-auto">
      <SectionLabel label="BỘ THẺ CỦA TÔI" count={decks.length} />
      <div className="border border-base-content/10">
        {decks.map(deck => (
          <CustomDeckRow key={deck.id} deck={deck} />
        ))}
      </div>
    </div>
  )
}

function CustomDeckRow({ deck }: { deck: CustomDeck }) {
  return (
    <div className="flex items-center justify-between border-b border-base-content/10 last:border-b-0 p-3 lg:p-4">
      <div className="min-w-0">
        <p className="font-[var(--br-heading-font)] text-sm font-bold uppercase tracking-tight truncate">
          {deck.title}
        </p>
        <p className="text-[10px] font-[var(--br-mono-font)] text-neutral">
          {deck.word_count}
          {' '}
          THẺ
        </p>
      </div>
      <Link
        to="/custom/$deckId"
        params={{ deckId: deck.id }}
        className="btn btn-outline btn-xs font-[var(--br-mono-font)] min-h-0 h-7"
      >
        XEM BỘ THẺ
      </Link>
    </div>
  )
}
