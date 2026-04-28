import type { KanjiItem } from '../types/kanji'
import { useQuery } from '@tanstack/react-query'
import { getKanji } from '../db/kanji'

export function useKanji(char: string) {
  return useQuery<KanjiItem | undefined>({
    queryKey: ['kanji', char],
    queryFn: () => getKanji(char),
    staleTime: Infinity,
    enabled: !!char,
  })
}
