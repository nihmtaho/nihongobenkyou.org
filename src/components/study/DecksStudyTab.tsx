import type { CustomDeck } from '../../types/custom-deck'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'

import { db } from '../../db/schema'
import { useCustomDecks } from '../../hooks/useCustomDecks'
import { formatNextReview } from '../../lib/next-review'
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
          <CustomDeckRow key={deck.id} deck={deck} userId={userId} />
        ))}
      </div>
    </div>
  )
}

function CustomDeckRow({ deck, userId }: { deck: CustomDeck, userId: string }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const { data: nextReview } = useQuery({
    queryKey: ['deck-next-review', userId, deck.id],
    queryFn: async () => {
      const words = await db.custom_vocabulary
        .where('deck_id')
        .equals(deck.id)
        .toArray()
      if (words.length === 0)
        return null
      const cards = await db.user_cards
        .where('[userId+vocabId]')
        .anyOf(words.map(w => [userId, w.id]))
        .toArray()
      const due = cards.filter(c => !c.is_known && c.due_date <= today).length
      if (due > 0)
        return { due, next: null }
      const nextDate = cards
        .filter(c => !c.is_known && c.due_date > today)
        .map(c => c.due_date)
        .sort()[0] ?? null
      return { due: 0, next: nextDate }
    },
    enabled: !!userId,
    staleTime: 0,
  })

  const dueCount = nextReview?.due ?? 0
  const nextLabel = dueCount === 0 && nextReview?.next
    ? formatNextReview([nextReview.next], today)
    : null

  return (
    <div className={[
      'flex items-center justify-between border-b border-base-content/10 last:border-b-0 p-3 lg:p-4',
      dueCount > 0 ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-transparent',
    ].join(' ')}
    >
      <div className="min-w-0">
        <p className="font-[var(--br-heading-font)] text-sm font-bold uppercase tracking-tight truncate">
          {deck.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] font-[var(--br-mono-font)] text-neutral">
            {deck.word_count}
            {' '}
            THẺ
          </p>
          {dueCount > 0
            ? (
                <span className="badge badge-error font-[var(--br-mono-font)] text-[10px]">
                  {dueCount}
                  {' '}
                  ĐH
                </span>
              )
            : nextLabel && (
              <span className="font-[var(--br-mono-font)] text-[9px] uppercase text-base-content/35 tracking-widest">
                ÔN SAU
                {' '}
                {nextLabel}
              </span>
            )}
        </div>
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
