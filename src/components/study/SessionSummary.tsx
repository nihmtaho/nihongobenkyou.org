import type { SRSRating } from '../../types/srs'
import type { SessionStats, StudyMode } from '../../types/study'
import type { ActiveTab } from './study.config'
import { useNavigate } from '@tanstack/react-router'
import { useStudySessionStore } from '../../stores/studySessionStore'

interface SessionSummaryProps {
  stats: SessionStats
  mode: StudyMode
  ratingCounts?: Record<SRSRating, number>
  streak?: number
  lessonContext?: { book: string, lesson: number }
  returnTab?: ActiveTab
}

const MODE_LABELS: Record<StudyMode, string> = {
  'flashcard': 'Thẻ từ',
  'quiz': 'Trắc nghiệm',
  'type-input': 'Gõ từ',
  'sentence-flashcard': 'Thẻ câu',
  'listening': 'Nghe hiểu',
  'reading-comprehension': 'Đọc hiểu',
  'pitch-discrimination': 'Thanh điệu',
}

function formatDuration(startTime: Date): string {
  const secs = Math.round((Date.now() - startTime.getTime()) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SessionSummary({ stats, mode, ratingCounts, streak, lessonContext, returnTab }: SessionSummaryProps) {
  const requeueWrongCards = useStudySessionStore(s => s.requeueWrongCards)
  const navigate = useNavigate()
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
  const isPerfect = stats.total > 0 && stats.correct === stats.total
  const hasWrong = !isPerfect && stats.wrongCards.length > 0

  function handleRetryWrong() {
    requeueWrongCards()
    navigate({ to: '/study/$mode', params: { mode }, search: { returnTab } })
  }

  function navigateToStudy() {
    navigate({ to: '/study', search: { tab: returnTab } })
  }

  function handleBackToLesson() {
    if (lessonContext) {
      navigate({
        to: '/books/$book/$lesson',
        params: { book: lessonContext.book, lesson: String(lessonContext.lesson) },
      })
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-sm mx-auto lg:max-w-lg">

      {/* Header */}
      <div className="w-full flex items-start justify-between">
        <div>
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral mb-1">
            {MODE_LABELS[mode]}
            {' '}
            · KẾT QUẢ
          </p>
          <p className={`text-3xl font-black font-[var(--br-heading-font)] uppercase tracking-tight ${isPerfect ? 'text-success' : ''}`}>
            {isPerfect ? 'HOÀN HẢO!' : 'HOÀN THÀNH'}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-black font-[var(--br-mono-font)] ${accuracy >= 80 ? 'text-success' : accuracy >= 50 ? 'text-warning' : 'text-error'}`}>
            {accuracy}
            <span className="text-xl">%</span>
          </p>
          <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral">CHÍNH XÁC</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats stats-horizontal w-full border border-base-content/10">
        <div className="stat p-3">
          <div className="stat-value text-base font-[var(--br-mono-font)]">
            {stats.correct}
            <span className="text-base-content/40">
              /
              {stats.total}
            </span>
          </div>
          <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">ĐÚNG</div>
        </div>
        {hasWrong && (
          <div className="stat p-3">
            <div className="stat-value text-base font-[var(--br-mono-font)] text-error">{stats.wrongCards.length}</div>
            <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">SAI</div>
          </div>
        )}
        <div className="stat p-3">
          <div className="stat-value text-base font-[var(--br-mono-font)]">{formatDuration(stats.startTime)}</div>
          <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">THỜI GIAN</div>
        </div>
        {streak !== undefined && (
          <div className="stat p-3">
            <div className="stat-value text-base font-[var(--br-mono-font)] text-primary">{streak}</div>
            <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">NGÀY</div>
          </div>
        )}
      </div>

      {/* Rating breakdown */}
      {ratingCounts && (
        <div className="stats stats-horizontal w-full border border-base-content/10">
          <div className="stat p-3">
            <div className="stat-value text-base font-[var(--br-mono-font)] text-error">{ratingCounts[0]}</div>
            <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">AGAIN</div>
          </div>
          <div className="stat p-3">
            <div className="stat-value text-base font-[var(--br-mono-font)] text-warning">{ratingCounts[1]}</div>
            <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">HARD</div>
          </div>
          <div className="stat p-3">
            <div className="stat-value text-base font-[var(--br-mono-font)] text-success">{ratingCounts[2]}</div>
            <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">GOOD</div>
          </div>
          <div className="stat p-3">
            <div className="stat-value text-base font-[var(--br-mono-font)] text-info">{ratingCounts[3]}</div>
            <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">EASY</div>
          </div>
        </div>
      )}

      {/* Wrong cards preview */}
      {hasWrong && (
        <div className="w-full border-l-4 border-error bg-error/5 p-3 flex flex-col gap-2">
          <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-error tracking-widest">
            {stats.wrongCards.length}
            {' '}
            TỪ CẦN ÔN LẠI
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.wrongCards.slice(0, 8).map(c => (
              <span
                key={c.vocab_id}
                className="text-sm font-[var(--br-jp-font)] bg-base-200 border border-base-content/10 px-2 py-0.5"
              >
                {c.word ?? c.reading}
              </span>
            ))}
            {stats.wrongCards.length > 8 && (
              <span className="text-[11px] font-[var(--br-mono-font)] text-neutral self-center">
                +
                {stats.wrongCards.length - 8}
                {' '}
                nữa
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full">
        {hasWrong && (
          <button
            className="btn btn-error w-full font-[var(--br-heading-font)] uppercase tracking-wide"
            onClick={handleRetryWrong}
          >
            ÔN LẠI
            {' '}
            {stats.wrongCards.length}
            {' '}
            TỪ SAI
          </button>
        )}

        {lessonContext
          ? (
              <>
                <button
                  className="btn btn-primary w-full font-[var(--br-heading-font)] uppercase tracking-wide"
                  onClick={handleBackToLesson}
                >
                  ← VỀ BÀI
                  {' '}
                  {String(lessonContext.lesson).padStart(2, '0')}
                </button>
                <button
                  className="btn btn-ghost w-full font-[var(--br-mono-font)] uppercase text-[11px]"
                  onClick={() => navigateToStudy()}
                >
                  Về Study
                </button>
              </>
            )
          : (
              <button
                className="btn btn-primary w-full font-[var(--br-heading-font)] uppercase tracking-wide"
                onClick={() => navigateToStudy()}
              >
                VỀ STUDY
              </button>
            )}
      </div>
    </div>
  )
}
