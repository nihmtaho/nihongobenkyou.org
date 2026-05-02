import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useTypeInput } from '../../hooks/useTypeInput'
import { removeDiacritics } from '../../lib/text-utils'

interface KanjiTypeInputCardProps {
  prompt: string
  answer: string
  hint?: string
  onAnswer: (correct: boolean) => void
}

export function KanjiTypeInputCard({ prompt, answer, hint, onAnswer }: KanjiTypeInputCardProps) {
  const [raw, setRaw] = useState('')
  const [hintedKey, setHintedKey] = useState<string | null>(null)

  const resetKey = `${prompt}:${answer}`
  const { phase, isCorrect, inputRef, commit, advance } = useTypeInput(onAnswer, resetKey)

  const showHint = hintedKey === resetKey

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
    if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault()
      if (phase === 'input' && hint)
        setHintedKey(prev => prev === resetKey ? null : resetKey)
      return
    }
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
    <div className={`grid grid-cols-1 border border-base-content/10 border-l-4 ${accentClass} transition-colors`}>

      {/* ── Prompt panel ── */}
      <div className="bg-base-200 p-6 flex flex-col items-center justify-center text-center gap-4 border-b border-base-content/10 min-h-[30vh]">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">HÁN TỰ</p>
        <p
          className="text-8xl font-bold leading-none"
          style={{ fontFamily: 'var(--br-jp-font)' }}
        >
          {prompt}
        </p>

        {/* Hint content — input phase only */}
        {phase === 'input' && hint && showHint && (
          <div className="w-full flex items-center justify-center bg-primary/[0.08] border border-primary/25 border-l-[3px] border-l-primary px-3.5 py-2">
            <span className="text-base font-semibold text-neutral" style={{ fontFamily: 'var(--br-jp-font)' }}>
              {hint}
            </span>
          </div>
        )}

        {/* Hint toggle button — input phase only, when hint data available */}
        {phase === 'input' && hint && (
          <button
            type="button"
            onClick={() => setHintedKey(prev => prev === resetKey ? null : resetKey)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border font-[var(--br-mono-font)] text-[9px] uppercase tracking-wider transition-colors ${
              showHint
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-base-content/20 bg-transparent text-base-content/40 hover:border-base-content/35 hover:text-base-content/60'
            }`}
          >
            {showHint ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>{showHint ? 'Ẩn' : 'Nghĩa'}</span>
            <span className="opacity-50">Ctrl+H</span>
          </button>
        )}
      </div>

      {/* ── Input panel ── */}
      <div className="p-6 flex flex-col gap-5">
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

          {phase === 'result' && (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
                {isCorrect ? 'HÁN VIỆT' : 'ĐÁP ÁN ĐÚNG'}
              </p>
              <p className={`text-2xl lg:text-3xl font-bold font-[var(--br-mono-font)] uppercase ${isCorrect ? 'text-success' : 'text-error'}`}>
                {answer}
              </p>
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
          {hint ? 'Enter = kiểm tra · Ctrl+Enter = bỏ qua · Ctrl+H = hint' : 'Enter = kiểm tra · Ctrl+Enter = bỏ qua'}
        </p>
      </div>
    </div>
  )
}
