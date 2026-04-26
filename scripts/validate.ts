import type { DatasetConfig } from '../src/types/dataset'
import type { Passage } from '../src/types/passages'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

interface EntryWithAudio {
  vocab_id: string
  kanji: string | null
  kana: string
  romaji: string
  meaning: { en: string, vi: string, fr?: string }
  pos: string[]
  jlpt: number | null
  examples: Array<{ ja: string, en: string, vi: string }>
  lesson_number: number
  pitch_pattern: number | null
  audio_filename: string | null
}

interface ValidationError {
  index: number
  field: string
  value: unknown
  entry: EntryWithAudio
}

export function validateEntries(entries: EntryWithAudio[]): ValidationError[] {
  const errors: ValidationError[] = []
  const seenIds = new Map<string, number>()

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    if (!entry.kana || entry.kana.trim() === '') {
      errors.push({ index: i, field: 'kana', value: entry.kana, entry })
    }

    if (!entry.meaning?.en || entry.meaning.en.trim() === '') {
      errors.push({ index: i, field: 'meaning.en', value: entry.meaning?.en, entry })
    }

    if (!entry.meaning?.vi || entry.meaning.vi.trim() === '') {
      errors.push({ index: i, field: 'meaning.vi', value: entry.meaning?.vi, entry })
    }

    if (entry.jlpt !== null && entry.jlpt !== undefined) {
      const level = entry.jlpt
      if (!Number.isInteger(level) || level < 1 || level > 5) {
        errors.push({ index: i, field: 'jlpt', value: level, entry })
      }
    }

    if (seenIds.has(entry.vocab_id)) {
      errors.push({ index: i, field: 'vocab_id', value: entry.vocab_id, entry })
    }
    else {
      seenIds.set(entry.vocab_id, i)
    }

    if (entry.examples.length > 0) {
      for (let j = 0; j < entry.examples.length; j++) {
        const ex = entry.examples[j]
        if (!ex.ja || ex.ja.trim() === '')
          errors.push({ index: i, field: `examples[${j}].ja`, value: ex.ja, entry })
        if (!ex.en || ex.en.trim() === '')
          errors.push({ index: i, field: `examples[${j}].en`, value: ex.en, entry })
        if (!ex.vi || ex.vi.trim() === '')
          errors.push({ index: i, field: `examples[${j}].vi`, value: ex.vi, entry })
      }
    }
  }

  return errors
}

interface PassageValidationError {
  passage_id: string
  field: string
  message: string
}

export function validatePassages(passages: Passage[], knownVocabIds: Set<string>): PassageValidationError[] {
  const errors: PassageValidationError[] = []

  for (const passage of passages) {
    for (const vocabId of passage.vocab_ids) {
      if (!knownVocabIds.has(vocabId)) {
        errors.push({ passage_id: passage.passage_id, field: 'vocab_ids', message: `Unknown vocab_id: ${vocabId}` })
      }
    }

    for (let i = 0; i < passage.questions.length; i++) {
      const q = passage.questions[i]
      if (q.options.length < 2 || q.options.length > 4) {
        errors.push({ passage_id: passage.passage_id, field: `questions[${i}].options`, message: `options length must be 2–4, got ${q.options.length}` })
      }
      if (q.correct_index < 0 || q.correct_index >= q.options.length) {
        errors.push({ passage_id: passage.passage_id, field: `questions[${i}].correct_index`, message: `correct_index ${q.correct_index} out of bounds for options length ${q.options.length}` })
      }
    }

    if (passage.questions.length < 2 || passage.questions.length > 3) {
      errors.push({ passage_id: passage.passage_id, field: 'questions', message: `questions length must be 2–3, got ${passage.questions.length}` })
    }
  }

  return errors
}

export async function run(inputPath: string, outputPath: string, _config: DatasetConfig): Promise<void> {
  const entries: EntryWithAudio[] = JSON.parse(readFileSync(inputPath, 'utf-8'))
  const errors = validateEntries(entries)

  if (errors.length > 0) {
    for (const err of errors) {
      process.stderr.write(`VALIDATION_ERROR: entry at index ${err.index}\n`)
      process.stderr.write(`  field: ${err.field}\n`)
      process.stderr.write(`  value: ${JSON.stringify(err.value)}\n`)
      process.stderr.write(`  entry: ${JSON.stringify(err.entry)}\n`)
      process.stderr.write('---\n')
    }
    process.stderr.write(`VALIDATION_FAILED: ${errors.length} error(s) found\n`)
    process.exit(1)
  }

  writeFileSync(outputPath, JSON.stringify(entries, null, 2), 'utf-8')
}
