import type { LessonStats } from '../../types/study'
import type { SRSStats } from '../common/SRSProgressBar'
import type { VocabTypeSubMode } from './KanjiVocabTypeInputCard'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { SRSProgressBar } from '../common/SRSProgressBar'

type StudyMode = 'flashcard' | 'quiz' | 'type'
type StudyType = 'kanji' | 'vocab'

interface ModeOption {
  mode: StudyMode
  vocabSubMode?: VocabTypeSubMode
  name: string
  desc: string
  tag: string
}

const KANJI_MODES: ModeOption[] = [
  { mode: 'flashcard', name: 'Flashcard', desc: 'Lật thẻ · ghi nhớ theo SRS', tag: 'SRS' },
  { mode: 'quiz', name: 'Trắc nghiệm', desc: 'Chọn Hán Việt đúng · 4 đáp án', tag: '4×' },
  { mode: 'type', name: 'Gõ Hán Việt', desc: 'Gõ Hán Việt · không cần dấu', tag: 'GÕ' },
]

const VOCAB_MODES: ModeOption[] = [
  { mode: 'flashcard', name: 'Flashcard', desc: 'Lật thẻ · ghi nhớ theo SRS', tag: 'SRS' },
  { mode: 'quiz', name: 'Trắc nghiệm', desc: 'Chọn nghĩa tiếng Việt đúng', tag: '4×' },
  { mode: 'type', vocabSubMode: 'word→hira', name: 'Gõ cách đọc', desc: 'Từ vựng Kanji → gõ hiragana', tag: 'かな' },
  { mode: 'type', vocabSubMode: 'vi→hira', name: 'Gõ từ vựng', desc: 'Nghĩa tiếng Việt → gõ hiragana', tag: 'かな' },
  { mode: 'type', vocabSubMode: 'word→vi+hanviet', name: 'Gõ nghĩa + Hán Việt', desc: 'Từ vựng Kanji → 2 ô nhập liệu', tag: '2+' },
]

function modeKey(m: ModeOption): string {
  return m.vocabSubMode ? `${m.mode}:${m.vocabSubMode}` : m.mode
}

export type { LessonStats } from '../../types/study'

interface ModeRowProps {
  type: StudyType
  modeOpt: ModeOption
  index: number
  onSelect: (type: StudyType, mode: StudyMode, vocabSubMode?: VocabTypeSubMode) => void
}

