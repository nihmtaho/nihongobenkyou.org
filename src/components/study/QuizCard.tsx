import type { MeaningLanguage, QuizQuestionType } from '../../types/study'
import type { VocabItem, VocabWithSRS } from '../../types/vocabulary'
import { useState } from 'react'
import { selectDistractors, shuffle } from '../../lib/quiz'
import { QuizOptions } from './QuizOptions'

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
  const [{ questionType, options, correctId }] = useState(() => {
    const type = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)]
    const distractors = selectDistractors(card, pool)
    const allItems = shuffle([card, ...distractors])
    return {
      questionType: type,
      options: allItems.map(item => ({
        id: item.vocab_id,
        label: getAnswerLabel(type, item, meaningLanguage),
      })),
      correctId: card.vocab_id,
    }
  })

  const prompt = getQuestionLabel(questionType, card, meaningLanguage)
  const isJpPrompt = questionType === 'word→meaning'

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
      <QuizOptions options={options} correctId={correctId} onAnswer={onAnswer} />
    </div>
  )
}
