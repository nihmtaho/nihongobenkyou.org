import type { CardState } from '../../types/srs'
import type { VocabItem } from '../../types/vocabulary'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import { moraCount } from '../../lib/mora'
import { parsePitchPattern } from '../../lib/pitch'
import { VocabCard } from './VocabCard'

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

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATE_SIZE,
    overscan: OVERSCAN,
    measureElement: el => el.getBoundingClientRect().height,
  })

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
    <div ref={parentRef} className="h-[calc(100vh-4rem)] overflow-auto">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
      >
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
  )
}
