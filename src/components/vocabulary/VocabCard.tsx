import type { CardState } from '../../types/srs'
import type { FontSize } from '../../types/study'
import type { VocabItem } from '../../types/vocabulary'

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
    <div className="card bg-base-200 border border-base-content/10">
      <div className="h-1 bg-primary w-full" />
      <div className="card-body p-4 gap-3">
        <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral bg-base-300 -mx-4 -mt-4 px-4 py-2 flex items-center justify-between">
          <span>
            {item.pos.join(' · ')}
            {' '}
            · LESSON
            {String(item.lesson_number).padStart(2, '0')}
          </span>
          {item.edition && (
            <span className="flex gap-1">
              {item.edition.map(ed => (
                <span
                  key={ed}
                  className="badge badge-outline font-[var(--br-mono-font)] text-[9px]"
                  title={`第${ed}版`}
                >
                  {ed}
                  版
                </span>
              ))}
            </span>
          )}
        </p>

        {item.word && (
          <div className="flex flex-col gap-0.5">
            <p className="text-2xl font-bold font-[var(--br-jp-font)] text-base-content">
              {item.word}
            </p>
            {item.han_viet && (
              <span className="text-[11px] font-[var(--br-mono-font)] text-primary uppercase tracking-[0.12em]">
                {item.han_viet}
              </span>
            )}
          </div>
        )}

        <p className={`${jpSize} font-bold font-[var(--br-jp-font)] text-base-content leading-none`}>
          {item.reading}
        </p>

        <p className="text-sm font-[var(--br-jp-font)] text-neutral">{item.romaji}</p>

        <PitchAccentBars pattern={moraPattern} kana={item.reading} />

        <AudioButton audioFilename={item.audio_filename} vocabId={item.vocab_id} />

        <div className="divider my-0 opacity-20" />

        <p className="text-base font-bold font-[var(--br-jp-font)]">{item.meaning_vi}</p>
        <p className="text-xs text-neutral font-[var(--br-jp-font)]">{item.meaning_en}</p>

        {item.examples.length > 0 && (
          <div className="border-l-4 border-primary pl-3">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral mb-1">EXAMPLE</p>
            <p className="text-sm font-[var(--br-jp-font)]">{item.examples[0].ja}</p>
            <p className="text-xs text-neutral font-[var(--br-jp-font)]">{item.examples[0].vi}</p>
            <p className="text-xs text-neutral font-[var(--br-jp-font)] opacity-70">{item.examples[0].en}</p>
            {item.examples[0].fr && (
              <p className="text-xs text-neutral font-[var(--br-jp-font)] opacity-70">{item.examples[0].fr}</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            className={`btn btn-sm font-[var(--br-mono-font)] ${isKnown ? 'btn-primary' : 'btn-outline'}`}
            onClick={handleToggleKnown}
            type="button"
          >
            {isKnown ? '✓ ĐÃ BIẾT' : 'ĐÃ BIẾT?'}
          </button>
          {firstKanjiChar && (
            <button
              className="btn btn-sm btn-outline font-[var(--br-mono-font)]"
              type="button"
              onClick={() => window.location.assign(`/kanji/${firstKanjiChar}`)}
              aria-label={`View kanji ${firstKanjiChar}`}
            >
              漢字
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
