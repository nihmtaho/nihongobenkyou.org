import type { KanjiItem } from '../../types/kanji'
import type { SRSCard, SRSRating } from '../../types/srs'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useFlipCardState } from '../../hooks/useFlipCardState'
import { RatingBar } from '../study/shared/RatingBar'

interface KanjiStudyFlipCardProps {
  kanji: KanjiItem
  srsState?: SRSCard
  onRate: (rating: SRSRating) => void
}

const GRID_FACE: React.CSSProperties = { gridArea: '1 / 1' }
const GRID_FACE_BACK: React.CSSProperties = { ...GRID_FACE, transform: 'rotateY(180deg)' }

export function KanjiStudyFlipCard({ kanji, srsState, onRate }: KanjiStudyFlipCardProps) {
  const { isFlipped, setIsFlipped, x, rotate, handleDragEnd } = useFlipCardState(onRate)
  const [hintRevealed, setHintRevealed] = useState(false)

  const hintText = kanji.meaning_vi[0] ?? null
  const relatedVocab = kanji.related_vocab?.slice(0, 4) ?? []
  const examples = kanji.examples?.slice(0, 2) ?? []

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return
      if ((e.key === 'h' || e.key === 'H') && !isFlipped) {
        e.preventDefault()
        setHintRevealed(h => !h)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isFlipped])

  function handleHint(e: React.MouseEvent) {
    e.stopPropagation()
    setHintRevealed(h => !h)
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[580px] mx-auto px-3 sm:px-0">
      <motion.div
        drag={isFlipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        dragMomentum={false}
        style={{ x, rotate }}
        onDragEnd={handleDragEnd}
        className="w-full cursor-pointer select-none"
        onClick={() => setIsFlipped(f => !f)}
      >
        <div style={{ perspective: 1200 }} className="w-full">
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ transformStyle: 'preserve-3d', display: 'grid' }}
            className="w-full"
          >
            {/* ── Front ───────────────────────────── */}
            <div
              style={{ backfaceVisibility: 'hidden', ...GRID_FACE }}
              className="bg-background border-2 border-foreground shadow-xl flex flex-col min-h-[280px]"
            >
              <div className="flex-1 flex flex-col items-center justify-center px-10 pt-10 pb-4 gap-4">
                <span
                  className="text-[7rem] font-bold leading-none"
                  style={{ fontFamily: 'var(--br-jp-font)' }}
                >
                  {kanji.char}
                </span>

                {hintRevealed && hintText
                  ? (
                      <p className="text-base font-[var(--br-heading-font)] uppercase tracking-wide text-primary">
                        {hintText}
                      </p>
                    )
                  : (
                      <span className="text-[11px] text-foreground/40 font-[var(--br-mono-font)] uppercase tracking-widest">
                        Space / tap to reveal
                      </span>
                    )}
              </div>

              {/* Hint button bar */}
              <div className="flex items-center justify-between px-4 pb-3 shrink-0">
                <span className="text-[9px] text-foreground/20 font-[var(--br-mono-font)] uppercase tracking-widest">
                  [H]
                </span>
                <button
                  type="button"
                  className={`inline-flex items-center justify-center h-6 px-2 text-[9px] font-[var(--br-mono-font)] uppercase transition-colors ${hintRevealed ? 'bg-primary text-primary-foreground' : 'bg-transparent border border-foreground/20 text-foreground hover:bg-accent'}`}
                  onClick={handleHint}
                  aria-label="Toggle meaning hint"
                >
                  {hintRevealed ? 'HIDE' : 'HINT'}
                </button>
              </div>
            </div>

            {/* ── Back ────────────────────────────── */}
            <div
              style={{ backfaceVisibility: 'hidden', ...GRID_FACE_BACK }}
              className="bg-background border-2 border-primary shadow-xl overflow-hidden flex flex-col min-h-[280px]"
            >
              {/* Header zone */}
              <div className="h-1 bg-primary w-full shrink-0" />
              <div className="px-5 pt-4 pb-3 flex items-start gap-4 border-b border-border/10">
                <span
                  className="text-6xl font-bold leading-none shrink-0 mt-0.5"
                  style={{ fontFamily: 'var(--br-jp-font)' }}
                >
                  {kanji.char}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-3xl font-black font-[var(--br-heading-font)] uppercase tracking-tighter leading-none text-primary">
                    {kanji.han_viet ?? '—'}
                  </p>
                  <p
                    className="text-sm text-muted-foreground leading-snug"
                    style={{ fontFamily: 'var(--br-jp-font)' }}
                  >
                    {kanji.meaning_vi.slice(0, 3).join(' · ')}
                  </p>
                </div>
              </div>

              {/* Readings row */}
              {(kanji.onyomi.length > 0 || kanji.kunyomi.length > 0) && (
                <div className="px-5 py-2.5 flex gap-6 border-b border-border/10 bg-card/50">
                  {kanji.onyomi.length > 0 && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
                        ON
                      </span>
                      <p
                        className="text-sm"
                        style={{ fontFamily: 'var(--br-jp-font)' }}
                      >
                        {kanji.onyomi.join('・')}
                      </p>
                    </div>
                  )}
                  {kanji.kunyomi.length > 0 && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
                        KUN
                      </span>
                      <p
                        className="text-sm"
                        style={{ fontFamily: 'var(--br-jp-font)' }}
                      >
                        {kanji.kunyomi.join('・')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Content zone */}
              <div className="px-5 py-3 flex flex-col gap-3">
                {kanji.mnemonic_vi && (
                  <div className="border-l-4 border-primary pl-3">
                    <p
                      className="text-xs text-foreground/70 leading-relaxed italic"
                      style={{ fontFamily: 'var(--br-jp-font)' }}
                    >
                      {kanji.mnemonic_vi}
                    </p>
                  </div>
                )}

                {relatedVocab.length > 0 && (
                  <div>
                    <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest mb-2">
                      Từ liên quan
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {relatedVocab.map(v => (
                        <div
                          key={v.word ?? v.kana}
                          className="bg-card border border-border/10 px-2 py-1.5 flex flex-col gap-0.5"
                        >
                          <span
                            className="text-base font-bold leading-tight"
                            style={{ fontFamily: 'var(--br-jp-font)' }}
                          >
                            {v.word ?? v.kana}
                          </span>
                          <span className="text-[9px] font-[var(--br-mono-font)] text-muted-foreground leading-tight line-clamp-2">
                            {v.meaning_vi}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {examples.length > 0 && (
                  <div className="border-l-4 border-border/10 pl-3">
                    <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest mb-1.5">
                      Ví dụ
                    </p>
                    {examples.map((ex, i) => (
                      <div key={ex.ja} className={i > 0 ? 'mt-2' : ''}>
                        <p
                          className="text-sm leading-snug"
                          style={{ fontFamily: 'var(--br-jp-font)' }}
                        >
                          {ex.ja}
                        </p>
                        <p
                          className="text-xs text-muted-foreground"
                          style={{ fontFamily: 'var(--br-jp-font)' }}
                        >
                          {ex.vi}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-5 pb-3 pt-1 mt-auto">
                <p className="text-[9px] font-[var(--br-mono-font)] text-foreground/20 uppercase tracking-widest text-right">
                  tap / space to flip back
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Rating bar */}
      {isFlipped && <RatingBar card={srsState} onRate={onRate} />}

      <p className="text-[10px] text-foreground/25 font-[var(--br-mono-font)] tracking-wide">
        {isFlipped ? '← swipe again · good → · keys 1–4' : 'space · tap · [h] hint'}
      </p>
    </div>
  )
}
