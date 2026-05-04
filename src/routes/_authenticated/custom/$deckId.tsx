import type { StudyMode, TypeInputSubMode } from '../../../types/study'
import type { VocabWithSRS } from '../../../types/vocabulary'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CsvImport } from '../../../components/custom-decks/CsvImport'
import { DeckEditor } from '../../../components/custom-decks/DeckEditor'
import { WordEntry } from '../../../components/custom-decks/WordEntry'
import { VocabStudyModal } from '../../../components/study/VocabStudyModal'
import { useCustomDeckMutations } from '../../../hooks/useCustomDeckMutations'
import { useCustomDecks } from '../../../hooks/useCustomDecks'
import { useCustomVocabulary } from '../../../hooks/useCustomVocabulary'
import { useAuthStore } from '../../../stores/authStore'
import { useStudySessionStore } from '../../../stores/studySessionStore'

export const Route = createFileRoute('/_authenticated/custom/$deckId')({
  component: DeckDetailPage,
})

function DeckDetailPage() {
  const { deckId } = Route.useParams()
  const { userId } = useAuthStore()
  const navigate = useNavigate()

  const [showStudyModal, setShowStudyModal] = useState(false)
  const initSession = useStudySessionStore(s => s.initSession)

  const { data: decks = [] } = useCustomDecks(userId ?? '')
  const { data: words = [], isLoading: wordsLoading, schedulePitchRefresh } = useCustomVocabulary(deckId)
  const mutations = useCustomDeckMutations(userId ?? '')

  const deck = decks.find(d => d.id === deckId)

  const [showEditor, setShowEditor] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [pitchLoading, setPitchLoading] = useState(false)
  const copyRef = useRef<HTMLInputElement>(null)

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-foreground/60">Không tìm thấy bộ từ vựng</p>
        <Button variant="ghost" asChild>
          <Link to="/custom">← Quay lại</Link>
        </Button>
      </div>
    )
  }

  function handleAddWord(input: Parameters<typeof mutations.addWord.mutate>[0]['input']) {
    mutations.addWord.mutate(
      { deckId, input },
      {
        onSuccess: () => {
          setPitchLoading(true)
          schedulePitchRefresh()
          setTimeout(setPitchLoading, 2500, false)
        },
      },
    )
  }

  function handleDeleteDeck() {
    mutations.deleteDeck.mutate(deckId, {
      onSuccess: () => navigate({ to: '/custom' }),
    })
  }

  function handleUpdateDeck(data: { title: string, description?: string }) {
    mutations.updateDeck.mutate(
      { deckId, updates: data },
      { onSuccess: () => setShowEditor(false) },
    )
  }

  function launchDeckSession(mode: StudyMode, subMode?: TypeInputSubMode) {
    if (!words.length)
      return
    const today = new Date().toISOString().slice(0, 10)
    const timestamp = new Date().toISOString()
    // userId is guaranteed by the _authenticated route guard
    const queue: VocabWithSRS[] = words.map((w): VocabWithSRS => ({
      vocab_id: w.id,
      word: w.kanji,
      reading: w.kana,
      romaji: '',
      meaning_en: w.meaning_en ?? '',
      meaning_vi: w.meaning_vi,
      pitch_pattern: w.pitch_pattern,
      pitch_type: null,
      audio_filename: null,
      pos: [],
      jlpt_level: null,
      book_source: 'custom',
      lesson_number: 0,
      examples: [],
      tags: [],
      deprecated: false,
      interval_days: 0,
      ease_factor: 2.5,
      due_date: today,
      review_count: 0,
      last_rating: null,
      pending_sync: false,
      updated_at: timestamp,
      is_known: false,
      consecutive_correct: 0,
    }))
    initSession(queue, mode, subMode)
    navigate({ to: '/study/$mode', params: { mode }, search: { returnTab: 'decks' } })
  }

  function handleTogglePublic() {
    mutations.updateDeck.mutate({ deckId, updates: { is_public: !deck!.is_public } })
  }

  function handleCopyShareUrl() {
    // deck is guaranteed non-null here (early return guard above)
    const url = `${window.location.origin}/custom/shared/${deck!.share_code}`
    navigator.clipboard.writeText(url).catch(() => {
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
      }
      catch {
        // clipboard fallback failed — no recovery needed
      }
      document.body.removeChild(textarea)
    })
  }

  const shareUrl = `${window.location.origin}/custom/shared/${deck.share_code}`

  return (
    <div className="p-4 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/custom" className="text-sm text-foreground/60 hover:text-foreground">
            ← Bộ từ vựng
          </Link>
          <h1 className="text-2xl font-bold mt-1">{deck.title}</h1>
          {deck.description && (
            <p className="text-sm text-foreground/60 mt-1">{deck.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setShowEditor(true)}>
            Chỉnh sửa
          </Button>
          <Button
            size="sm"
            disabled={wordsLoading || !words.length}
            onClick={() => setShowStudyModal(true)}
          >
            Học
          </Button>
        </div>
      </div>

      {/* Share section */}
      <div className="bg-card border border-secondary p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">Chia sẻ bộ từ vựng</span>
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary"
            checked={deck.is_public}
            onChange={handleTogglePublic}
            disabled={mutations.updateDeck.isPending}
          />
        </div>
        {deck.is_public && (
          <div className="flex items-center gap-2">
            <input
              ref={copyRef}
              type="text"
              readOnly
              value={shareUrl}
              className="input input-bordered input-sm flex-1 text-xs font-mono"
            />
            <Button variant="ghost" size="sm" onClick={handleCopyShareUrl}>
              Sao chép
            </Button>
          </div>
        )}
      </div>

      {/* Word entry */}
      <div className="bg-card border border-secondary p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Thêm từ mới</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setShowCsvImport(!showCsvImport)}
          >
            {showCsvImport ? 'Ẩn' : 'Nhập CSV'}
          </Button>
        </div>

        {showCsvImport
          ? (
              <CsvImport
                deckId={deckId}
                userId={userId ?? ''}
                onSuccess={() => {
                  setShowCsvImport(false)
                  mutations.refresh(deckId)
                }}
              />
            )
          : (
              <WordEntry
                onAdd={handleAddWord}
                isPending={mutations.addWord.isPending}
                pitchLoading={pitchLoading}
              />
            )}
      </div>

      {/* Word list */}
      <div>
        <h2 className="font-medium mb-3">
          Từ vựng
          {' '}
          <span className="text-foreground/60">
            (
            {deck.word_count}
            )
          </span>
        </h2>

        {wordsLoading
          ? <Loader2 className="animate-spin h-4 w-4" />
          : words.length === 0
            ? <p className="text-foreground/60 text-sm">Chưa có từ nào. Thêm từ đầu tiên!</p>
            : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th style={{ fontFamily: 'var(--br-jp-font)' }}>Kana</th>
                        <th style={{ fontFamily: 'var(--br-jp-font)' }}>Kanji</th>
                        <th>Nghĩa (VI)</th>
                        <th>Nghĩa (EN)</th>
                        <th>Pitch</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {words.map(word => (
                        <tr key={word.id}>
                          <td style={{ fontFamily: 'var(--br-jp-font)' }}>{word.kana}</td>
                          <td style={{ fontFamily: 'var(--br-jp-font)' }}>{word.kanji ?? '—'}</td>
                          <td>{word.meaning_vi}</td>
                          <td>{word.meaning_en ?? '—'}</td>
                          <td>
                            {word.pitch_pattern !== null
                              ? word.pitch_pattern
                              : <span className="text-foreground/40">—</span>}
                          </td>
                          <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                              onClick={() =>
                                mutations.deleteWord.mutate({ wordId: word.id, deckId })}
                              disabled={mutations.deleteWord.isPending}
                            >
                              ×
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
      </div>

      {showEditor && (
        <DeckEditor
          deck={deck}
          onSave={handleUpdateDeck}
          onDelete={handleDeleteDeck}
          onClose={() => setShowEditor(false)}
          isPending={mutations.updateDeck.isPending || mutations.deleteDeck.isPending}
        />
      )}

      {showStudyModal && (
        <VocabStudyModal
          title={deck.title}
          context="all"
          onLaunch={(mode: StudyMode, subMode?: TypeInputSubMode) => {
            setShowStudyModal(false)
            launchDeckSession(mode, subMode)
          }}
          onClose={() => setShowStudyModal(false)}
        />
      )}
    </div>
  )
}
