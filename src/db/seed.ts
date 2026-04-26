import type { LessonMeta, Manifest } from '../types/dataset'
import type { VocabItem } from '../types/vocabulary'
import { db } from './schema'

export class SeedError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'SeedError'
    if (cause)
      this.cause = cause
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok)
    throw new SeedError(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export async function seedDatabase(): Promise<void> {
  let manifest: Manifest
  try {
    manifest = await fetchJson<Manifest>('/data/manifest.json')
  }
  catch (err) {
    if (err instanceof SeedError)
      throw err
    throw new SeedError('Failed to fetch manifest.json', err)
  }

  const dataset = manifest.datasets[0]
  if (!dataset)
    throw new SeedError('manifest.json contains no datasets')

  const storedChecksum = await db.settings.get('manifest_checksum')
  if (storedChecksum?.value === dataset.checksum)
    return

  const vocabItems: VocabItem[] = []
  const lessonMetas: LessonMeta[] = []

  try {
    for (const file of dataset.files) {
      const items = await fetchJson<VocabItem[]>(`/data/${dataset.book_code_prefix}/${file.filename}`)
      vocabItems.push(...items)
    }

    // Derive lesson metadata from vocab items — group by lesson_number
    const lessonMap = new Map<number, LessonMeta>()
    for (const v of vocabItems) {
      if (!lessonMap.has(v.lesson_number)) {
        lessonMap.set(v.lesson_number, {
          lesson_id: `${v.book_source}:${v.lesson_number}`,
          book_source: v.book_source,
          lesson_number: v.lesson_number,
          title: '',
          vocab_count: 0,
        })
      }
      lessonMap.get(v.lesson_number)!.vocab_count++
    }
    lessonMetas.push(...Array.from(lessonMap.values()).sort((a, b) => a.lesson_number - b.lesson_number))
  }
  catch (err) {
    if (err instanceof SeedError)
      throw err
    throw new SeedError('Failed to fetch lesson files', err)
  }

  try {
    await db.transaction('rw', [db.vocabulary, db.lessons, db.settings], async () => {
      await db.vocabulary.clear()
      await db.lessons.clear()
      await db.vocabulary.bulkPut(vocabItems)
      if (lessonMetas.length > 0)
        await db.lessons.bulkPut(lessonMetas)
      await db.settings.put({ key: 'manifest_checksum', value: dataset.checksum })
    })
  }
  catch (err) {
    throw new SeedError('Seed transaction failed — database may be in a partial state', err)
  }
}
