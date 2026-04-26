import type { Passage } from '../../types/passages'
import type { SRSRating } from '../../types/srs'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useState } from 'react'
import { highlightSentence } from '../../lib/sentence-highlight'

interface ReadingComprehensionCardProps {
  passage: Passage
  card: VocabWithSRS
  onRate: (rating: SRSRating) => void
}

type Phase = 'reading' | 'questions' | 'results'

export function ReadingComprehensionCard({ passage, card, onRate }: ReadingComprehensionCardProps) {
  const [phase, setPhase] = useState<Phase>('reading')
  const [answers, setAnswers] = useState<(number | null)[]>(passage.questions.map(() => null))
  const [currentQ, setCurrentQ] = useState(0)

  const allAnswered = answers.every(a => a !== null)

  function selectAnswer(qIndex: number, optIndex: number) {
    if (answers[qIndex] !== null)
      return
    const next = [...answers]
    next[qIndex] = optIndex
    setAnswers(next)
    if (qIndex < passage.questions.length - 1) {
      setTimeout(setCurrentQ, 400, qIndex + 1)
    }
  }

  function handleViewResults() {
    setPhase('results')
  }

  const correctCount = answers.filter((a, i) => a === passage.questions[i].correct_index).length
  const allCorrect = correctCount === passage.questions.length

  const target = card.word ?? card.reading
  const passageParts = highlightSentence(passage.text_ja, target)

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      {phase === 'reading' && (
        <div className="card bg-base-100 border-2 border-base-content shadow-xl w-full p-6 flex flex-col gap-4">
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral">Đọc đoạn văn</p>
          <p className="text-base leading-relaxed" style={{ fontFamily: 'var(--br-jp-font)' }}>
            {passageParts.length === 1
              ? passageParts[0]
              : (
                  <>
                    <span>{passageParts[0]}</span>
                    <span className="underline decoration-2 decoration-primary font-bold">{passageParts[1]}</span>
                    <span>{passageParts[2]}</span>
                  </>
                )}
          </p>
          <button className="btn btn-primary w-full font-[var(--br-mono-font)]" onClick={() => setPhase('questions')}>
            Trả lời
          </button>
        </div>
      )}

      {phase === 'questions' && (
        <div className="card bg-base-100 border-2 border-base-content shadow-xl w-full p-6 flex flex-col gap-4">
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral">
            Câu hỏi
            {' '}
            {currentQ + 1}
            /
            {passage.questions.length}
          </p>
          {passage.questions.slice(0, currentQ + 1).map((q, qi) => (
            <div key={q.question_vi} className="flex flex-col gap-2">
              <p className="text-sm font-semibold">{q.question_vi}</p>
              <div className="flex flex-col gap-1">
                {q.options.map((opt, oi) => {
                  const chosen = answers[qi]
                  let cls = 'btn btn-outline btn-sm justify-start'
                  if (chosen !== null) {
                    if (oi === q.correct_index)
                      cls = 'btn btn-success btn-sm justify-start'
                    else if (oi === chosen)
                      cls = 'btn btn-error btn-sm justify-start'
                  }
                  return (
                    <button
                      key={opt}
                      className={cls}
                      style={{ fontFamily: 'var(--br-jp-font)' }}
                      onClick={() => selectAnswer(qi, oi)}
                      disabled={answers[qi] !== null}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {allAnswered && (
            <button className="btn btn-primary w-full font-[var(--br-mono-font)]" onClick={handleViewResults}>
              Xem kết quả
            </button>
          )}
        </div>
      )}

      {phase === 'results' && (
        <>
          <div className="card bg-base-100 border-2 border-base-content shadow-xl w-full p-6 flex flex-col gap-3">
            <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral">Kết quả</p>
            <p className={`text-lg font-bold ${allCorrect ? 'text-success' : 'text-error'}`}>
              {correctCount}
              /
              {passage.questions.length}
              {' '}
              đúng
            </p>
            <div className="border-l-4 border-primary pl-3 text-sm text-base-content/70">
              {passage.text_vi}
            </div>
          </div>
          <div className="flex gap-2 w-full">
            {([0, 1, 2, 3] as SRSRating[]).map((r) => {
              const labels = ['Again', 'Hard', 'Good', 'Easy']
              const classes = ['btn-error', 'btn-warning', 'btn-success', 'btn-info']
              const preselected = allCorrect ? 2 : 0
              return (
                <button
                  key={r}
                  className={`btn flex-1 ${classes[r]} ${preselected === r ? 'ring-2 ring-offset-1 ring-base-content' : ''}`}
                  aria-label={labels[r].toLowerCase()}
                  onClick={() => onRate(r)}
                >
                  {labels[r]}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
