import type { SRSRating } from '../../types/srs'
import type { MeaningLanguage } from '../../types/study'
import type { VocabWithSRS } from '../../types/vocabulary'
import { motion } from 'framer-motion'
import { useFlipCardState } from '../../hooks/useFlipCardState'
import { moraCount } from '../../lib/mora'
import { parsePitchPattern } from '../../lib/pitch'
import { useSettingsStore } from '../../stores/settingsStore'
import { AudioButton } from '../vocabulary/AudioButton'
import { PitchAccentBars } from '../vocabulary/PitchAccentBars'
import { RatingBar } from './shared/RatingBar'

// Grid-overlay flip: both faces occupy gridArea 1/1 — container auto-heights
const GRID_FACE: React.CSSProperties = { gridArea: '1 / 1' }
const GRID_FACE_BACK: React.CSSProperties = {
  ...GRID_FACE,
  transform: 'rotateY(180deg)',
}

const JP_SIZE_MAP = { sm: 'text-5xl', md: 'text-6xl', lg: 'text-7xl' }

interface FlipCardProps {
  card: VocabWithSRS
  meaningLanguage: MeaningLanguage
  onRate: (rating: SRSRating) => void
}

export function FlipCard({ card, meaningLanguage, onRate }: FlipCardProps) {
  const { isFlipped, setIsFlipped, x, rotate, handleDragEnd } = useFlipCardState(onRate)
  const fontSize = useSettingsStore(s => s.fontSize)

  const word = card.word ?? card.reading
  const morae = moraCount(card.reading)
  const pitchPattern = parsePitchPattern(card.pitch_pattern, morae)
  const jpSize = JP_SIZE_MAP[fontSize]

  const primaryMeaning = meaningLanguage === 'en' ? card.meaning_en : card.meaning_vi
  const secondaryMeaning = meaningLanguage === 'both' ? card.meaning_en : null

  const examples = card.examples.slice(0, 2)

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[580px] mx-auto">
      <motion.div
        drag={isFlipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        dragMomentum={false}
        style={{ x, rotate }}
        onDragEnd={handleDragEnd}
        className="w-full cursor-pointer select-none"
        onClick={() => setIsFlipped(f => !f)}
      >
        <div style={{ perspective: 1200 }} className="w-full">
          {/* Grid overlay: container height = max(front, back) */}
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ transformStyle: 'preserve-3d', display: 'grid' }}
            className="w-full"
          >
            {/* ── Front ─────────────────────────── */}
            <div
              style={{ backfaceVisibility: 'hidden', ...GRID_FACE }}
              className="bg-background border-2 border-foreground flex flex-col items-center justify-center p-10 gap-4 min-h-56"
            >
              <span
                className={`${jpSize} font-bold leading-none`}
                style={{ fontFamily: 'var(--br-jp-font)' }}
              >
                {word}
              </span>
              <PitchAccentBars pattern={pitchPattern} kana={card.reading} />
              <span className="text-[11px] text-foreground/40 font-[var(--br-mono-font)] uppercase tracking-widest mt-1">
                Space / tap to reveal
              </span>
            </div>

            {/* ── Back ──────────────────────────── */}
            <div
              style={{ backfaceVisibility: 'hidden', ...GRID_FACE_BACK }}
              className="bg-background border-2 border-primary overflow-hidden flex flex-col"
            >
              {/* Accent top bar */}
              <div className="h-1 bg-primary w-full shrink-0" />

              {/* Header zone */}
              <div className="px-5 pt-4 pb-3 flex items-start gap-4 border-b border-border/10">
                <div className="flex flex-col items-start shrink-0">
                  <span
                    className="text-4xl font-bold leading-none"
                    style={{ fontFamily: 'var(--br-jp-font)' }}
                  >
                    {word}
                  </span>
                  {card.han_viet && (
                    <span className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground uppercase tracking-wider mt-1">
                      {card.han_viet}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <p className="text-2xl font-black font-[var(--br-heading-font)] uppercase tracking-tighter leading-none text-primary">
                    {primaryMeaning}
                  </p>
                  {secondaryMeaning && (
                    <p className="text-sm text-muted-foreground leading-snug">{secondaryMeaning}</p>
                  )}
                </div>
              </div>

              {/* Reading strip */}
              <div className="px-5 py-2.5 flex items-center gap-4 border-b border-border/10 bg-card/50">
                <div className="flex flex-col gap-0.5">
                  <p
                    className="text-sm leading-none"
                    style={{ fontFamily: 'var(--br-jp-font)' }}
                  >
                    {card.reading}
                  </p>
                  <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">{card.romaji}</p>
                </div>
                {pitchPattern && (
                  <PitchAccentBars pattern={pitchPattern} kana={card.reading} />
                )}
                <div className="ml-auto">
                  <AudioButton audioFilename={card.audio_filename} vocabId={card.vocab_id} />
                </div>
              </div>

              {/* Content zone — examples */}
              {examples.length > 0 && (
                <div className="px-5 py-3 flex flex-col gap-2">
                  <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
                    Ví dụ
                  </p>
                  {examples.map((ex, i) => (
                    <div
                      key={ex.ja}
                      className={`border-l-4 border-primary pl-3 ${i > 0 ? 'mt-1' : ''}`}
                    >
                      <p className="text-sm leading-snug" style={{ fontFamily: 'var(--br-jp-font)' }}>
                        {ex.ja}
                      </p>
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--br-jp-font)' }}>
                        {ex.vi}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Flip-back hint */}
              <div className="px-5 pb-3 pt-1 mt-auto">
                <p className="text-[9px] font-[var(--br-mono-font)] text-foreground/20 uppercase tracking-widest text-right">
                  tap / space to flip back
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Rating bar */}
      {isFlipped && <RatingBar onRate={onRate} />}

      <p className="text-[10px] text-foreground/25 font-[var(--br-mono-font)] tracking-wide">
        {isFlipped ? '← swipe again · good → · keys 1–4' : 'space · tap · swipe'}
      </p>
    </div>
  )
}
