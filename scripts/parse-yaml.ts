import type { DatasetConfig } from '../src/types/dataset'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { load } from 'js-yaml'

interface RawVocabEntry {
  id: [number, number]
  edition?: number[]
  kanji: string | null
  kana: string
  romaji: string
  meaning: { en: string, vi: string, fr?: string }
  pos: string[]
  jlpt: number | null
  examples: Array<{ ja: string, en: string, vi: string, fr?: string }>
  lesson_number: number
}

interface YamlLesson {
  key: string
  id: number
}

interface YamlDoc {
  languages: Record<string, string>
  lessons: YamlLesson[]
  [lessonKey: string]: unknown
}

interface YamlExample {
  ja: string
  en: string
  vi: string
  fr?: string
}

interface YamlEntry {
  id: [number, number] | number[]
  edition?: number[]
  kanji?: string | null
  kana: string
  romaji: string
  meaning: { en: string, vi: string, fr?: string }
  examples?: YamlExample[]
}

export async function run(yamlPath: string, outputPath: string, config: DatasetConfig): Promise<void> {
  let doc: YamlDoc
  try {
    const raw = readFileSync(yamlPath, 'utf-8')
    doc = load(raw) as YamlDoc
  }
  catch (err) {
    process.stderr.write(`PARSE_ERROR: failed to read or parse YAML at ${yamlPath}\n${String(err)}\n`)
    process.exit(1)
  }

  if (!doc.languages) {
    process.stderr.write(`PARSE_ERROR: missing required 'languages' block in ${yamlPath}\n`)
    process.exit(1)
  }

  const [rangeStart, rangeEnd] = config.lesson_range
  const entries: RawVocabEntry[] = []

  for (const lesson of doc.lessons) {
    const lessonId = lesson.id
    if (lessonId < rangeStart || lessonId > rangeEnd)
      continue

    const lessonEntries = doc[lesson.key] as YamlEntry[] | undefined
    if (!lessonEntries)
      continue

    // Filter by edition if config specifies one
    const editionFilter = config.edition_filter
    const filtered = editionFilter
      ? lessonEntries.filter((entry) => {
          if (!entry.edition)
            return true // no edition tag → include always
          return entry.edition.some(e => editionFilter.includes(e))
        })
      : lessonEntries

    // Sort by id[1] (index within lesson)
    const sorted = [...filtered].sort((a, b) => (a.id[1] ?? 0) - (b.id[1] ?? 0))

    for (const entry of sorted) {
      entries.push({
        id: [entry.id[0], entry.id[1]],
        edition: entry.edition,
        kanji: entry.kanji ?? null,
        kana: entry.kana,
        romaji: entry.romaji,
        meaning: {
          en: entry.meaning.en,
          vi: entry.meaning.vi,
          ...(entry.meaning.fr ? { fr: entry.meaning.fr } : {}),
        },
        pos: [],
        jlpt: null,
        examples: (entry.examples ?? []).map(ex => ({
          ja: ex.ja,
          en: ex.en,
          vi: ex.vi,
          ...(ex.fr ? { fr: ex.fr } : {}),
        })),
        lesson_number: lessonId,
      })
    }
  }

  writeFileSync(outputPath, JSON.stringify(entries, null, 2), 'utf-8')
}