function ModeRow({ type, modeOpt, index, onSelect }: ModeRowProps) {
  const isSubMode = modeOpt.mode === 'type' && !!modeOpt.vocabSubMode

  return (
    <button
      type="button"
      className={`group w-full flex items-center gap-3 border-b border-border/10
        hover:bg-primary hover:text-primary-foreground transition-colors text-left
        ${isSubMode ? 'pl-9 pr-4 py-2.5' : 'px-5 py-3'}`}
      onClick={() => onSelect(type, modeOpt.mode, modeOpt.vocabSubMode)}
    >
      {/* Sequential index */}
      <span className="font-[var(--br-mono-font)] text-[10px] text-foreground/25 group-hover:text-primary-foreground/50 transition-colors w-4 shrink-0 tabular-nums leading-none">
        {String(index).padStart(2, '0')}
      </span>

      {/* Left rail */}
      <div className="w-px h-7 bg-primary group-hover:bg-primary-foreground/60 transition-colors shrink-0" />

      {/* Label + desc */}
      <div className="flex-1 min-w-0">
        <span className="font-[var(--br-heading-font)] font-bold uppercase tracking-wide leading-none text-[15px]">
          {modeOpt.name}
        </span>
        <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground group-hover:text-primary-foreground/75 transition-colors mt-0.5 leading-snug">
          {modeOpt.desc}
        </p>
      </div>

      {/* Tag + arrow — inherits text color from group so transitions naturally */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-[var(--br-mono-font)] text-[9px] uppercase border border-current px-1 py-px tabular-nums leading-none">
          {modeOpt.tag}
        </span>
        <span className="font-[var(--br-mono-font)] text-[11px] opacity-40 group-hover:opacity-100 transition-opacity">
          →
        </span>
      </div>
    </button>
  )
}

interface KanjiStudyModalProps {
  lessonNum: number
  stats: LessonStats
  type?: 'kanji' | 'vocab'
  onClose: () => void
}

export function KanjiStudyModal({ lessonNum, stats, type, onClose }: KanjiStudyModalProps) {
  const { total, new: newCount, learning, review, mature } = stats
  const studied = learning + review + mature
  const navigate = useNavigate()

  function go(studyType: StudyType, mode: StudyMode, vocabSubMode?: VocabTypeSubMode) {
    onClose()
    navigate({
      to: '/kanji/lesson-study',
      search: { lesson: lessonNum, type: studyType, mode, ...(vocabSubMode ? { vocabSubMode } : {}) },
    })
  }

  const srsStats: SRSStats = { total, new: newCount, learning, review, mature }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border border-foreground/20 gap-0">
        {/* ── Accent top rail ── */}
        <div className="h-0.5 bg-primary w-full shrink-0" />

        {/* ── Header ── */}
        <div className="bg-card px-5 pt-4 pb-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest mb-1">
                Chọn chế độ học
              </p>
              <h2 className="font-[var(--br-heading-font)] font-black text-4xl uppercase tracking-tighter leading-none">
                Bài
                {' '}
                {String(lessonNum).padStart(2, '0')}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Đóng [ESC]"
              className="font-[var(--br-mono-font)] text-[11px] mt-0.5 h-8 w-8 p-0"
              onClick={onClose}
            >
              ✕
            </Button>
          </div>

          {/* Segmented SRS progress bar — matches lesson panel */}
          <SRSProgressBar stats={srsStats} height="h-2" animDelay={0.05} />

          {/* Stat legend */}
          <div className="flex items-center gap-3 py-2.5 flex-wrap">
            {newCount > 0 && (
              <span className="font-[var(--br-mono-font)] text-[10px] text-foreground/40">
                <span className="font-bold">{newCount}</span>
                {' '}
                chưa học
              </span>
            )}
            {learning > 0 && (
              <span className="font-[var(--br-mono-font)] text-[10px] text-warning">
                <span className="font-bold">{learning}</span>
                {' '}
                đang học
              </span>
            )}
            {review > 0 && (
              <span className="font-[var(--br-mono-font)] text-[10px] text-info">
                <span className="font-bold">{review}</span>
                {' '}
                ôn tập
              </span>
            )}
            {mature > 0 && (
              <span className="font-[var(--br-mono-font)] text-[10px] text-success">
                <span className="font-bold">{mature}</span>
                {' '}
                thuộc
              </span>
            )}
            <span className="font-[var(--br-mono-font)] text-[10px] text-foreground/25 ml-auto tabular-nums">
              {studied}
              /
              {total}
              {' '}
              hán tự
            </span>
          </div>
        </div>

        {/* ── 単漢字 section ── */}
        {(type === undefined || type === 'kanji') && (
          <div>
            <div className="flex items-center gap-2 px-5 py-2 border-y border-border/10 bg-secondary/50">
              <div className="w-0.5 h-3.5 bg-primary shrink-0" />
              <span
                className="text-[13px] font-bold leading-none"
                style={{ fontFamily: 'var(--br-jp-font)' }}
              >
                単漢字
              </span>
              <span className="font-[var(--br-mono-font)] text-[9px] uppercase text-muted-foreground ml-1">
                KANJI ĐƠN
              </span>
              <span className="font-[var(--br-mono-font)] text-[9px] text-foreground/25 ml-auto">
                {KANJI_MODES.length}
              </span>
            </div>
            {KANJI_MODES.map((m, i) => (
              <ModeRow key={modeKey(m)} type="kanji" modeOpt={m} index={i + 1} onSelect={go} />
            ))}
          </div>
        )}

        {/* ── Từ vựng kanji section ── */}
        {(type === undefined || type === 'vocab') && (
          <div>
            <div className="flex items-center gap-2 px-5 py-2 border-y border-border/10 bg-secondary/50">
              <div className="w-0.5 h-3.5 bg-primary shrink-0" />
              <span
                className="text-[13px] font-bold leading-none"
                style={{ fontFamily: 'var(--br-jp-font)' }}
              >
                語彙
              </span>
              <span className="font-[var(--br-mono-font)] text-[9px] uppercase text-muted-foreground ml-1">
                TỪ VỰNG KANJI
              </span>
              <span className="font-[var(--br-mono-font)] text-[9px] text-foreground/25 ml-auto">
                {VOCAB_MODES.length}
              </span>
            </div>
            {VOCAB_MODES.map((m, i) => (
              <ModeRow key={modeKey(m)} type="vocab" modeOpt={m} index={i + 1} onSelect={go} />
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-5 py-2 bg-card border-t border-border/10">
          <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-foreground/20 text-right tracking-widest">
            [ESC] đóng
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
