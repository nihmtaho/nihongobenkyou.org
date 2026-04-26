import type { CardState } from '../../types/srs'
import type { FontSize } from '../../types/study'
import type { VocabItem } from '../../types/vocabulary'

import { useKnownCards } from '../../hooks/useKnownCards'
import { useSettingsStore } from '../../stores/settingsStore'
import { AudioButton } from './AudioButton'
import { PitchAccentBars } from './PitchAccentBars'

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

  function handleToggleKnown() {
    toggleKnown(userId, item.vocab_id, isKnown)
  }

  return (
    <div className="card bg-base-200 border border-base-content/10">
      <div className="h-1 bg-primary w-full" />
      <div className="card-body p-4 gap-3">
        <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral bg-base-300 -mx-4 -mt-4 px-4 py-2">
          {item.pos.join(' · ')}
          {' '}
          · LESSON
          {String(item.lesson_number).padStart(2, '0')}
        </p>

        {item.word && (
          <p className="text-2xl font-bold font-[var(--br-jp-font)] text-base-content">
            {item.word}
          </p>
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

        <button
          className={`btn btn-sm self-start font-[var(--br-mono-font)] ${isKnown ? 'btn-primary' : 'btn-outline'}`}
          onClick={handleToggleKnown}
          type="button"
        >
          {isKnown ? '✓ ĐÃ BIẾT' : 'ĐÃ BIẾT?'}
        </button>
      </div>
    </div>
  )
}
