import type { DatasetConfig, LessonMeta } from '../src/types/dataset'
import type { Passage } from '../src/types/passages'
import type { PitchType, VocabItem } from '../src/types/vocabulary'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export interface LessonFile {
  vocabulary: VocabItem[]
  passages: Passage[]
}

interface ValidatedEntry {
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

// Small kana that do not count as separate morae (combined with preceding character)
const SMALL_KANA = new Set(['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'っ', 'ゃ', 'ゅ', 'ょ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ッ', 'ャ', 'ュ', 'ョ'])

function countMorae(kana: string): number {
  let count = 0
  for (const char of kana) {
    if (!SMALL_KANA.has(char))
      count++
  }
  return count
}

function derivePitchType(pitch_pattern: number | null, kana: string): PitchType {
  if (pitch_pattern === null)
    return null
  if (pitch_pattern === 0)
    return 'heiban'
  if (pitch_pattern === 1)
    return 'atamadaka'
  const moraCount = countMorae(kana)
  if (pitch_pattern === moraCount)
    return 'odaka'
  return 'nakadaka'
}

function zeroPad(n: number): string {
  return String(n).padStart(2, '0')
}

export async function run(inputPath: string, config: DatasetConfig, passageMap: Map<number, Passage[]> = new Map()): Promise<void> {
  const entries: ValidatedEntry[] = JSON.parse(readFileSync(inputPath, 'utf-8'))

  const grouped = new Map<number, ValidatedEntry[]>()
  for (const entry of entries) {
    const group = grouped.get(entry.lesson_number) ?? []
    group.push(entry)
    grouped.set(entry.lesson_number, group)
  }

  const outputBase = path.join(process.cwd(), 'public', 'data', config.book_code_prefix)
  if (!existsSync(outputBase))
    mkdirSync(outputBase, { recursive: true })

  const lessonMetas: LessonMeta[] = []
  const [rangeStart, rangeEnd] = config.lesson_range

  for (let lessonNum = rangeStart; lessonNum <= rangeEnd; lessonNum++) {
    const lessonEntries = grouped.get(lessonNum) ?? []

    const vocabItems: VocabItem[] = lessonEntries.map(entry => ({
      vocab_id: entry.vocab_id,
      word: entry.kanji,
      reading: entry.kana,
      romaji: entry.romaji,
      meaning_en: entry.meaning.en,
      meaning_vi: entry.meaning.vi,
      pitch_pattern: entry.pitch_pattern,
      pitch_type: derivePitchType(entry.pitch_pattern, entry.kana),
      audio_filename: entry.audio_filename,
      pos: entry.pos,
      jlpt_level: entry.jlpt ?? config.jlpt_level,
      book_source: config.id,
      lesson_number: lessonNum,
      examples: entry.examples,
      tags: [],
      deprecated: false,
    }))

    const lessonFile = path.join(outputBase, `lesson-${zeroPad(lessonNum)}.json`)
    const lessonOutput: LessonFile = {
      vocabulary: vocabItems,
      passages: passageMap.get(lessonNum) ?? [],
    }
    writeFileSync(lessonFile, JSON.stringify(lessonOutput, null, 2), 'utf-8')

    lessonMetas.push({
      lesson_id: `${config.id}_${lessonNum}`,
      book_source: config.id,
      lesson_number: lessonNum,
      title: `Bài ${lessonNum}`,
      vocab_count: vocabItems.length,
    })
  }

  const metaFile = path.join(outputBase, 'lessons-meta.json')
  writeFileSync(metaFile, JSON.stringify(lessonMetas, null, 2), 'utf-8')
}
