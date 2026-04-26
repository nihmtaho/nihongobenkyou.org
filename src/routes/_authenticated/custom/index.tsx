import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { DeckEditor } from '../../../components/custom-decks/DeckEditor'
import { DeckList } from '../../../components/custom-decks/DeckList'
import { useCustomDeckMutations } from '../../../hooks/useCustomDeckMutations'
import { useCustomDecks } from '../../../hooks/useCustomDecks'
import { useAuthStore } from '../../../stores/authStore'

export const Route = createFileRoute('/_authenticated/custom/')({
  component: CustomDecksPage,
})

function CustomDecksPage() {
  const { userId } = useAuthStore()
  const navigate = useNavigate()
  const [showEditor, setShowEditor] = useState(false)

  const { data: decks = [], isLoading } = useCustomDecks(userId ?? '')
  const mutations = useCustomDeckMutations(userId ?? '')

  function handleSave(data: { title: string, description?: string }) {
    mutations.createDeck.mutate(data, {
      onSuccess: () => setShowEditor(false),
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <DeckList
        decks={decks}
        onNewDeck={() => setShowEditor(true)}
        onSelectDeck={deckId => navigate({ to: '/custom/$deckId', params: { deckId } })}
      />

      {showEditor && (
        <DeckEditor
          onSave={handleSave}
          onClose={() => setShowEditor(false)}
          isPending={mutations.createDeck.isPending}
        />
      )}
    </div>
  )
}
