import type { RelatedVocabItem } from '../../types/kanji'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AddToDeckDialog } from '../../components/common/AddToDeckDialog'
import { StrokeOrderAnimation } from '../../components/kanji/StrokeOrderAnimation'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import { Skeleton } from '../../components/ui/skeleton'
import { getAllKanji, upsertKanjiSRSCard } from '../../db/kanji'
import { db } from '../../db/schema'
import { useKanji } from '../../hooks/useKanji'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/kanji/$char')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: KanjiDetailPage,
})

function KanjiDetailPage() {
  const { char } = Route.useParams()
  const navigate = useNavigate()
  const userId = useAuthStore(s => s.userId)
  const { data: kanji, isLoading, isError } = useKanji(char)
  const queryClient = useQueryClient()

  const { data: lessonKanji } = useQuery({
    queryKey: ['kanji-lesson-neighbors', kanji?.lesson_number],
    queryFn: () => getAllKanji({ lesson_number: kanji!.lesson_number! }),
    enabled: kanji?.lesson_number != null,
    staleTime: Infinity,
  })

  const currentIndex = lessonKanji ? lessonKanji.findIndex(k => k.char === char) : -1
  const prevChar = currentIndex > 0 ? lessonKanji![currentIndex - 1].char : null
  const nextChar = lessonKanji && currentIndex >= 0 && currentIndex < lessonKanji.length - 1
    ? lessonKanji[currentIndex + 1].char
    : null

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && prevChar)
        navigate({ to: '/kanji/$char', params: { char: prevChar } })
      if (e.key === 'ArrowRight' && nextChar)
        navigate({ to: '/kanji/$char', params: { char: nextChar } })
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prevChar, nextChar, navigate])

  useEffect(() => {
    if (!userId || !kanji)
      return
    upsertKanjiSRSCard(userId, kanji.char)
      .then(() => queryClient.invalidateQueries({ queryKey: ['kanji-list', userId] }))
      .catch(console.error)
  }, [userId, kanji, queryClient])

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <Skeleton className="h-20 w-20" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || !kanji) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <p className="font-[var(--br-mono-font)] text-sm uppercase text-destructive">
          Kanji not found:
          {' '}
          {char}
        </p>
      </div>
    )
  }

  // Shared sub-sections — defined as variables to avoid duplication across mobile/desktop branches
  const badgeRow = (
    <div className="flex gap-2 flex-wrap">
      {kanji.jlpt_level && (
        <Badge variant="outline" className="font-[var(--br-mono-font)] text-[10px] text-primary border-primary">
          {kanji.jlpt_level}
        </Badge>
      )}
      <Badge variant="outline" className="font-[var(--br-mono-font)] text-[10px]">
        {kanji.stroke_count}
        {' '}
        strokes
      </Badge>
      {kanji.radical && (
        <Badge variant="outline" className="font-[var(--br-mono-font)] text-[10px]">
          radical:
          {' '}
          {kanji.radical}
        </Badge>
      )}
    </div>
  )

  const readingsBlock = (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Readings</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border/10 p-3">
          <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground mb-1">On'yomi</p>
          <p className="font-[var(--br-jp-font)] text-sm">
            {kanji.onyomi.length > 0 ? kanji.onyomi.join('・') : '—'}
          </p>
        </div>
        <div className="bg-card border border-border/10 p-3">
          <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground mb-1">Kun'yomi</p>
          <p className="font-[var(--br-jp-font)] text-sm">
            {kanji.kunyomi.length > 0 ? kanji.kunyomi.join('・') : '—'}
          </p>
        </div>
      </div>
    </div>
  )

  const meaningsBlock = (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Meanings</p>
      <p className="text-lg font-bold font-[var(--br-jp-font)]">{kanji.meaning_vi.join(', ')}</p>
      <p className="text-sm text-muted-foreground font-[var(--br-jp-font)]">{kanji.meaning_en.join(', ')}</p>
    </div>
  )

  const hanVietBlock = (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Hán Việt</p>
      <p className="text-2xl font-bold font-[var(--br-heading-font)] uppercase tracking-wider">
        {kanji.han_viet ?? '—'}
      </p>
    </div>
  )

  const mnemonicBlock = kanji.mnemonic_vi
    ? (
        <div className="border-l-4 border-primary pl-3 flex flex-col gap-1">
          <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Mnemonic</p>
          <p className="text-sm font-[var(--br-jp-font)]">{kanji.mnemonic_vi}</p>
        </div>
      )
    : null

  const componentsBlock = kanji.components && kanji.components.length > 0
    ? (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Components</p>
          <div className="flex flex-col gap-2">
            {kanji.components.map(comp => (
              <div
                key={comp.char}
                className="flex items-center gap-3 bg-card border border-border/10 p-3"
              >
                <span
                  className="text-3xl font-bold"
                  style={{ fontFamily: 'var(--br-jp-font)' }}
                >
                  {comp.char}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold font-[var(--br-jp-font)]">{comp.meaning_vi}</span>
                  <span className="text-xs text-muted-foreground">{comp.meaning_en}</span>
                  {comp.han_viet && (
                    <span className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground">{comp.han_viet}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    : null

  const strokeOrderBlock = (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Stroke Order</p>
      {kanji.stroke_paths && kanji.stroke_paths.length > 0
        ? (
            <StrokeOrderAnimation strokes={kanji.stroke_paths} char={char} />
          )
        : (
            <p className="text-sm text-muted-foreground font-[var(--br-mono-font)]">
              Stroke data not available for this kanji.
            </p>
          )}
    </div>
  )

  const chevronLeft = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
  const chevronRight = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )

  return (
    <>
      <div className="p-4 max-w-5xl mx-auto pb-28 lg:pb-20">

        {/* Mobile layout (< lg): single column */}
        <div className="flex flex-col gap-6 lg:hidden">
          <div className="flex items-start gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <p
                className="text-7xl font-bold leading-none"
                style={{ fontFamily: 'var(--br-jp-font)' }}
              >
                {kanji.char}
              </p>
              {badgeRow}
            </div>
          </div>
          <Separator className="my-0 opacity-20" />
          {readingsBlock}
          {meaningsBlock}
          {hanVietBlock}
          {mnemonicBlock}
          {componentsBlock}
          {strokeOrderBlock}
          <RelatedVocabulary
            char={kanji.char}
            curated={kanji.related_vocab}
            userId={userId ?? ''}
          />
        </div>

        {/* Desktop layout (≥ lg): two-column sticky grid */}
        <div className="hidden lg:grid lg:grid-cols-[320px_1fr] lg:gap-8 lg:items-start">
          {/* Left panel — sticky */}
          <div className="sticky top-6 flex flex-col gap-6">
            {/* Large character card */}
            <div className="bg-card border border-border/10 flex flex-col items-center gap-3 p-6">
              <p
                className="text-[120px] font-bold leading-none"
                style={{ fontFamily: 'var(--br-jp-font)' }}
              >
                {kanji.char}
              </p>
              {kanji.han_viet && (
                <p className="text-3xl font-bold font-[var(--br-heading-font)] uppercase tracking-wider text-center">
                  {kanji.han_viet}
                </p>
              )}
              {!kanji.han_viet && (
                <p className="text-3xl font-bold font-[var(--br-heading-font)] uppercase tracking-wider text-center text-muted-foreground">
                  —
                </p>
              )}
              <div className="flex gap-2 flex-wrap justify-center">
                {kanji.jlpt_level && (
                  <Badge variant="outline" className="font-[var(--br-mono-font)] text-[10px] text-primary border-primary">
                    {kanji.jlpt_level}
                  </Badge>
                )}
                <Badge variant="outline" className="font-[var(--br-mono-font)] text-[10px]">
                  {kanji.stroke_count}
                  {' '}
                  strokes
                </Badge>
                {kanji.radical && (
                  <Badge variant="outline" className="font-[var(--br-mono-font)] text-[10px]">
                    radical:
                    {' '}
                    {kanji.radical}
                  </Badge>
                )}
              </div>
            </div>
            {readingsBlock}
            {meaningsBlock}
          </div>

          {/* Right panel — flowing content */}
          <div className="flex flex-col gap-6">
            {mnemonicBlock}
            {strokeOrderBlock}
            {componentsBlock}
            <RelatedVocabulary
              char={kanji.char}
              curated={kanji.related_vocab}
              userId={userId ?? ''}
            />
          </div>
        </div>
      </div>

      {kanji.lesson_number != null && lessonKanji && lessonKanji.length > 1 && (
        <div className="fixed bottom-[72px] lg:bottom-6 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="flex items-center gap-3 bg-background border border-border/10 px-3 py-2 pointer-events-auto">
            <Button
              size="icon-lg"
              aria-label="Hán tự trước"
              disabled={!prevChar}
              className="disabled:opacity-30"
              onClick={() => prevChar && navigate({ to: '/kanji/$char', params: { char: prevChar } })}
            >
              {chevronLeft}
            </Button>
            <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-muted-foreground tracking-wider select-none">
              BÀI
              {' '}
              {String(kanji.lesson_number).padStart(2, '0')}
              {' '}
              ·
              {' '}
              {currentIndex + 1}
              /
              {lessonKanji.length}
            </span>
            <Button
              size="icon-lg"
              aria-label="Hán tự tiếp theo"
              disabled={!nextChar}
              className="disabled:opacity-30"
              onClick={() => nextChar && navigate({ to: '/kanji/$char', params: { char: nextChar } })}
            >
              {chevronRight}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

interface VocabHit {
  vocab_id: string
  word: string | null
  reading: string
  meaning_vi: string
  han_viet: string | null
}

interface RelatedVocabularyProps {
  char: string
  curated: RelatedVocabItem[] | null
  userId: string
}

function RelatedVocabulary({ char, curated, userId }: RelatedVocabularyProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [openVocabKey, setOpenVocabKey] = useState<string | null>(null)

  const { data: dynamic } = useQuery<VocabHit[]>({
    queryKey: ['related-vocab', char],
    queryFn: async () => {
      const items = await db.vocabulary.toArray()
      return items
        .filter(v => v.word?.includes(char) || v.reading?.includes(char))
        .slice(0, 8)
        .map(v => ({ vocab_id: v.vocab_id, word: v.word ?? null, reading: v.reading, meaning_vi: v.meaning_vi, han_viet: v.han_viet ?? null }))
    },
    staleTime: Infinity,
    enabled: !curated || curated.length === 0,
  })

  if (curated && curated.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Related Vocabulary</p>
        <div className="flex flex-col gap-1">
          {curated.map((v) => {
            const itemKey = `${v.word ?? ''}:${v.kana}`
            return (
              <div key={itemKey} className="flex flex-col bg-card border border-border/10">
                <div className="flex items-center">
                  <button
                    type="button"
                    className="flex flex-col gap-0.5 p-2 text-left flex-1"
                    onClick={() => setExpandedKey(expandedKey === v.kana ? null : v.kana)}
                  >
                    <div className="flex items-baseline gap-2">
                      {v.word && (
                        <span className="text-base font-bold font-[var(--br-jp-font)]">{v.word}</span>
                      )}
                      <span className="text-sm font-[var(--br-jp-font)] text-muted-foreground">{v.kana}</span>
                      {v.han_viet && (
                        <span className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground">{v.han_viet}</span>
                      )}
                    </div>
                    <span className="text-sm font-[var(--br-jp-font)] text-muted-foreground/80">{v.meaning_vi}</span>
                  </button>
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label={`Thêm ${v.word ?? v.kana} vào deck`}
                      onClick={() => setOpenVocabKey(itemKey)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <AddToDeckDialog
                      open={openVocabKey === itemKey}
                      onOpenChange={open => !open && setOpenVocabKey(null)}
                      vocabItem={{
                        vocab_id: itemKey,
                        word: v.word ?? null,
                        reading: v.kana,
                        meaning_vi: v.meaning_vi,
                        han_viet: v.han_viet ?? null,
                      }}
                      userId={userId}
                    />
                  </>
                </div>
                {expandedKey === v.kana && v.example && (
                  <div className="border-t border-border/10 border-l-4 border-l-primary pl-3 pr-2 py-2">
                    <p className="text-sm font-[var(--br-jp-font)]">{v.example.ja}</p>
                    <p className="text-xs text-muted-foreground font-[var(--br-jp-font)] mt-1">{v.example.vi}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (!dynamic || dynamic.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Related Vocabulary</p>
        <p className="text-sm text-muted-foreground font-[var(--br-mono-font)]">No vocabulary found for this kanji yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">Related Vocabulary</p>
      <div className="flex flex-col gap-1">
        {dynamic.map(v => (
          <div
            key={v.vocab_id}
            className="flex items-center bg-card border border-border/10"
          >
            <div className="flex flex-col gap-0.5 p-2 flex-1">
              <div className="flex items-baseline gap-2">
                {v.word && (
                  <span className="text-base font-bold font-[var(--br-jp-font)]">{v.word}</span>
                )}
                <span className="text-sm font-[var(--br-jp-font)] text-muted-foreground">{v.reading}</span>
              </div>
              <span className="text-sm font-[var(--br-jp-font)] text-muted-foreground/80">{v.meaning_vi}</span>
            </div>
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label={`Thêm ${v.word ?? v.reading} vào deck`}
                onClick={() => setOpenVocabKey(v.vocab_id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <AddToDeckDialog
                open={openVocabKey === v.vocab_id}
                onOpenChange={open => !open && setOpenVocabKey(null)}
                vocabItem={{
                  vocab_id: v.vocab_id,
                  word: v.word ?? null,
                  reading: v.reading,
                  meaning_vi: v.meaning_vi,
                  han_viet: v.han_viet ?? null,
                }}
                userId={userId}
              />
            </>
          </div>
        ))}
      </div>
    </div>
  )
}
