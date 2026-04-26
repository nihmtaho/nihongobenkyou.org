import type { SRSRating } from '../../types/srs'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useMemo, useState } from 'react'
import { AudioButton } from '../vocabulary/AudioButton'

interface ListeningCardProps {
  card: VocabWithSRS
  distractors: VocabWithSRS[]
  playbackRate: number
  onRateChange: (rate: number) => void
  onRate: (rating: SRSRating) => void
}

const PLAYBACK_RATES = [0.75, 1.0, 1.25] as const

export function ListeningCard({ card, distractors, playbackRate, onRateChange, onRate }: ListeningCardProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const options = useMemo(() => {
    const all = [card, ...distractors.slice(0, 3)]
    return all.sort(() => Math.random() - 0.5)
  }, [card, distractors])

  const isAnswered = selected !== null
  const isCorrect = selected === card.vocab_id
  const preselectedRating: SRSRating = isCorrect ? 2 : 0

  if (!card.audio_filename) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4 w-full max-w-sm mx-auto">
        <div role="alert" className="alert alert-warning w-full">
          <span className="font-[var(--br-mono-font)] text-[11px] uppercase">Audio not available for this word</span>
        </div>
        <div className="flex gap-2 w-full">
          <button className="btn btn-error flex-1" onClick={() => onRate(0)} aria-label="again">Again</button>
          <button className="btn btn-warning flex-1" onClick={() => onRate(1)} aria-label="hard">Hard</button>
          <button className="btn btn-success flex-1" onClick={() => onRate(2)} aria-label="good">Good</button>
          <button className="btn btn-info flex-1" onClick={() => onRate(3)} aria-label="easy">Easy</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="card bg-base-100 border-2 border-base-content shadow-xl w-full p-6 flex flex-col gap-4">
        {/* Audio controls */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral">Nghe và chọn từ đúng</p>
          <AudioButton audioFilename={card.audio_filename} vocabId={card.vocab_id} rate={playbackRate} />
          <div className="flex gap-1">
            {PLAYBACK_RATES.map(r => (
              <button
                key={r}
                className={`btn btn-xs font-[var(--br-mono-font)] ${playbackRate === r ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => onRateChange(r)}
              >
                {r}
                x
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2">
          {options.map((opt) => {
            const isSelected = selected === opt.vocab_id
            const isTarget = opt.vocab_id === card.vocab_id
            let btnClass = 'btn btn-outline w-full justify-start'
            if (isAnswered) {
              if (isTarget)
                btnClass = 'btn btn-success w-full justify-start'
              else if (isSelected)
                btnClass = 'btn btn-error w-full justify-start'
            }
            return (
              <button
                key={opt.vocab_id}
                className={btnClass}
                style={{ fontFamily: 'var(--br-jp-font)' }}
                onClick={() => !isAnswered && setSelected(opt.vocab_id)}
                disabled={isAnswered && !isTarget && !isSelected}
              >
                {isAnswered ? (opt.word ?? opt.reading) : '???'}
              </button>
            )
          })}
        </div>

        {/* Revealed info after answer */}
        {isAnswered && (
          <div className="border-l-4 border-primary pl-3 flex flex-col gap-1">
            <span className="text-xl font-bold" style={{ fontFamily: 'var(--br-jp-font)' }}>{card.word ?? card.reading}</span>
            <span className="text-sm text-base-content/70" style={{ fontFamily: 'var(--br-jp-font)' }}>{card.reading}</span>
            <span className="text-base font-bold">{card.meaning_vi}</span>
          </div>
        )}
      </div>

      {/* Rating bar */}
      {isAnswered && (
        <div className="flex gap-2 w-full">
          {([0, 1, 2, 3] as SRSRating[]).map((r) => {
            const labels = ['Again', 'Hard', 'Good', 'Easy']
            const classes = ['btn-error', 'btn-warning', 'btn-success', 'btn-info']
            return (
              <button
                key={r}
                className={`btn flex-1 ${classes[r]} ${preselectedRating === r ? 'ring-2 ring-offset-1 ring-base-content' : ''}`}
                aria-label={labels[r].toLowerCase()}
                onClick={() => onRate(r)}
              >
                {labels[r]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
