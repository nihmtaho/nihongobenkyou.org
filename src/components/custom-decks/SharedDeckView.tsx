import type { CustomDeck, CustomVocabItem } from '../../types/custom-deck'
import { useAuthStore } from '../../stores/authStore'

interface Props {
  deck: CustomDeck | null
  words: CustomVocabItem[]
  isLoading: boolean
  onImport?: () => void
  isImporting?: boolean
}

export function SharedDeckView({ deck, words, isLoading, onImport, isImporting }: Props) {
  const { isAuthenticated } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-lg font-bold">Không tìm thấy bộ từ vựng</p>
        <p className="text-sm text-base-content/60">
          Bộ từ vựng này không tồn tại hoặc đã được đặt thành riêng tư.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="badge badge-ghost badge-sm font-[var(--br-mono-font)] mb-2">
            CHIA SẺ
          </span>
          <h1 className="text-2xl font-bold">{deck.title}</h1>
          {deck.description && (
            <p className="text-sm text-base-content/60 mt-1">{deck.description}</p>
          )}
          <p className="text-sm text-base-content/60 mt-2">
            {deck.word_count}
            {' '}
            từ
          </p>
        </div>

        {isAuthenticated && onImport && (
          <button
            className="btn btn-primary shrink-0"
            onClick={onImport}
            disabled={isImporting}
          >
            {isImporting
              ? <span className="loading loading-spinner loading-sm" />
              : 'Thêm vào bộ của tôi'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th style={{ fontFamily: 'var(--br-jp-font)' }}>Kana</th>
              <th style={{ fontFamily: 'var(--br-jp-font)' }}>Kanji</th>
              <th>Nghĩa (VI)</th>
              <th>Nghĩa (EN)</th>
            </tr>
          </thead>
          <tbody>
            {words.map(word => (
              <tr key={word.id}>
                <td style={{ fontFamily: 'var(--br-jp-font)' }}>{word.kana}</td>
                <td style={{ fontFamily: 'var(--br-jp-font)' }}>{word.kanji ?? '—'}</td>
                <td>{word.meaning_vi}</td>
                <td>{word.meaning_en ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isAuthenticated && (
        <p className="text-sm text-base-content/60 text-center">
          <a href="/auth/login" className="link link-primary">Đăng nhập</a>
          {' '}
          để thêm bộ từ vựng này vào tài khoản của bạn.
        </p>
      )}
    </div>
  )
}
