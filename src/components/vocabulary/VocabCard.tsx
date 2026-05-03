import type { CardState } from '../../types/srs'
import type { FontSize } from '../../types/study'
import type { VocabItem } from '../../types/vocabulary'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useKnownCards } from '../../hooks/useKnownCards'
import { useSettingsStore } from '../../stores/settingsStore'
import { AudioButton } from './AudioButton'
import { PitchAccentBars } from './PitchAccentBars'

// eslint-disable-next-line regexp/no-obscure-range
const KANJI_RE = /[一-龯]/

const JP_SIZE: Record<FontSize, string> = {
  sm: 'text-4xl',
  md: 'text-5xl',
  lg: 'text-6xl',
}

interface VocabCardProps {
  item: VocabItem
  card: CardState | null
  moraPattern: ('H' | 'L')[] | null
  userId: string
}

export function VocabCard({ item, card, moraPattern, userId }: VocabCardProps) {
  const { toggleKnown } = useKnownCards()
  const isKnown = card?.is_known === true
  const fontSize = useSettingsStore(s => s.fontSize)
  const jpSize = JP_SIZE[fontSize]

  const firstKanjiChar = item.word ? (item.word.match(KANJI_RE) ?? [])[0] : null

  function handleToggleKnown() {
    toggleKnown(userId, item.vocab_id, isKnown)
  }

  return (
    <div className="bg-card border border-border/10">
      <div className="h-1 bg-primary w-full" />
      <div className="p-4 flex flex-col gap-3">
        <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground bg-secondary -mx-4 -mt-4 px-4 py-2 flex items-center justify-between">
          <span>
            {item.pos.join(' · ')}
            {' '}
            · LESSON
            {String(item.lesson_number).padStart(2, '0')}
          </span>
          {item.edition && (
            <span className="flex gap-1">
              {item.edition.map(ed => (
                <Badge
                  key={ed}
                  variant="outline"
                  className="font-[var(--br-mono-font)] text-[9px]"
                  title={`第${ed}版`}
                >
                  {ed}
                  版
                </Badge>
              ))}
            </span>
          )}
        </p>

        {item.word && (
          <div className="flex flex-col gap-0.5">
            <p className="text-2xl font-bold font-[var(--br-jp-font)] text-foreground">
              {item.word}
            </p>
            {item.han_viet && (
              <span className="text-[11px] font-[var(--br-mono-font)] text-primary uppercase tracking-[0.12em]">
                {item.han_viet}
              </span>
            )}
          </div>
        )}

        <p className={`${jpSize} font-bold font-[var(--br-jp-font)] text-foreground leading-none`}>
          {item.reading}
        </p>

        <p className="text-sm font-[var(--br-jp-font)] text-muted-foreground">{item.romaji}</p>

        <PitchAccentBars pattern={moraPattern} kana={item.reading} />

        <AudioButton audioFilename={item.audio_filename} vocabId={item.vocab_id} />

        <Separator className="opacity-20" />

        <p className="text-base font-bold font-[var(--br-jp-font)]">{item.meaning_vi}</p>
        <p className="text-xs text-muted-foreground font-[var(--br-jp-font)]">{item.meaning_en}</p>

        {item.examples.length > 0 && (
          <div className="border-l-4 border-primary pl-3">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground mb-1">EXAMPLE</p>
            <p className="text-sm font-[var(--br-jp-font)]">{item.examples[0].ja}</p>
            <p className="text-xs text-muted-foreground font-[var(--br-jp-font)]">{item.examples[0].vi}</p>
            <p className="text-xs text-muted-foreground font-[var(--br-jp-font)] opacity-70">{item.examples[0].en}</p>
            {item.examples[0].fr && (
              <p className="text-xs text-muted-foreground font-[var(--br-jp-font)] opacity-70">{item.examples[0].fr}</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isKnown ? 'default' : 'outline'}
            className="font-[var(--br-mono-font)]"
            onClick={handleToggleKnown}
            type="button"
          >
            {isKnown ? '✓ ĐÃ BIẾT' : 'ĐÃ BIẾT?'}
          </Button>
          {firstKanjiChar && (
            <Button
              size="sm"
              variant="outline"
              className="font-[var(--br-mono-font)]"
              type="button"
              onClick={() => window.location.assign(`/kanji/${firstKanjiChar}`)}
              aria-label={`View kanji ${firstKanjiChar}`}
            >
              漢字
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
