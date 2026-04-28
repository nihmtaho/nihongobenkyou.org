import type { KanjiCardState, KanjiItem } from '../../types/kanji'

interface KanjiCardProps {
  kanji: KanjiItem
  card?: KanjiCardState
  onClick?: () => void
}

function srsLabel(card?: KanjiCardState): string {
  if (!card)
    return 'New'
  if (card.interval_days < 7)
    return 'Learning'
  if (card.interval_days < 21)
    return 'Review'
  return 'Mature'
}

function srsBadgeClass(card?: KanjiCardState): string {
  if (!card)
    return 'badge-info'
  if (card.interval_days < 7)
    return 'badge-warning'
  if (card.interval_days < 21)
    return 'badge-primary'
  return 'badge-success'
}

export function KanjiCard({ kanji, card, onClick }: KanjiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card bg-base-200 border border-base-content/10 w-full text-left transition-colors hover:border-l-4 hover:border-l-primary cursor-pointer"
    >
      <div className="card-body p-3 gap-1">
        <p
          className="text-4xl font-bold leading-none"
          style={{ fontFamily: 'var(--br-jp-font)' }}
        >
          {kanji.char}
        </p>
        <p className="text-xs text-neutral font-[var(--br-mono-font)]">
          {kanji.han_viet ?? '—'}
        </p>
        <div className="flex gap-1 flex-wrap mt-1">
          {kanji.jlpt_level && (
            <span className="badge badge-outline badge-primary font-[var(--br-mono-font)] text-[10px]">
              {kanji.jlpt_level}
            </span>
          )}
          <span className={`badge font-[var(--br-mono-font)] text-[10px] ${srsBadgeClass(card)}`}>
            {srsLabel(card)}
          </span>
        </div>
      </div>
    </button>
  )
}
