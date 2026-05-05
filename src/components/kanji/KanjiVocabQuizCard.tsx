import type { RelatedVocabItem } from '../../types/kanji'
import type { CardState, SRSRating } from '../../types/srs'
import { useState } from 'react'

import { shuffle } from '../../lib/quiz'
import { QuizOptions } from '../study/QuizOptions'
import { RatingBar } from '../study/shared/RatingBar'

interface KanjiVocabQuizCardProps {
  rv: RelatedVocabItem
  card: CardState
  /** Other rv items from the same lesson pool — used as distractors */
  pool: RelatedVocabItem[]
  onRate: (rating: SRSRating) => void
}

export function KanjiVocabQuizCard({ rv, card, pool, onRate }: KanjiVocabQuizCardProps) {
  const [answered, setAnswered] = useState(false)
  const [wasCorrect, setWasCorrect] = useState(false)

  const [{ options, correctId }] = useState(() => {
    const distractors = pool
      .filter(p => p.kana !== rv.kana)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    const all = shuffle([rv, ...distractors])
    return {
      options: all.map(r => ({ id: r.kana, label: r.han_viet ?? r.kana })),
      correctId: rv.kana,
    }
  })

  const word = rv.word ?? rv.kana

  return (
    <div className="p-4 pt-6 w-full max-w-4xl mx-auto flex flex-col gap-4">
      <div className="border border-foreground/20 overflow-hidden">
        <div className="h-0.5 bg-primary w-full" />
        <div className="lg:grid lg:grid-cols-2 lg:divide-x lg:divide-foreground/10">
          <div
            className="bg-card px-[18px] pt-4 pb-4 border-b border-border/10 text-center
                          lg:border-b-0 lg:flex lg:flex-col lg:items-center lg:justify-center lg:py-12 lg:px-10"
          >
            <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest mb-4">
              Hán Việt là gì?
            </p>
            <span
              className="text-5xl lg:text-7xl font-bold leading-none"
              style={{ fontFamily: 'var(--br-jp-font)' }}
            >
              {word}
            </span>
          </div>
          <div className="px-[18px] py-[14px] lg:flex lg:flex-col lg:justify-center lg:py-8 lg:px-8">
            <QuizOptions
              options={options}
              correctId={correctId}
              onAnswer={(correct) => {
                setWasCorrect(correct)
                setAnswered(true)
              }}
              locked={answered}
            />
          </div>
        </div>
      </div>

      {answered && (
        <div className="flex flex-col gap-2">
          <p className={`text-center text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest ${wasCorrect ? 'text-success' : 'text-destructive'}`}>
            {wasCorrect ? '✓ Đúng' : `✗ Sai — ${rv.han_viet ?? rv.kana}`}
          </p>
          <RatingBar card={{ ...card, vocab_id: card.vocabId } as never} onRate={onRate} />
        </div>
      )}
    </div>
  )
}
