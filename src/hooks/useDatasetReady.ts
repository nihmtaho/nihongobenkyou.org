import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { seedDatasetLazy } from '../db/seed'
import { datasets } from '../lib/datasets.config'

export function useDatasetReady(datasetId: string) {
  const dataset = datasets.find(d => d.id === datasetId)
  const prefix = dataset?.book_code_prefix ?? ''
  const isKanji = dataset?.type === 'kanji'
  const queryClient = useQueryClient()

  const { isLoading, error, data } = useQuery({
    queryKey: ['dataset-ready', prefix],
    queryFn: () => seedDatasetLazy(prefix),
    staleTime: Infinity,
    retry: 2,
    enabled: !!prefix && !isKanji,
  })

  useEffect(() => {
    if (data === 'seeded') {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      queryClient.invalidateQueries({ queryKey: ['book-progress'] })
    }
  }, [data, queryClient])

  if (isKanji) {
    return { isReady: true, isLoading: false, error: null }
  }

  return {
    isReady: data === 'up-to-date' || data === 'seeded',
    isLoading,
    error,
  }
}
