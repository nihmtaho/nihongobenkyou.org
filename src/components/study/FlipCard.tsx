import type { SRSRating } from '../../types/srs'
import type { MeaningLanguage } from '../../types/study'
import type { VocabWithSRS } from '../../types/vocabulary'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useState } from 'react'
import { moraCount } from '../../lib/mora'
import { parsePitchPattern } from '../../lib/pitch'
import { AudioButton } from '../vocabulary/AudioButton'
import { PitchAccentBars } from '../vocabulary/PitchAccentBars'

interface FlipCardProps {
  card: VocabWithSRS
  meaningLanguage: MeaningLanguage
  onRate: (rating: SRSRating) => void
}

function MeaningDisplay({ card, lang }: { card: VocabWithSRS, lang: MeaningLanguage }) {
  if (lang === 'both') {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xl font-bold">{card.meaning_vi}</span>
        <span className="text-sm text-base-content/60">{card.meaning_en}</span>
      </div>
    )
  }
  return (
    <span className="text-xl font-bold">
      {lang === 'vi' ? card.meaning_vi : card.meaning_en}
    </span>
  )
}

export function FlipCard({ card, meaningLanguage, onRate }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showButtons, setShowButtons] = useState(false)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12])

  const word = card.word ?? card.reading
  const morae = moraCount(card.reading)
  const pitchPattern = parsePitchPattern(card.pitch_pattern, morae)

  function handleFlip() {
    if (!isFlipped) {
      setIsFlipped(true)
      setShowButtons(true)
    }
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (!isFlipped)
      return
    if (info.offset.x > 100)
      onRate(2)
    else if (info.offset.x < -100)
      onRate(0)
    else x.set(0)
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <motion.div
        drag={isFlipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        dragMomentum={false}
        style={{ x, rotate }}
        onDragEnd={handleDragEnd}
        className="w-full cursor-pointer select-none"
        onClick={handleFlip}
      >
        <div style={{ perspective: 1000 }}>
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ transformStyle: 'preserve-3d', position: 'relative' }}
            className="min-h-64 w-full"
          >
            {/* Front */}
            <div
              style={{ backfaceVisibility: 'hidden' }}
              className="card bg-base-100 border-2 border-base-content shadow-xl absolute inset-0 flex flex-col items-center justify-center p-6 gap-3"
            >
              <span className="text-4xl font-bold" style={{ fontFamily: 'var(--br-jp-font)' }}>
                {word}
              </span>
              <PitchAccentBars pattern={pitchPattern} kana={card.reading} />
              <span className="text-sm text-base-content/50 mt-2">Tap to reveal</span>
            </div>

            {/* Back */}
            <div
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              className="card bg-base-100 border-2 border-primary shadow-xl absolute inset-0 flex flex-col items-center justify-center p-6 gap-3"
            >
              <span className="text-2xl" style={{ fontFamily: 'var(--br-jp-font)' }}>
                {word}
              </span>
              <MeaningDisplay card={card} lang={meaningLanguage} />
              <AudioButton audioFilename={card.audio_filename} vocabId={card.vocab_id} />
              {card.examples.length > 0 && (
                <p className="text-xs text-base-content/60 text-center mt-1" style={{ fontFamily: 'var(--br-jp-font)' }}>
                  {card.examples[0].ja}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Rating buttons */}
      {showButtons && (
        <div className="flex gap-2 w-full">
          <button className="btn btn-error flex-1" onClick={() => onRate(0)}>Again</button>
          <button className="btn btn-warning flex-1" onClick={() => onRate(1)}>Hard</button>
          <button className="btn btn-success flex-1" onClick={() => onRate(2)}>Good</button>
          <button className="btn btn-info flex-1" onClick={() => onRate(3)}>Easy</button>
        </div>
      )}

      {isFlipped && !showButtons && null}

      {/* Swipe hint */}
      {isFlipped && (
        <p className="text-xs text-base-content/40">← Again &nbsp;|&nbsp; Good →</p>
      )}
    </div>
  )
}
