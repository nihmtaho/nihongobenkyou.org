import type { SRSCard } from '../../types/srs'
import type { VocabItem } from '../../types/vocabulary'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JapaneseText } from '@/components/ui/japanese-text'
import { Separator } from '@/components/ui/separator'
import { useKnownCards } from '../../hooks/useKnownCards'
import { AddToDeckDialog } from '../common/AddToDeckDialog'
import { AudioButton } from './AudioButton'
import { PitchAccentBars } from './PitchAccentBars'

// eslint-disable-next-line regexp/no-obscure-range
const KANJI_RE = /[一-龯]/

interface VocabDetailPanelProps {
  item: VocabItem
  card: SRSCard | null
  moraPattern: ('H' | 'L')[] | null
  userId: string
  index: number
  total: number
}

export function VocabDetailPanel({ item, card, moraPattern, userId, index, total }: VocabDetailPanelProps) {
  const { toggleKnown } = useKnownCards()
  const isKnown = card?.is_known === true
  const firstKanjiChar = item.word ? (item.word.match(KANJI_RE) ?? [])[0] : null
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleToggleKnown() {
    toggleKnown(userId, item.vocab_id, isKnown)
  }

  return (
    <div className="h-full overflow-auto">
      <div className="min-h-full flex flex-col">
        <div className="h-1 bg-primary w-full shrink-0" />

        <div className="flex-1 p-8 xl:p-12 flex flex-col gap-6">
          {/* Metadata strip */}
          <div className="flex items-center justify-between">
            <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-muted-foreground tracking-wider">
              {item.pos.join(' · ')}
              {' '}
              · LESSON
              {' '}
              {String(item.lesson_number).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-3">
              {item.edition && item.edition.length > 0 && (
                <div className="flex gap-1">
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
                </div>
              )}
              <span className="font-[var(--br-mono-font)] text-[11px] text-muted-foreground/40 tabular-nums">
                {String(index + 1).padStart(2, '0')}
                {' '}
                /
                {' '}
                {String(total).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Main Japanese display — poster-scale */}
          <div className="flex flex-col gap-2">
            {item.word && (
              <div className="flex flex-col gap-1">
                <JapaneseText className="text-7xl xl:text-8xl font-bold text-foreground leading-none break-all">
                  {item.word}
                </JapaneseText>
                {item.han_viet && (
                  <span className="font-[var(--br-mono-font)] text-[11px] text-primary uppercase tracking-[0.15em]">
                    {item.han_viet}
                  </span>
                )}
              </div>
            )}
            <JapaneseText className={`font-bold leading-none ${item.word ? 'text-3xl text-muted-foreground' : 'text-7xl xl:text-8xl text-foreground'}`}>
              {item.reading}
            </JapaneseText>
            <JapaneseText className="text-lg text-muted-foreground">{item.romaji}</JapaneseText>
          </div>

          {/* Pitch accent + audio */}
          <div className="flex flex-col gap-3">
            <PitchAccentBars pattern={moraPattern} kana={item.reading} />
            <AudioButton audioFilename={item.audio_filename} vocabId={item.vocab_id} />
          </div>

          <Separator className="opacity-20" />

          {/* Meanings */}
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-bold font-[var(--br-jp-font)]">{item.meaning_vi}</p>
            <p className="text-sm text-muted-foreground font-[var(--br-jp-font)]">{item.meaning_en}</p>
          </div>

          {/* Examples */}
          {item.examples.length > 0 && (
            <div className="border-l-4 border-primary pl-4">
              <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground mb-2 tracking-wider">EXAMPLE</p>
              <p className="text-sm leading-relaxed"><JapaneseText>{item.examples[0].ja}</JapaneseText></p>
              <p className="text-xs text-muted-foreground mt-1">{item.examples[0].vi}</p>
              <p className="text-xs text-muted-foreground opacity-70">{item.examples[0].en}</p>
              {item.examples[0].fr && (
                <p className="text-xs text-muted-foreground opacity-70">{item.examples[0].fr}</p>
              )}
              {item.examples[0].pitch_pattern != null && (
                <div className="mt-2">
                  <PitchAccentBars pattern={item.examples[0].pitch_pattern} kana={item.reading} />
                </div>
              )}
            </div>
          )}

          {/* Action buttons pinned to bottom */}
          <div className="mt-auto pt-6 border-t border-border/10 flex justify-between">
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
            <Button
              size="sm"
              variant="outline"
              className="font-[var(--br-mono-font)]"
              type="button"
              aria-label={`Thêm ${item.word ?? item.reading} vào deck`}
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <AddToDeckDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            vocabItem={item}
            userId={userId}
          />
        </div>
      </div>
    </div>
  )
}
