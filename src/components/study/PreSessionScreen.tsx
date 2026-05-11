import type { StudyMode, TypeInputSubMode } from '../../types/study'
import type { CardTypeFilter } from '../../types/unified-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PreSessionScreenProps {
  filter: CardTypeFilter
  vocabCount: number
  kanjiCount: number
  kanjiVocabCount: number
  mode: StudyMode
  typeInputSubMode: TypeInputSubMode
  onSetMode: (m: StudyMode) => void
  onSetTypeInputSubMode: (m: TypeInputSubMode) => void
  onStart: () => void
  onBack: () => void
}

const MODES_FOR_FILTER: Record<CardTypeFilter, StudyMode[]> = {
  all: ['flashcard', 'quiz', 'type-input'],
  vocab: ['flashcard', 'quiz', 'type-input', 'sentence-flashcard', 'listening', 'pitch-discrimination'],
  kanji: ['flashcard', 'quiz', 'type-input'],
  decks: ['flashcard', 'quiz', 'type-input'],
}

const MODE_LABELS: Record<StudyMode, string> = {
  'flashcard': 'Thẻ lật',
  'quiz': 'Trắc nghiệm',
  'type-input': 'Gõ từ',
  'sentence-flashcard': 'Thẻ câu',
  'listening': 'Nghe hiểu',
  'reading-comprehension': 'Đọc hiểu',
  'pitch-discrimination': 'Thanh điệu',
}

// word→han_viet is excluded: it's used only in specialized kanji-vocab flows, not general review
const TYPE_INPUT_SUB_MODES: { value: Exclude<TypeInputSubMode, 'word→han_viet'>, label: string }[] = [
  { value: 'word→hira', label: 'TỪ VỰNG → CÁCH ĐỌC' },
  { value: 'vi→hira', label: 'TIẾNG VIỆT → CÁCH ĐỌC' },
  { value: 'word→vi', label: 'TỪ VỰNG → NGHĨA VIỆT' },
]

export function PreSessionScreen({
  filter,
  vocabCount,
  kanjiCount,
  kanjiVocabCount,
  mode,
  typeInputSubMode,
  onSetMode,
  onSetTypeInputSubMode,
  onStart,
  onBack,
}: PreSessionScreenProps) {
  const total = vocabCount + kanjiCount + kanjiVocabCount
  const availableModes = MODES_FOR_FILTER[filter]

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 p-4 max-w-md mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="self-start font-[var(--br-mono-font)] text-[11px] uppercase text-muted-foreground hover:text-foreground"
      >
        ← STUDY
      </button>

      <div className="text-center">
        <p className="text-6xl font-black font-[var(--br-heading-font)] tracking-tight">{total}</p>
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground mt-1">
          THẺ ĐẾN HẠN
        </p>
      </div>

      {/* Counts by type */}
      <div className="flex gap-4 text-center">
        {vocabCount > 0 && (
          <div>
            <p className="font-bold text-lg">{vocabCount}</p>
            <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Từ vựng</p>
          </div>
        )}
        {kanjiVocabCount > 0 && (
          <div>
            <p className="font-bold text-lg">{kanjiVocabCount}</p>
            <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Hán-từ</p>
          </div>
        )}
        {kanjiCount > 0 && (
          <div>
            <p className="font-bold text-lg">{kanjiCount}</p>
            <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Hán tự</p>
          </div>
        )}
      </div>

      {/* Mode selector */}
      <div className="w-full flex flex-col gap-2">
        <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
          CHẾ ĐỘ HỌC
        </p>
        <div className="grid grid-cols-2 gap-2">
          {availableModes.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onSetMode(m)}
              className={cn(
                'px-3 py-2 text-[11px] font-[var(--br-mono-font)] uppercase tracking-wide border transition-colors',
                mode === m
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border/20 hover:border-border/50',
              )}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Sub-mode selector — visible only when type-input is active */}
        {mode === 'type-input' && (
          <div className="flex flex-col gap-2">
            <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
              TUỲ CHỌN GÕ TỪ
            </p>
            <div className="flex flex-col gap-1">
              {TYPE_INPUT_SUB_MODES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={typeInputSubMode === value}
                  onClick={() => onSetTypeInputSubMode(value)}
                  className={cn(
                    'px-3 py-2 text-[11px] font-[var(--br-mono-font)] uppercase tracking-wide border transition-colors text-left min-h-[44px]',
                    typeInputSubMode === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border/20 hover:border-border/50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        size="lg"
        className="w-full font-[var(--br-heading-font)] uppercase tracking-wide"
        onClick={onStart}
        disabled={total === 0}
      >
        BẮT ĐẦU (
        {total}
        )
      </Button>
    </div>
  )
}
