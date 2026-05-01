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
    <div className="flex flex-col gap-6 p-4 w-full mx-auto">
      <div className="card bg-base-100 border-2 border-base-content shadow p-6 text-center">
        <span
          className="text-7xl font-bold leading-none"
          style={{ fontFamily: 'var(--br-jp-font)' }}
        >
          {kanji.char}
        </span>
        <span className="text-[10px] font-[var(--br-mono-font)] uppercase text-base-content/40 mt-3">
          Hán Việt là gì?
        </span>
      </div>
      <QuizOptions options={options} correctId={correctId} onAnswer={onAnswer} />
    </div>
  )
}
