import type { KanjiCardState, KanjiItem } from '../../types/kanji'
import { Badge } from '@/components/ui/badge'

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
    return 'bg-info text-foreground'
  if (card.interval_days < 7)
    return 'bg-warning text-foreground'
  if (card.interval_days < 21)
    return ''
  return 'bg-success text-foreground'
}

export function KanjiCard({ kanji, card, onClick }: KanjiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-card border border-border/10 w-full text-left transition-[border-color] duration-[120ms] hover:border-l-4 hover:border-l-primary cursor-pointer"
    >
      <div className="p-3 flex flex-col gap-1.5 min-h-[88px]">
        <div className="flex items-start justify-between gap-1">
          <p
            className="text-5xl font-bold leading-none"
            style={{ fontFamily: 'var(--br-jp-font)' }}
          >
            {kanji.char}
          </p>
          <Badge
            variant={card && card.interval_days >= 7 && card.interval_days < 21 ? 'default' : 'secondary'}
            className={`font-[var(--br-mono-font)] text-[9px] shrink-0 ${srsBadgeClass(card)}`}
          >
            {srsLabel(card)}
          </Badge>
        </div>
        <p className="text-[11px] font-[var(--br-mono-font)] text-primary uppercase tracking-widest leading-none">
          {kanji.han_viet ?? '—'}
        </p>
        {kanji.jlpt_level && (
          <Badge variant="outline" className="font-[var(--br-mono-font)] text-[9px] self-start mt-auto">
            {kanji.jlpt_level}
          </Badge>
        )}
      </div>
    </button>
  )
}
