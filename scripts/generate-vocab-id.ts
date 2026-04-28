import type { DatasetConfig } from '../src/types/dataset'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { generateVocabId } from '../src/lib/vocab-id'

interface PitchedEntry {
  id: [number, number]
  edition?: number[]
  kanji: string | null
  kana: string
  romaji: string
  meaning: { en: string, vi: string, fr?: string }
  pos: string[]
  jlpt: number | null
  examples: Array<{ ja: string, en: string, vi: string }>
  lesson_number: number
  pitch_pattern: number | null
}

interface EntryWithId extends PitchedEntry {
  vocab_id: string
}

export async function run(inputPath: string, outputPath: string, config: DatasetConfig): Promise<void> {
  const entries: PitchedEntry[] = JSON.parse(readFileSync(inputPath, 'utf-8'))

  const seen = new Map<string, PitchedEntry>()
  const withIds: EntryWithId[] = []
  let hasDuplicates = false

  for (const entry of entries) {
    const vocab_id = generateVocabId(
      config.book_code_prefix,
      config.id,
      entry.lesson_number,
      entry.kanji,
      entry.kana,
    )

    if (seen.has(vocab_id)) {
      process.stderr.write(`DUPLICATE_VOCAB_ID: ${vocab_id}\n`)
      process.stderr.write(`  first:  ${JSON.stringify(seen.get(vocab_id))}\n`)
      process.stderr.write(`  second: ${JSON.stringify(entry)}\n`)
      hasDuplicates = true
    }
    else {
      seen.set(vocab_id, entry)
    }

    withIds.push({ ...entry, vocab_id })
  }

  if (hasDuplicates)
    process.exit(1)

  writeFileSync(outputPath, JSON.stringify(withIds, null, 2), 'utf-8')
}
