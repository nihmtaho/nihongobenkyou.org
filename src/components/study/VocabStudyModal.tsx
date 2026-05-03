import type { LessonStats, StudyMode, TypeInputSubMode } from '../../types/study'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { SRSProgressBar } from '../common/SRSProgressBar'

type VocabStudyModalProps = {
  stats?: LessonStats
  onLaunch: (mode: StudyMode, subMode?: TypeInputSubMode, order?: 'random' | 'sequential') => void
  onClose: () => void
} & (
  | { context: 'all', title: string, dueCount?: never }
  | { context: 'due', title: string, dueCount: number }
)

interface ModeOption {
  mode: StudyMode
  subMode?: TypeInputSubMode
  name: string
  desc: string
  tag: string
  idx?: number
  isSubMode?: true
}

const VOCAB_MODES: ModeOption[] = [
  { mode: 'flashcard', name: 'Flashcard', desc: 'Lật thẻ · ghi nhớ theo SRS', tag: 'SRS', idx: 1 },
  { mode: 'quiz', name: 'Trắc nghiệm', desc: 'Chọn nghĩa đúng · 4 đáp án', tag: '4×', idx: 2 },
  { mode: 'type-input', subMode: 'word→hira', name: 'Từ vựng → Hiragana', desc: 'Nhìn chữ Nhật, gõ cách đọc', tag: 'かな', isSubMode: true },
  { mode: 'type-input', subMode: 'vi→hira', name: 'Tiếng Việt → Hiragana', desc: 'Nhìn nghĩa tiếng Việt, gõ hiragana', tag: 'かな', isSubMode: true },
  { mode: 'type-input', subMode: 'word→vi', name: 'Từ vựng → Tiếng Việt', desc: 'Nhìn chữ Nhật, gõ nghĩa tiếng Việt', tag: 'VI', isSubMode: true },
  { mode: 'listening', name: 'Nghe hiểu', desc: 'Nghe audio, chọn nghĩa đúng', tag: '♪', idx: 3 },
]

function modeKey(m: ModeOption) {
  return m.subMode ? `${m.mode}:${m.subMode}` : m.mode
}

