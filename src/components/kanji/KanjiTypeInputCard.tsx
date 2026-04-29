import { useState } from 'react'
import { useTypeInput } from '../../hooks/useTypeInput'
import { removeDiacritics } from '../../lib/text-utils'

interface KanjiTypeInputCardProps {
  prompt: string
  answer: string
  onAnswer: (correct: boolean) => void
}

export function KanjiTypeInputCard({ prompt, answer, onAnswer }: KanjiTypeInputCardProps) {
  const [raw, setRaw] = useState('')

  const resetKey = `${prompt}:${answer}`
  const { phase, isCorrect, inputRef, commit, advance } = useTypeInput(onAnswer, resetKey)

  function doSkip() {
    if (phase !== 'input')
      return
    commit(false)
  }

  function doCheck() {
    if (!raw.trim())
      return
    commit(removeDiacritics(raw.trim()) === removeDiacritics(answer.trim()))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase === 'result')
      return
    setRaw(e.target.value)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      doSkip()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (phase === 'result')
        advance()
      else
        doCheck()
    }
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (phase === 'result')
      advance()
    else
      doCheck()
  }

  const accentClass = phase === 'result'
    ? isCorrect ? 'border-l-success' : 'border-l-error'
    : 'border-l-primary'

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 border border-base-content/10 border-l-4 ${accentClass} transition-colors`}>

      {/* ── LEFT: Prompt panel ── */}
      <div className="bg-base-200 p-6 lg:p-10 flex flex-col justify-center gap-4 border-b lg:border-b-0 lg:border-r border-base-content/10 min-h-[38vh] lg:min-h-[52vh]">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">HÁN TỰ</p>
        <p
          className="text-8xl lg:text-[9rem] font-bold leading-none"
          style={{ fontFamily: 'var(--br-jp-font)' }}
        >
          {prompt}
        </p>
      </div>

      {/* ── RIGHT: Input panel ── */}
      <div className="p-6 lg:p-10 flex flex-col justify-center gap-5 min-h-[38vh] lg:min-h-[52vh]">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">GÕ HÁN VIỆT</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            value={raw}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Gõ Hán Việt... (không cần dấu)"
            readOnly={phase === 'result'}
            className={`input input-bordered w-full text-center text-2xl lg:text-3xl uppercase font-[var(--br-mono-font)] transition-colors ${
              phase === 'result'
                ? isCorrect
                  ? 'input-success'
                  : 'input-error'
                : ''
            }`}
          />

          {phase === 'result' && !isCorrect && (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">ĐÁP ÁN ĐÚNG</p>
              <p className="text-2xl lg:text-3xl font-bold text-error font-[var(--br-mono-font)] uppercase">{answer}</p>
            </div>
          )}

          {phase === 'input'
            ? (
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!raw.trim()}
                    className="btn btn-primary flex-1 font-[var(--br-mono-font)] text-[11px] uppercase"
                  >
                    KIỂM TRA
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost font-[var(--br-mono-font)] text-[11px] uppercase"
                    onClick={doSkip}
                    title="Bỏ qua (Ctrl+Enter)"
                  >
                    SKIP
                  </button>
                </div>
              )
            : (
                <button
                  type="submit"
                  className={`btn flex-1 font-[var(--br-mono-font)] text-[11px] uppercase ${isCorrect ? 'btn-success' : 'btn-error'}`}
                >
                  {isCorrect ? '✓' : '✗'}
                  {' '}
                  TIẾP TỤC [ENTER]
                </button>
              )}
        </form>

        <p className="text-[10px] font-[var(--br-mono-font)] text-base-content/30 text-center">
          Enter = kiểm tra · Ctrl+Enter = bỏ qua
        </p>
      </div>
    </div>
  )
}
