import { useEffect, useState } from 'react'

const CORRECT_ADVANCE_MS = 600

interface QuizOptionsProps {
  options: { id: string, label: string }[]
  correctId: string
  onAnswer: (isCorrect: boolean) => void
}

export function QuizOptions({ options, correctId, onAnswer }: QuizOptionsProps) {
  // Store options reference alongside selected so the reset happens synchronously during render
  // when a new card is dealt, avoiding a setState-in-effect pattern.
  const [prevOptions, setPrevOptions] = useState(options)
  const [selected, setSelected] = useState<string | null>(null)

  if (options !== prevOptions) {
    setPrevOptions(options)
    setSelected(null)
  }

  useEffect(() => {
    if (selected === correctId) {
      const t = setTimeout(onAnswer, CORRECT_ADVANCE_MS, true)
      return () => clearTimeout(t)
    }
  }, [selected, correctId, onAnswer])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return
      if (selected === null) {
        const idx = Number(e.key) - 1
        if (idx >= 0 && idx < options.length)
          setSelected(options[idx].id)
      }
      else if (e.key === ' ' && selected !== correctId) {
        e.preventDefault()
        onAnswer(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selected, options, correctId, onAnswer])

  function handleSelect(id: string) {
    if (selected !== null)
      return
    setSelected(id)
  }

  const showContinue = selected !== null && selected !== correctId

  return (
    <div className="flex flex-col gap-1.5">
      {options.map((opt, idx) => {
        const isCorrect = opt.id === correctId
        const isWrong = opt.id === selected && selected !== correctId
        const isGhost = selected !== null && !isCorrect && opt.id !== selected

        const btnCls = [
          'flex items-center gap-2.5 px-3.5 py-2.5 text-left w-full transition-colors',
          selected === null
            ? 'border border-border/20 bg-card hover:border-primary hover:bg-primary/10 cursor-pointer'
            : isCorrect
              ? 'border-y border-r border-success border-l-4 border-l-success bg-success/10 text-success'
              : isWrong
                ? 'border border-destructive bg-destructive/10 text-destructive opacity-60'
                : 'border border-border/10 bg-card opacity-25 pointer-events-none',
        ].join(' ')

        const numCls = [
          'font-[var(--br-mono-font)] text-[9px] border px-1.5 py-px flex-shrink-0 leading-snug',
          selected !== null && isCorrect
            ? 'border-success text-success'
            : selected !== null && isWrong
              ? 'border-destructive text-destructive'
              : 'border-border/20 text-muted-foreground',
        ].join(' ')

        return (
          <button
            key={opt.id}
            type="button"
            className={btnCls}
            onClick={() => handleSelect(opt.id)}
            aria-disabled={isGhost}
          >
            <span className={numCls}>{idx + 1}</span>
            <span className="font-[var(--br-jp-font)] text-sm leading-snug flex-1">{opt.label}</span>
          </button>
        )
      })}

      <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-foreground/30 text-right mt-1 tracking-widest">
        {selected === null
          ? 'Phím 1–4 để chọn'
          : selected !== correctId
            ? '[SPACE] tiếp tục'
            : ''}
      </p>

      {showContinue && (
        <button
          type="button"
          className="w-full bg-primary text-primary-content font-[var(--br-mono-font)] text-[10px] uppercase tracking-widest py-2.5 font-bold mt-1"
          onClick={() => onAnswer(false)}
        >
          TIẾP TỤC →
        </button>
      )}
    </div>
  )
}
