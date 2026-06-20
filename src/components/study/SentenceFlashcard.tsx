import type { MeaningLanguage } from '../../types/study'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useState } from 'react'
import { JapaneseText } from '@/components/ui/japanese-text'
import { highlightSentence } from '../../lib/sentence-highlight'
import { AudioButton } from '../vocabulary/AudioButton'
import { RatingBar } from './shared/RatingBar'

interface SentenceFlashcardProps {
  card: VocabWithSRS
  meaningLanguage: MeaningLanguage
  onRate: Parameters<typeof RatingBar>[0]['onRate']
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
          className="bg-background border-2 border-foreground w-full min-h-64 flex flex-col items-center justify-center p-6 gap-3 cursor-pointer"
          onClick={() => setIsFlipped(true)}
          role="button"
          aria-label="flip"
        >
          {!isFlipped
            ? (
                <JapaneseText className="text-4xl font-bold">
                  {target}
                </JapaneseText>
              )
            : (
                <>
                  <JapaneseText className="text-2xl">{target}</JapaneseText>
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
              <JapaneseText className="text-xl text-center leading-relaxed">
                {sentenceParts!.length === 1
                  ? sentenceParts![0]
                  : (
                      <>
                        <span>{sentenceParts![0]}</span>
                        <span className="underline decoration-2 decoration-primary font-bold">{sentenceParts![1]}</span>
                        <span>{sentenceParts![2]}</span>
                      </>
                    )}
              </JapaneseText>
            )
          : (
              <>
                <p className="text-base text-center leading-relaxed">{example.vi}</p>
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
