import type { LessonMeta, Manifest } from '../types/dataset'
import type { KanjiItem } from '../types/kanji'
import type { Passage } from '../types/passages'
import type { VocabItem } from '../types/vocabulary'
import { bookCodePrefixToSource } from '../lib/datasets.config'
import { updateStore } from '../stores/updateStore'
import { db } from './schema'

interface LessonFile {
  vocabulary: VocabItem[]
  passages: Passage[]
}

function parseLessonFile(raw: unknown): LessonFile {
  if (Array.isArray(raw)) {
    return { vocabulary: raw as VocabItem[], passages: [] }
  }
  const file = raw as LessonFile
  return { vocabulary: file.vocabulary ?? [], passages: file.passages ?? [] }
}

export class SeedError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'SeedError'
    if (cause)
      this.cause = cause
  }
}

function buildLessonMetas(vocabItems: VocabItem[]): LessonMeta[] {
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
  return Array.from(lessonMap.values()).sort((a, b) => a.lesson_number - b.lesson_number)
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok)
    throw new SeedError(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export async function invalidateLessonCache(prefix: string): Promise<void> {
  if (!('caches' in globalThis))
    return
  const cache = await caches.open('lessons-cache')
  const keys = await cache.keys()
  await Promise.all(
    keys
      .filter(req => req.url.includes(`/data/${prefix}/`))
      .map(req => cache.delete(req)),
  )
}

export async function seedDatabase(
  onProgress?: (file: string, index: number, total: number) => void,
): Promise<'up-to-date' | 'seeded'> {
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

  const [storedChecksum, storedVersion] = await Promise.all([
    db.settings.get('manifest_checksum'),
    db.settings.get('dataset_version'),
  ])

  if (storedChecksum?.value === dataset.checksum && storedVersion?.value === dataset.version)
    return 'up-to-date'

  await invalidateLessonCache(dataset.book_code_prefix)

  const vocabItems: VocabItem[] = []
  const passages: Passage[] = []
  const lessonMetas: LessonMeta[] = []

  try {
    for (let i = 0; i < dataset.files.length; i++) {
      const file = dataset.files[i]
      onProgress?.(file.filename, i + 1, dataset.files.length)
      const raw = await fetchJson<unknown>(`/data/${dataset.book_code_prefix}/${file.filename}`)
      const lessonFile = parseLessonFile(raw)
      vocabItems.push(...lessonFile.vocabulary)
      passages.push(...lessonFile.passages)
    }

    lessonMetas.push(...buildLessonMetas(vocabItems))
  }
  catch (err) {
    if (err instanceof SeedError)
      throw err
    throw new SeedError('Failed to fetch lesson files', err)
  }

  try {
    await db.transaction('rw', [db.vocabulary, db.lessons, db.passages, db.settings], async () => {
      await db.vocabulary.clear()
      await db.lessons.clear()
      await db.passages.clear()
      await db.vocabulary.bulkPut(vocabItems)
      if (lessonMetas.length > 0)
        await db.lessons.bulkPut(lessonMetas)
      if (passages.length > 0)
        await db.passages.bulkPut(passages)
      await db.settings.put({ key: 'manifest_checksum', value: dataset.checksum })
      await db.settings.put({ key: 'dataset_version', value: dataset.version })
    })
  }
  catch (err) {
    throw new SeedError('Seed transaction failed — database may be in a partial state', err)
  }

  return 'seeded'
}

export async function seedDatasetLazy(
  bookPrefix: string,
  onProgress?: (file: string, index: number, total: number) => void,
): Promise<'up-to-date' | 'seeded'> {
  let manifest: Manifest
  try {
    manifest = await fetchJson<Manifest>('/data/manifest.json')
  }
  catch (err) {
    if (err instanceof SeedError)
      throw err
    throw new SeedError('Failed to fetch manifest.json', err)
  }

  const dataset = manifest.datasets.find(d => d.book_code_prefix === bookPrefix)
  if (!dataset)
    throw new SeedError(`No dataset found for prefix: ${bookPrefix}`)

  const [seededFlag, storedVersion] = await Promise.all([
    db.settings.get(`dataset_seeded_${bookPrefix}`),
    db.settings.get(`dataset_version_${bookPrefix}`),
  ])

  if (seededFlag?.value === true && storedVersion?.value === dataset.version)
    return 'up-to-date'

  await invalidateLessonCache(bookPrefix)

  const bookSource = bookCodePrefixToSource[bookPrefix]
  if (!bookSource)
    throw new SeedError(`No book source mapping for prefix: ${bookPrefix}`)

  const vocabItems: VocabItem[] = []
  const passages: Passage[] = []
  const checksums: Record<string, string> = {}

  try {
    for (let i = 0; i < dataset.files.length; i++) {
      const file = dataset.files[i]
      onProgress?.(file.filename, i + 1, dataset.files.length)
      const raw = await fetchJson<unknown>(`/data/${bookPrefix}/${file.filename}`)
      const lessonFile = parseLessonFile(raw)
      vocabItems.push(...lessonFile.vocabulary)
      passages.push(...lessonFile.passages)
      checksums[file.filename] = file.checksum
    }
  }
  catch (err) {
    if (err instanceof SeedError)
      throw err
    throw new SeedError('Failed to fetch lesson files', err)
  }

  const lessonMetas = buildLessonMetas(vocabItems)

  try {
    await db.transaction('rw', [db.vocabulary, db.lessons, db.passages, db.settings], async () => {
      await db.vocabulary.where('book_source').equals(bookSource).delete()
      await db.lessons.where('book_source').equals(bookSource).delete()
      await db.passages.where('book_source').equals(bookSource).delete()
      await db.vocabulary.bulkPut(vocabItems)
      if (lessonMetas.length > 0)
        await db.lessons.bulkPut(lessonMetas)
      if (passages.length > 0)
        await db.passages.bulkPut(passages)
      await db.settings.put({ key: `dataset_seeded_${bookPrefix}`, value: true })
      await db.settings.put({ key: `dataset_version_${bookPrefix}`, value: dataset.version })
      await db.settings.put({ key: `lesson_checksums_${bookPrefix}`, value: checksums })
    })
  }
  catch (err) {
    throw new SeedError('Seed transaction failed — database may be in a partial state', err)
  }

  return 'seeded'
}

const CONCURRENCY = 3

export async function updateChangedFiles(
  manifest: Manifest,
  onProgress?: (file: string, completed: number, total: number) => void,
): Promise<void> {
  for (const dataset of manifest.datasets) {
    const seededFlag = await db.settings.get(`dataset_seeded_${dataset.book_code_prefix}`)
    if (!seededFlag?.value)
      continue

    const bookSource = bookCodePrefixToSource[dataset.book_code_prefix]
    if (!bookSource)
      continue

    const storedChecksums = ((await db.settings.get(`lesson_checksums_${dataset.book_code_prefix}`))?.value ?? {}) as Record<string, string>
    const changedFiles = dataset.files.filter(f => storedChecksums[f.filename] !== f.checksum)

    if (changedFiles.length === 0)
      continue

    let completed = 0
    const updatedChecksums = { ...storedChecksums }

    for (let i = 0; i < changedFiles.length; i += CONCURRENCY) {
      const batch = changedFiles.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map(async (fileEntry) => {
        const raw = await fetchJson<unknown>(`/data/${dataset.book_code_prefix}/${fileEntry.filename}`)
        const lessonFile = parseLessonFile(raw)
        const lessonNumber = Number(fileEntry.filename.replace('lesson-', '').replace('.json', ''))

        await db.transaction('rw', [db.vocabulary, db.lessons, db.passages, db.settings], async () => {
          await db.vocabulary.where('[book_source+lesson_number]').equals([bookSource, lessonNumber]).delete()
          await db.passages.where('[book_source+lesson_number]').equals([bookSource, lessonNumber]).delete()

          if (lessonFile.vocabulary.length > 0)
            await db.vocabulary.bulkPut(lessonFile.vocabulary)
          if (lessonFile.passages.length > 0)
            await db.passages.bulkPut(lessonFile.passages)

          await db.lessons.delete(`${bookSource}:${lessonNumber}`)
          if (lessonFile.vocabulary.length > 0) {
            await db.lessons.put({
              lesson_id: `${bookSource}:${lessonNumber}`,
              book_source: bookSource,
              lesson_number: lessonNumber,
              title: '',
              vocab_count: lessonFile.vocabulary.length,
            })
          }
        })

        updatedChecksums[fileEntry.filename] = fileEntry.checksum
        completed++
        onProgress?.(fileEntry.filename, completed, changedFiles.length)
      }))
    }

    await db.settings.put({ key: `lesson_checksums_${dataset.book_code_prefix}`, value: updatedChecksums })
    await db.settings.put({ key: `dataset_version_${dataset.book_code_prefix}`, value: dataset.version })
  }

  if (manifest.app_version) {
    await db.settings.put({ key: 'app_version', value: manifest.app_version })
  }
}

