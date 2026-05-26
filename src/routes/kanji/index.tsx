import type { KanjiItem } from '../../types/kanji'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { KanjiCard } from '../../components/kanji/KanjiCard'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/skeleton'
import { useKanjiList } from '../../hooks/useKanjiList'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/kanji/')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: KanjiPage,
})

function KanjiPage() {
  const userId = useAuthStore(s => s.userId) ?? ''

  return (
    <div className="flex flex-col min-h-full lg:h-full">
      <div className="sticky top-0 z-10 bg-background px-4 pt-4 border-b border-border/10 flex-shrink-0 pb-3 lg:hidden">
        <h1 className="text-4xl font-black font-[var(--br-heading-font)] tracking-tight uppercase">
          漢字
        </h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <BrowsePanel userId={userId} />
      </div>
    </div>
  )
}

const JLPT_LEVELS: KanjiItem['jlpt_level'][] = ['N5', 'N4', 'N3', 'N2', 'N1']
const STROKE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20]

interface BrowsePanelProps {
  userId: string
  stickyFilters?: boolean
}

function BrowsePanel({ userId, stickyFilters = false }: BrowsePanelProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [jlptFilter, setJlptFilter] = useState<KanjiItem['jlpt_level'] | undefined>(undefined)
  const [radicalFilter, setRadicalFilter] = useState('')
  const [strokeFilter, setStrokeFilter] = useState<number | undefined>(undefined)

  const { data: kanjiList, isLoading } = useKanjiList(userId, {
    query: query || undefined,
    jlpt_level: jlptFilter,
    radical: radicalFilter || undefined,
    stroke_count: strokeFilter,
  })

  const filterSection = (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <Button
          size="xs"
          variant={jlptFilter === undefined ? 'default' : 'outline'}
          className="text-[10px] font-[var(--br-mono-font)]"
          onClick={() => setJlptFilter(undefined)}
        >
          ALL
        </Button>
        {JLPT_LEVELS.map(level => (
          <Button
            key={level}
            size="xs"
            variant={jlptFilter === level ? 'default' : 'outline'}
            className="text-[10px] font-[var(--br-mono-font)]"
            onClick={() => setJlptFilter(level)}
          >
            {level}
          </Button>
        ))}
      </div>

      <div className="flex gap-3">
        <Input
          type="text"
          placeholder="Tìm theo hán tự / Hán Việt"
          className="h-8 text-sm font-[var(--br-jp-font)] flex-1"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Input
          type="text"
          placeholder="Bộ thủ"
          className="h-8 w-20 text-sm font-[var(--br-jp-font)] shrink-0"
          value={radicalFilter}
          onChange={e => setRadicalFilter(e.target.value)}
          maxLength={1}
        />
        <select
          className="border border-border bg-background text-sm px-2 py-1 font-[var(--br-mono-font)] outline-none focus:ring-1 focus:ring-ring"
          value={strokeFilter ?? ''}
          onChange={e => setStrokeFilter(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Strokes</option>
          {STROKE_OPTIONS.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {!isLoading && kanjiList && (
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground">
          {kanjiList.length}
          {' '}
          characters
        </p>
      )}
    </div>
  )

  return (
    <div className="flex flex-col">
      {stickyFilters
        ? (
            <div className="sticky top-0 z-10 bg-background px-6 pt-4 pb-3 border-b border-border/10">
              <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest mb-3">
                DUYỆT TẤT CẢ
              </p>
              {filterSection}
            </div>
          )
        : (
            <div className="px-6 pt-4 pb-3">
              {filterSection}
            </div>
          )}

      {/* Kanji grid — scrolls */}
      <div className="px-6 py-4">
        {isLoading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {!isLoading && (!kanjiList || kanjiList.length === 0) && (
          <div className="flex flex-col items-center justify-center min-h-[20vh] gap-3">
            <p className="font-[var(--br-mono-font)] text-sm uppercase text-muted-foreground">Không tìm thấy</p>
            <Button
              variant="outline"
              size="sm"
              className="font-[var(--br-mono-font)] uppercase"
              onClick={() => {
                setQuery('')
                setJlptFilter(undefined)
                setRadicalFilter('')
                setStrokeFilter(undefined)
              }}
            >
              Reset filters
            </Button>
          </div>
        )}

        {!isLoading && kanjiList && kanjiList.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {kanjiList.map(item => (
              <KanjiCard
                key={item.char}
                kanji={item}
                card={item.card}
                onClick={() => navigate({ to: '/kanji/$char', params: { char: item.char } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
