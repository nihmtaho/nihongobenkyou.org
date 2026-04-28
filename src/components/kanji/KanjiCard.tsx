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
      className="card bg-base-200 border border-base-content/10 w-full text-left transition-[border-color] duration-[120ms] hover:border-l-4 hover:border-l-primary cursor-pointer"
    >
      <div className="p-3 flex flex-col gap-1.5 min-h-[88px]">
        <div className="flex items-start justify-between gap-1">
          <p
            className="text-5xl font-bold leading-none"
            style={{ fontFamily: 'var(--br-jp-font)' }}
          >
            {kanji.char}
          </p>
          <span className={`badge badge-sm font-[var(--br-mono-font)] text-[9px] shrink-0 ${srsBadgeClass(card)}`}>
            {srsLabel(card)}
          </span>
        </div>
        <p className="text-[11px] font-[var(--br-mono-font)] text-primary uppercase tracking-widest leading-none">
          {kanji.han_viet ?? '—'}
        </p>
        {kanji.jlpt_level && (
          <span className="badge badge-xs badge-outline badge-primary font-[var(--br-mono-font)] text-[9px] self-start mt-auto">
            {kanji.jlpt_level}
          </span>
        )}
      </div>
    </button>
  )
}
