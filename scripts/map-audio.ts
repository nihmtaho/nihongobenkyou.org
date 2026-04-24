import type { DatasetConfig } from '../src/types/dataset'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

interface EntryWithId {
  vocab_id: string
  kanji: string | null
  kana: string
  [key: string]: unknown
}

interface EntryWithAudio extends EntryWithId {
  audio_filename: string | null
}

export async function run(inputPath: string, outputPath: string, config: DatasetConfig): Promise<void> {
  const entries: EntryWithId[] = JSON.parse(readFileSync(inputPath, 'utf-8'))

  const hasJitendex = config.jitendex_file && existsSync(config.jitendex_file)

  const withAudio: EntryWithAudio[] = entries.map((entry) => {
    // NOTE: Jitendex audio mapping is a future enhancement; without the file all entries get null
    const audio_filename = hasJitendex ? null : null
    return { ...entry, audio_filename }
  })

  writeFileSync(outputPath, JSON.stringify(withAudio, null, 2), 'utf-8')
}
