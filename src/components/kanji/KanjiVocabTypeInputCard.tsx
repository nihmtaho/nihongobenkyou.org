import type { SRSRating } from '../../types/srs'
import type { VocabWithSRS } from '../../types/vocabulary'
import { Eye, EyeOff } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTypeInput } from '../../hooks/useTypeInput'
import { extractAnswer, processTypeInput } from '../../lib/convert-input'
import { gradeReading } from '../../lib/mora'
import { normalizeViMeaning, removeDiacritics } from '../../lib/text-utils'
import { RatingBar } from '../study/shared/RatingBar'
import { AnnotatedWord } from './AnnotatedWord'

export type VocabTypeSubMode = 'word→hira' | 'vi→hira' | 'word→vi+hanviet'

interface KanjiVocabTypeInputCardProps {
  card: VocabWithSRS
  hanVietMap: Map<string, string>
  subMode: VocabTypeSubMode
  onRate: (rating: SRSRating) => void
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
  onRate: (rating: SRSRating) => void
}

function SingleHiraCard({ card, hanVietMap, subMode, onRate }: SingleHiraCardProps) {
  const [raw, setRaw] = useState('')
  const [wrongMorae, setWrongMorae] = useState<number[]>([])
  const [wasSkipped, setWasSkipped] = useState(false)
  const [hintedKey, setHintedKey] = useState<string | null>(null)

  const canonicalReading = normalizeCanonical(card.reading)
  const { phase, isCorrect, inputRef, commit } = useTypeInput(() => {}, `${card.vocab_id}:${subMode}`)

  const word = card.word ?? card.reading
  const hasAnnotations = card.word !== null && hanVietMap.size > 0

  const showHint = hintedKey === card.vocab_id

  const hintLabel = subMode === 'vi→hira' ? 'Từ vựng' : 'Nghĩa'
  const hintContent = subMode === 'vi→hira' ? word : card.meaning_vi
  const hintIsVocab = subMode === 'vi→hira'

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
    if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault()
      if (phase === 'input')
        setHintedKey(prev => prev === card.vocab_id ? null : card.vocab_id)
      return
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      doSkip()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (phase !== 'result')
        doCheck()
    }
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (phase !== 'result')
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
    <div className={`grid grid-cols-1 border border-border/10 border-l-4 ${accentClass} transition-colors`}>

      {/* ── Prompt panel ── */}
      <div className="bg-card p-6 flex flex-col items-center justify-center text-center gap-4 border-b border-border/10 min-h-[30vh]">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
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

        {/* Hint content — input phase only */}
        {phase === 'input' && showHint && (
          <div className="w-full flex items-center justify-center bg-primary/[0.08] border border-primary/25 border-l-[3px] border-l-primary px-3.5 py-2">
            <span
              className={`font-[var(--br-jp-font)] font-semibold text-muted-foreground ${hintIsVocab ? 'text-2xl font-bold' : 'text-base'}`}
            >
              {hintContent}
            </span>
          </div>
        )}

        {/* Hint toggle button — input phase only */}
        {phase === 'input' && (
          <button
            type="button"
            onClick={() => setHintedKey(prev => prev === card.vocab_id ? null : card.vocab_id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border font-[var(--br-mono-font)] text-[9px] uppercase tracking-wider transition-colors ${
              showHint
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border/20 bg-transparent text-foreground/40 hover:border-border/35 hover:text-foreground/60'
            }`}
          >
            {showHint ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>{showHint ? 'Ẩn' : hintLabel}</span>
            <span className="opacity-50">Ctrl+H</span>
          </button>
        )}

        {/* Reveal kanji + reading after result in vi→hira mode */}
        {phase === 'result' && subMode === 'vi→hira' && (
          <div className="border-t border-border/10 pt-4 flex flex-col gap-1">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground">TỪ VỰNG</p>
            {hasAnnotations
              ? (
                  <AnnotatedWord word={word} hanVietMap={hanVietMap} className="text-2xl font-bold" />
                )
              : (
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--br-jp-font)' }}>{word}</p>
                )}
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--br-jp-font)' }}>{canonicalReading}</p>
          </div>
        )}

        {/* Reveal reading + meaning after result in word→hira mode */}
        {phase === 'result' && subMode === 'word→hira' && (
          <div className="border-t border-border/10 pt-4 flex flex-col gap-1">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground">CÁCH ĐỌC</p>
            <p className="text-lg text-muted-foreground" style={{ fontFamily: 'var(--br-jp-font)' }}>{canonicalReading}</p>
            <p className="text-sm text-muted-foreground/75">{card.meaning_vi}</p>
          </div>
        )}
      </div>

      {/* ── Input panel ── */}
      <div className="p-6 flex flex-col gap-5">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
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
              <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">ĐÁP ÁN ĐÚNG</p>
              {wasSkipped
                ? (
                    <p
                      className="text-2xl lg:text-3xl font-bold text-foreground"
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
                          className={`text-2xl lg:text-3xl font-bold ${wrongMorae.includes(i) ? 'text-destructive' : 'text-success'}`}
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
                  <Button
                    type="submit"
                    disabled={!extractAnswer(raw).replace(/\s+/g, '')}
                    className="flex-1 font-[var(--br-mono-font)] text-[11px] uppercase"
                  >
                    KIỂM TRA
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="font-[var(--br-mono-font)] text-[11px] uppercase"
                    onClick={doSkip}
                    title="Bỏ qua (Ctrl+Enter)"
                  >
                    SKIP
                  </Button>
                </div>
              )
            : (
                <RatingBar card={card} onRate={onRate} correct={isCorrect} />
              )}
        </form>

        <p className="text-[10px] font-[var(--br-mono-font)] text-foreground/30 text-center">
          Enter = kiểm tra · Ctrl+Enter = bỏ qua · Ctrl+H = hint · # = romaji · @ = katakana
        </p>
      </div>
    </div>
  )
}

// ─── Dual field: Vietnamese meaning + Han Viet ────────────────────────────────

interface DualViHvCardProps {
  card: VocabWithSRS
  hanVietMap: Map<string, string>
  onRate: (rating: SRSRating) => void
}

function DualViHvCard({ card, hanVietMap, onRate }: DualViHvCardProps) {
  const [viRaw, setViRaw] = useState('')
  const [hvRaw, setHvRaw] = useState('')
  const [phase, setPhase] = useState<'input' | 'result'>('input')
  const [viResult, setViResult] = useState(false)
  const [hvResult, setHvResult] = useState(false)
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

    setViResult(vi)
    setHvResult(hv)
    setPhase('result')
  }

  function doSkip() {
    if (phase !== 'input')
      return
    setViResult(false)
    setHvResult(false)
    setPhase('result')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      doSkip()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (phase !== 'result')
        doCheck()
    }
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (phase !== 'result')
      doCheck()
  }

  const accentClass = phase === 'result'
    ? isAllCorrect ? 'border-l-success' : 'border-l-error'
    : 'border-l-primary'

  return (
    <div className={`grid grid-cols-1 border border-border/10 border-l-4 ${accentClass} transition-colors`}>

      {/* ── Prompt panel ── */}
      <div className="bg-card p-6 flex flex-col items-center justify-center text-center gap-4 border-b border-border/10 min-h-[30vh]">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">TỪ VỰNG KANJI</p>

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
          <p className="text-sm leading-none text-muted-foreground" style={{ fontFamily: 'var(--br-jp-font)' }}>
            {card.reading}
          </p>
        </div>
      </div>

      {/* ── Input panel ── */}
      <div className="p-6 flex flex-col gap-5">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
          GÕ NGHĨA + HÁN VIỆT
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Field 1: Vietnamese meaning */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground/60">NGHĨA TIẾNG VIỆT</label>
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
              <p className={`text-sm font-bold text-center ${viResult ? 'text-success' : 'text-destructive'}`}>
                {viResult ? '✓ Đúng' : `✗ ${card.meaning_vi}`}
              </p>
            )}
          </div>

          {/* Field 2: Han Viet */}
          {hasHanViet && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground/60">HÁN VIỆT</label>
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
                <p className={`text-sm font-bold font-[var(--br-mono-font)] uppercase text-center ${hvResult ? 'text-success' : 'text-destructive'}`}>
                  {hvResult ? '✓ Đúng' : `✗ ${card.han_viet}`}
                </p>
              )}
            </div>
          )}

          {phase === 'input'
            ? (
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={!viRaw.trim()}
                    className="flex-1 font-[var(--br-mono-font)] text-[11px] uppercase"
                  >
                    KIỂM TRA
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="font-[var(--br-mono-font)] text-[11px] uppercase"
                    onClick={doSkip}
                    title="Bỏ qua (Ctrl+Enter)"
                  >
                    SKIP
                  </Button>
                </div>
              )
            : (
                <RatingBar card={card} onRate={onRate} correct={isAllCorrect} />
              )}
        </form>

        <p className="text-[10px] font-[var(--br-mono-font)] text-foreground/30 text-center">
          Enter = kiểm tra · Ctrl+Enter = bỏ qua
        </p>
      </div>
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export function KanjiVocabTypeInputCard({ card, hanVietMap, subMode, onRate }: KanjiVocabTypeInputCardProps) {
  if (subMode === 'word→vi+hanviet') {
    return <DualViHvCard card={card} hanVietMap={hanVietMap} onRate={onRate} />
  }
  return <SingleHiraCard card={card} hanVietMap={hanVietMap} subMode={subMode} onRate={onRate} />
}
