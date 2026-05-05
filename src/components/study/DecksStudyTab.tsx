import type { CustomDeck } from '../../types/custom-deck'
import type { StudyMode, TypeInputSubMode } from '../../types/study'
import type { SRSStats } from '../common/SRSProgressBar'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SRSProgressBar } from '../common/SRSProgressBar'
import { db } from '../../db/schema'
import { useLaunchCustomDeckSession } from '../../hooks/useLaunchCustomDeckSession'
import { useCustomDeckMutations } from '../../hooks/useCustomDeckMutations'
import { useCustomDecks } from '../../hooks/useCustomDecks'
import { formatNextReview } from '../../lib/next-review'
import { DeckStudyModal } from './DeckStudyModal'
import { DueCard } from './shared/DueCard'
import { EmptyState } from './shared/EmptyState'
import { NextReviewCard } from './shared/NextReviewCard'
import { SectionLabel } from './shared/SectionLabel'
import { SkeletonRows } from './shared/SkeletonRows'
import { StatPip } from './shared/StatPip'
import { StatsGrid } from './shared/StatsGrid'

interface DeckSRSStats extends SRSStats {
  due: number
  nextDate: string | null
}

function useActiveDeckStats(userId: string, activeDecks: CustomDeck[]) {
  const deckIds = useMemo(() => activeDecks.map(d => d.id), [activeDecks])

  return useQuery({
    queryKey: ['active-decks-srs-stats', userId, deckIds],
    queryFn: async () => {
      const now = new Date().toISOString()
      const statsMap = new Map<string, DeckSRSStats>()

      for (const deck of activeDecks) {
        const words = await db.custom_vocabulary.where('deck_id').equals(deck.id).toArray()
        const cards = words.length > 0
          ? await db.user_cards.where('[userId+vocabId]').anyOf(words.map(w => [userId, w.id])).toArray()
          : []

        const due = cards.filter(c => !c.is_known && c.due_date <= now).length
        const newCount = Math.max(0, words.length - cards.length)
        const learning = cards.filter(c => c.interval_days < 8 && !c.is_known).length
        const review = cards.filter(c => c.interval_days >= 8 && c.interval_days < 21 && !c.is_known).length
        const mature = cards.filter(c => c.interval_days >= 21 || c.is_known).length
        const nextDate = due === 0
          ? (cards.filter(c => !c.is_known && c.due_date > now).map(c => c.due_date).sort()[0] ?? null)
          : null

        statsMap.set(deck.id, { due, new: newCount, learning, review, mature, total: words.length, nextDate })
      }

      return statsMap
    },
    enabled: !!userId && activeDecks.length > 0,
    staleTime: 0,
    refetchInterval: 30_000,
  })
}

export function DecksStudyTab({ userId }: { userId: string }) {
  const { data: decks, isLoading } = useCustomDecks(userId)
  const activeDecks = useMemo(() => (decks ?? []).filter(d => d.is_active), [decks])
  const { data: statsMap, isLoading: statsLoading } = useActiveDeckStats(userId, activeDecks)

  const totals = useMemo(() => {
    if (!statsMap)
      return { due: 0, new: 0, learning: 0, review: 0, mature: 0, studied: 0 }
    let due = 0, newCount = 0, learning = 0, review = 0, mature = 0
    for (const s of statsMap.values()) {
      due += s.due
      newCount += s.new
      learning += s.learning
      review += s.review
      mature += s.mature
    }
    return { due, new: newCount, learning, review, mature, studied: learning + review + mature }
  }, [statsMap])

  const nextGlobalDate = useMemo(() => {
    if (!statsMap)
      return null
    const dates = [...statsMap.values()].map(s => s.nextDate).filter(Boolean) as string[]
    return dates.sort()[0] ?? null
  }, [statsMap])

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 xl:p-8 max-w-5xl mx-auto">
        <SkeletonRows count={3} />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 max-w-5xl mx-auto">
      {/* Action widgets — always visible */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <DueCard
          count={totals.due}
          label="THẺ BỘ THẺ CẦN ÔN HÔM NAY"
          reviewLink="/custom"
        />
        <NextReviewCard nextDueDate={nextGlobalDate} />
      </div>

      {activeDecks.length === 0
        ? (
            <EmptyState
              jp="学習中のデッキがありません"
              label="Chưa có bộ thẻ nào đang học"
              hint="Vào trang Bộ thẻ, bật SRS cho bộ thẻ bạn muốn học"
              cta="ĐẾN BỘ THẺ"
              ctaLink="/custom"
            />
          )
        : (
            <>
              <StatsGrid
                isLoading={statsLoading}
                items={[
                  { label: 'ĐẾN HẠN', value: totals.due, color: 'text-destructive' },
                  { label: 'MỚI', value: totals.new, color: 'text-foreground/50' },
                  { label: 'ĐANG HỌC', value: totals.learning, color: 'text-warning' },
                  { label: 'ÔN TẬP', value: totals.review, color: 'text-info' },
                  { label: 'ĐÃ THUỘC', value: totals.mature, color: 'text-success' },
                  { label: 'ĐÃ HỌC QUA', value: totals.studied, color: 'text-foreground' },
                ]}
              />

              <SectionLabel label="BỘ THẺ ĐANG HỌC" count={activeDecks.length} />
              <div className="border border-border/10">
                {activeDecks.map((deck, i) => (
                  <CustomDeckRow
                    key={deck.id}
                    deck={deck}
                    userId={userId}
                    stats={statsMap?.get(deck.id) ?? null}
                    animDelay={i * 0.04}
                  />
                ))}
              </div>
            </>
          )}
    </div>
  )
}

