import type { StudyLaunchOptions } from '../study/study-modal.types'
import type { StudyMode, TypeInputSubMode } from '@/types/study'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getActiveDeckKanjiSRSMap, getActiveDeckVocabSRSMap } from '@/db/active-deck'
import { db } from '@/db/schema'
import {
  useActiveDeckDueCounts,
  useActiveDeckKanji,
  useActiveDeckVocab,
  useClearKanjiDeck,
  useClearVocabDeck,
  useToggleKanjiInDeck,
  useToggleVocabInDeck,
} from '@/hooks/useActiveDeck'
import { useLaunchActiveKanjiDeckSession } from '@/hooks/useLaunchActiveKanjiDeckSession'
import { useLaunchActiveVocabDeckSession } from '@/hooks/useLaunchActiveVocabDeckSession'
import { ACTIVE_DECK_KANJI_SECTIONS, ACTIVE_DECK_VOCAB_SECTIONS } from '../study/config/active-deck-modes.config'
import { StudyModal } from '../study/StudyModal'
import { KanjiDeckItem, VocabDeckItem } from './ActiveDeckItem'

// ─── Menu button (⋯) with inline popover ─────────────────────────────────────

interface MenuProps {
  onClear: () => void
}

function DeckMenu({ onClear }: MenuProps) {
  const [open, setOpen] = useState(false)

  function handleClear() {
    setOpen(false)
    onClear()
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Tùy chọn deck"
        className="font-[var(--br-mono-font)] text-xs"
        onClick={() => setOpen(o => !o)}
      >
        ⋯
      </Button>
      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border/20 min-w-[160px]">
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-[11px] font-[var(--br-mono-font)] text-destructive hover:bg-destructive/10 transition-colors"
              onClick={handleClear}
            >
              Xóa toàn bộ deck
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Clear confirm dialog ──────────────────────────────────────────────────────

interface ClearDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  label: string
}

function ClearConfirmDialog({ open, onClose, onConfirm, label }: ClearDialogProps) {
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-[var(--br-heading-font)] text-xl uppercase">
            Xóa toàn bộ?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {label}
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Vocab section ─────────────────────────────────────────────────────────────

interface ActiveDeckVocabSectionProps {
  userId: string
}

export function ActiveDeckVocabSection({ userId }: ActiveDeckVocabSectionProps) {
  const [studyModalOpen, setStudyModalOpen] = useState(false)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)

  const { data: deckItems = [] } = useActiveDeckVocab(userId)
  const { data: dueCounts } = useActiveDeckDueCounts(userId)
  const toggleVocab = useToggleVocabInDeck(userId)
  const clearVocab = useClearVocabDeck(userId)
  const { launch, isLaunching } = useLaunchActiveVocabDeckSession(userId)

  const vocabIds = deckItems.map(i => i.vocab_id)

  // Load vocab content for display
  const { data: vocabMap } = useQuery({
    queryKey: ['active-deck-vocab-content', vocabIds],
    queryFn: async () => {
      const rows = await db.vocabulary.bulkGet(vocabIds)
      return new Map(rows.filter(Boolean).map(v => [v!.vocab_id, v!]))
    },
    enabled: vocabIds.length > 0,
    staleTime: Infinity,
  })

  // Load SRS data for due dates
  const { data: srsMap } = useQuery({
    queryKey: ['active-deck-vocab-srs', userId],
    queryFn: () => getActiveDeckVocabSRSMap(userId),
    enabled: !!userId,
    staleTime: 0,
  })

  const dueCount = dueCounts?.vocab ?? 0
  const totalCount = deckItems.length

  function handleLaunch(_mode: string, options: StudyLaunchOptions) {
    const mode = _mode as StudyMode
    const subMode = options.subMode as TypeInputSubMode | undefined
    const dueOnly = dueCount > 0
    setStudyModalOpen(false)
    launch(dueOnly, mode, subMode)
  }

  function handleClearConfirm() {
    setClearDialogOpen(false)
    clearVocab.mutate()
  }

  const isEmpty = totalCount === 0

  return (
    <div className="border border-border/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/10 bg-card">
        <h2 className="font-[var(--br-heading-font)] text-lg font-bold uppercase tracking-wide leading-none">
          HỌC NGẮT QUÃNG
        </h2>
        <DeckMenu onClear={() => setClearDialogOpen(true)} />
      </div>

      {/* Stats + launch */}
      <div className="px-4 py-3 bg-secondary/30 border-b border-border/10">
        <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground mb-2">
          {totalCount}
          {' '}
          từ
          {' · '}
          {dueCount}
          {' '}
          đến hạn
        </p>
        <Button
          type="button"
          variant="default"
          className="w-full font-[var(--br-mono-font)] text-[11px] uppercase"
          disabled={isEmpty || isLaunching}
          onClick={() => setStudyModalOpen(true)}
        >
          ▶ BẮT ĐẦU HỌC
        </Button>
      </div>

      {/* Item list */}
      {isEmpty
        ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[11px] font-[var(--br-mono-font)] text-muted-foreground">
                Chưa có từ nào. Nhấn + ở danh sách từ vựng để thêm vào đây.
              </p>
            </div>
          )
        : (
            <div>
              {deckItems.map((item) => {
                const vocab = vocabMap?.get(item.vocab_id)
                const srs = srsMap?.get(item.vocab_id)
                if (!vocab)
                  return null
                return (
                  <VocabDeckItem
                    key={item.vocab_id}
                    vocab={vocab}
                    dueDate={srs?.due_date ?? new Date().toISOString().slice(0, 10)}
                    onRemove={() => toggleVocab.mutate({ vocabId: item.vocab_id, inDeck: true })}
                  />
                )
              })}
            </div>
          )}

      <StudyModal
        open={studyModalOpen}
        onClose={() => setStudyModalOpen(false)}
        title="HỌC NGẮT QUÃNG"
        context={dueCount > 0 ? 'due' : 'all'}
        cardCount={dueCount > 0 ? dueCount : totalCount}
        sections={ACTIVE_DECK_VOCAB_SECTIONS}
        onLaunch={handleLaunch}
      />

      <ClearConfirmDialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        onConfirm={handleClearConfirm}
        label="Tất cả từ vựng sẽ bị xóa khỏi deck chủ động. Tiến trình SRS vẫn được giữ lại."
      />
    </div>
  )
}

