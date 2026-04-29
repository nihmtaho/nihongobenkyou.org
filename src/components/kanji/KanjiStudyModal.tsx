import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

type StudyMode = 'flashcard' | 'quiz' | 'type'
type StudyType = 'kanji' | 'vocab'

interface ModeOption {
  mode: StudyMode
  name: string
  desc: string
}

const KANJI_MODES: ModeOption[] = [
  { mode: 'flashcard', name: 'Flashcard', desc: 'Lật thẻ · ghi nhớ theo SRS' },
  { mode: 'quiz', name: 'Trắc nghiệm', desc: 'Chọn Hán Việt đúng (4 đáp án)' },
  { mode: 'type', name: 'Gõ từ', desc: 'Gõ Hán Việt · chấp nhận không dấu' },
]

const VOCAB_MODES: ModeOption[] = [
  { mode: 'flashcard', name: 'Flashcard', desc: 'Lật thẻ · ghi nhớ theo SRS' },
  { mode: 'quiz', name: 'Trắc nghiệm', desc: 'Chọn nghĩa tiếng Việt đúng' },
  { mode: 'type', name: 'Gõ từ', desc: 'Gõ hiragana · # = romaji, @ = katakana' },
]

interface ModeRowProps {
  type: StudyType
  modeOpt: ModeOption
  onSelect: (type: StudyType, mode: StudyMode) => void
}

function ModeRow({ type, modeOpt, onSelect }: ModeRowProps) {
  return (
    <button
      type="button"
      className="group w-full flex items-center justify-between px-4 py-3 border-b border-base-content/10 hover:bg-primary hover:text-primary-content transition-colors text-left"
      onClick={() => onSelect(type, modeOpt.mode)}
    >
      <span className="font-[var(--br-heading-font)] font-bold text-base uppercase tracking-wide">
        {modeOpt.name}
      </span>
      <span className="text-[10px] font-[var(--br-mono-font)] text-neutral group-hover:text-primary-content transition-colors ml-4 text-right leading-tight max-w-[160px]">
        {modeOpt.desc}
      </span>
    </button>
  )
}

interface LessonStats {
  total: number
  studied: number
  mature: number
}

interface KanjiStudyModalProps {
  lessonNum: number
  stats: LessonStats
  onClose: () => void
}

export function KanjiStudyModal({ lessonNum, stats, onClose }: KanjiStudyModalProps) {
  const { total, studied, mature } = stats
  const newCount = total - studied
  const learningCount = studied - mature
  const navigate = useNavigate()

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape')
        onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  function go(type: StudyType, mode: StudyMode) {
    onClose()
    navigate({ to: '/kanji/lesson-study', search: { lesson: lessonNum, type, mode } })
  }

  return (
    <dialog
      className="modal modal-open"
      onClick={onClose}
    >
      <div
        className="modal-box max-w-sm p-0 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-base-content/10 bg-base-200">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div>
              <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
                Chọn chế độ học
              </p>
              <p className="font-[var(--br-heading-font)] font-black text-2xl uppercase tracking-tighter leading-none">
                Bài
                {' '}
                {String(lessonNum).padStart(2, '0')}
              </p>
            </div>
            <button
              type="button"
              aria-label="Đóng"
              className="btn btn-ghost btn-sm btn-square font-[var(--br-mono-font)]"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* Progress strip */}
          <div className="px-4 pb-3">
            <progress
              className="progress progress-primary h-1.5 w-full mb-2"
              value={studied}
              max={total}
            />
            <div className="flex items-center gap-3">
              {newCount > 0 && (
                <span className="font-[var(--br-mono-font)] text-[10px] text-neutral">
                  <span className="font-bold">{newCount}</span>
                  {' '}
                  mới
                </span>
              )}
              {learningCount > 0 && (
                <span className="font-[var(--br-mono-font)] text-[10px] text-primary">
                  <span className="font-bold">{learningCount}</span>
                  {' '}
                  đang học
                </span>
              )}
              {mature > 0 && (
                <span className="font-[var(--br-mono-font)] text-[10px] text-success">
                  <span className="font-bold">{mature}</span>
                  {' '}
                  thuộc
                </span>
              )}
              <span className="font-[var(--br-mono-font)] text-[10px] text-neutral ml-auto">
                {studied}
                /
                {total}
                {' '}
                hán tự
              </span>
            </div>
          </div>
        </div>

        {/* 単漢字 section */}
        <div className="bg-base-300/60 px-4 py-1.5 border-b border-base-content/10">
          <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
            単漢字
          </p>
        </div>
        {KANJI_MODES.map(m => (
          <ModeRow key={m.mode} type="kanji" modeOpt={m} onSelect={go} />
        ))}

        {/* Từ vựng section */}
        <div className="bg-base-300/60 px-4 py-1.5 border-b border-base-content/10 mt-1 border-t border-t-base-content/10">
          <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
            Từ vựng kanji
          </p>
        </div>
        {VOCAB_MODES.map(m => (
          <ModeRow key={m.mode} type="vocab" modeOpt={m} onSelect={go} />
        ))}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  )
}
