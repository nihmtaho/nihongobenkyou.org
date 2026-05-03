import type { TypeInputSubMode } from '../../types/study'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'

const TYPE_INPUT_SUB_MODES: { value: TypeInputSubMode, label: string }[] = [
  { value: 'word→hira', label: 'Từ → Đọc' },
  { value: 'vi→hira', label: 'Nghĩa → Đọc' },
  { value: 'word→vi', label: 'Từ → Nghĩa Việt' },
]

interface Props {
  dueCardsCount: number
  srsMode: 'flashcard' | 'type-input'
  onSetSrsMode: (m: 'flashcard' | 'type-input') => void
  typeInputSubMode: TypeInputSubMode
  onSetTypeInputSubMode: (m: TypeInputSubMode) => void
  onStart: () => void
  startError: string | null
  vocabLoadFailed: boolean
  isVocabReady: boolean
}

export function SrsPreSession({
  dueCardsCount,
  srsMode,
  onSetSrsMode,
  typeInputSubMode,
  onSetTypeInputSubMode,
  onStart,
  startError,
  vocabLoadFailed,
  isVocabReady,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
      <h1 className="text-4xl font-black font-[var(--br-heading-font)] tracking-tight uppercase">
        ÔN TẬP HÀNG NGÀY
      </h1>
      <p className="font-[var(--br-mono-font)] text-sm uppercase text-foreground/60">
        {dueCardsCount}
        {' '}
        thẻ đến hạn
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <p className="font-[var(--br-mono-font)] text-[11px] uppercase text-foreground/50">Chế độ ôn tập</p>
        <ButtonGroup className="w-full">
          <Button
            type="button"
            variant={srsMode === 'flashcard' ? 'default' : 'outline'}
            className="flex-1 font-[var(--br-mono-font)] text-[11px] uppercase"
            onClick={() => onSetSrsMode('flashcard')}
          >
            Lật thẻ
          </Button>
          <Button
            type="button"
            variant={srsMode === 'type-input' ? 'default' : 'outline'}
            className="flex-1 font-[var(--br-mono-font)] text-[11px] uppercase"
            onClick={() => onSetSrsMode('type-input')}
          >
            Gõ từ
          </Button>
        </ButtonGroup>

        {srsMode === 'type-input' && (
          <div className="flex flex-col gap-2 w-full">
            {TYPE_INPUT_SUB_MODES.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                variant={typeInputSubMode === value ? 'default' : 'outline'}
                className="w-full font-[var(--br-mono-font)] text-[11px] uppercase"
                onClick={() => onSetTypeInputSubMode(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {startError && (
        <Alert className="bg-warning/10 border-warning/50 max-w-sm w-full">
          <AlertDescription className="font-[var(--br-mono-font)] text-[11px] uppercase">
            {startError}
          </AlertDescription>
        </Alert>
      )}

      {vocabLoadFailed && (
        <Alert variant="destructive" className="max-w-sm w-full">
          <AlertDescription className="font-[var(--br-mono-font)] text-[11px] uppercase">
            Không tìm thấy dữ liệu từ vựng cho các thẻ này. Thẻ có thể thuộc custom deck hoặc dữ liệu bị lỗi — hãy làm mới trang.
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        size="lg"
        disabled={!isVocabReady}
        className="font-[var(--br-heading-font)] uppercase tracking-wide"
        onClick={onStart}
      >
        {!isVocabReady && !vocabLoadFailed ? 'Đang tải...' : 'Bắt đầu ôn tập'}
      </Button>
    </div>
  )
}
