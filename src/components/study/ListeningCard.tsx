import type { SRSRating } from '../../types/srs'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { AudioButton } from '../vocabulary/AudioButton'

interface ListeningCardProps {
  card: VocabWithSRS
  distractors: VocabWithSRS[]
  playbackRate: number
  onRateChange: (rate: number) => void
  onRate: (rating: SRSRating) => void
}

const PLAYBACK_RATES = [0.75, 1.0, 1.25] as const
const RATING_LABELS = ['Again', 'Hard', 'Good', 'Easy'] as const
const RATING_VARIANTS = ['destructive', 'warning', 'success', 'info'] as const

export function ListeningCard({ card, distractors, playbackRate, onRateChange, onRate }: ListeningCardProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const options = useMemo(() => {
    const all = [card, ...distractors.slice(0, 3)]
    return all.sort(() => Math.random() - 0.5)
  }, [card, distractors])

  const isAnswered = selected !== null
  const isCorrect = selected === card.vocab_id
  const preselectedRating: SRSRating = isCorrect ? 3 : 1

  if (!card.audio_filename) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4 w-full max-w-sm mx-auto">
        <Alert className="bg-warning/10 border-warning/50 w-full">
          <AlertDescription className="font-[var(--br-mono-font)] text-[11px] uppercase text-foreground">
            Audio not available for this word
          </AlertDescription>
        </Alert>
        <ButtonGroup className="w-full">
          {([1, 2, 3, 4] as SRSRating[]).map(r => (
            <Button key={r} variant={RATING_VARIANTS[r-1]} className="flex-1" onClick={() => onRate(r)} aria-label={RATING_LABELS[r-1].toLowerCase()}>
              {RATING_LABELS[r-1]}
            </Button>
          ))}
        </ButtonGroup>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="bg-background border-2 border-foreground w-full p-6 flex flex-col gap-4">
        {/* Audio controls */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Nghe và chọn từ đúng</p>
          <AudioButton audioFilename={card.audio_filename} vocabId={card.vocab_id} rate={playbackRate} />
          <div className="flex gap-1">
            {PLAYBACK_RATES.map(r => (
              <Button
                key={r}
                size="xs"
                variant={playbackRate === r ? 'default' : 'outline'}
                className="font-[var(--br-mono-font)]"
                onClick={() => onRateChange(r)}
              >
                {r}
                x
              </Button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2">
          {options.map((opt) => {
            const isSelected = selected === opt.vocab_id
            const isTarget = opt.vocab_id === card.vocab_id
            let variant: React.ComponentProps<typeof Button>['variant'] = 'outline'
            if (isAnswered) {
              if (isTarget)
                variant = 'success'
              else if (isSelected)
                variant = 'destructive'
            }
            return (
              <Button
                key={opt.vocab_id}
                variant={variant}
                className="w-full justify-start"
                style={{ fontFamily: 'var(--br-jp-font)' }}
                onClick={() => !isAnswered && setSelected(opt.vocab_id)}
                disabled={isAnswered && !isTarget && !isSelected}
              >
                {isAnswered ? (opt.word ?? opt.reading) : '???'}
              </Button>
            )
          })}
        </div>

        {/* Revealed info after answer */}
        {isAnswered && (
          <div className="border-l-4 border-primary pl-3 flex flex-col gap-1">
            <span className="text-xl font-bold" style={{ fontFamily: 'var(--br-jp-font)' }}>{card.word ?? card.reading}</span>
            <span className="text-sm text-foreground/70" style={{ fontFamily: 'var(--br-jp-font)' }}>{card.reading}</span>
            <span className="text-base font-bold">{card.meaning_vi}</span>
          </div>
        )}
      </div>

      {/* Rating bar */}
      {isAnswered && (
        <ButtonGroup className="w-full">
          {([1, 2, 3, 4] as SRSRating[]).map((r) => {
            return (
              <Button
                key={r}
                variant={RATING_VARIANTS[r-1]}
                className={`flex-1 ${preselectedRating === r ? 'ring-2 ring-offset-1 ring-foreground' : ''}`}
                aria-label={RATING_LABELS[r-1].toLowerCase()}
                onClick={() => onRate(r)}
              >
                {RATING_LABELS[r-1]}
              </Button>
            )
          })}
        </ButtonGroup>
      )}
    </div>
  )
}
