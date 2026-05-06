import type { SRSRating } from '../../types/srs'
import type { TypeInputSubMode } from '../../types/study'
import type { VocabWithSRS } from '../../types/vocabulary'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useTypeInput } from '../../hooks/useTypeInput'
import { extractAnswer, processTypeInput } from '../../lib/convert-input'
import { gradeReading } from '../../lib/mora'
import { normalizeViMeaning } from '../../lib/text-utils'
import { RatingBar } from './shared/RatingBar'

interface TypeInputCardProps {
  card: VocabWithSRS
  subMode?: TypeInputSubMode
  onRate: (rating: SRSRating) => void
}

function normalizeAnswer(text: string): string {
  return text
    .replace(/\[.*?\]/g, '') // ASCII []
    .replace(/\(.*?\)/g, '') // ASCII ()
    .replace(/［.*?］/g, '') // full-width ［］
    .replace(/（.*?）/g, '') // full-width （）
    .replace(/〔.*?〕/g, '') // tortoise-shell 〔〕
    .replace(/〜/g, '～') // normalize wave dash (U+301C) → fullwidth tilde (U+FF5E)
    .replace(/\s+/g, '') // strip spaces — kana readings don't use spaces semantically
    .trim()
}

export function TypeInputCard({ card, subMode = 'word→hira', onRate }: TypeInputCardProps) {
  const [raw, setRaw] = useState('')
  const [wrongMorae, setWrongMorae] = useState<number[]>([])
  const [wasSkipped, setWasSkipped] = useState(false)
  const [hintedKey, setHintedKey] = useState<string | null>(null)

  const canonicalReading = normalizeAnswer(card.reading)
  const canonicalViMeaning = normalizeViMeaning(card.meaning_vi)
  const canonicalHanViet = (card.han_viet ?? '').toLowerCase().trim()

  const { phase, isCorrect, inputRef, commit } = useTypeInput(() => {}, card.vocab_id)

  const showHint = hintedKey === card.vocab_id

  const word = card.word ?? card.reading

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
    if (subMode === 'word→han_viet') {
      const answer = raw.trim().toLowerCase()
      if (!answer)
        return
      setWasSkipped(false)
      setWrongMorae([])
      commit(!!canonicalHanViet && answer === canonicalHanViet)
      return
    }

    if (subMode === 'word→vi') {
      const answer = raw.trim().toLowerCase()
      if (!answer)
        return
      setWasSkipped(false)
      setWrongMorae([])
      // Accept any comma-separated segment of the meaning
      const segments = canonicalViMeaning.split(',').map(s => s.trim()).filter(Boolean)
      commit(segments.includes(answer))
      return
    }

    const answer = extractAnswer(raw).replace(/\s+/g, '')
    if (!answer)
      return
    setWasSkipped(false)
    if (subMode === 'word→hira') {
      const graded = gradeReading(answer, canonicalReading)
      setWrongMorae(graded.wrongMorae)
      commit(graded.correct)
    }
    else {
      setWrongMorae([])
      commit(answer.trim() === canonicalReading)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase === 'result')
      return
    // word→vi: store raw DOM value — wanakana would mangle Vietnamese diacritics
    setRaw((subMode === 'word→vi' || subMode === 'word→han_viet') ? e.target.value : processTypeInput(e.target.value))
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

  const moraChars = canonicalReading.split('').map((char, i) => ({ char, key: `${card.vocab_id}:${i}`, i }))

  const accentClass = phase === 'result'
    ? isCorrect
      ? 'border-l-success'
      : 'border-l-destructive'
    : 'border-l-primary'

  return (
    <div className={`grid grid-cols-1 border border-border/10 border-l-4 ${accentClass} transition-colors`}>

      {/* ── Prompt panel ── */}
      <div className="bg-card p-6 flex flex-col items-center justify-center text-center gap-4 border-b border-border/10 min-h-[30vh]">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
          {card.pos.join(' · ')}
          {' '}
          · BÀI
          {' '}
          {String(card.lesson_number).padStart(2, '0')}
        </p>

        {subMode === 'word→hira' || subMode === 'word→vi' || subMode === 'word→han_viet'
          ? (
              <p className="text-6xl font-bold font-[var(--br-jp-font)] leading-tight break-all">
                {word}
              </p>
            )
          : (
              <div className="flex flex-col gap-2">
                <p className="text-3xl font-bold leading-snug">
                  {card.meaning_vi}
                </p>
                <p className="text-sm text-muted-foreground">{card.meaning_en}</p>
              </div>
            )}

        {/* Hint content — visible during input phase when toggled */}
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
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 border font-[var(--br-mono-font)] text-[9px] uppercase tracking-wider transition-colors',
              showHint
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border/20 bg-transparent text-foreground/40 hover:border-border/35 hover:text-foreground/60',
            )}
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
            <p className="text-2xl font-bold font-[var(--br-jp-font)]">{word}</p>
            <p className="text-sm font-[var(--br-jp-font)] text-muted-foreground">{canonicalReading}</p>
          </div>
        )}

        {/* Reveal reading + meaning after result in word→hira mode */}
        {phase === 'result' && subMode === 'word→hira' && (
          <div className="border-t border-border/10 pt-4 flex flex-col gap-1">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground">CÁCH ĐỌC</p>
            <p className="text-lg font-[var(--br-jp-font)] text-muted-foreground">{canonicalReading}</p>
            <p className="text-sm text-muted-foreground/75">{card.meaning_vi}</p>
          </div>
        )}

        {/* Reveal reading after result in word→vi mode */}
        {phase === 'result' && subMode === 'word→vi' && (
          <div className="border-t border-border/10 pt-4 flex flex-col gap-1">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground">CÁCH ĐỌC</p>
            <p className="text-lg font-[var(--br-jp-font)] text-muted-foreground">{canonicalReading}</p>
          </div>
        )}

        {/* Reveal reading after result in word→han_viet mode */}
        {phase === 'result' && subMode === 'word→han_viet' && (
          <div className="border-t border-border/10 pt-4 flex flex-col gap-1">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground">CÁCH ĐỌC</p>
            <p className="text-lg font-[var(--br-jp-font)] text-muted-foreground">{canonicalReading}</p>
            <p className="text-sm text-muted-foreground/75">{card.meaning_vi}</p>
          </div>
        )}
      </div>

      {/* ── Input panel ── */}
      <div className="p-6 flex flex-col gap-5">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
          {subMode === 'word→hira'
            ? 'GÕ CÁCH ĐỌC (HIRAGANA)'
            : subMode === 'vi→hira'
              ? 'GÕ HIRAGANA CỦA TỪ NÀY'
              : subMode === 'word→han_viet'
                ? 'GÕ ÂM HÁN VIỆT'
                : 'GÕ NGHĨA TIẾNG VIỆT'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            value={raw}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              subMode === 'word→vi'
                ? 'Gõ nghĩa tiếng Việt...'
                : subMode === 'word→han_viet'
                  ? 'Gõ âm Hán Việt...'
                  : 'Gõ hiragana · # = romaji · @ = katakana · ! = hiragana'
            }
            readOnly={phase === 'result'}
            className={cn(
              'w-full text-center text-2xl lg:text-3xl h-auto py-2 transition-colors',
              phase === 'result' && isCorrect && 'border-success focus-visible:border-success focus-visible:ring-success/20',
              phase === 'result' && !isCorrect && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
            )}
            style={subMode !== 'word→vi' && subMode !== 'word→han_viet' ? { fontFamily: 'var(--br-jp-font)' } : undefined}
          />

          {/* word→vi: always show meaning_vi after check, coloured by result */}
          {phase === 'result' && subMode === 'word→vi' && (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
                {isCorrect ? 'NGHĨA ĐÚNG' : 'ĐÁP ÁN ĐÚNG'}
              </p>
              <p className={`text-xl lg:text-2xl font-bold text-center ${isCorrect ? 'text-success' : 'text-destructive'}`}>
                {card.meaning_vi}
              </p>
            </div>
          )}

          {/* word→han_viet: show han_viet after check, coloured by result */}
          {phase === 'result' && subMode === 'word→han_viet' && (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
                {isCorrect ? 'ÂM HÁN VIỆT ĐÚNG' : 'ĐÁP ÁN ĐÚNG'}
              </p>
              <p className={`text-xl lg:text-2xl font-bold text-center ${isCorrect ? 'text-success' : 'text-destructive'}`}>
                {card.han_viet}
              </p>
            </div>
          )}

          {/* Kana modes: only show correct answer on wrong */}
          {phase === 'result' && !isCorrect && subMode !== 'word→vi' && subMode !== 'word→han_viet' && (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
                ĐÁP ÁN ĐÚNG
              </p>
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
                    disabled={(subMode === 'word→vi' || subMode === 'word→han_viet') ? !raw.trim() : !extractAnswer(raw).replace(/\s+/g, '')}
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
                <RatingBar card={card} onRate={onRate} />
              )}
        </form>

        <p className="text-[10px] font-[var(--br-mono-font)] text-foreground/30 text-center">
          {subMode === 'word→vi'
            ? 'Enter = kiểm tra · Ctrl+Enter = bỏ qua · Ctrl+H = hint'
            : 'Enter = kiểm tra · Ctrl+Enter = bỏ qua · Ctrl+H = hint · # = romaji · @ = katakana · ! = hiragana'}
        </p>
      </div>
    </div>
  )
}
