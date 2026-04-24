import type { DatasetConfig } from '../src/types/dataset'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

interface RawVocabEntry {
  id: [number, number]
  kanji: string | null
  kana: string
  romaji: string
  meaning: { en: string, vi: string, fr?: string }
  pos: string[]
  jlpt: number | null
  examples: Array<{ ja: string, en: string, vi: string }>
  lesson_number: number
}

interface PitchedEntry extends RawVocabEntry {
  pitch_pattern: number | null
}

function buildKanjiumMap(filePath: string): Map<string, number> {
  const map = new Map<string, number>()
  const lines = readFileSync(filePath, 'utf-8').split('\n')
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 3)
      continue
    const [kanji, kana, patternStr] = parts
    const pattern = Number.parseInt(patternStr.split(',')[0] ?? patternStr, 10)
    if (Number.isNaN(pattern))
      continue
    if (kanji && kanji.trim())
      map.set(`${kanji.trim()}:${kana.trim()}`, pattern)
    map.set(kana.trim(), pattern)
  }
  return map
}

export async function run(inputPath: string, outputPath: string, config: DatasetConfig): Promise<void> {
  const entries: RawVocabEntry[] = JSON.parse(readFileSync(inputPath, 'utf-8'))

  const hasKanjium = config.kanjium_file && existsSync(config.kanjium_file)
  const kanjiumMap = hasKanjium ? buildKanjiumMap(config.kanjium_file!) : null

  const pitched: PitchedEntry[] = entries.map((entry) => {
    let pitch_pattern: number | null = null
    if (kanjiumMap) {
      const compositeKey = entry.kanji ? `${entry.kanji}:${entry.kana}` : null
      pitch_pattern = (compositeKey && kanjiumMap.get(compositeKey) !== undefined)
        ? kanjiumMap.get(compositeKey)!
        : (kanjiumMap.get(entry.kana) ?? null)
    }
    return { ...entry, pitch_pattern }
  })

  writeFileSync(outputPath, JSON.stringify(pitched, null, 2), 'utf-8')
}
