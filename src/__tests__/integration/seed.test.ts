import type { Manifest } from '../../types/dataset'
import type { VocabItem } from '../../types/vocabulary'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { checkForUpdates, invalidateLessonCache, seedDatabase, seedDatasetLazy, SeedError, seedKanji, updateChangedFiles } from '../../db/seed'
import { updateStore } from '../../stores/updateStore'

const SAMPLE_LESSON_FILE = sampleVocabulary.filter(v => v.lesson_number === 1)

const SAMPLE_MANIFEST: Manifest = {
  schema_version: '1.0',
  built_at: '2026-04-18T00:00:00.000Z',
  built_by: 'build:dataset',
  built_from: 'minna_shokyuu_1',
  datasets: [
    {
      id: 'minna_shokyuu_1',
      version: '1.0.0',
      book_code_prefix: 'mnn1',
      lesson_count: 1,
      vocab_count: SAMPLE_LESSON_FILE.length,
      checksum: 'abc123checksum',
      files: [{ filename: 'lesson-01.json', size_bytes: 100, checksum: 'abc123' }],
    },
  ],
}

function mockFetch(manifest: Manifest, lessonData: VocabItem[]): void {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('manifest.json')) {
      return new Response(JSON.stringify(manifest), { status: 200 })
    }
    if (String(url).includes('lessons-meta.json')) {
      return new Response(JSON.stringify([]), { status: 404, statusText: 'Not Found' })
    }
    return new Response(JSON.stringify(lessonData), { status: 200 })
  }))
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await db.delete()
})

describe('seedDatabase', () => {
  it('seeds vocabulary entries from lesson files', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)

    await seedDatabase()

    const seeded = await db.vocabulary.toArray()
    expect(seeded.length).toBe(SAMPLE_LESSON_FILE.length)
    expect(seeded[0].vocab_id).toBe(SAMPLE_LESSON_FILE[0].vocab_id)
  })

  it('stores checksum in Dexie settings after seed', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)

    await seedDatabase()

    const stored = await db.settings.get('manifest_checksum')
    expect(stored?.value).toBe('abc123checksum')
  })

  it('skips re-seed when checksum matches', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    await seedDatabase()

    const fetchSpy = vi.fn(async (url: string) => {
      if (String(url).includes('manifest.json')) {
        return new Response(JSON.stringify(SAMPLE_MANIFEST), { status: 200 })
      }
      return new Response(JSON.stringify([]), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchSpy)

    await seedDatabase()

    // Only manifest.json should have been fetched on the second call
    const lessonFetches = fetchSpy.mock.calls.filter(c => !String(c[0]).includes('manifest.json'))
    expect(lessonFetches).toHaveLength(0)
  })

  it('re-seeds when checksum changes', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    await seedDatabase()

    const updatedManifest: Manifest = {
      ...SAMPLE_MANIFEST,
      datasets: [{ ...SAMPLE_MANIFEST.datasets[0], checksum: 'newchecksum' }],
    }
    mockFetch(updatedManifest, SAMPLE_LESSON_FILE)

    await seedDatabase()

    const stored = await db.settings.get('manifest_checksum')
    expect(stored?.value).toBe('newchecksum')
  })

  it('throws SeedError when manifest fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404, statusText: 'Not Found' })))

    await expect(seedDatabase()).rejects.toBeInstanceOf(SeedError)
  })

  it('stores dataset_version in Dexie settings after seed', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)

    await seedDatabase()

    const stored = await db.settings.get('dataset_version')
    expect(stored?.value).toBe('1.0.0')
  })

  it('re-seeds when version changes even if checksum is same', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    await seedDatabase()

    const updatedManifest: Manifest = {
      ...SAMPLE_MANIFEST,
      datasets: [{ ...SAMPLE_MANIFEST.datasets[0], version: '1.0.1' }],
    }
    mockFetch(updatedManifest, SAMPLE_LESSON_FILE)

    const result = await seedDatabase()

    expect(result).toBe('seeded')
    const stored = await db.settings.get('dataset_version')
    expect(stored?.value).toBe('1.0.1')
  })

  it('returns up-to-date when both checksum and version match', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    await seedDatabase()

    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    const result = await seedDatabase()

    expect(result).toBe('up-to-date')
  })

  it('does not clear srs_cards during re-seed', async () => {
    await db.srs_cards.put({
      userId: 'user1',
      cardId: 'mnn1_abc',
      cardType: 'vocab',
      deckId: null,
      state: 'review',
      stability: 1,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 1,
      lapses: 0,
      last_review: '2026-04-20',
      due: '2026-04-21',
      last_rating: 3,
      is_known: false,
      consecutive_correct: 0,
      pending_sync: false,
      updated_at: new Date().toISOString(),
    })

    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    await seedDatabase()

    const cards = await db.srs_cards.toArray()
    expect(cards).toHaveLength(1)
  })

  it('calls onProgress for each lesson file when seeding', async () => {
    const manifest: Manifest = {
      ...SAMPLE_MANIFEST,
      datasets: [{
        ...SAMPLE_MANIFEST.datasets[0],
        checksum: 'new-checksum',
        files: [
          { filename: 'lesson-01.json', size_bytes: 100, checksum: 'a' },
          { filename: 'lesson-02.json', size_bytes: 100, checksum: 'b' },
          { filename: 'lesson-03.json', size_bytes: 100, checksum: 'c' },
        ],
      }],
    }
    mockFetch(manifest, SAMPLE_LESSON_FILE)

    const calls: Array<[string, number, number]> = []
    await seedDatabase((file, index, total) => calls.push([file, index, total]))

    expect(calls).toHaveLength(3)
    expect(calls[0]).toEqual(['lesson-01.json', 1, 3])
    expect(calls[1]).toEqual(['lesson-02.json', 2, 3])
    expect(calls[2]).toEqual(['lesson-03.json', 3, 3])
  })

  it('does not call onProgress when already up-to-date', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    await db.settings.put({ key: 'manifest_checksum', value: 'abc123checksum' })
    await db.settings.put({ key: 'dataset_version', value: '1.0.0' })

    const onProgress = vi.fn()
    await seedDatabase(onProgress)

    expect(onProgress).not.toHaveBeenCalled()
  })
})

