import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { KanjiGraph } from '../../components/kanji/KanjiGraph'
import { useKanji } from '../../hooks/useKanji'
import { useKanjiList } from '../../hooks/useKanjiList'
import { useAuthStore } from '../../stores/authStore'

const MAX_NODES = 20

interface GraphSearch {
  focus?: string
}

export const Route = createFileRoute('/kanji/graph')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  validateSearch: (search: Record<string, unknown>): GraphSearch => ({
    focus: typeof search.focus === 'string' ? search.focus : undefined,
  }),
  component: KanjiGraphPage,
})

function KanjiGraphPage() {
  const { focus } = Route.useSearch()
  const userId = useAuthStore(s => s.userId) ?? ''
  const navigate = useNavigate()

  const [isExpanded, setIsExpanded] = useState(false)

  // Default to first N5 kanji if no focus specified
  const { data: allKanji } = useKanjiList(userId, { jlpt_level: 'N5' })
  const focusChar = focus ?? allKanji?.[0]?.char ?? '日'

  const { data: focusKanji } = useKanji(focusChar)

  // Neighbors: same radical as focus kanji
  const { data: neighborList } = useKanjiList(
    userId,
    focusKanji?.radical ? { radical: focusKanji.radical } : undefined,
  )

  const neighbors = (neighborList ?? [])
    .filter(k => k.char !== focusChar)

  const visibleNodes = isExpanded ? neighbors : neighbors.slice(0, MAX_NODES - 1)

  const graphNodes = [
    ...(focusKanji ? [{ char: focusKanji.char, han_viet: focusKanji.han_viet, meaning_en: focusKanji.meaning_en }] : []),
    ...visibleNodes.map(k => ({ char: k.char, han_viet: k.han_viet, meaning_en: k.meaning_en })),
  ]

  return (
    <div className="p-4 flex flex-col gap-6 max-w-sm mx-auto">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-black font-[var(--br-heading-font)] tracking-tight uppercase">
          KANJI GRAPH
        </h1>
        {focusKanji && (
          <span
            className="text-4xl font-bold"
            style={{ fontFamily: 'var(--br-jp-font)' }}
          >
            {focusKanji.char}
          </span>
        )}
      </div>

      {focusKanji?.radical && (
        <p className="font-[var(--br-mono-font)] text-[11px] uppercase text-neutral">
          Radical:
          {' '}
          {focusKanji.radical}
          {' '}
          —
          {' '}
          {neighbors.length}
          {' '}
          related kanji
        </p>
      )}

      <KanjiGraph
        focusChar={focusChar}
        nodes={graphNodes}
        onNodeClick={char => navigate({ to: '/kanji/$char', params: { char } })}
      />

      {!isExpanded && neighbors.length > MAX_NODES - 1 && (
        <button
          type="button"
          className="btn btn-outline btn-sm font-[var(--br-mono-font)] uppercase"
          onClick={() => setIsExpanded(true)}
        >
          Show more (
          {neighbors.length - (MAX_NODES - 1)}
          {' '}
          more)
        </button>
      )}
    </div>
  )
}
