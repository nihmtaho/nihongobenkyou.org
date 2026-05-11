import type { CardState } from '../../types/srs'
import type { VocabItem } from '../../types/vocabulary'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useState } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { useActiveDeckVocab } from '../../hooks/useActiveDeck'
import { moraCount } from '../../lib/mora'
import { parsePitchPattern } from '../../lib/pitch'
import { HiddenVocabList } from './HiddenVocabList'
import { VocabCard } from './VocabCard'
import { VocabDetailPanel } from './VocabDetailPanel'
import { VocabIndexRow } from './VocabIndexRow'

interface VocabListProps {
  items: VocabItem[]
  cards: Map<string, CardState>
  userId: string
  isLoading: boolean
  hiddenPanelOpen?: boolean
  onHiddenPanelClose?: () => void
}

const ESTIMATE_SIZE = 180
const OVERSCAN = 3
const SKELETON_COUNT = 5

export function VocabList({ items, cards, userId, isLoading, hiddenPanelOpen, onHiddenPanelClose }: VocabListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: deckItems } = useActiveDeckVocab(userId)
  const vocabIdSet = useMemo(
    () => new Set((deckItems ?? []).map(i => i.vocab_id)),
    [deckItems],
  )

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
          <Skeleton key={key} className="h-[180px] w-full" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="font-[var(--br-mono-font)] text-muted-foreground text-sm">
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
        {/* Hidden vocab panel — slides in from left */}
        {hiddenPanelOpen && onHiddenPanelClose && (
          <div className="w-40 shrink-0 border-r-2 border-foreground flex flex-col bg-secondary">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/10 shrink-0">
              <span className="text-[9px] font-[var(--br-mono-font)] uppercase tracking-wider font-bold">
                Từ Đang Ẩn
              </span>
              <button
                type="button"
                onClick={onHiddenPanelClose}
                aria-label="Đóng danh sách ẩn"
                className="text-muted-foreground hover:text-foreground text-xs leading-none"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <HiddenVocabList source="lesson" userId={userId} />
            </div>
          </div>
        )}

        {/* Left — compact numbered index */}
        <div
          className="w-[300px] xl:w-[340px] shrink-0 border-r border-border/10 overflow-auto outline-none"
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
              vocabIdSet={vocabIdSet}
              userId={userId}
            />
          ))}
        </div>

        {/* Right — poster-scale detail view */}
        <div className="flex-1 min-w-0 bg-card">
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
