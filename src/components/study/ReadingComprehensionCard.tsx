import type { Passage } from '../../types/passages'
import type { SRSRating } from '../../types/srs'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { annotatePassage } from '../../lib/sentence-highlight'

interface ReadingComprehensionCardProps {
  passage: Passage
  card: VocabWithSRS
  /** Other vocab from the session pool to underline in the passage. */
  vocabPool?: VocabWithSRS[]
  onRate: (rating: SRSRating) => void
}

type Phase = 'reading' | 'questions' | 'results'

const RATING_LABELS = ['Again', 'Hard', 'Good', 'Easy'] as const
const RATING_VARIANTS = ['destructive', 'warning', 'success', 'info'] as const

export function ReadingComprehensionCard({ passage, card, vocabPool, onRate }: ReadingComprehensionCardProps) {
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
  const knownTerms = (vocabPool ?? [])
    .filter(v => v.vocab_id !== card.vocab_id)
    .map(v => ({ term: v.word ?? v.reading, meaning: v.meaning_vi }))
  const segments = annotatePassage(passage.text_ja, target, knownTerms)

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      {phase === 'reading' && (
        <div className="bg-background border-2 border-foreground w-full p-6 flex flex-col gap-4">
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Đọc đoạn văn</p>
          <p className="text-base leading-relaxed" style={{ fontFamily: 'var(--br-jp-font)' }}>
            {segments.map((seg, i) => {
              if (seg.kind === 'target') {
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <span key={i} className="underline decoration-2 decoration-primary font-bold">
                    {seg.text}
                  </span>
                )
              }
              if (seg.kind === 'known') {
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <span key={i} className="border-b border-muted-foreground/40" title={`${seg.text} → ${seg.meaning}`}>
                    {seg.text}
                  </span>
                )
              }
              // eslint-disable-next-line react/no-array-index-key
              return <span key={i}>{seg.text}</span>
            })}
          </p>
          <Button className="w-full font-[var(--br-mono-font)]" onClick={() => setPhase('questions')}>
            Trả lời
          </Button>
        </div>
      )}

      {phase === 'questions' && (
        <div className="bg-background border-2 border-foreground w-full p-6 flex flex-col gap-4">
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">
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
                  let variant: React.ComponentProps<typeof Button>['variant'] = 'outline'
                  if (chosen !== null) {
                    if (oi === q.correct_index)
                      variant = 'success'
                    else if (oi === chosen)
                      variant = 'destructive'
                  }
                  return (
                    <Button
                      key={opt}
                      size="sm"
                      variant={variant}
                      className="justify-start"
                      style={{ fontFamily: 'var(--br-jp-font)' }}
                      onClick={() => selectAnswer(qi, oi)}
                      disabled={answers[qi] !== null}
                    >
                      {opt}
                    </Button>
                  )
                })}
              </div>
            </div>
          ))}
          {allAnswered && (
            <Button className="w-full font-[var(--br-mono-font)]" onClick={handleViewResults}>
              Xem kết quả
            </Button>
          )}
        </div>
      )}

      {phase === 'results' && (
        <>
          <div className="bg-background border-2 border-foreground w-full p-6 flex flex-col gap-3">
            <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Kết quả</p>
            <p className={`text-lg font-bold ${allCorrect ? 'text-success' : 'text-destructive'}`}>
              {correctCount}
              /
              {passage.questions.length}
              {' '}
              đúng
            </p>
            <div className="border-l-4 border-primary pl-3 text-sm text-foreground/70">
              {passage.text_vi}
            </div>
          </div>
          <ButtonGroup className="w-full">
            {([1, 2, 3, 4] as SRSRating[]).map((r) => {
              const preselected = allCorrect ? 2 : 0
              return (
                <Button
                  key={r}
                  variant={RATING_VARIANTS[r - 1]}
                  className={`flex-1 ${preselected === r ? 'ring-2 ring-offset-1 ring-foreground' : ''}`}
                  aria-label={RATING_LABELS[r - 1].toLowerCase()}
                  onClick={() => onRate(r)}
                >
                  {RATING_LABELS[r - 1]}
                </Button>
              )
            })}
          </ButtonGroup>
        </>
      )}
    </div>
  )
}
