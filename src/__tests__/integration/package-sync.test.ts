import type { StreakData } from '../../db/schema'

import type { CustomDeck, CustomVocabItem } from '../../types/custom-deck'
import type { ReviewLogEntry } from '../../types/review-log'
import type { SRSCard } from '../../types/srs'
import type { SyncPackagePayload } from '../../types/sync-package'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest'

import { buildPackage, mergePackageIntoDexie } from '../../db/package-sync'
import { db } from '../../db/schema'

describe('syncPackagePayload shape', () => {
  it('review_log is optional/deprecated in the payload', () => {
    expectTypeOf<SyncPackagePayload['review_log']>().toEqualTypeOf<unknown[] | undefined>()
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
    rating: 3,
    scheduledDays: 4,
    stability: 4,
    difficulty: 5,
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
    srs_cards: [],
    custom_decks: [],
    custom_vocabulary: [],
    streaks: [],
    ...overrides,
  }
}

beforeEach(async () => {
  await db.review_log.clear()
  await db.streaks.clear()
  await db.srs_cards.clear()
  await db.custom_decks.clear()
  await db.custom_vocabulary.clear()
})

afterEach(async () => {
  await db.review_log.clear()
  await db.streaks.clear()
  await db.srs_cards.clear()
  await db.custom_decks.clear()
  await db.custom_vocabulary.clear()
})

describe('buildPackage', () => {
  it('does not include review_log (synced via separate channel)', async () => {
    await db.review_log.add(makeLogEntry('mnn1_aaa', '2026-05-01T10:00:00Z'))

    const pkg = await buildPackage(UID)

    expect(pkg.review_log).toBeUndefined()
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

describe('mergePackageIntoDexie — custom_vocabulary', () => {
  const UID = 'cv-sync-test-user'

  function makeVocab(id: string, updatedAt: string): CustomVocabItem {
    return {
      id,
      deck_id: 'deck-1',
      user_id: UID,
      kana: 'てすと',
      kanji: 'テスト',
      han_viet: null,
      meaning_vi: 'kiểm tra',
      source: 'manual' as const,
      created_at: updatedAt,
      updated_at: updatedAt,
    }
  }

  it('writes remote custom_vocab to Dexie when no local copy exists', async () => {
    const remoteEntry = makeVocab('vocab-remote-1', '2026-06-01T10:00:00.000Z')
    const pkg: SyncPackagePayload = {
      srs_cards: [],
      custom_decks: [],
      custom_vocabulary: [remoteEntry],
      streaks: [],
    }

    await mergePackageIntoDexie(UID, pkg)

    const stored = await db.custom_vocabulary.get('vocab-remote-1')
    expect(stored).toBeDefined()
    expect(stored?.kana).toBe('てすと')
  })

  it('overwrites local custom_vocab when remote is newer', async () => {
    const oldEntry = makeVocab('vocab-shared', '2026-05-01T00:00:00.000Z')
    await db.custom_vocabulary.put(oldEntry)

    const newerRemote = { ...oldEntry, meaning_vi: 'updated', updated_at: '2026-06-01T00:00:00.000Z' }
    const pkg: SyncPackagePayload = {
      srs_cards: [],
      custom_decks: [],
      custom_vocabulary: [newerRemote],
      streaks: [],
    }

    await mergePackageIntoDexie(UID, pkg)

    const stored = await db.custom_vocabulary.get('vocab-shared')
    expect(stored).toBeDefined()
    expect(stored?.meaning_vi).toBe('updated')
  })
})

function makeSRSCard(userId: string, cardId: string, updatedAt: string): SRSCard {
  return {
    userId,
    cardId,
    cardType: 'vocab',
    deckId: null,
    state: 'review',
    stability: 4,
    difficulty: 5,
    elapsed_days: 1,
    scheduled_days: 4,
    reps: 2,
    lapses: 0,
    last_review: '2026-06-01',
    due: '2026-06-05',
    last_rating: 3,
    is_known: false,
    consecutive_correct: 2,
    pending_sync: false,
    updated_at: updatedAt,
  }
}

function makeCustomDeck(userId: string, id: string, updatedAt: string): CustomDeck {
  return {
    id,
    user_id: userId,
    title: `Deck ${id}`,
    description: null,
    is_active: false,
    word_count: 0,
    created_at: updatedAt,
    updated_at: updatedAt,
  }
}

describe('mergePackageIntoDexie — bulk ops', () => {
  const BULK_UID = 'bulk-test-user'

  it('imports 100 new srs_cards and returns correct imported count', async () => {
    const cards: SRSCard[] = Array.from({ length: 100 }, (_, i) => makeSRSCard(BULK_UID, `card-${i}`, '2026-06-01T00:00:00.000Z'))
    const pkg: SyncPackagePayload = {
      srs_cards: cards,
      custom_decks: [],
      custom_vocabulary: [],
      streaks: [],
    }

    const imported = await mergePackageIntoDexie(BULK_UID, pkg)

    expect(imported).toBe(100)
    const stored = await db.srs_cards.filter(c => c.userId === BULK_UID).toArray()
    expect(stored).toHaveLength(100)
  })

  it('sets pending_sync: false on all imported srs_cards', async () => {
    const cards: SRSCard[] = Array.from({ length: 5 }, (_, i) => makeSRSCard(BULK_UID, `ps-card-${i}`, '2026-06-01T00:00:00.000Z'))
    const pkg: SyncPackagePayload = {
      srs_cards: cards,
      custom_decks: [],
      custom_vocabulary: [],
      streaks: [],
    }

    await mergePackageIntoDexie(BULK_UID, pkg)

    const stored = await db.srs_cards.filter(c => c.userId === BULK_UID).toArray()
    expect(stored.every(c => c.pending_sync === false)).toBe(true)
  })

  it('skips srs_cards where local is newer than remote', async () => {
    const localNewer = makeSRSCard(BULK_UID, 'old-remote', '2026-06-10T00:00:00.000Z')
    await db.srs_cards.put(localNewer)

    const remoteOlder = makeSRSCard(BULK_UID, 'old-remote', '2026-06-01T00:00:00.000Z')
    const pkg: SyncPackagePayload = {
      srs_cards: [remoteOlder],
      custom_decks: [],
      custom_vocabulary: [],
      streaks: [],
    }

    const imported = await mergePackageIntoDexie(BULK_UID, pkg)

    expect(imported).toBe(0)
    const stored = await db.srs_cards.get([BULK_UID, 'old-remote'])
    expect(stored?.updated_at).toBe('2026-06-10T00:00:00.000Z')
  })

  it('imports 100 new custom_decks and returns correct imported count', async () => {
    const decks: CustomDeck[] = Array.from({ length: 100 }, (_, i) => makeCustomDeck(BULK_UID, `deck-${i}`, '2026-06-01T00:00:00.000Z'))
    const pkg: SyncPackagePayload = {
      srs_cards: [],
      custom_decks: decks,
      custom_vocabulary: [],
      streaks: [],
    }

    const imported = await mergePackageIntoDexie(BULK_UID, pkg)

    expect(imported).toBe(100)
    const stored = await db.custom_decks.where('user_id').equals(BULK_UID).toArray()
    expect(stored).toHaveLength(100)
  })
})
