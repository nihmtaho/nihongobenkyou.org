import type { KanjiItem } from '../../types/kanji'
import { useState } from 'react'
import { selectKanjiDistractors, shuffle } from '../../lib/quiz'
import { QuizOptions } from '../study/QuizOptions'

interface KanjiQuizCardProps {
  kanji: KanjiItem
  pool: KanjiItem[]
  onAnswer: (correct: boolean) => void
}

export function KanjiQuizCard({ kanji, pool, onAnswer }: KanjiQuizCardProps) {
  const [{ options, correctId }] = useState(() => {
    const distractors = selectKanjiDistractors(kanji, pool)
    const allItems = shuffle([kanji, ...distractors])
    return {
      options: allItems.map(k => ({ id: k.char, label: k.han_viet ?? '—' })),
      correctId: kanji.char,
    }
  })

  return (
    <div className="p-4 pt-6 w-full max-w-4xl mx-auto">
      <div className="border border-base-content/20 overflow-hidden">
        <div className="h-0.5 bg-primary w-full" />
        <div className="lg:grid lg:grid-cols-2 lg:divide-x lg:divide-base-content/10">
          {/* Question — left on desktop, top on mobile */}
          <div className="bg-base-200 px-[18px] pt-4 pb-4 border-b border-base-content/10 text-center
                          lg:border-b-0 lg:flex lg:flex-col lg:items-center lg:justify-center lg:py-12 lg:px-10"
          >
            <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest mb-4">
              Hán Việt là gì?
            </p>
            <span
              className="text-7xl lg:text-9xl font-bold leading-none"
              style={{ fontFamily: 'var(--br-jp-font)' }}
            >
              {kanji.char}
            </span>
          </div>
          {/* Options — right on desktop, bottom on mobile */}
          <div className="px-[18px] py-[14px] lg:flex lg:flex-col lg:justify-center lg:py-8 lg:px-8">
            <QuizOptions options={options} correctId={correctId} onAnswer={onAnswer} />
          </div>
        </div>
      </div>
    </div>
  )
}
