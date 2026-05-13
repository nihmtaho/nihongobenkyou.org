import type { SRSRating } from '../../types/srs'
import type { MeaningLanguage } from '../../types/study'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { highlightSentence } from '../../lib/sentence-highlight'
import { AudioButton } from '../vocabulary/AudioButton'

interface SentenceFlashcardProps {
  card: VocabWithSRS
  meaningLanguage: MeaningLanguage
  onRate: (rating: SRSRating) => void
}

const RATING_VARIANTS = ['destructive', 'warning', 'success', 'info'] as const
const RATING_LABELS = ['Again', 'Hard', 'Good', 'Easy'] as const

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
          className="bg-background border-2 border-foreground w-full min-h-64 flex flex-col items-center justify-center p-6 gap-3 cursor-pointer"
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
        className="bg-background border-2 border-foreground w-full min-h-64 flex flex-col items-center justify-center p-6 gap-3 cursor-pointer"
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
          <span className="text-xs text-foreground/40 mt-2">Tap to reveal</span>
        )}
      </div>
      {isFlipped && <RatingBar onRate={onRate} />}
    </div>
  )
}

function RatingBar({ onRate }: { onRate: (r: SRSRating) => void }) {
  return (
    <ButtonGroup className="w-full">
      {([1, 2, 3, 4] as SRSRating[]).map(r => (
        <Button key={r} variant={RATING_VARIANTS[r - 1]} className="flex-1" onClick={() => onRate(r)} aria-label={RATING_LABELS[r - 1].toLowerCase()}>
          {RATING_LABELS[r - 1]}
        </Button>
      ))}
    </ButtonGroup>
  )
}
