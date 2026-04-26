import type { CustomVocabItem } from '../../types/custom-deck'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { fetchDeckByShareCode, importSharedDeck } from '../../api/custom-decks'
import { fetchWords } from '../../api/custom-vocabulary'
import { SharedDeckView } from '../../components/custom-decks/SharedDeckView'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/custom/shared/$shareCode')({
  component: SharedDeckPage,
})

function SharedDeckPage() {
  const { shareCode } = Route.useParams()
  const { userId, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [isImporting, setIsImporting] = useState(false)

  const { data: deck, isLoading: deckLoading } = useQuery({
    queryKey: ['shared-deck', shareCode],
    queryFn: () => fetchDeckByShareCode(shareCode),
    retry: 0,
  })

  const { data: words = [], isLoading: wordsLoading } = useQuery<CustomVocabItem[]>({
    queryKey: ['shared-deck-words', deck?.id],
    queryFn: () => fetchWords(deck!.id),
    enabled: !!deck?.id,
  })

  async function handleImport() {
    if (!userId)
      return
    setIsImporting(true)
    try {
      await importSharedDeck(shareCode, userId)
      navigate({ to: '/custom' })
    }
    catch {
      setIsImporting(false)
    }
  }

  return (
    <SharedDeckView
      deck={deck ?? null}
      words={words}
      isLoading={deckLoading || (!!deck && wordsLoading)}
      onImport={isAuthenticated ? handleImport : undefined}
      isImporting={isImporting}
    />
  )
}
