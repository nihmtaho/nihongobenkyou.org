import type { Manifest } from '../../types/dataset'
import type { VocabItem } from '../../types/vocabulary'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { invalidateLessonCache, seedDatabase, SeedError } from '../../db/seed'

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

  it('does not clear user_cards during re-seed', async () => {
    await db.user_cards.put({
      userId: 'user1',
      vocabId: 'mnn1_abc',
      interval_days: 1,
      ease_factor: 2.5,
      due_date: '2026-04-20',
      review_count: 1,
      last_rating: 2,
      pending_sync: false,
      updated_at: new Date().toISOString(),
      is_known: false,
      consecutive_correct: 0,
    })

    mockFetch(SAMPLE_MANIFEST, SAMPLE_LESSON_FILE)
    await seedDatabase()

    const cards = await db.user_cards.toArray()
    expect(cards).toHaveLength(1)
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
