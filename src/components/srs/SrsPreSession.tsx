import type { TypeInputSubMode } from '../../types/study'

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
      <p className="font-[var(--br-mono-font)] text-sm uppercase text-base-content/60">
        {dueCardsCount}
        {' '}
        thẻ đến hạn
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <p className="font-[var(--br-mono-font)] text-[11px] uppercase text-base-content/50">Chế độ ôn tập</p>
        <div className="join w-full">
          <button
            type="button"
            onClick={() => onSetSrsMode('flashcard')}
            className={`btn join-item flex-1 font-[var(--br-mono-font)] text-[11px] uppercase ${srsMode === 'flashcard' ? 'btn-primary' : 'btn-outline'}`}
          >
            Lật thẻ
          </button>
          <button
            type="button"
            onClick={() => onSetSrsMode('type-input')}
            className={`btn join-item flex-1 font-[var(--br-mono-font)] text-[11px] uppercase ${srsMode === 'type-input' ? 'btn-primary' : 'btn-outline'}`}
          >
            Gõ từ
          </button>
        </div>

        {srsMode === 'type-input' && (
          <div className="flex flex-col gap-2 w-full">
            {TYPE_INPUT_SUB_MODES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onSetTypeInputSubMode(value)}
                className={`btn w-full font-[var(--br-mono-font)] text-[11px] uppercase ${typeInputSubMode === value ? 'btn-neutral' : 'btn-outline'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {startError && (
        <div className="alert alert-warning max-w-sm w-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="font-[var(--br-mono-font)] text-[11px] uppercase">{startError}</span>
        </div>
      )}

      {vocabLoadFailed && (
        <div className="alert alert-error max-w-sm w-full">
          <span className="font-[var(--br-mono-font)] text-[11px] uppercase">
            Không tìm thấy dữ liệu từ vựng cho các thẻ này. Thẻ có thể thuộc custom deck hoặc dữ liệu bị lỗi — hãy làm mới trang.
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={!isVocabReady}
        className="btn btn-primary btn-lg font-[var(--br-heading-font)] uppercase tracking-wide"
      >
        {!isVocabReady && !vocabLoadFailed ? 'Đang tải...' : 'Bắt đầu ôn tập'}
      </button>
    </div>
  )
}