interface CustomDeckRowProps {
  deck: CustomDeck
  userId: string
  stats: DeckSRSStats | null
  animDelay?: number
}

function CustomDeckRow({ deck, userId, stats, animDelay = 0 }: CustomDeckRowProps) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const dueCount = stats?.due ?? 0
  const nextLabel = dueCount === 0 && stats?.nextDate
    ? formatNextReview([stats.nextDate], today)
    : null

  const srsStats: SRSStats | null = stats
    ? { total: stats.total, new: stats.new, learning: stats.learning, review: stats.review, mature: stats.mature }
    : null

  return (
    <div className={[
      'border-b border-border/10 last:border-b-0',
      dueCount > 0 ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-transparent',
    ].join(' ')}
    >
      <div className="flex items-center justify-between p-3 lg:p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-[var(--br-heading-font)] text-sm font-bold uppercase tracking-tight truncate">
              {deck.title}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
              {deck.word_count}
              {' '}
              THẺ
            </p>
            {stats && (
              <>
                {stats.new > 0 && <StatPip count={stats.new} label="MỚI" className="text-foreground/40" />}
                {stats.learning > 0 && <StatPip count={stats.learning} label="HỌC" className="text-warning" />}
                {stats.review > 0 && <StatPip count={stats.review} label="ÔN" className="text-info" />}
                {stats.mature > 0 && <StatPip count={stats.mature} label="THUỘC" className="text-success" />}
              </>
            )}
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
      {srsStats && srsStats.total > 0 && (
        <SRSProgressBar stats={srsStats} height="h-1" animDelay={animDelay} />
      )}
    </div>
  )
}

function StudyToggleButton({ deck, userId }: { deck: CustomDeck, userId: string }) {
  const { launch, isLaunching } = useLaunchCustomDeckSession(userId)
  const { toggleActive } = useCustomDeckMutations(userId)
  const [showModal, setShowModal] = useState(false)

  function handleLaunch(mode: StudyMode, subMode?: TypeInputSubMode) {
    setShowModal(false)
    launch(deck, mode, subMode)
  }

  return (
    <>
      <Button
        size="xs"
        className="font-[var(--br-mono-font)] min-h-0 h-7"
        onClick={() => setShowModal(true)}
        disabled={isLaunching}
      >
        HỌC
      </Button>
      <Button
        size="xs"
        variant="outline"
        className="font-[var(--br-mono-font)] min-h-0 h-7 text-muted-foreground border-muted-foreground/30"
        onClick={() => toggleActive.mutate(deck.id)}
        disabled={toggleActive.isPending}
      >
        DỪNG
      </Button>
      {showModal && (
        <DeckStudyModal
          title={deck.title}
          wordCount={deck.word_count}
          onLaunch={handleLaunch}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
