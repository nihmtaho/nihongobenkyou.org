import type { VocabWithSRS } from '../../types/vocabulary'
import { useState } from 'react'
import * as wanakana from 'wanakana'
import { gradeReading } from '../../lib/mora'

interface TypeInputCardProps {
  card: VocabWithSRS
  onAnswer: (isCorrect: boolean) => void
}

export function TypeInputCard({ card, onAnswer }: TypeInputCardProps) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState<{ correct: boolean, wrongMorae: number[] } | null>(null)

  const word = card.word ?? card.reading
  const moraChars = card.reading.split('').map((char, i) => ({
    char,
    id: `${card.vocab_id}:${i}`,
    index: i,
  }))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (result)
      return
    setValue(wanakana.toHiragana(e.target.value, { IMEMode: true }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (result || !value)
      return
    const graded = gradeReading(value, card.reading)
    setResult(graded)
    if (graded.correct) {
      setTimeout(onAnswer, 600, true)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-sm mx-auto w-full">
      <div className="card bg-base-100 border-2 border-base-content shadow p-6 text-center">
        <span className="text-4xl font-bold" style={{ fontFamily: 'var(--br-jp-font)' }}>
          {word}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          inputMode="text"
          autoFocus
          value={value}
          onChange={handleChange}
          placeholder="Type the reading (romaji)..."
          className={`input input-bordered w-full text-center text-xl ${
            result ? (result.correct ? 'input-success' : 'input-error') : ''
          }`}
          style={{ fontFamily: 'var(--br-jp-font)' }}
          disabled={result !== null}
        />

        {result && !result.correct && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1 justify-center">
              {moraChars.map(({ char, id, index }) => (
                <span
                  key={id}
                  className={result.wrongMorae.includes(index) ? 'text-error font-bold' : 'text-success'}
                  style={{ fontFamily: 'var(--br-jp-font)' }}
                >
                  {char}
                </span>
              ))}
            </div>
            <button type="button" className="btn btn-sm btn-error mt-2" onClick={() => onAnswer(false)}>
              Continue
            </button>
          </div>
        )}

        {!result && (
          <button type="submit" className="btn btn-primary w-full">
            Submit
          </button>
        )}
      </form>
    </div>
  )
}
