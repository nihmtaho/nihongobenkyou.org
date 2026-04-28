import type { CardState } from '../../types/srs'
import type { VocabItem } from '../../types/vocabulary'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useState } from 'react'

import { moraCount } from '../../lib/mora'
import { parsePitchPattern } from '../../lib/pitch'
import { VocabCard } from './VocabCard'
import { VocabDetailPanel } from './VocabDetailPanel'
import { VocabIndexRow } from './VocabIndexRow'

interface VocabListProps {
  items: VocabItem[]
  cards: Map<string, CardState>
  userId: string
  isLoading: boolean
}

const ESTIMATE_SIZE = 180
const OVERSCAN = 3
const SKELETON_COUNT = 5

export function VocabList({ items, cards, userId, isLoading }: VocabListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATE_SIZE,
    overscan: OVERSCAN,
    measureElement: el => el.getBoundingClientRect().height,
  })

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const effectiveSelectedId = selectedId ?? items[0]?.vocab_id ?? null
  const selectedIndex = useMemo(
    () => items.findIndex(item => item.vocab_id === effectiveSelectedId),
    [items, effectiveSelectedId],
  )
  const selectedItem = items[selectedIndex] ?? null
  const selectedCard = selectedItem ? (cards.get(selectedItem.vocab_id) ?? null) : null
  const selectedMoraPattern = selectedItem
    ? parsePitchPattern(selectedItem.pitch_pattern, moraCount(selectedItem.reading))
    : null

  function handleIndexKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const current = items.findIndex(item => item.vocab_id === effectiveSelectedId)
    if (e.key === 'ArrowDown' && current < items.length - 1) {
      e.preventDefault()
      setSelectedId(items[current + 1].vocab_id)
    }
    else if (e.key === 'ArrowUp' && current > 0) {
      e.preventDefault()
      setSelectedId(items[current - 1].vocab_id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => `skel-${i}`).map(key => (
          <div key={key} className="skeleton h-[180px] w-full" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="font-[var(--br-mono-font)] text-neutral text-sm">
          No vocabulary — run `pnpm run build:dataset`
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile: virtualized card stack */}
      <div ref={parentRef} className="lg:hidden h-[calc(100vh-4rem)] overflow-auto">
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = items[virtualItem.index]
            const card = cards.get(item.vocab_id) ?? null
            const count = moraCount(item.reading)
            const moraPattern = parsePitchPattern(item.pitch_pattern, count)

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="p-2"
              >
                <VocabCard
                  item={item}
                  card={card}
                  moraPattern={moraPattern}
                  userId={userId}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Desktop: newspaper split view */}
      <div className="hidden lg:flex h-full">
        {/* Left — compact numbered index */}
        <div
          className="w-[300px] xl:w-[340px] shrink-0 border-r border-base-content/10 overflow-auto outline-none"
          tabIndex={0}
          onKeyDown={handleIndexKeyDown}
          aria-label="Vocabulary index — use arrow keys to navigate"
        >
          {items.map((item, index) => (
            <VocabIndexRow
              key={item.vocab_id}
              item={item}
              card={cards.get(item.vocab_id) ?? null}
              index={index}
              isSelected={item.vocab_id === effectiveSelectedId}
              today={today}
              onSelect={() => setSelectedId(item.vocab_id)}
            />
          ))}
        </div>

        {/* Right — poster-scale detail view */}
        <div className="flex-1 min-w-0 bg-base-200">
          {selectedItem && (
            <VocabDetailPanel
              item={selectedItem}
              card={selectedCard}
              moraPattern={selectedMoraPattern}
              userId={userId}
              index={selectedIndex}
              total={items.length}
            />
          )}
        </div>
      </div>
    </>
  )
}
