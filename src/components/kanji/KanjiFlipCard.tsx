import type { KanjiItem } from '../../types/kanji'
import type { SRSCard, SRSRating } from '../../types/srs'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'

interface KanjiFlipCardProps {
  kanji: KanjiItem
  card: SRSCard
  onRate: (rating: SRSRating) => void
}

export function KanjiFlipCard({ kanji, card: _card, onRate }: KanjiFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showButtons, setShowButtons] = useState(false)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12])

  function handleFlip() {
    if (!isFlipped) {
      setIsFlipped(true)
      setShowButtons(true)
    }
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (!isFlipped)
      return
    if (info.offset.x > 100)
      onRate(3)
    else if (info.offset.x < -100)
      onRate(1)
    else x.set(0)
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <motion.div
        drag={isFlipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        dragMomentum={false}
        style={{ x, rotate }}
        onDragEnd={handleDragEnd}
        className="w-full cursor-pointer select-none"
        onClick={handleFlip}
      >
        <div style={{ perspective: 1000 }}>
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ transformStyle: 'preserve-3d', position: 'relative' }}
            className="min-h-64 w-full"
          >
            {/* Front */}
            <div
              style={{ backfaceVisibility: 'hidden' }}
              className="bg-background border-2 border-foreground shadow-xl absolute inset-0 flex flex-col items-center justify-center p-6 gap-3"
            >
              <span
                className="text-7xl font-bold leading-none"
                style={{ fontFamily: 'var(--br-jp-font)' }}
              >
                {kanji.char}
              </span>
              <span className="text-sm text-foreground/50 mt-2 font-[var(--br-mono-font)] uppercase">
                Tap to reveal
              </span>
            </div>

            {/* Back */}
            <div
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              className="bg-background border-2 border-primary shadow-xl absolute inset-0 flex flex-col items-center justify-center p-6 gap-3"
            >
              <span
                className="text-4xl font-bold"
                style={{ fontFamily: 'var(--br-jp-font)' }}
              >
                {kanji.char}
              </span>

              <p className="text-2xl font-bold font-[var(--br-heading-font)] uppercase tracking-wider">
                {kanji.han_viet ?? '—'}
              </p>

              <div className="flex flex-col items-center gap-1">
                {kanji.onyomi.length > 0 && (
                  <p className="text-sm font-[var(--br-jp-font)] text-muted-foreground">
                    {kanji.onyomi.join('・')}
                  </p>
                )}
                {kanji.kunyomi.length > 0 && (
                  <p className="text-sm font-[var(--br-jp-font)] text-muted-foreground">
                    {kanji.kunyomi.join('・')}
                  </p>
                )}
              </div>

              <p className="text-base font-bold font-[var(--br-jp-font)]">
                {kanji.meaning_vi.join(', ')}
              </p>

              {kanji.mnemonic_vi && (
                <div className="border-l-4 border-primary pl-3 self-start">
                  <p className="text-xs font-[var(--br-jp-font)] text-muted-foreground">{kanji.mnemonic_vi}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Rating buttons */}
      {showButtons && (
        <ButtonGroup className="w-full">
          <Button variant="destructive" className="flex-1 font-[var(--br-mono-font)] text-[11px]" onClick={() => onRate(1)}>Again</Button>
          <Button className="flex-1 bg-warning text-foreground hover:bg-warning/90 font-[var(--br-mono-font)] text-[11px]" onClick={() => onRate(2)}>Hard</Button>
          <Button className="flex-1 bg-success text-foreground hover:bg-success/90 font-[var(--br-mono-font)] text-[11px]" onClick={() => onRate(3)}>Good</Button>
          <Button className="flex-1 bg-info text-foreground hover:bg-info/90 font-[var(--br-mono-font)] text-[11px]" onClick={() => onRate(4)}>Easy</Button>
        </ButtonGroup>
      )}

      {isFlipped && (
        <p className="text-xs text-foreground/40 font-[var(--br-mono-font)]">← Again &nbsp;|&nbsp; Good →</p>
      )}
    </div>
  )
}
