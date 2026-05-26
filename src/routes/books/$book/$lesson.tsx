import type { SRSStats } from '../../../components/common/SRSProgressBar'
import type { StudyMode, TypeInputSubMode } from '../../../types/study'
import type { UnifiedCard } from '../../../types/unified-card'
import type { VocabWithSRS } from '../../../types/vocabulary'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { SRSProgressBar } from '../../../components/common/SRSProgressBar'
import { VocabStudyModal } from '../../../components/study/VocabStudyModal'
import { HiddenVocabBadge } from '../../../components/vocabulary/HiddenVocabBadge'
import { HiddenVocabList } from '../../../components/vocabulary/HiddenVocabList'
import { VocabList } from '../../../components/vocabulary/VocabList'
import { useLaunchVocabSession } from '../../../hooks/useLaunchVocabSession'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { useUserCards } from '../../../hooks/useUserCards'
import { useVocabulary } from '../../../hooks/useVocabulary'
import { formatNextReview } from '../../../lib/next-review'
import { useAuthStore } from '../../../stores/authStore'
import { useStudySessionStore } from '../../../stores/studySessionStore'

export const Route = createFileRoute('/books/$book/$lesson')({
  component: LessonPage,
})

const RETRY_MODES = [
  { value: 'flashcard' as StudyMode, label: 'Thẻ từ' },
  { value: 'quiz' as StudyMode, label: 'Trắc nghiệm' },
  { value: 'type-input' as StudyMode, label: 'Gõ từ' },
]

