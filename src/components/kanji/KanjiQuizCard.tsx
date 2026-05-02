import type { KanjiItem } from '../../types/kanji'
import { useEffect, useState } from 'react'
import { selectKanjiDistractors, shuffle } from '../../lib/quiz'
import { QuizOptions } from '../study/QuizOptions'

interface KanjiQuizCardProps {
  kanji: KanjiItem
  pool: KanjiItem[]
  onAnswer: (correct: boolean) => void
}

export function KanjiQuizCard({ kanji, pool, onAnswer }: KanjiQuizCardProps) {
  const [showHint, setShowHint] = useState(false)

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
            {/* Hint area — onyomi + kunyomi, toggled with [H] */}
            <div className="mt-3 min-h-[28px] flex flex-col items-center justify-center gap-1">
              {showHint && (
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {kanji.onyomi.length > 0 && (
                    <span className="font-[var(--br-jp-font)] text-sm text-neutral">
                      <span className="font-[var(--br-mono-font)] text-[9px] text-base-content/30 mr-1">音</span>
                      {kanji.onyomi.join('・')}
                    </span>
                  )}
                  {kanji.kunyomi.length > 0 && (
                    <span className="font-[var(--br-jp-font)] text-sm text-neutral">
                      <span className="font-[var(--br-mono-font)] text-[9px] text-base-content/30 mr-1">訓</span>
                      {kanji.kunyomi.join('・')}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="mt-1 font-[var(--br-mono-font)] text-[9px] uppercase tracking-widest text-base-content/25 hover:text-base-content/50 transition-colors"
              onClick={() => setShowHint(prev => !prev)}
            >
              {showHint ? '[H] Ẩn' : '[H] Cách đọc'}
            </button>
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
