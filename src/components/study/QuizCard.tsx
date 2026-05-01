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
    <div className="max-w-sm mx-auto w-full border border-base-content/20 overflow-hidden">
      <div className="h-0.5 bg-primary w-full" />
      <div className="bg-base-200 px-[18px] pt-4 pb-3 border-b border-base-content/10 text-center">
        <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest mb-3">
          {questionType}
        </p>
        <span
          className="text-[32px] font-bold leading-tight"
          style={isJpPrompt ? { fontFamily: 'var(--br-jp-font)' } : undefined}
        >
          {prompt}
        </span>
      </div>
      <div className="px-[18px] py-[14px]">
        <QuizOptions options={options} correctId={correctId} onAnswer={onAnswer} />
      </div>
    </div>
  )
}