export function VocabStudyModal({ title, context, dueCount, stats, onLaunch, onClose }: VocabStudyModalProps) {
  const [order, setOrder] = useState<'random' | 'sequential'>('random')

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape')
        onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border border-border/20" showCloseButton={false}>
        {/* Accent top rail */}
        <div className="h-0.5 bg-primary w-full shrink-0" />

        {/* Header */}
        <div className="bg-card px-5 pt-4 pb-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest mb-1">
                Chọn chế độ học
              </p>
              <h2 className="font-[var(--br-jp-font)] font-black text-4xl uppercase tracking-tighter leading-none">
                {title}
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Đóng [ESC]"
              className="font-[var(--br-mono-font)] text-[11px] mt-0.5"
              onClick={onClose}
            >
              ✕
            </Button>
          </div>

          {/* Context badge + order toggle */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {context === 'due'
              ? (
                  <span className="inline-flex items-center gap-1.5 font-[var(--br-mono-font)] text-[9px] uppercase tracking-widest px-2 py-1 bg-destructive/10 text-destructive border border-destructive/30">
                    ÔN TẬP ·
                    {' '}
                    {dueCount}
                    {' '}
                    THẺ ĐẾN HẠN
                  </span>
                )
              : (
                  <span className="inline-flex items-center gap-1.5 font-[var(--br-mono-font)] text-[9px] uppercase tracking-widest px-2 py-1 bg-primary/10 text-primary border border-primary/30">
                    TỰ HỌC ·
                    {' '}
                    {stats?.total ?? '—'}
                    {' '}
                    THẺ
                  </span>
                )}
            <ButtonGroup className="ml-auto">
              <Button
                type="button"
                size="xs"
                variant={order === 'random' ? 'default' : 'outline'}
                className="font-[var(--br-mono-font)] min-h-0 h-6 px-2"
                onClick={() => setOrder('random')}
              >
                NGẪU NHIÊN
              </Button>
              <Button
                type="button"
                size="xs"
                variant={order === 'sequential' ? 'default' : 'outline'}
                className="font-[var(--br-mono-font)] min-h-0 h-6 px-2"
                onClick={() => setOrder('sequential')}
              >
                TUẦN TỰ
              </Button>
            </ButtonGroup>
          </div>

          {/* SRS progress bar + stat legend */}
          {stats && (
            <>
              <SRSProgressBar stats={stats} height="h-2" animDelay={0.05} />
              <div className="flex items-center gap-3 py-2.5 flex-wrap">
                {stats.new > 0 && (
                  <span className="font-[var(--br-mono-font)] text-[10px] text-foreground/40">
                    <span className="font-bold">{stats.new}</span>
                    {' '}
                    chưa học
                  </span>
                )}
                {stats.learning > 0 && (
                  <span className="font-[var(--br-mono-font)] text-[10px] text-warning">
                    <span className="font-bold">{stats.learning}</span>
                    {' '}
                    đang học
                  </span>
                )}
                {stats.review > 0 && (
                  <span className="font-[var(--br-mono-font)] text-[10px] text-info">
                    <span className="font-bold">{stats.review}</span>
                    {' '}
                    ôn tập
                  </span>
                )}
                {stats.mature > 0 && (
                  <span className="font-[var(--br-mono-font)] text-[10px] text-success">
                    <span className="font-bold">{stats.mature}</span>
                    {' '}
                    thuộc
                  </span>
                )}
                <span className="font-[var(--br-mono-font)] text-[10px] text-foreground/25 ml-auto tabular-nums">
                  {stats.learning + stats.review + stats.mature}
                  /
                  {stats.total}
                  {' '}
                  từ
                </span>
              </div>
            </>
          )}
        </div>

        {/* Mode list */}
        <div>
          {VOCAB_MODES.map((m, i) => (
            <div key={modeKey(m)}>
              {/* Insert GÕ TỪ divider before first sub-mode row */}
              {m.isSubMode && !VOCAB_MODES[i - 1]?.isSubMode && (
                <div className="flex items-center gap-2 px-5 py-2 border-y border-border/10 bg-secondary/50">
                  <div className="w-0.5 h-3.5 bg-primary shrink-0" />
                  <span className="font-[var(--br-mono-font)] text-[11px] font-bold uppercase tracking-wide">
                    GÕ TỪ
                  </span>
                </div>
              )}
              <button
                type="button"
                className={`group w-full flex items-center gap-3 border-b border-border/10
                  hover:bg-primary hover:text-primary-foreground transition-colors text-left
                  ${m.isSubMode ? 'pl-9 pr-4 py-2.5' : 'px-5 py-3'}`}
                onClick={() => onLaunch(m.mode, m.subMode, order)}
              >
                <span className="font-[var(--br-mono-font)] text-[10px] text-foreground/25 group-hover:text-primary-foreground/50 transition-colors w-4 shrink-0 tabular-nums leading-none">
                  {m.isSubMode ? '—' : String(m.idx ?? 0).padStart(2, '0')}
                </span>
                <div className="w-px h-7 bg-primary group-hover:bg-primary-foreground/60 transition-colors shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-[var(--br-heading-font)] font-bold uppercase tracking-wide leading-none text-[15px]">
                    {m.name}
                  </span>
                  <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground group-hover:text-primary-foreground/75 transition-colors mt-0.5 leading-snug">
                    {m.desc}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-[var(--br-mono-font)] text-[9px] uppercase border border-current px-1 py-px tabular-nums leading-none">
                    {m.tag}
                  </span>
                  <span className="font-[var(--br-mono-font)] text-[11px] opacity-40 group-hover:opacity-100 transition-opacity">
                    →
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 bg-card border-t border-border/10">
          <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-foreground/20 text-right tracking-widest">
            [ESC] đóng
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
