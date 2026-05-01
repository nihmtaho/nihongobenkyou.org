import type { VocabWithSRS } from '../../types/vocabulary'
import { useRef, useState } from 'react'
import { useTypeInput } from '../../hooks/useTypeInput'
import { extractAnswer, processTypeInput } from '../../lib/convert-input'
import { gradeReading } from '../../lib/mora'
import { normalizeViMeaning, removeDiacritics } from '../../lib/text-utils'
import { AnnotatedWord } from './AnnotatedWord'

export type VocabTypeSubMode = 'word→hira' | 'vi→hira' | 'word→vi+hanviet'

interface KanjiVocabTypeInputCardProps {
  card: VocabWithSRS
  hanVietMap: Map<string, string>
  subMode: VocabTypeSubMode
  onAnswer: (correct: boolean) => void
}

function normalizeCanonical(text: string): string {
  return text
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, '')
    .trim()
}

// ─── Single hiragana input (word→hira, vi→hira) ──────────────────────────────

interface SingleHiraCardProps {
  card: VocabWithSRS
  hanVietMap: Map<string, string>
  subMode: 'word→hira' | 'vi→hira'
  onAnswer: (correct: boolean) => void
}

function SingleHiraCard({ card, hanVietMap, subMode, onAnswer }: SingleHiraCardProps) {
  const [raw, setRaw] = useState('')
  const [wrongMorae, setWrongMorae] = useState<number[]>([])
  const [wasSkipped, setWasSkipped] = useState(false)

  const canonicalReading = normalizeCanonical(card.reading)
  const { phase, isCorrect, inputRef, commit, advance } = useTypeInput(onAnswer, `${card.vocab_id}:${subMode}`)

  const word = card.word ?? card.reading
  const hasAnnotations = card.word !== null && hanVietMap.size > 0

  function doSkip() {
    if (phase !== 'input')
      return
    setWasSkipped(true)
    setWrongMorae([])
    commit(false)
  }

  function doCheck() {
    const answer = extractAnswer(raw).replace(/\s+/g, '')
    if (!answer)
      return
    setWasSkipped(false)
    const graded = gradeReading(answer, canonicalReading)
    setWrongMorae(graded.wrongMorae)
    commit(graded.correct)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase === 'result')
      return
    setRaw(processTypeInput(e.target.value))
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

  const moraChars = canonicalReading.split('').map((char, i) => ({
    char,
    key: `${card.vocab_id}:${i}`,
    i,
  }))

  const accentClass = phase === 'result'
    ? isCorrect ? 'border-l-success' : 'border-l-error'
    : 'border-l-primary'

  return (
    <div className={`grid grid-cols-1 border border-base-content/10 border-l-4 ${accentClass} transition-colors`}>

      {/* ── Prompt panel ── */}
      <div className="bg-base-200 p-6 flex flex-col items-center justify-center text-center gap-4 border-b border-base-content/10 min-h-[30vh]">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
          {subMode === 'vi→hira' ? 'NGHĨA TIẾNG VIỆT' : 'TỪ VỰNG KANJI'}
        </p>

        {subMode === 'vi→hira'
          ? (
              <div className="flex flex-col gap-2">
                <p className="text-3xl font-bold leading-snug">{card.meaning_vi}</p>
              </div>
            )
          : hasAnnotations
            ? (
                <AnnotatedWord
                  word={word}
                  hanVietMap={hanVietMap}
                  className="text-6xl font-bold leading-tight break-all text-center"
                />
              )
            : (
                <p
                  className="text-6xl font-bold leading-tight break-all"
                  style={{ fontFamily: 'var(--br-jp-font)' }}
                >
                  {word}
                </p>
              )}

        {phase === 'result' && !isCorrect && subMode === 'vi→hira' && (
          <div className="border-t border-base-content/10 pt-4 flex flex-col gap-1">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral">TỪ VỰNG</p>
            {hasAnnotations
              ? (
                  <AnnotatedWord word={word} hanVietMap={hanVietMap} className="text-2xl font-bold" />
                )
              : (
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--br-jp-font)' }}>{word}</p>
                )}
          </div>
        )}

        {phase === 'result' && !isCorrect && subMode === 'word→hira' && (
          <div className="border-t border-base-content/10 pt-4 flex flex-col gap-1">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral">NGHĨA</p>
            <p className="text-lg font-bold">{card.meaning_vi}</p>
          </div>
        )}
      </div>

      {/* ── Input panel ── */}
      <div className="p-6 flex flex-col gap-5">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
          GÕ CÁCH ĐỌC (HIRAGANA)
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            value={raw}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Gõ hiragana · # = romaji · @ = katakana"
            readOnly={phase === 'result'}
            className={`input input-bordered w-full text-center text-2xl lg:text-3xl transition-colors ${
              phase === 'result'
                ? isCorrect
                  ? 'input-success'
                  : 'input-error'
                : ''
            }`}
            style={{ fontFamily: 'var(--br-jp-font)' }}
          />

          {phase === 'result' && !isCorrect && (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">ĐÁP ÁN ĐÚNG</p>
              {wasSkipped
                ? (
                    <p
                      className="text-2xl lg:text-3xl font-bold text-base-content"
                      style={{ fontFamily: 'var(--br-jp-font)' }}
                    >
                      {canonicalReading}
                    </p>
                  )
                : (
                    <div className="flex gap-px justify-center flex-wrap">
                      {moraChars.map(({ char, key, i }) => (
                        <span
                          key={key}
                          className={`text-2xl lg:text-3xl font-bold ${wrongMorae.includes(i) ? 'text-error' : 'text-success'}`}
                          style={{ fontFamily: 'var(--br-jp-font)' }}
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                  )}
            </div>
          )}

          {phase === 'input'
            ? (
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!extractAnswer(raw).replace(/\s+/g, '')}
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
          Enter = kiểm tra · Ctrl+Enter = bỏ qua · # = romaji · @ = katakana
        </p>
      </div>
    </div>
  )
}

// ─── Dual field: Vietnamese meaning + Han Viet ────────────────────────────────

interface DualViHvCardProps {
  card: VocabWithSRS
  hanVietMap: Map<string, string>
  onAnswer: (correct: boolean) => void
}

function DualViHvCard({ card, hanVietMap, onAnswer }: DualViHvCardProps) {
  const [viRaw, setViRaw] = useState('')
  const [hvRaw, setHvRaw] = useState('')
  const [phase, setPhase] = useState<'input' | 'result'>('input')
  const [viResult, setViResult] = useState(false)
  const [hvResult, setHvResult] = useState(false)
  const isCorrectRef = useRef(false)
  const viRef = useRef<HTMLInputElement>(null)

  const canonicalViMeaning = normalizeViMeaning(card.meaning_vi)
  const hasHanViet = !!card.han_viet

  const word = card.word ?? card.reading
  const hasAnnotations = card.word !== null && hanVietMap.size > 0
  const isAllCorrect = viResult && (!hasHanViet || hvResult)

  function doCheck() {
    const viAnswer = viRaw.trim().toLowerCase()
    if (!viAnswer)
      return

    const viSegments = canonicalViMeaning.split(',').map(s => s.trim()).filter(Boolean)
    const vi = viSegments.includes(viAnswer)

    let hv = true
    if (hasHanViet) {
      hv = removeDiacritics(hvRaw.trim()) === removeDiacritics(card.han_viet!.trim())
    }

    isCorrectRef.current = vi && hv
    setViResult(vi)
    setHvResult(hv)
    setPhase('result')
  }

  function doSkip() {
    if (phase !== 'input')
      return
    isCorrectRef.current = false
    setViResult(false)
    setHvResult(false)
    setPhase('result')
  }

  function advance() {
    onAnswer(isCorrectRef.current)
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
    ? isAllCorrect ? 'border-l-success' : 'border-l-error'
    : 'border-l-primary'

  return (
    <div className={`grid grid-cols-1 border border-base-content/10 border-l-4 ${accentClass} transition-colors`}>

      {/* ── Prompt panel ── */}
      <div className="bg-base-200 p-6 flex flex-col items-center justify-center text-center gap-4 border-b border-base-content/10 min-h-[30vh]">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">TỪ VỰNG KANJI</p>

        {hasAnnotations
          ? (
              <AnnotatedWord
                word={word}
                hanVietMap={hanVietMap}
                className="text-6xl font-bold leading-tight break-all text-center"
              />
            )
          : (
              <p
                className="text-6xl font-bold leading-tight break-all"
                style={{ fontFamily: 'var(--br-jp-font)' }}
              >
                {word}
              </p>
            )}

        <div className="flex flex-col gap-0.5">
          <p className="text-sm leading-none text-neutral" style={{ fontFamily: 'var(--br-jp-font)' }}>
            {card.reading}
          </p>
        </div>
      </div>

      {/* ── Input panel ── */}
      <div className="p-6 flex flex-col gap-5">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
          GÕ NGHĨA + HÁN VIỆT
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Field 1: Vietnamese meaning */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral/60">NGHĨA TIẾNG VIỆT</label>
            <input
              ref={viRef}
              type="text"
              inputMode="text"
              autoFocus
              autoComplete="off"
              value={viRaw}
              onChange={e => phase === 'input' && setViRaw(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Gõ nghĩa tiếng Việt..."
              readOnly={phase === 'result'}
              className={`input input-bordered w-full text-center text-xl lg:text-2xl transition-colors ${
                phase === 'result'
                  ? viResult
                    ? 'input-success'
                    : 'input-error'
                  : ''
              }`}
            />
            {phase === 'result' && (
              <p className={`text-sm font-bold text-center ${viResult ? 'text-success' : 'text-error'}`}>
                {viResult ? '✓ Đúng' : `✗ ${card.meaning_vi}`}
              </p>
            )}
          </div>

          {/* Field 2: Han Viet */}
          {hasHanViet && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral/60">HÁN VIỆT</label>
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                value={hvRaw}
                onChange={e => phase === 'input' && setHvRaw(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Gõ Hán Việt... (không cần dấu)"
                readOnly={phase === 'result'}
                className={`input input-bordered w-full text-center text-xl lg:text-2xl uppercase font-[var(--br-mono-font)] transition-colors ${
                  phase === 'result'
                    ? hvResult
                      ? 'input-success'
                      : 'input-error'
                    : ''
                }`}
              />
              {phase === 'result' && (
                <p className={`text-sm font-bold font-[var(--br-mono-font)] uppercase text-center ${hvResult ? 'text-success' : 'text-error'}`}>
                  {hvResult ? '✓ Đúng' : `✗ ${card.han_viet}`}
                </p>
              )}
            </div>
          )}

          {phase === 'input'
            ? (
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!viRaw.trim()}
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
                  className={`btn flex-1 font-[var(--br-mono-font)] text-[11px] uppercase ${isAllCorrect ? 'btn-success' : 'btn-error'}`}
                >
                  {isAllCorrect ? '✓' : '✗'}
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

// ─── Public component ─────────────────────────────────────────────────────────

export function KanjiVocabTypeInputCard({ card, hanVietMap, subMode, onAnswer }: KanjiVocabTypeInputCardProps) {
  if (subMode === 'word→vi+hanviet') {
    return <DualViHvCard card={card} hanVietMap={hanVietMap} onAnswer={onAnswer} />
  }
  return <SingleHiraCard card={card} hanVietMap={hanVietMap} subMode={subMode} onAnswer={onAnswer} />
}
