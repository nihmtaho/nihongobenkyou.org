import type { SRSRating } from '../../types/srs'
import type { MeaningLanguage } from '../../types/study'
import type { VocabWithSRS } from '../../types/vocabulary'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useFlipCardState } from '../../hooks/useFlipCardState'
import { moraCount } from '../../lib/mora'
import { parsePitchPattern } from '../../lib/pitch'
import { useSettingsStore } from '../../stores/settingsStore'
import { AnnotatedWord } from '../kanji/AnnotatedWord'
import { AudioButton } from '../vocabulary/AudioButton'
import { PitchAccentBars } from '../vocabulary/PitchAccentBars'
import { RatingBar } from './shared/RatingBar'

const GRID_FACE: React.CSSProperties = { gridArea: '1 / 1' }
const GRID_FACE_BACK: React.CSSProperties = { ...GRID_FACE, transform: 'rotateY(180deg)' }

const JP_SIZE_MAP = { sm: 'text-5xl', md: 'text-6xl', lg: 'text-7xl' }

interface VocabFlipCardProps {
  card: VocabWithSRS
  meaningLanguage: MeaningLanguage
  onRate: (rating: SRSRating) => void
}

export function VocabFlipCard({ card, meaningLanguage, onRate }: VocabFlipCardProps) {
  const { isFlipped, setIsFlipped, x, rotate, handleDragEnd } = useFlipCardState(onRate)
  const [hintRevealed, setHintRevealed] = useState(false)
  const fontSize = useSettingsStore(s => s.fontSize)

  const word = card.word ?? card.reading
  const morae = moraCount(card.reading)
  const pitchPattern = parsePitchPattern(card.pitch_pattern, morae)
  const jpSize = JP_SIZE_MAP[fontSize]
  const primaryMeaning = meaningLanguage === 'en' ? card.meaning_en : card.meaning_vi
  const secondaryMeaning = meaningLanguage === 'both' ? card.meaning_en : null
  const examples = card.examples.slice(0, 2)

  // Build per-char han_viet map: split "NHẬT BẢN NGỮ" → map each kanji char
  const hanVietMap = useMemo(() => {
    const map = new Map<string, string>()
    if (!card.word || !card.han_viet)
      return map
    const kanjiChars = [...card.word].filter(ch => ch >= '一' && ch <= '鿿')
    const hvParts = card.han_viet.trim().split(/\s+/)
    if (kanjiChars.length === hvParts.length)
      kanjiChars.forEach((ch, i) => map.set(ch, hvParts[i]))
    return map
  }, [card.word, card.han_viet])

  const hasHanViet = hanVietMap.size > 0

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return
      if ((e.key === 'h' || e.key === 'H') && !isFlipped) {
        e.preventDefault()
        setHintRevealed(h => !h)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isFlipped])

  function handleHint(e: React.MouseEvent) {
    e.stopPropagation()
    setHintRevealed(h => !h)
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[580px] mx-auto px-3 sm:px-0">
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
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ transformStyle: 'preserve-3d', display: 'grid' }}
            className="w-full"
          >
            {/* ── Front ─────────────────────────── */}
            <div
              style={{ backfaceVisibility: 'hidden', ...GRID_FACE }}
              className="card bg-base-100 border-2 border-base-content shadow-xl flex flex-col min-h-[240px] portrait:min-h-[55svh]"
            >
              <div className="flex-1 flex flex-col items-center justify-center px-10 pt-10 pb-4 gap-4">
                <span
                  className={`${jpSize} font-bold leading-none`}
                  style={{ fontFamily: 'var(--br-jp-font)' }}
                >
                  {word}
                </span>

                {hintRevealed
                  ? (
                      <div className="flex flex-col items-center gap-2">
                        <PitchAccentBars pattern={pitchPattern} kana={card.reading} />
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm text-neutral"
                            style={{ fontFamily: 'var(--br-jp-font)' }}
                          >
                            {card.reading}
                          </span>
                          <span className="text-[10px] font-[var(--br-mono-font)] text-neutral/50">
                            {card.romaji}
                          </span>
                        </div>
                      </div>
                    )
                  : (
                      <span className="text-[11px] text-base-content/30 font-[var(--br-mono-font)] uppercase tracking-widest">
                        Space / tap to reveal
                      </span>
                    )}
              </div>

              {/* Hint button bar */}
              <div className="flex items-center justify-between px-4 pb-3 shrink-0">
                <span className="text-[9px] text-base-content/20 font-[var(--br-mono-font)] uppercase tracking-widest">
                  [H]
                </span>
                <button
                  type="button"
                  className={`btn btn-xs font-[var(--br-mono-font)] uppercase text-[9px] ${hintRevealed ? 'btn-primary' : 'btn-ghost border border-base-content/20'}`}
                  onClick={handleHint}
                  aria-label="Toggle reading hint"
                >
                  {hintRevealed ? 'HIDE' : 'HINT'}
                </button>
              </div>
            </div>

            {/* ── Back ──────────────────────────── */}
            <div
              style={{ backfaceVisibility: 'hidden', ...GRID_FACE_BACK }}
              className="card bg-base-100 border-2 border-primary shadow-xl overflow-hidden flex flex-col min-h-[240px] portrait:min-h-[55svh]"
            >
              <div className="h-1 bg-primary w-full shrink-0" />

              {/* Word header — per-char han_viet ruby (same as KanjiVocabFlipCard) */}
              <div className="px-5 pt-4 pb-3 border-b border-base-content/10">
                {hasHanViet
                  ? (
                      <AnnotatedWord
                        word={word}
                        hanVietMap={hanVietMap}
                        className="text-4xl sm:text-5xl font-bold"
                      />
                    )
                  : (
                      <span
                        className="text-4xl sm:text-5xl font-bold leading-none"
                        style={{ fontFamily: 'var(--br-jp-font)' }}
                      >
                        {word}
                      </span>
                    )}
              </div>

              {/* Reading strip */}
              <div className="px-5 py-2.5 flex items-center gap-4 border-b border-base-content/10 bg-base-200/50">
                <div className="flex flex-col gap-0.5">
                  <p
                    className="text-sm leading-none"
                    style={{ fontFamily: 'var(--br-jp-font)' }}
                  >
                    {card.reading}
                  </p>
                  <p className="text-[10px] font-[var(--br-mono-font)] text-neutral">{card.romaji}</p>
                </div>
                {pitchPattern && <PitchAccentBars pattern={pitchPattern} kana={card.reading} />}
                <div className="ml-auto">
                  <AudioButton audioFilename={card.audio_filename} vocabId={card.vocab_id} />
                </div>
              </div>

              {/* Meaning section — below reading so long VI text has full width */}
              <div className="px-5 py-4 border-b border-base-content/10">
                <p className="text-2xl sm:text-3xl font-black font-[var(--br-heading-font)] uppercase tracking-tighter leading-tight text-primary">
                  {primaryMeaning}
                </p>
                {secondaryMeaning && (
                  <p className="text-sm text-neutral leading-snug mt-1">{secondaryMeaning}</p>
                )}
              </div>

              {/* Examples */}
              {examples.length > 0 && (
                <div className="px-5 py-3 flex flex-col gap-2">
                  <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
                    Ví dụ
                  </p>
                  {examples.map((ex, i) => (
                    <div key={ex.ja} className={`border-l-4 border-primary pl-3 ${i > 0 ? 'mt-1' : ''}`}>
                      <p
                        className="text-sm leading-snug"
                        style={{ fontFamily: 'var(--br-jp-font)' }}
                      >
                        {ex.ja}
                      </p>
                      <p
                        className="text-xs text-neutral"
                        style={{ fontFamily: 'var(--br-jp-font)' }}
                      >
                        {ex.vi}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-5 pb-3 pt-1 mt-auto">
                <p className="text-[9px] font-[var(--br-mono-font)] text-base-content/20 uppercase tracking-widest text-right">
                  tap / space to flip back
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {isFlipped && <RatingBar onRate={onRate} />}

      <p className="text-[10px] text-base-content/25 font-[var(--br-mono-font)] tracking-wide">
        {isFlipped ? '← swipe again · good → · keys 1–4' : 'space · tap · [h] hint'}
      </p>
    </div>
  )
}