export async function seedKanji(): Promise<'up-to-date' | 'seeded' | 'skipped'> {
  let manifest: Manifest
  try {
    manifest = await fetchJson<Manifest>('/data/manifest.json')
  }
  catch {
    return 'skipped'
  }

  if (!manifest.kanji)
    return 'skipped'

  const [storedChecksum, storedVersion] = await Promise.all([
    db.settings.get('kanji_n5_checksum'),
    db.settings.get('kanji_n5_version'),
  ])

  if (storedChecksum?.value === manifest.kanji.n5_checksum && storedVersion?.value === manifest.kanji.version)
    return 'up-to-date'

  await invalidateLessonCache('kanji')

  let kanjiItems: KanjiItem[]
  try {
    kanjiItems = await fetchJson<KanjiItem[]>('/data/kanji/n5-kanji.json')
  }
  catch (err) {
    throw new SeedError('Failed to fetch n5-kanji.json', err)
  }

  try {
    await db.transaction('rw', [db.kanji, db.settings], async () => {
      await db.kanji.clear()
      await db.kanji.bulkPut(kanjiItems)
      await db.settings.put({ key: 'kanji_n5_checksum', value: manifest.kanji!.n5_checksum })
      await db.settings.put({ key: 'kanji_n5_version', value: manifest.kanji!.version })
    })
  }
  catch (err) {
    throw new SeedError('Kanji seed transaction failed — database may be in a partial state', err)
  }

  return 'seeded'
}

