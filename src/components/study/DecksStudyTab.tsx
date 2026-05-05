import type { CustomDeck } from '../../types/custom-deck'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { db } from '../../db/schema'
import { useActivateStudyDeck } from '../../hooks/useActivateStudyDeck'
import { useCustomDeckMutations } from '../../hooks/useCustomDeckMutations'
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
      <div className="border border-border/10">
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
      'flex items-center justify-between border-b border-border/10 last:border-b-0 p-3 lg:p-4',
      dueCount > 0 ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-transparent',
    ].join(' ')}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-[var(--br-heading-font)] text-sm font-bold uppercase tracking-tight truncate">
            {deck.title}
          </p>
          {deck.is_active && (
            <span className="font-[var(--br-mono-font)] text-[9px] uppercase text-primary tracking-widest shrink-0">
              ● SRS ACTIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
            {deck.word_count}
            {' '}
            THẺ
          </p>
          {dueCount > 0
            ? (
                <Badge className="bg-destructive text-destructive-foreground font-[var(--br-mono-font)] text-[10px]">
                  {dueCount}
                  {' '}
                  ĐH
                </Badge>
              )
            : nextLabel && (
              <span className="font-[var(--br-mono-font)] text-[9px] uppercase text-foreground/35 tracking-widest">
                ÔN SAU
                {' '}
                {nextLabel}
              </span>
            )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button asChild size="xs" variant="ghost" className="font-[var(--br-mono-font)] min-h-0 h-7 text-muted-foreground">
          <Link to="/custom">
            XEM
          </Link>
        </Button>
        <StudyToggleButton deck={deck} userId={userId} />
      </div>
    </div>
  )
}

function StudyToggleButton({ deck, userId }: { deck: CustomDeck, userId: string }) {
  const activate = useActivateStudyDeck(userId)
  const { toggleActive } = useCustomDeckMutations(userId)

  if (deck.is_active) {
    return (
      <Button
        size="xs"
        variant="outline"
        className="font-[var(--br-mono-font)] min-h-0 h-7 text-muted-foreground border-muted-foreground/30"
        onClick={() => toggleActive.mutate(deck.id)}
        disabled={toggleActive.isPending}
      >
        DỪNG HỌC
      </Button>
    )
  }

  return (
    <Button
      size="xs"
      className="font-[var(--br-mono-font)] min-h-0 h-7"
      onClick={() => activate.mutate(deck)}
      disabled={activate.isPending}
    >
      HỌC NGAY
    </Button>
  )
}
