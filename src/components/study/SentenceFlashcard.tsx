import type { SRSRating } from '../../types/srs'
import type { MeaningLanguage } from '../../types/study'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useState } from 'react'
import { highlightSentence } from '../../lib/sentence-highlight'
import { AudioButton } from '../vocabulary/AudioButton'

interface SentenceFlashcardProps {
  card: VocabWithSRS
  meaningLanguage: MeaningLanguage
  onRate: (rating: SRSRating) => void
}

export function SentenceFlashcard({ card, meaningLanguage, onRate }: SentenceFlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const hasExample = card.examples.length > 0
  const example = card.examples[0]
  const target = card.word ?? card.reading
  const sentenceParts = hasExample ? highlightSentence(example.ja, target) : null

  const meaning = meaningLanguage === 'en' ? card.meaning_en : card.meaning_vi

  if (!hasExample) {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
        <div
          className="card bg-base-100 border-2 border-base-content shadow-xl w-full min-h-64 flex flex-col items-center justify-center p-6 gap-3 cursor-pointer"
          onClick={() => setIsFlipped(true)}
          role="button"
          aria-label="flip"
        >
          {!isFlipped
            ? (
                <span className="text-4xl font-bold" style={{ fontFamily: 'var(--br-jp-font)' }}>
                  {target}
                </span>
              )
            : (
                <>
                  <span className="text-2xl" style={{ fontFamily: 'var(--br-jp-font)' }}>{target}</span>
                  <span className="text-xl font-bold">{meaning}</span>
                  <AudioButton audioFilename={card.audio_filename} vocabId={card.vocab_id} />
                </>
              )}
        </div>
        {isFlipped && <RatingBar onRate={onRate} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div
        className="card bg-base-100 border-2 border-base-content shadow-xl w-full min-h-64 flex flex-col items-center justify-center p-6 gap-3 cursor-pointer"
        onClick={() => setIsFlipped(true)}
        role="button"
        aria-label="flip"
      >
        {!isFlipped
          ? (
              <p className="text-xl text-center leading-relaxed" style={{ fontFamily: 'var(--br-jp-font)' }}>
                {sentenceParts!.length === 1
                  ? sentenceParts![0]
                  : (
                      <>
                        <span>{sentenceParts![0]}</span>
                        <span className="underline decoration-2 decoration-primary font-bold">{sentenceParts![1]}</span>
                        <span>{sentenceParts![2]}</span>
                      </>
                    )}
              </p>
            )
          : (
              <>
                <p className="text-base text-center leading-relaxed" style={{ fontFamily: 'var(--br-jp-font)' }}>
                  {example.vi}
                </p>
                <span className="text-lg font-bold text-primary">{meaning}</span>
                <AudioButton audioFilename={card.audio_filename} vocabId={card.vocab_id} />
              </>
            )}
        {!isFlipped && (
          <span className="text-xs text-base-content/40 mt-2">Tap to reveal</span>
        )}
      </div>
      {isFlipped && <RatingBar onRate={onRate} />}
    </div>
  )
}

function RatingBar({ onRate }: { onRate: (r: SRSRating) => void }) {
  return (
    <div className="flex gap-2 w-full">
      <button className="btn btn-error flex-1" onClick={() => onRate(0)} aria-label="again">Again</button>
      <button className="btn btn-warning flex-1" onClick={() => onRate(1)} aria-label="hard">Hard</button>
      <button className="btn btn-success flex-1" onClick={() => onRate(2)} aria-label="good">Good</button>
      <button className="btn btn-info flex-1" onClick={() => onRate(3)} aria-label="easy">Easy</button>
    </div>
  )
}
