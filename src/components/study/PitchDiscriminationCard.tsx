import type { SRSRating } from '../../types/srs'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { moraCount } from '../../lib/mora'
import { parsePitchPattern } from '../../lib/pitch'
import { AudioButton } from '../vocabulary/AudioButton'
import { PitchAccentBars } from '../vocabulary/PitchAccentBars'

interface PitchDiscriminationCardProps {
  card: VocabWithSRS
  onRate: (rating: SRSRating) => void
}

const RATING_LABELS = ['Again', 'Hard', 'Good', 'Easy'] as const
const RATING_VARIANTS = ['destructive', 'warning', 'success', 'info'] as const

export function PitchDiscriminationCard({ card, onRate }: PitchDiscriminationCardProps) {
  const morae = moraCount(card.reading)
  const pitchPattern = parsePitchPattern(card.pitch_pattern, morae)

  const [selected, setSelected] = useState<'A' | 'B' | null>(null)
  const [preselectedRating, setPreselectedRating] = useState<SRSRating>(2)

  // Randomly assign which button (A or B) plays the canonical audio
  const canonicalButton = useMemo<'A' | 'B'>(() => (Math.random() < 0.5 ? 'A' : 'B'), [])

  if (!card.audio_filename || !card.audio_filename_alt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4 w-full max-w-sm mx-auto">
        <Alert className="bg-warning/10 border-warning/50 w-full">
          <AlertDescription className="font-[var(--br-mono-font)] text-[11px] uppercase text-foreground">
            Dual-audio not available for this word
          </AlertDescription>
        </Alert>
        <ButtonGroup className="w-full">
          {([0, 1, 2, 3] as SRSRating[]).map(r => (
            <Button key={r} variant={RATING_VARIANTS[r]} className="flex-1" onClick={() => onRate(r)} aria-label={RATING_LABELS[r].toLowerCase()}>
              {RATING_LABELS[r]}
            </Button>
          ))}
        </ButtonGroup>
      </div>
    )
  }

  const isAnswered = selected !== null
  const isCorrect = selected === canonicalButton

  function handleSelect(btn: 'A' | 'B') {
    if (isAnswered)
      return
    setSelected(btn)
    setPreselectedRating(btn === canonicalButton ? 2 : 0)
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="bg-background border-2 border-foreground w-full p-6 flex flex-col gap-4">
        <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Chọn âm thanh khớp với mẫu thanh điệu</p>

        {/* Word reading */}
        <p className="text-3xl font-bold text-center" style={{ fontFamily: 'var(--br-jp-font)' }}>
          {card.reading}
        </p>

        {/* Pitch pattern diagram */}
        {pitchPattern && (
          <div className="flex justify-center">
            <PitchAccentBars pattern={pitchPattern} kana={card.reading} />
          </div>
        )}

        {/* Two audio buttons */}
        <div className="flex gap-3 justify-center">
          {(['A', 'B'] as const).map((btn) => {
            const filename = btn === canonicalButton ? card.audio_filename : (card.audio_filename_alt ?? null)
            let cls = 'flex flex-col items-center gap-1'
            if (isAnswered) {
              if (btn === canonicalButton)
                cls += ' opacity-100'
              else cls += ' opacity-50'
            }
            const btnVariant = selected === btn
              ? (isCorrect && btn === canonicalButton ? 'success' : btn === canonicalButton ? 'success' : 'destructive')
              : 'outline'
            return (
              <div key={btn} className={cls}>
                <AudioButton
                  audioFilename={filename}
                  vocabId={`${card.vocab_id}-${btn}`}
                />
                <Button
                  size="sm"
                  variant={btnVariant as React.ComponentProps<typeof Button>['variant']}
                  className="font-[var(--br-mono-font)]"
                  onClick={() => handleSelect(btn)}
                  disabled={isAnswered}
                >
                  {btn}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Reveal on answer */}
        {isAnswered && (
          <div className="flex flex-col gap-2 border-l-4 border-primary pl-3">
            <p className="text-sm font-semibold">
              {isCorrect ? '✓ Đúng!' : '✗ Sai'}
            </p>
            <p className="text-xs text-foreground/60">
              Âm thanh
              {' '}
              {canonicalButton}
              {' '}
              là thanh điệu chính xác (
              {card.pitch_type ?? 'không xác định'}
              )
            </p>
            <div className="flex justify-center">
              <PitchAccentBars pattern={pitchPattern!} kana={card.reading} />
            </div>
          </div>
        )}
      </div>

      {isAnswered && (
        <ButtonGroup className="w-full">
          {([0, 1, 2, 3] as SRSRating[]).map((r) => {
            return (
              <Button
                key={r}
                variant={RATING_VARIANTS[r]}
                className={`flex-1 ${preselectedRating === r ? 'ring-2 ring-offset-1 ring-foreground' : ''}`}
                aria-label={RATING_LABELS[r].toLowerCase()}
                onClick={() => onRate(r)}
              >
                {RATING_LABELS[r]}
              </Button>
            )
          })}
        </ButtonGroup>
      )}
    </div>
  )
}