// ─── Kanji section ─────────────────────────────────────────────────────────────

interface ActiveDeckKanjiSectionProps {
  userId: string
}

export function ActiveDeckKanjiSection({ userId }: ActiveDeckKanjiSectionProps) {
  const [studyModalOpen, setStudyModalOpen] = useState(false)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)

  const { data: deckItems = [] } = useActiveDeckKanji(userId)
  const { data: dueCounts } = useActiveDeckDueCounts(userId)
  const toggleKanji = useToggleKanjiInDeck(userId)
  const clearKanji = useClearKanjiDeck(userId)
  const { launch, isLaunching } = useLaunchActiveKanjiDeckSession(userId)

  const chars = deckItems.map(i => i.char)

  // Load kanji content for display
  const { data: kanjiMap } = useQuery({
    queryKey: ['active-deck-kanji-content', chars],
    queryFn: async () => {
      const rows = await db.kanji.bulkGet(chars)
      return new Map(rows.filter(Boolean).map(k => [k!.char, k!]))
    },
    enabled: chars.length > 0,
    staleTime: Infinity,
  })

  // Load SRS data for due dates
  const { data: srsMap } = useQuery({
    queryKey: ['active-deck-kanji-srs', userId],
    queryFn: () => getActiveDeckKanjiSRSMap(userId),
    enabled: !!userId,
    staleTime: 0,
  })

  const dueCount = dueCounts?.kanji ?? 0
  const totalCount = deckItems.length

  function handleLaunch(_mode: string, _options: StudyLaunchOptions) {
    setStudyModalOpen(false)
    launch(_mode as StudyMode)
  }

  function handleClearConfirm() {
    setClearDialogOpen(false)
    clearKanji.mutate()
  }

  const isEmpty = totalCount === 0

  return (
    <div className="border border-border/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/10 bg-card">
        <h2 className="font-[var(--br-heading-font)] text-lg font-bold uppercase tracking-wide leading-none">
          HỌC NGẮT QUÃNG
        </h2>
        <DeckMenu onClear={() => setClearDialogOpen(true)} />
      </div>

      {/* Stats + launch */}
      <div className="px-4 py-3 bg-secondary/30 border-b border-border/10">
        <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground mb-2">
          {totalCount}
          {' '}
          kanji
          {' · '}
          {dueCount}
          {' '}
          đến hạn
        </p>
        <Button
          type="button"
          variant="default"
          className="w-full font-[var(--br-mono-font)] text-[11px] uppercase"
          disabled={isEmpty || isLaunching}
          onClick={() => setStudyModalOpen(true)}
        >
          ▶ BẮT ĐẦU HỌC
        </Button>
      </div>

      {/* Item list */}
      {isEmpty
        ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[11px] font-[var(--br-mono-font)] text-muted-foreground">
                Chưa có kanji nào. Nhấn + ở trang chi tiết kanji để thêm vào đây.
              </p>
            </div>
          )
        : (
            <div>
              {deckItems.map((item) => {
                const kanji = kanjiMap?.get(item.char)
                const srs = srsMap?.get(item.char)
                if (!kanji)
                  return null
                return (
                  <KanjiDeckItem
                    key={item.char}
                    kanji={kanji}
                    dueDate={srs?.due_date ?? new Date().toISOString().slice(0, 10)}
                    onRemove={() => toggleKanji.mutate({ char: item.char, inDeck: true })}
                  />
                )
              })}
            </div>
          )}

      <StudyModal
        open={studyModalOpen}
        onClose={() => setStudyModalOpen(false)}
        title="漢字 DECK"
        context={dueCount > 0 ? 'due' : 'all'}
        cardCount={dueCount > 0 ? dueCount : totalCount}
        sections={ACTIVE_DECK_KANJI_SECTIONS}
        onLaunch={handleLaunch}
      />

      <ClearConfirmDialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        onConfirm={handleClearConfirm}
        label="Tất cả kanji sẽ bị xóa khỏi deck chủ động. Tiến trình SRS vẫn được giữ lại."
      />
    </div>
  )
}