function LessonPage() {
  const { book, lesson } = Route.useParams()
  const lessonNumber = Number(lesson)
  const navigate = useNavigate()
  const [showConfig, setShowConfig] = useState(false)
  const [configContext, setConfigContext] = useState<'all' | 'due'>('all')
  const [retryMode, setRetryMode] = useState<StudyMode>('flashcard')
  const [retrySubMode] = useState<TypeInputSubMode>('word→hira')

  const userId = useAuthStore(s => s.userId) ?? ''
  const [hiddenPanelOpen, setHiddenPanelOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { data: items = [], isLoading, hiddenCount } = useVocabulary(book, lessonNumber, userId)
  const nonDeprecated = items.filter(item => !item.deprecated)
  const vocabIds = nonDeprecated.map(item => item.vocab_id)
  const { data: cards = new Map() } = useUserCards(userId, vocabIds)
  const { initSession, stats } = useStudySessionStore()
  const launchVocabSession = useLaunchVocabSession(userId)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const total = nonDeprecated.length
  const cardList = useMemo(() => [...cards.values()], [cards])
  const learningCount = cardList.filter(c => c.scheduled_days < 8).length
  const reviewCount = cardList.filter(c => c.scheduled_days >= 8 && c.scheduled_days < 21).length
  const matureCount = cardList.filter(c => c.scheduled_days >= 21).length
  const newCount = Math.max(0, total - cardList.length)
  const dueCount = cardList.filter(c => !c.is_known && c.due <= today).length

  const srsStats: SRSStats = {
    total,
    new: newCount,
    learning: learningCount,
    review: reviewCount,
    mature: matureCount,
  }

  const nextReview = useMemo(
    () => formatNextReview(cardList.map(c => c.due), today),
    [cardList, today],
  )

  // Deduplicated wrong cards from the last session for this lesson
  const retryCards = useMemo(() => {
    const seen = new Set<string>()
    const result: VocabWithSRS[] = []
    for (const c of stats.wrongCards as unknown as VocabWithSRS[]) {
      if (c.book_source === book && c.lesson_number === lessonNumber && !seen.has(c.vocab_id)) {
        seen.add(c.vocab_id)
        result.push(c)
      }
    }
    return result
  }, [stats.wrongCards, book, lessonNumber])

  const hasRetry = retryCards.length > 0

  function handleRetry() {
    initSession(retryCards as unknown as UnifiedCard[], retryMode, retryMode === 'type-input' ? retrySubMode : undefined)
    navigate({ to: '/study/review', search: { filter: 'all' } })
  }

  function handleLaunch(mode: StudyMode, subMode?: TypeInputSubMode, order?: 'random' | 'sequential') {
    setShowConfig(false)
    launchVocabSession(book, lessonNumber, configContext === 'due', mode, subMode, order)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="z-10 bg-background border-b border-border/10 shrink-0">
        {/* Main header */}
        <div className="p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/books/$book"
              params={{ book }}
              className="inline-flex items-center gap-1 text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              ← LESSON LIST
            </Link>
            <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground mb-1">
              {book.toUpperCase()}
            </p>
            <h1 className="text-6xl sm:text-7xl font-black font-[var(--br-heading-font)] tracking-tighter leading-none">
              {String(lessonNumber).padStart(2, '0')}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2 pt-1 shrink-0 sm:flex-row sm:items-center sm:pt-0 sm:mt-2">
            <HiddenVocabBadge count={hiddenCount} onClick={() => setHiddenPanelOpen(true)} />
            {dueCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="font-[var(--br-mono-font)]"
                onClick={() => {
                  setConfigContext('due')
                  setShowConfig(true)
                }}
              >
                ÔN TẬP (
                {dueCount}
                )
              </Button>
            )}
            <Button
              className="font-[var(--br-mono-font)]"
              onClick={() => {
                setConfigContext('all')
                setShowConfig(true)
              }}
              disabled={nonDeprecated.length === 0}
            >
              STUDY
            </Button>
          </div>
        </div>

        {/* Progress strip */}
        {!isLoading && total > 0 && (
          <div className="px-4 pb-3 flex flex-col gap-2">
            <SRSProgressBar stats={srsStats} height="h-2" animDelay={0.05} />
            <div className="flex items-end gap-3 overflow-x-auto pb-0.5 sm:gap-4">
              {[
                { count: newCount, label: 'CHƯA HỌC', color: 'text-foreground/50' },
                { count: learningCount, label: 'ĐANG HỌC', color: 'text-warning' },
                { count: reviewCount, label: 'ÔN TẬP', color: 'text-info' },
                { count: matureCount, label: 'ĐÃ THUỘC', color: 'text-success' },
              ].map(({ count, label, color }) => (
                <div key={label} className="flex flex-col shrink-0">
                  <span className={`text-xs sm:text-sm font-black font-[var(--br-mono-font)] leading-none tabular-nums ${color}`}>
                    {count}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-[var(--br-mono-font)] text-muted-foreground uppercase">{label}</span>
                </div>
              ))}
              {dueCount > 0 && (
                <div className="flex flex-col shrink-0 border-l border-border/10 pl-4">
                  <span className="text-xs sm:text-sm font-black font-[var(--br-mono-font)] text-destructive leading-none tabular-nums">{dueCount}</span>
                  <span className="text-[8px] sm:text-[9px] font-[var(--br-mono-font)] text-muted-foreground uppercase">ĐẾN HẠN</span>
                </div>
              )}
              {nextReview && (
                <span className="ml-auto shrink-0 self-end text-[9px] font-[var(--br-mono-font)] uppercase text-foreground/40 pb-0.5">
                  ôn tiếp:
                  {' '}
                  {nextReview}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Retry banner — only shown when there are wrong cards from the last session */}
        {hasRetry && (
          <div className="border-t-2 border-destructive bg-destructive/5 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-[var(--br-mono-font)] uppercase text-destructive tracking-widest">
                  ÔN LẠI —
                  {' '}
                  {retryCards.length}
                  {' '}
                  TỪ SAI
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {retryCards.slice(0, 6).map(c => (
                  <span
                    key={c.vocab_id}
                    className="text-xs font-[var(--br-jp-font)] bg-background border border-destructive/30 px-1.5 py-0.5"
                  >
                    {c.word ?? c.reading}
                  </span>
                ))}
                {retryCards.length > 6 && (
                  <span className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground self-center">
                    +
                    {retryCards.length - 6}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Inline mode picker */}
              <div className="flex">
                {RETRY_MODES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRetryMode(value)}
                    className={`h-6 px-2 text-[10px] font-[var(--br-mono-font)] uppercase border transition-colors ${retryMode === value ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-destructive/30 text-destructive/70 hover:bg-destructive/10'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="font-[var(--br-mono-font)] uppercase text-[11px] shrink-0"
                onClick={handleRetry}
              >
                BẮT ĐẦU →
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <VocabList
          items={nonDeprecated}
          cards={cards}
          userId={userId}
          isLoading={isLoading}
          hiddenPanelOpen={isDesktop && hiddenPanelOpen}
          onHiddenPanelClose={() => setHiddenPanelOpen(false)}
        />
      </div>

      {showConfig && (
        <VocabStudyModal
          title={`Bài ${String(lessonNumber).padStart(2, '0')}`}
          {...(configContext === 'due'
            ? { context: 'due' as const, dueCount }
            : { context: 'all' as const })}
          stats={srsStats}
          onLaunch={handleLaunch}
          onClose={() => setShowConfig(false)}
        />
      )}

      {!isDesktop && (
        <Sheet open={hiddenPanelOpen} onOpenChange={setHiddenPanelOpen}>
          <SheetContent side="bottom" className="max-h-[60vh] flex flex-col p-0">
            <div className="px-4 py-3 border-b border-border/10 shrink-0">
              <p className="text-[11px] font-[var(--br-mono-font)] uppercase font-bold tracking-wider">
                Từ Đang Ẩn — Bài
                {' '}
                {String(lessonNumber).padStart(2, '0')}
              </p>
              <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground mt-0.5">
                {hiddenCount}
                {' '}
                từ · Nhấn HIỆN để bỏ ẩn
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <HiddenVocabList source="lesson" userId={userId} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
