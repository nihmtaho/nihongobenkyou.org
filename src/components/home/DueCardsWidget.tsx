import type { StudyConfig } from '../../types/study'
import type { VocabItem, VocabWithSRS } from '../../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { db } from '../../db/schema'
import { useDueCards } from '../../hooks/useDueCards'
import { useStudySessionStore } from '../../stores/studySessionStore'
import { StudyConfigModal } from '../study/StudyConfigModal'

interface DueCardsWidgetProps {
  userId: string
}

export function DueCardsWidget({ userId }: DueCardsWidgetProps) {
  const navigate = useNavigate()
  const { data: cards, isLoading } = useDueCards(userId)
  const [showConfig, setShowConfig] = useState(false)
  const initSession = useStudySessionStore(s => s.initSession)

  const vocabIds = useMemo(() => cards?.map(c => c.vocabId) ?? [], [cards])

  const { data: vocabMap } = useQuery<Map<string, VocabItem>>({
    queryKey: ['vocabulary-batch', vocabIds],
    queryFn: async () => {
      const items = await db.vocabulary.where('vocab_id').anyOf(vocabIds).toArray()
      return new Map(items.map(v => [v.vocab_id, v]))
    },
    enabled: showConfig && vocabIds.length > 0,
    staleTime: Infinity,
  })

  const merged = useMemo<VocabWithSRS[]>(() => {
    if (!cards || !vocabMap)
      return []
    return cards.flatMap((c) => {
      const v = vocabMap.get(c.vocabId)
      if (!v)
        return []
      return [{ ...v, ...c } as VocabWithSRS]
    })
  }, [cards, vocabMap])

  const availableLessons = useMemo(() => {
    const seen = new Set<string>()
    return merged
      .reduce<{ lesson_id: string, lesson_number: number }[]>((acc, v) => {
        const id = `${v.book_source}:${v.lesson_number}`
        if (!seen.has(id)) {
          seen.add(id)
          acc.push({ lesson_id: id, lesson_number: v.lesson_number })
        }
        return acc
      }, [])
      .sort((a, b) => a.lesson_number - b.lesson_number)
  }, [merged])

  function handleConfirm(config: StudyConfig) {
    let queue = config.lessonIds.length > 0
      ? merged.filter(v => config.lessonIds.includes(`${v.book_source}:${v.lesson_number}`))
      : merged
    if (config.order === 'random')
      queue = queue.sort(() => Math.random() - 0.5)
    if (config.cardCount !== 'all')
      queue = queue.slice(0, config.cardCount)
    initSession(queue, config.mode, config.typeInputSubMode)
    navigate({ to: '/study/$mode', params: { mode: config.mode }, search: { returnTab: 'vocab' } })
  }

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />
  }

  const count = cards?.length ?? 0

  return (
    <>
      <Card className="p-4">
        <CardContent className="p-0">
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground mb-2">
            DUE TODAY
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold font-[var(--br-mono-font)]">{count}</span>
            <span className="text-sm font-[var(--br-mono-font)] text-muted-foreground uppercase">CARDS</span>
          </div>
          {count === 0
            ? (
                <p className="text-sm font-[var(--br-jp-font)] text-muted-foreground mt-2">すごい! All caught up.</p>
              )
            : (
                <Button
                  variant="default"
                  size="sm"
                  className="mt-3 font-[var(--br-mono-font)] self-start"
                  onClick={() => setShowConfig(true)}
                >
                  STUDY DUE
                </Button>
              )}
        </CardContent>
      </Card>

      {showConfig && (
        <StudyConfigModal
          availableLessons={availableLessons}
          defaultMode="flashcard"
          defaultLessonIds={availableLessons.map(l => l.lesson_id)}
          onConfirm={handleConfirm}
          onClose={() => setShowConfig(false)}
        />
      )}
    </>
  )
}
