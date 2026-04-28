import type { SRSStats } from '../../../components/common/SRSProgressBar'
import type { StudyConfig, StudyMode, TypeInputSubMode } from '../../../types/study'
import type { VocabWithSRS } from '../../../types/vocabulary'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { SRSProgressBar } from '../../../components/common/SRSProgressBar'
import { StudyConfigModal } from '../../../components/study/StudyConfigModal'
import { VocabList } from '../../../components/vocabulary/VocabList'
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
  const [retryMode, setRetryMode] = useState<StudyMode>('flashcard')
  const [retrySubMode] = useState<TypeInputSubMode>('word→hira')

  const { data: items = [], isLoading } = useVocabulary(book, lessonNumber)
  const nonDeprecated = items.filter(item => !item.deprecated)
  const vocabIds = nonDeprecated.map(item => item.vocab_id)

  const userId = useAuthStore(s => s.userId) ?? ''
  const { data: cards = new Map() } = useUserCards(userId, vocabIds)
  const { initSession, stats } = useStudySessionStore()

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const total = nonDeprecated.length
  const cardList = useMemo(() => [...cards.values()], [cards])
  const learningCount = cardList.filter(c => c.interval_days < 8).length
  const reviewCount = cardList.filter(c => c.interval_days >= 8 && c.interval_days < 21).length
  const matureCount = cardList.filter(c => c.interval_days >= 21).length
  const newCount = Math.max(0, total - cardList.length)
  const dueCount = cardList.filter(c => !c.is_known && c.due_date <= today).length

  const srsStats: SRSStats = {
    total,
    new: newCount,
    learning: learningCount,
    review: reviewCount,
    mature: matureCount,
  }

  const nextReview = useMemo(
    () => formatNextReview(cardList.map(c => c.due_date), today),
    [cardList, today],
  )

  // Deduplicated wrong cards from the last session for this lesson
  const retryCards = useMemo(() => {
    const seen = new Set<string>()
    const result: VocabWithSRS[] = []
    for (const c of stats.wrongCards as VocabWithSRS[]) {
      if (c.book_source === book && c.lesson_number === lessonNumber && !seen.has(c.vocab_id)) {
        seen.add(c.vocab_id)
        result.push(c)
      }
    }
    return result
  }, [stats.wrongCards, book, lessonNumber])

  const hasRetry = retryCards.length > 0

  function handleRetry() {
    initSession(retryCards, retryMode, retryMode === 'type-input' ? retrySubMode : undefined)
    navigate({ to: '/study/$mode', params: { mode: retryMode } })
  }

  function handleStudyConfirm(config: StudyConfig) {
    const now = new Date().toISOString()
    let merged: VocabWithSRS[] = nonDeprecated.map((v) => {
      const c = cards.get(v.vocab_id)
      if (c)
        return { ...v, ...c }
      return {
        ...v,
        userId,
        vocabId: v.vocab_id,
        interval_days: 1,
        ease_factor: 2.5,
        due_date: today,
        review_count: 0,
        last_rating: null,
        pending_sync: false,
        updated_at: now,
        is_known: false,
      }
    })

    if (config.order === 'random')
      merged = merged.sort(() => Math.random() - 0.5)
    if (config.cardCount !== 'all')
      merged = merged.slice(0, config.cardCount)

    initSession(merged, config.mode, config.typeInputSubMode)
    navigate({ to: '/study/$mode', params: { mode: config.mode } })
  }

  const lessonMeta = [{ lesson_id: `${book}:${lessonNumber}`, lesson_number: lessonNumber }]

  return (
    <div className="lg:h-full lg:flex lg:flex-col lg:overflow-hidden">
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-content/10 shrink-0">
        {/* Main header */}
        <div className="p-4 flex items-end justify-between">
          <div>
            <Link
              to="/books/$book"
              params={{ book }}
              className="inline-flex items-center gap-1 text-[11px] font-[var(--br-mono-font)] uppercase text-neutral hover:text-base-content transition-colors mb-2"
            >
              ← LESSON LIST
            </Link>
            <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral mb-1">
              {book.toUpperCase()}
            </p>
            <h1 className="text-7xl font-black font-[var(--br-heading-font)] tracking-tighter leading-none">
              {String(lessonNumber).padStart(2, '0')}
            </h1>
          </div>
          <button
            className="btn btn-primary font-[var(--br-mono-font)] mb-2"
            onClick={() => setShowConfig(true)}
            disabled={nonDeprecated.length === 0}
          >
            STUDY
          </button>
        </div>

        {/* Progress strip */}
        {!isLoading && total > 0 && (
          <div className="px-4 pb-3 flex flex-col gap-2">
            <SRSProgressBar stats={srsStats} height="h-2" animDelay={0.05} />
            <div className="flex items-end gap-4 overflow-x-auto pb-0.5">
              {[
                { count: newCount, label: 'CHƯA HỌC', color: 'text-base-content/50' },
                { count: learningCount, label: 'ĐANG HỌC', color: 'text-warning' },
                { count: reviewCount, label: 'ÔN TẬP', color: 'text-info' },
                { count: matureCount, label: 'ĐÃ THUỘC', color: 'text-success' },
              ].map(({ count, label, color }) => (
                <div key={label} className="flex flex-col shrink-0">
                  <span className={`text-sm font-black font-[var(--br-mono-font)] leading-none tabular-nums ${color}`}>
                    {count}
                  </span>
                  <span className="text-[9px] font-[var(--br-mono-font)] text-neutral uppercase">{label}</span>
                </div>
              ))}
              {dueCount > 0 && (
                <div className="flex flex-col shrink-0 border-l border-base-content/10 pl-4">
                  <span className="text-sm font-black font-[var(--br-mono-font)] text-error leading-none tabular-nums">{dueCount}</span>
                  <span className="text-[9px] font-[var(--br-mono-font)] text-neutral uppercase">ĐẾN HẠN</span>
                </div>
              )}
              {nextReview && (
                <span className="ml-auto shrink-0 self-end text-[9px] font-[var(--br-mono-font)] uppercase text-base-content/40 pb-0.5">
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
          <div className="border-t-2 border-error bg-error/5 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-[var(--br-mono-font)] uppercase text-error tracking-widest">
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
                    className="text-xs font-[var(--br-jp-font)] bg-base-100 border border-error/30 px-1.5 py-0.5"
                  >
                    {c.word ?? c.reading}
                  </span>
                ))}
                {retryCards.length > 6 && (
                  <span className="text-[10px] font-[var(--br-mono-font)] text-neutral self-center">
                    +
                    {retryCards.length - 6}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Inline mode picker */}
              <div className="join">
                {RETRY_MODES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRetryMode(value)}
                    className={`btn btn-xs join-item font-[var(--br-mono-font)] text-[10px] uppercase ${retryMode === value ? 'btn-error' : 'btn-outline border-error/30 text-error/70 hover:btn-error'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="btn btn-error btn-sm font-[var(--br-mono-font)] uppercase text-[11px] shrink-0"
              >
                BẮT ĐẦU →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="lg:flex-1 lg:min-h-0">
        <VocabList
          items={nonDeprecated}
          cards={cards}
          userId={userId}
          isLoading={isLoading}
        />
      </div>

      {showConfig && (
        <StudyConfigModal
          availableLessons={lessonMeta}
          defaultLessonIds={[`${book}:${lessonNumber}`]}
          onConfirm={handleStudyConfirm}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  )
}
