import type { MeaningLanguage, QuizQuestionType } from '../../types/study'
import type { VocabItem, VocabWithSRS } from '../../types/vocabulary'
import { useEffect, useState } from 'react'
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

  const [showHint, setShowHint] = useState(false)
  const canShowHint = questionType !== 'word→reading'

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return
      if ((e.key === 'h' || e.key === 'H') && canShowHint)
        setShowHint(prev => !prev)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [canShowHint])

  const prompt = getQuestionLabel(questionType, card, meaningLanguage)
  const isJpPrompt = questionType === 'word→meaning'

  return (
    <div className="p-4 pt-6 w-full max-w-4xl mx-auto">
      <div className="border border-base-content/20 overflow-hidden">
        <div className="h-0.5 bg-primary w-full" />
        <div className="lg:grid lg:grid-cols-2 lg:divide-x lg:divide-base-content/10">
          {/* Question — left on desktop, top on mobile */}
          <div className="bg-base-200 px-[18px] pt-4 pb-4 border-b border-base-content/10 text-center
                          lg:border-b-0 lg:flex lg:flex-col lg:items-center lg:justify-center lg:py-12 lg:px-10"
          >
            <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest mb-3">
              {questionType}
            </p>
            <span
              className="text-[32px] lg:text-5xl font-bold leading-tight"
              style={isJpPrompt ? { fontFamily: 'var(--br-jp-font)' } : undefined}
            >
              {prompt}
            </span>
            {/* Hint area — reading + romaji, toggled with [H] */}
            <div className="mt-3 h-8 flex flex-col items-center justify-center">
              {showHint && (
                <span className="font-[var(--br-jp-font)] text-sm text-neutral leading-snug">
                  {card.reading}
                  {card.romaji && (
                    <span className="ml-2 font-[var(--br-mono-font)] text-[11px] text-base-content/40">
                      {card.romaji}
                    </span>
                  )}
                </span>
              )}
            </div>
            {canShowHint && (
              <button
                type="button"
                className="mt-1 font-[var(--br-mono-font)] text-[9px] uppercase tracking-widest text-base-content/25 hover:text-base-content/50 transition-colors"
                onClick={() => setShowHint(prev => !prev)}
              >
                {showHint ? '[H] Ẩn' : '[H] Cách đọc'}
              </button>
            )}
          </div>
          {/* Options — right on desktop, bottom on mobile */}
          <div className="px-[18px] py-[14px] lg:flex lg:flex-col lg:justify-center lg:py-8 lg:px-8">
            <QuizOptions options={options} correctId={correctId} onAnswer={onAnswer} />
          </div>
        </div>
      </div>
    </div>
  )
}
