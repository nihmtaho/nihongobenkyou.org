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
    <div className="max-w-sm mx-auto w-full border border-base-content/20 overflow-hidden">
      <div className="h-0.5 bg-primary w-full" />
      <div className="bg-base-200 px-[18px] pt-4 pb-3 border-b border-base-content/10 text-center">
        <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest mb-3">
          Hán Việt là gì?
        </p>
        <span
          className="text-7xl font-bold leading-none"
          style={{ fontFamily: 'var(--br-jp-font)' }}
        >
          {kanji.char}
        </span>
      </div>
      <div className="px-[18px] py-[14px]">
        <QuizOptions options={options} correctId={correctId} onAnswer={onAnswer} />
      </div>
    </div>
  )
}
