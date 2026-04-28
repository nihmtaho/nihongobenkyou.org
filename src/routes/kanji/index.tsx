import type { KanjiItem } from '../../types/kanji'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { KanjiCard } from '../../components/kanji/KanjiCard'
import { KanjiLessonPanel } from '../../components/kanji/KanjiLessonPanel'
import { useKanjiList } from '../../hooks/useKanjiList'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/kanji/')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: KanjiPage,
})

type Tab = 'lessons' | 'browse'

function KanjiPage() {
  const userId = useAuthStore(s => s.userId) ?? ''
  const [activeTab, setActiveTab] = useState<Tab>('lessons')

  return (
    // lg:h-full fills main's height so columns can have independent overflow-y-auto
    <div className="flex flex-col lg:h-full">

      {/* Page header */}
      <div className="sticky top-0 lg:static z-10 bg-base-100 px-4 pt-4 border-b border-base-content/10 flex-shrink-0">
        <h1 className="text-4xl font-black font-[var(--br-heading-font)] tracking-tight uppercase mb-3">
          漢字
        </h1>

        {/* Tabs — mobile only */}
        <div className="lg:hidden tabs tabs-border">
          <button
            type="button"
            className={`tab font-[var(--br-mono-font)] text-[11px] uppercase tracking-widest ${activeTab === 'lessons' ? 'tab-active font-bold' : ''}`}
            onClick={() => setActiveTab('lessons')}
          >
            Theo bài
          </button>
          <button
            type="button"
            className={`tab font-[var(--br-mono-font)] text-[11px] uppercase tracking-widest ${activeTab === 'browse' ? 'tab-active font-bold' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            Duyệt
          </button>
        </div>
      </div>

      {/* Mobile: tab content scrolls via main */}
      <div className="lg:hidden flex flex-col">
        {activeTab === 'lessons' && (
          <KanjiLessonPanel userId={userId} title="THEO BÀI" />
        )}
        {activeTab === 'browse' && (
          <BrowsePanel userId={userId} />
        )}
      </div>

      {/* Desktop: two independent scroll panels */}
      {/* flex-1 min-h-0 → fills remaining height after page header */}
      {/* each column overflow-y-auto → scrolls independently within grid cell */}
      <div className="hidden lg:grid lg:grid-cols-[2fr_3fr] lg:flex-1 lg:min-h-0 divide-x divide-base-content/10">
        <div className="overflow-y-auto">
          <KanjiLessonPanel userId={userId} title="THEO BÀI" stickyStats={true} />
        </div>
        <div className="overflow-y-auto">
          <BrowsePanel userId={userId} stickyFilters={true} />
        </div>
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
  const [jlptFilter, setJlptFilter] = useState<KanjiItem['jlpt_level'] | undefined>(undefined)
  const [radicalFilter, setRadicalFilter] = useState('')
  const [strokeFilter, setStrokeFilter] = useState<number | undefined>(undefined)

  const { data: kanjiList, isLoading } = useKanjiList(userId, {
    jlpt_level: jlptFilter,
    radical: radicalFilter || undefined,
    stroke_count: strokeFilter,
  })

  const filterSection = (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          className={`btn btn-xs font-[var(--br-mono-font)] ${jlptFilter === undefined ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setJlptFilter(undefined)}
        >
          ALL
        </button>
        {JLPT_LEVELS.map(level => (
          <button
            key={level}
            type="button"
            className={`btn btn-xs font-[var(--br-mono-font)] ${jlptFilter === level ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setJlptFilter(level)}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Radical (e.g. 木)"
          className="input input-bordered input-sm font-[var(--br-jp-font)] flex-1"
          value={radicalFilter}
          onChange={e => setRadicalFilter(e.target.value)}
          maxLength={1}
        />
        <select
          className="select select-bordered select-sm font-[var(--br-mono-font)]"
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
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral">
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
            <div className="sticky top-0 z-10 bg-base-100 px-6 pt-4 pb-3 border-b border-base-content/10">
              <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest mb-3">
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
              <div key={i} className="skeleton h-24" />
            ))}
          </div>
        )}

        {!isLoading && (!kanjiList || kanjiList.length === 0) && (
          <div className="flex flex-col items-center justify-center min-h-[20vh] gap-3">
            <p className="font-[var(--br-mono-font)] text-sm uppercase text-neutral">Không tìm thấy</p>
            <button
              type="button"
              className="btn btn-outline btn-sm font-[var(--br-mono-font)] uppercase"
              onClick={() => {
                setJlptFilter(undefined)
                setRadicalFilter('')
                setStrokeFilter(undefined)
              }}
            >
              Reset filters
            </button>
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
