import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
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
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-4xl mx-auto flex flex-col gap-6">
      <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight">
        MY DECKS
      </h1>
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