describe('invalidateLessonCache', () => {
  it('deletes matching cache entries for the given prefix', async () => {
    const deleted: string[] = []
    const mockCache = {
      keys: vi.fn(async () => [
        { url: 'http://localhost/data/mnn1/lesson-01.json' },
        { url: 'http://localhost/data/mnn1/lesson-02.json' },
        { url: 'http://localhost/data/kanji/n5-kanji.json' },
      ]),
      delete: vi.fn(async (req: { url: string }) => {
        deleted.push(req.url)
        return true
      }),
    }
    vi.stubGlobal('caches', { open: vi.fn(async () => mockCache) })

    await invalidateLessonCache('mnn1')

    expect(deleted).toEqual([
      'http://localhost/data/mnn1/lesson-01.json',
      'http://localhost/data/mnn1/lesson-02.json',
    ])
    expect(deleted).not.toContain('http://localhost/data/kanji/n5-kanji.json')
  })

  it('is a no-op when caches is not available', async () => {
    const hadCaches = 'caches' in globalThis
    const savedValue = (globalThis as Record<string, unknown>).caches
    delete (globalThis as Record<string, unknown>).caches
    try {
      await expect(invalidateLessonCache('mnn1')).resolves.toBeUndefined()
    }
    finally {
      if (hadCaches)
        (globalThis as Record<string, unknown>).caches = savedValue
    }
  })
})

const SAMPLE_KANJI_MANIFEST: Manifest = {
  ...SAMPLE_MANIFEST,
  kanji: {
    n5_checksum: 'kanjiChecksum123',
    n5_count: 80,
    generated_at: '2026-05-07T00:00:00.000Z',
    version: '1.0.0',
  },
}

const SAMPLE_KANJI_ITEMS = [{ char: '一', meanings: ['one'], readings_on: ['いち'], readings_kun: ['ひと'] }]

function mockFetchWithKanji(manifest: Manifest, lessonData: VocabItem[], kanjiData: unknown[]): void {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('manifest.json'))
      return new Response(JSON.stringify(manifest), { status: 200 })
    if (String(url).includes('n5-kanji.json'))
      return new Response(JSON.stringify(kanjiData), { status: 200 })
    return new Response(JSON.stringify(lessonData), { status: 200 })
  }))
}

describe('seedKanji', () => {
  it('seeds kanji and stores checksum and version', async () => {
    mockFetchWithKanji(SAMPLE_KANJI_MANIFEST, SAMPLE_LESSON_FILE, SAMPLE_KANJI_ITEMS)

    const result = await seedKanji()

    expect(result).toBe('seeded')
    const storedChecksum = await db.settings.get('kanji_n5_checksum')
    const storedVersion = await db.settings.get('kanji_n5_version')
    expect(storedChecksum?.value).toBe('kanjiChecksum123')
    expect(storedVersion?.value).toBe('1.0.0')
  })

  it('returns up-to-date when both kanji checksum and version match', async () => {
    mockFetchWithKanji(SAMPLE_KANJI_MANIFEST, SAMPLE_LESSON_FILE, SAMPLE_KANJI_ITEMS)
    await seedKanji()

    mockFetchWithKanji(SAMPLE_KANJI_MANIFEST, SAMPLE_LESSON_FILE, SAMPLE_KANJI_ITEMS)
    const result = await seedKanji()

    expect(result).toBe('up-to-date')
  })

  it('re-seeds kanji when version changes even if checksum is same', async () => {
    mockFetchWithKanji(SAMPLE_KANJI_MANIFEST, SAMPLE_LESSON_FILE, SAMPLE_KANJI_ITEMS)
    await seedKanji()

    const updatedManifest: Manifest = {
      ...SAMPLE_KANJI_MANIFEST,
      kanji: { ...SAMPLE_KANJI_MANIFEST.kanji!, version: '1.0.1' },
    }
    mockFetchWithKanji(updatedManifest, SAMPLE_LESSON_FILE, SAMPLE_KANJI_ITEMS)

    const result = await seedKanji()

    expect(result).toBe('seeded')
    const stored = await db.settings.get('kanji_n5_version')
    expect(stored?.value).toBe('1.0.1')
  })

  it('returns skipped when manifest has no kanji section', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)

    const result = await seedKanji()

    expect(result).toBe('skipped')
  })
})

