import type { StreakData } from '../../db/schema'

import type { ReviewLogEntry } from '../../types/review-log'
import type { SyncPackagePayload } from '../../types/sync-package'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest'

import { buildPackage, mergePackageIntoDexie } from '../../db/package-sync'
import { db } from '../../db/schema'

describe('syncPackagePayload shape', () => {
  it('review_log is typed as ReviewLogEntry[]', () => {
    expectTypeOf<SyncPackagePayload['review_log']>().toEqualTypeOf<ReviewLogEntry[]>()
  })

  it('streaks is typed as StreakData[]', () => {
    expectTypeOf<SyncPackagePayload['streaks']>().toEqualTypeOf<StreakData[]>()
  })
})

const UID = 'pkg-sync-test-user'

function makeLogEntry(vocabId: string, reviewedAt: string): Omit<ReviewLogEntry, 'id'> {
  return {
    userId: UID,
    vocabId,
    bookSource: 'minna_shokyuu_1',
    cardType: 'vocab',
    rating: 2,
    intervalDays: 1,
    easeFactor: 2.5,
    dueDate: '2026-05-01',
    reviewCount: 1,
    isKnown: false,
    reviewedAt,
    pendingSync: false,
    remoteId: null,
  }
}

function makeStreak(date: string, current: number): StreakData {
  return { date, userId: UID, cards_reviewed: 5, current_streak: current, max_streak: current }
}

function makeEmptyPkg(overrides: Partial<SyncPackagePayload> = {}): SyncPackagePayload {
  return {
    user_cards: [],
    kanji_cards: [],
    custom_decks: [],
    custom_vocabulary: [],
    review_log: [],
    streaks: [],
    ...overrides,
  }
}

beforeEach(async () => {
  await db.review_log.clear()
  await db.streaks.clear()
  await db.user_cards.clear()
  await db.kanji_cards.clear()
  await db.custom_decks.clear()
  await db.custom_vocabulary.clear()
})

afterEach(async () => {
  await db.review_log.clear()
  await db.streaks.clear()
  await db.user_cards.clear()
  await db.kanji_cards.clear()
  await db.custom_decks.clear()
  await db.custom_vocabulary.clear()
})

describe('buildPackage', () => {
  it('includes review_log entries for the user', async () => {
    await db.review_log.add(makeLogEntry('mnn1_aaa', '2026-05-01T10:00:00Z'))
    await db.review_log.add(makeLogEntry('mnn1_bbb', '2026-05-01T11:00:00Z'))

    const pkg = await buildPackage(UID)

    expect(pkg.review_log).toHaveLength(2)
  })

  it('excludes review_log entries from other users', async () => {
    await db.review_log.add(makeLogEntry('mnn1_aaa', '2026-05-01T10:00:00Z'))
    await db.review_log.add({ ...makeLogEntry('mnn1_bbb', '2026-05-01T11:00:00Z'), userId: 'other-user' })

    const pkg = await buildPackage(UID)

    expect(pkg.review_log).toHaveLength(1)
  })

  it('includes streaks for the user', async () => {
    await db.streaks.bulkPut([makeStreak('2026-04-30', 3), makeStreak('2026-05-01', 4)])

    const pkg = await buildPackage(UID)

    expect(pkg.streaks).toHaveLength(2)
  })

  it('excludes streak records from other users', async () => {
    await db.streaks.put(makeStreak('2026-05-01', 5))
    await db.streaks.put({ date: '2026-04-30', userId: 'other-user', cards_reviewed: 3, current_streak: 2, max_streak: 2 })

    const pkg = await buildPackage(UID)

    expect(pkg.streaks).toHaveLength(1)
  })
})

describe('mergePackageIntoDexie — review_log', () => {
  it('adds new review_log entries from the package', async () => {
    const pkg = makeEmptyPkg({ review_log: [makeLogEntry('mnn1_aaa', '2026-05-01T10:00:00Z')] })

    await mergePackageIntoDexie(UID, pkg)

    const entries = await db.review_log.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].vocabId).toBe('mnn1_aaa')
  })

  it('does not duplicate an entry that already exists locally', async () => {
    await db.review_log.add(makeLogEntry('mnn1_aaa', '2026-05-01T10:00:00Z'))
    const pkg = makeEmptyPkg({ review_log: [makeLogEntry('mnn1_aaa', '2026-05-01T10:00:00Z')] })

    await mergePackageIntoDexie(UID, pkg)

    expect(await db.review_log.count()).toBe(1)
  })

  it('adds entry with different reviewedAt even for same vocabId', async () => {
    await db.review_log.add(makeLogEntry('mnn1_aaa', '2026-05-01T10:00:00Z'))
    const pkg = makeEmptyPkg({ review_log: [makeLogEntry('mnn1_aaa', '2026-05-02T10:00:00Z')] })

    await mergePackageIntoDexie(UID, pkg)

    expect(await db.review_log.count()).toBe(2)
  })

  it('treats same vocabId+reviewedAt with different cardType as distinct entries', async () => {
    await db.review_log.add(makeLogEntry('mnn1_aaa', '2026-05-01T10:00:00Z'))
    const pkg = makeEmptyPkg({
      review_log: [{ ...makeLogEntry('mnn1_aaa', '2026-05-01T10:00:00Z'), cardType: 'kanji' }],
    })

    await mergePackageIntoDexie(UID, pkg)

    expect(await db.review_log.count()).toBe(2)
  })

  it('imported entry has pendingSync=false', async () => {
    const entry = { ...makeLogEntry('mnn1_aaa', '2026-05-01T10:00:00Z'), pendingSync: true }
    const pkg = makeEmptyPkg({ review_log: [entry] })

    await mergePackageIntoDexie(UID, pkg)

    const stored = await db.review_log.toArray()
    expect(stored[0].pendingSync).toBe(false)
  })
})

describe('mergePackageIntoDexie — streaks', () => {
  it('adds streak records that do not exist locally', async () => {
    const pkg = makeEmptyPkg({ streaks: [makeStreak('2026-05-01', 5)] })

    await mergePackageIntoDexie(UID, pkg)

    const s = await db.streaks.get('2026-05-01')
    expect(s?.current_streak).toBe(5)
  })

  it('keeps local streak when remote has lower current_streak', async () => {
    await db.streaks.put(makeStreak('2026-05-01', 10))
    const pkg = makeEmptyPkg({ streaks: [makeStreak('2026-05-01', 3)] })

    await mergePackageIntoDexie(UID, pkg)

    expect((await db.streaks.get('2026-05-01'))?.current_streak).toBe(10)
  })

  it('overwrites local streak when remote has higher current_streak', async () => {
    await db.streaks.put(makeStreak('2026-05-01', 3))
    const pkg = makeEmptyPkg({ streaks: [makeStreak('2026-05-01', 10)] })

    await mergePackageIntoDexie(UID, pkg)

    expect((await db.streaks.get('2026-05-01'))?.current_streak).toBe(10)
  })

  it('preserves local max_streak when remote current_streak wins but has lower max_streak', async () => {
    await db.streaks.put({ date: '2026-05-01', userId: UID, cards_reviewed: 5, current_streak: 10, max_streak: 15 })
    const pkg = makeEmptyPkg({
      streaks: [{ date: '2026-05-01', userId: UID, cards_reviewed: 8, current_streak: 12, max_streak: 12 }],
    })

    await mergePackageIntoDexie(UID, pkg)

    const s = await db.streaks.get('2026-05-01')
    expect(s?.current_streak).toBe(12)
    expect(s?.max_streak).toBe(15) // local max preserved
  })
})