export async function checkForUpdates(): Promise<void> {
  let manifest: Manifest
  try {
    manifest = await fetchJson<Manifest>('/data/manifest.json')
  }
  catch {
    return
  }

  await db.settings.put({ key: 'last_update_check', value: new Date().toISOString() })

  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined)
  const swWaiting = !!reg?.waiting

  // Migration: if old manifest_checksum exists but new seeded flags don't, initialize them
  // so the next update check will use per-file checksums instead
  const oldChecksum = await db.settings.get('manifest_checksum')
  if (oldChecksum?.value) {
    for (const dataset of manifest.datasets) {
      const alreadyMigrated = await db.settings.get(`dataset_seeded_${dataset.book_code_prefix}`)
      if (!alreadyMigrated) {
        await db.settings.put({ key: `dataset_seeded_${dataset.book_code_prefix}`, value: true })
      }
    }
  }

  let datasetOutdated = false
  for (const dataset of manifest.datasets) {
    const seededFlag = await db.settings.get(`dataset_seeded_${dataset.book_code_prefix}`)
    if (!seededFlag?.value)
      continue

    const storedChecksums = ((await db.settings.get(`lesson_checksums_${dataset.book_code_prefix}`))?.value ?? {}) as Record<string, string>
    if (dataset.files.some(f => storedChecksums[f.filename] !== f.checksum)) {
      datasetOutdated = true
      break
    }
  }

  const storedKanjiChecksum = await db.settings.get('kanji_n5_checksum')
  const kanjiOutdated = !!manifest.kanji && storedKanjiChecksum?.value !== manifest.kanji.n5_checksum

  if (swWaiting || datasetOutdated || kanjiOutdated) {
    updateStore.getState().startUpdate(swWaiting, datasetOutdated, kanjiOutdated, manifest)
  }
}
