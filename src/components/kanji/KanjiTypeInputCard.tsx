import { useState } from 'react'
import { useTypeInput } from '../../hooks/useTypeInput'
import { extractAnswer, processTypeInput } from '../../lib/convert-input'
import { removeDiacritics } from '../../lib/text-utils'

interface KanjiTypeInputCardProps {
  subMode: 'han-viet' | 'hiragana'
  prompt: string
  answer: string
  onAnswer: (correct: boolean) => void
}

export function KanjiTypeInputCard({ subMode, prompt, answer, onAnswer }: KanjiTypeInputCardProps) {
  const [raw, setRaw] = useState('')

  const resetKey = `${prompt}:${answer}`
  const { phase, isCorrect, inputRef, commit, advance } = useTypeInput(onAnswer, resetKey)

  function getEffective(): string {
    return subMode === 'hiragana' ? extractAnswer(raw) : raw
  }

  function checkAnswer(): boolean {
    const effective = getEffective()
    if (subMode === 'han-viet')
      return removeDiacritics(effective.trim()) === removeDiacritics(answer.trim())
    return effective.trim() === answer.trim()
  }

  function doSkip() {
    if (phase !== 'input')
      return
    commit(false)
  }

  function doCheck() {
    if (!getEffective().trim())
      return
    commit(checkAnswer())
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase === 'result')
      return
    setRaw(subMode === 'hiragana' ? processTypeInput(e.target.value) : e.target.value)
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

  const isJpPrompt = subMode === 'hiragana'
  const placeholder = subMode === 'han-viet'
    ? 'Gõ Hán Việt... (# = romaji, không chuyển)'
    : 'Gõ hiragana... (# = romaji, @ = katakana)'

  return (
    <div className="flex flex-col gap-5 p-4 max-w-sm mx-auto w-full">
      <div className="card bg-base-100 border-2 border-base-content shadow p-6 text-center">
        <span
          className={`font-bold leading-tight ${isJpPrompt ? 'text-sm text-neutral' : 'text-3xl'}`}
          style={{ fontFamily: isJpPrompt ? undefined : 'var(--br-jp-font)' }}
        >
          {prompt}
        </span>
        {subMode === 'hiragana' && (
          <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-base-content/40 mt-2">
            Gõ từ vựng bằng hiragana
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          autoFocus
          autoComplete="off"
          value={raw}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={phase === 'result'}
          className={`input input-bordered w-full text-center text-xl ${
            phase === 'result'
              ? isCorrect
                ? 'input-success'
                : 'input-error'
              : ''
          }`}
          style={subMode === 'hiragana' ? { fontFamily: 'var(--br-jp-font)' } : undefined}
        />

        {phase === 'result' && !isCorrect && (
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral">ĐÁP ÁN ĐÚNG</p>
            <p
              className="text-xl font-bold text-error"
              style={subMode === 'hiragana' ? { fontFamily: 'var(--br-jp-font)' } : undefined}
            >
              {answer}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {phase === 'input'
            ? (
                <>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1 font-[var(--br-mono-font)] uppercase text-[11px]"
                    disabled={!getEffective().trim()}
                  >
                    Kiểm tra
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost font-[var(--br-mono-font)] uppercase text-[11px]"
                    onClick={doSkip}
                    title="Bỏ qua (Ctrl+Enter)"
                  >
                    Skip
                  </button>
                </>
              )
            : (
                <button
                  type="submit"
                  className={`btn flex-1 font-[var(--br-mono-font)] uppercase text-[11px] ${isCorrect ? 'btn-success' : 'btn-error'}`}
                >
                  {isCorrect ? '✓' : '✗'}
                  {' '}
                  Tiếp tục [Enter]
                </button>
              )}
        </div>

        <p className="text-[10px] font-[var(--br-mono-font)] text-base-content/30 text-center">
          Enter = kiểm tra / tiếp tục · Ctrl+Enter = bỏ qua (xem đáp án)
        </p>
      </form>
    </div>
  )
}