describe('checkForUpdates', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    updateStore.getState().reset()
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    updateStore.getState().reset()
  })

  it('does not call startUpdate when everything is up-to-date', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    await db.settings.put({ key: 'manifest_checksum', value: 'abc123checksum' })
    await db.settings.put({ key: 'dataset_version', value: '1.0.0' })

    await checkForUpdates()

    expect(updateStore.getState().phase).toBe('idle')
  })

  it('calls startUpdate with datasetOutdated=true when checksum differs', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    // No stored checksum — dataset is outdated

    await checkForUpdates()

    expect(updateStore.getState().phase).toBe('updating')
    const dataset = updateStore.getState().steps.find(s => s.id === 'dataset')
    expect(dataset?.status).not.toBe('skipped')
  })

  it('calls startUpdate with datasetOutdated=true when version changes even if checksum is same', async () => {
    const newVersionManifest: Manifest = {
      ...SAMPLE_MANIFEST,
      datasets: [{ ...SAMPLE_MANIFEST.datasets[0], version: '1.1.0' }],
    }
    mockFetch(newVersionManifest, SAMPLE_LESSON_FILE)
    await db.settings.put({ key: 'manifest_checksum', value: 'abc123checksum' })
    await db.settings.put({ key: 'dataset_version', value: '1.0.0' })

    await checkForUpdates()

    expect(updateStore.getState().phase).toBe('updating')
    const dataset = updateStore.getState().steps.find(s => s.id === 'dataset')
    expect(dataset?.status).not.toBe('skipped')
  })

  it('calls startUpdate with swWaiting=true when SW is waiting', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    await db.settings.put({ key: 'manifest_checksum', value: 'abc123checksum' })
    await db.settings.put({ key: 'dataset_version', value: '1.0.0' })
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({ waiting: {} }),
      },
    })

    await checkForUpdates()

    expect(updateStore.getState().phase).toBe('updating')
    const sw = updateStore.getState().steps.find(s => s.id === 'sw')
    expect(sw?.status).not.toBe('skipped')
  })

  it('does not throw when manifest fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    await expect(checkForUpdates()).resolves.not.toThrow()
    expect(updateStore.getState().phase).toBe('idle')
  })
})

describe('seedDatasetLazy', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('seeds only the requested book_code_prefix', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)

    const result = await seedDatasetLazy('mnn1')
    expect(result).toBe('seeded')

    const seededFlag = await db.settings.get('dataset_seeded_mnn1')
    expect(seededFlag?.value).toBe(true)

    const checksums = await db.settings.get('lesson_checksums_mnn1')
    expect(typeof checksums?.value).toBe('object')

    const vocabCount = await db.vocabulary.count()
    expect(vocabCount).toBeGreaterThan(0)
  })

  it('returns up-to-date on second call with same version', async () => {
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    await seedDatasetLazy('mnn1')
    const result = await seedDatasetLazy('mnn1')
    expect(result).toBe('up-to-date')
  })
})

async function fetchTestManifest(): Promise<Manifest> {
  const res = await fetch('/data/manifest.json')
  return res.json() as Promise<Manifest>
}

describe('updateChangedFiles', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    await seedDatasetLazy('mnn1')
  })

  it('skips datasets that were never seeded', async () => {
    await db.settings.delete('dataset_seeded_mnn1')

    const vocabBefore = await db.vocabulary.count()
    const manifest = await fetchTestManifest()
    await updateChangedFiles(manifest)
    const vocabAfter = await db.vocabulary.count()
    expect(vocabAfter).toBe(vocabBefore)
  })

  it('updates only files with changed checksums', async () => {
    const storedChecksums = (await db.settings.get('lesson_checksums_mnn1'))?.value as Record<string, string>
    // Fake one changed checksum
    const fakeChecksums = { ...storedChecksums, 'lesson-01.json': 'old-checksum' }
    await db.settings.put({ key: 'lesson_checksums_mnn1', value: fakeChecksums })

    const updatedFiles: string[] = []
    const manifest = await fetchTestManifest()
    await updateChangedFiles(manifest, (file) => {
      updatedFiles.push(file)
    })

    expect(updatedFiles).toContain('lesson-01.json')
    expect(updatedFiles).toHaveLength(1)
    // Checksum should be updated
    const newChecksums = (await db.settings.get('lesson_checksums_mnn1'))?.value as Record<string, string>
    expect(newChecksums['lesson-01.json']).not.toBe('old-checksum')
  })
})
