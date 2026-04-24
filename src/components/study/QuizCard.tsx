import type { MeaningLanguage, QuizQuestionType } from '../../types/study'
import type { VocabItem, VocabWithSRS } from '../../types/vocabulary'
import { useEffect, useState } from 'react'
import { selectDistractors } from '../../lib/quiz'

const QUESTION_TYPES: QuizQuestionType[] = ['word→meaning', 'meaning→word', 'word→reading']

function getQuestionLabel(type: QuizQuestionType, card: VocabItem, lang: MeaningLanguage): string {
  if (type === 'word→meaning')
    return card.word ?? card.reading
  if (type === 'meaning→word')
    return lang === 'vi' ? card.meaning_vi : card.meaning_en
  return card.word ?? card.reading
}

function getAnswerLabel(type: QuizQuestionType, card: VocabItem, lang: MeaningLanguage): string {
  if (type === 'word→meaning')
    return lang === 'vi' ? card.meaning_vi : card.meaning_en
  if (type === 'meaning→word')
    return card.word ?? card.reading
  return card.reading
}

interface QuizCardProps {
  card: VocabWithSRS
  pool: VocabWithSRS[]
  meaningLanguage: MeaningLanguage
  onAnswer: (isCorrect: boolean) => void
}

export function QuizCard({ card, pool, meaningLanguage, onAnswer }: QuizCardProps) {
  const [{ questionType, options }] = useState(() => {
    const type = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)]
    const distractors = selectDistractors(card, pool)
    const allOptions = [
      getAnswerLabel(type, card, meaningLanguage),
      ...distractors.map(d => getAnswerLabel(type, d, meaningLanguage)),
    ]
    return { questionType: type, options: allOptions.sort(() => Math.random() - 0.5) }
  })
  const [selected, setSelected] = useState<string | null>(null)

  const correctAnswer = getAnswerLabel(questionType, card, meaningLanguage)
  const prompt = getQuestionLabel(questionType, card, meaningLanguage)
  const isJpPrompt = questionType === 'word→meaning'

  useEffect(() => {
    if (selected === correctAnswer) {
      const t = setTimeout(onAnswer, 500, true)
      return () => clearTimeout(t)
    }
  }, [selected, correctAnswer, onAnswer])

  function handleSelect(opt: string) {
    if (selected !== null)
      return
    setSelected(opt)
  }

  function handleContinue() {
    onAnswer(false)
  }

  const showContinue = selected !== null && selected !== correctAnswer

  return (
    <div className="flex flex-col gap-6 p-4 max-w-sm mx-auto w-full">
      <div className="card bg-base-100 border-2 border-base-content shadow p-6 text-center">
        <span
          className="text-3xl font-bold"
          style={isJpPrompt ? { fontFamily: 'var(--br-jp-font)' } : undefined}
        >
          {prompt}
        </span>
        <span className="text-xs text-base-content/40 mt-2">{questionType}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          let cls = 'btn btn-outline w-full h-auto py-3 text-sm whitespace-normal'
          if (selected !== null) {
            if (opt === correctAnswer)
              cls += ' btn-success'
            else if (opt === selected)
              cls += ' btn-error'
          }
          return (
            <button key={opt} className={cls} onClick={() => handleSelect(opt)}>
              {opt}
            </button>
          )
        })}
      </div>

      {showContinue && (
        <button className="btn btn-primary w-full" onClick={handleContinue}>
          Continue
        </button>
      )}
    </div>
  )
}
