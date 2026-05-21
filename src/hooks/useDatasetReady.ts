import { useQuery } from '@tanstack/react-query'

import { seedDatasetLazy } from '../db/seed'
import { datasets } from '../lib/datasets.config'

export function useDatasetReady(datasetId: string) {
  const dataset = datasets.find(d => d.id === datasetId)
  const prefix = dataset?.book_code_prefix ?? ''

  const { isLoading, error, data } = useQuery({
    queryKey: ['dataset-ready', prefix],
    queryFn: () => seedDatasetLazy(prefix),
    staleTime: Infinity,
    retry: 2,
    enabled: !!prefix,
  })

  return {
    isReady: data === 'up-to-date' || data === 'seeded',
    isLoading,
    error,
  }
}
