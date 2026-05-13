import type { KanjiItem } from '../../types/kanji'
import type { SRSCard, SRSRating } from '../../types/srs'
import { useEffect, useState } from 'react'
import { selectKanjiDistractors, shuffle } from '../../lib/quiz'
import { QuizOptions } from '../study/QuizOptions'
import { RatingBar } from '../study/shared/RatingBar'

interface KanjiQuizCardProps {
  kanji: KanjiItem
  srsState?: SRSCard
  pool: KanjiItem[]
  onRate: (rating: SRSRating) => void
}

export function KanjiQuizCard({ kanji, srsState, pool, onRate }: KanjiQuizCardProps) {
  const [showHint, setShowHint] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [wasCorrect, setWasCorrect] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return
      if (e.key === 'h' || e.key === 'H')
        setShowHint(prev => !prev)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const [{ options, correctId }] = useState(() => {
    const distractors = selectKanjiDistractors(kanji, pool)
    const allItems = shuffle([kanji, ...distractors])
    return {
      options: allItems.map(k => ({ id: k.char, label: k.han_viet ?? '—' })),
      correctId: kanji.char,
    }
  })

  function handleAnswer(correct: boolean) {
    setWasCorrect(correct)
    setAnswered(true)
  }

  return (
    <div className="p-4 pt-6 w-full max-w-4xl mx-auto flex flex-col gap-4">
      <div className="border border-foreground/20 overflow-hidden">
        <div className="h-0.5 bg-primary w-full" />
        <div className="lg:grid lg:grid-cols-2 lg:divide-x lg:divide-foreground/10">
          {/* Question */}
          <div className="bg-card px-[18px] pt-4 pb-4 border-b border-border/10 text-center
                          lg:border-b-0 lg:flex lg:flex-col lg:items-center lg:justify-center lg:py-12 lg:px-10"
          >
            <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest mb-4">
              Hán Việt là gì?
            </p>
            <span
              className="text-7xl lg:text-9xl font-bold leading-none"
              style={{ fontFamily: 'var(--br-jp-font)' }}
            >
              {kanji.char}
            </span>
            <div className="mt-3 min-h-[28px] flex flex-col items-center justify-center gap-1">
              {showHint && (
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {kanji.onyomi.length > 0 && (
                    <span className="font-[var(--br-jp-font)] text-sm text-muted-foreground">
                      <span className="font-[var(--br-mono-font)] text-[9px] text-foreground/30 mr-1">音</span>
                      {kanji.onyomi.join('・')}
                    </span>
                  )}
                  {kanji.kunyomi.length > 0 && (
                    <span className="font-[var(--br-jp-font)] text-sm text-muted-foreground">
                      <span className="font-[var(--br-mono-font)] text-[9px] text-foreground/30 mr-1">訓</span>
                      {kanji.kunyomi.join('・')}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="mt-1 font-[var(--br-mono-font)] text-[9px] uppercase tracking-widest text-foreground/25 hover:text-foreground/50 transition-colors"
              onClick={() => setShowHint(prev => !prev)}
            >
              {showHint ? '[H] Ẩn' : '[H] Cách đọc'}
            </button>
          </div>
          {/* Options */}
          <div className="px-[18px] py-[14px] lg:flex lg:flex-col lg:justify-center lg:py-8 lg:px-8">
            <QuizOptions
              options={options}
              correctId={correctId}
              onAnswer={handleAnswer}
              locked={answered}
            />
          </div>
        </div>
      </div>

      {answered && (
        <div className="flex flex-col gap-2">
          <p className={`text-center text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest ${wasCorrect ? 'text-success' : 'text-destructive'}`}>
            {wasCorrect ? '✓ Đúng' : `✗ Sai — ${kanji.han_viet ?? '—'}`}
          </p>
          <RatingBar card={srsState} onRate={onRate} />
        </div>
      )}
    </div>
  )
}
