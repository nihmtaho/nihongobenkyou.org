import type { CustomDeck } from '../../types/custom-deck'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { DeckCreateDialog } from '../../components/custom-decks/DeckCreateDialog'
import { DeckGrid } from '../../components/custom-decks/DeckGrid'
import { DeckSheet } from '../../components/custom-decks/DeckSheet'
import { useActivateStudyDeck } from '../../hooks/useActivateStudyDeck'
import { useCustomDeckMutations } from '../../hooks/useCustomDeckMutations'
import { useCustomDecks } from '../../hooks/useCustomDecks'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/custom/')({
  component: CustomDecksPage,
})

const GUEST_ID = 'guest'

function CustomDecksPage() {
  const userId = useAuthStore(state => state.userId)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const effectiveUserId = userId ?? GUEST_ID

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data: decks = [], isLoading } = useCustomDecks(effectiveUserId)
  const mutations = useCustomDeckMutations(effectiveUserId)
  const activateMutation = useActivateStudyDeck(effectiveUserId)

  const selectedDeck = decks.find(d => d.id === selectedDeckId) ?? null

  function handleCreateDeck(data: { title: string, description?: string }) {
    mutations.createDeck.mutate(data, {
      onSuccess: (deck: CustomDeck) => {
        setShowCreateDialog(false)
        setSelectedDeckId(deck.id)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-4xl mx-auto flex flex-col gap-6">
      <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight">
        MY DECKS
      </h1>

      {!isAuthenticated && (
        <p className="text-xs text-muted-foreground border border-border/30 px-3 py-2">
          💾 Dữ liệu được lưu trên thiết bị này.
          {' '}
          <a href="/auth/login" className="underline text-primary">Đăng nhập</a>
          {' '}
          để sao lưu và đồng bộ.
        </p>
      )}

      <DeckGrid
        decks={decks}
        selectedDeckId={selectedDeckId}
        onSelectDeck={id => setSelectedDeckId(prev => prev === id ? null : id)}
        onNewDeck={() => setShowCreateDialog(true)}
        onStudy={deck => activateMutation.mutate(deck)}
        onToggleActive={deckId => mutations.toggleActive.mutate(deckId)}
        onDeleteDeck={(deckId) => {
          if (selectedDeckId === deckId)
            setSelectedDeckId(null)
          mutations.deleteDeck.mutate(deckId)
        }}
      />

      <DeckSheet
        deck={selectedDeck}
        userId={effectiveUserId}
        onClose={() => setSelectedDeckId(null)}
      />

      <DeckCreateDialog
        open={showCreateDialog}
        isPending={mutations.createDeck.isPending}
        onSave={handleCreateDeck}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  )
}
