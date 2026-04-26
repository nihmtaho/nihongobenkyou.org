import type { SRSRating } from '../../types/srs'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useMemo, useState } from 'react'
import { moraCount } from '../../lib/mora'
import { parsePitchPattern } from '../../lib/pitch'
import { AudioButton } from '../vocabulary/AudioButton'
import { PitchAccentBars } from '../vocabulary/PitchAccentBars'

interface PitchDiscriminationCardProps {
  card: VocabWithSRS
  onRate: (rating: SRSRating) => void
}

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
        <div role="alert" className="alert alert-warning w-full">
          <span className="font-[var(--br-mono-font)] text-[11px] uppercase">Dual-audio not available for this word</span>
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
      <div className="card bg-base-100 border-2 border-base-content shadow-xl w-full p-6 flex flex-col gap-4">
        <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral">Chọn âm thanh khớp với mẫu thanh điệu</p>

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
            return (
              <div key={btn} className={cls}>
                <AudioButton
                  audioFilename={filename}
                  vocabId={`${card.vocab_id}-${btn}`}
                />
                <button
                  className={`btn btn-sm ${selected === btn ? (isCorrect && btn === canonicalButton ? 'btn-success' : btn === canonicalButton ? 'btn-success' : 'btn-error') : 'btn-outline'} font-[var(--br-mono-font)]`}
                  onClick={() => handleSelect(btn)}
                  disabled={isAnswered}
                >
                  {btn}
                </button>
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
            <p className="text-xs text-base-content/60">
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
