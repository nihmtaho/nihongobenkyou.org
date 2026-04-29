import type { KanjiItem } from '../../types/kanji'
import { useEffect, useState } from 'react'

interface KanjiQuizCardProps {
  kanji: KanjiItem
  pool: KanjiItem[]
  onAnswer: (correct: boolean) => void
}

function selectDistractors(target: KanjiItem, pool: KanjiItem[]): KanjiItem[] {
  const candidates = pool.filter(k => k.char !== target.char && k.han_viet != null)
  const sameLevel = candidates.filter(k => k.jlpt_level === target.jlpt_level)
  const rest = candidates.filter(k => k.jlpt_level !== target.jlpt_level)
  const sorted = [...sameLevel.sort(() => Math.random() - 0.5), ...rest.sort(() => Math.random() - 0.5)]
  return sorted.slice(0, 3)
}

export function KanjiQuizCard({ kanji, pool, onAnswer }: KanjiQuizCardProps) {
  const [{ options, correctAnswer }] = useState(() => {
    const distractors = selectDistractors(kanji, pool)
    const correct = kanji.han_viet ?? '—'
    const allOptions = [correct, ...distractors.map(d => d.han_viet ?? '—')]
    return {
      options: allOptions.sort(() => Math.random() - 0.5),
      correctAnswer: correct,
    }
  })
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (selected === correctAnswer) {
      const t = setTimeout(onAnswer, 800, true)
      return () => clearTimeout(t)
    }
  }, [selected, correctAnswer, onAnswer])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return
      const idx = Number(e.key) - 1
      if (idx >= 0 && idx < options.length)
        handleSelect(options[idx])
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  function handleSelect(opt: string) {
    if (selected !== null)
      return
    setSelected(opt)
  }

  const showContinue = selected !== null && selected !== correctAnswer

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

      <div className="join join-vertical w-full">
        {options.map((opt, idx) => {
          let cls = 'btn join-item w-full h-auto py-3 font-[var(--br-heading-font)] text-base uppercase tracking-wide text-left flex items-center justify-between px-4'
          if (selected !== null) {
            if (opt === correctAnswer)
              cls += ' btn-success'
            else if (opt === selected)
              cls += ' btn-error'
            else
              cls += ' btn-ghost opacity-40'
          }
          else {
            cls += ' btn-outline'
          }
          return (
            <button
              key={opt}
              type="button"
              className={cls}
              onClick={() => handleSelect(opt)}
            >
              <span className="text-[10px] font-[var(--br-mono-font)] opacity-50 mr-3">{`[${idx + 1}]`}</span>
              <span className="flex-1 text-center">{opt}</span>
            </button>
          )
        })}
      </div>

      {showContinue && (
        <button
          type="button"
          className="btn btn-primary w-full font-[var(--br-mono-font)] uppercase text-[11px]"
          onClick={() => onAnswer(false)}
        >
          Tiếp tục
        </button>
      )}

      <p className="text-[10px] text-base-content/30 font-[var(--br-mono-font)] text-center">
        Phím 1–4 để chọn đáp án
      </p>
    </div>
  )
}
