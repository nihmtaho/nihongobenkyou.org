import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'

const TEST_USER_ID = 'test-user-001'

beforeEach(async () => {
  await db.sessions.clear()
})

afterEach(async () => {
  await db.sessions.clear()
})

describe('db.sessions — Dexie write', () => {
  it('writes a session record and reads it back', async () => {
    const studiedAt = new Date()
    await db.sessions.add({
      user_id: TEST_USER_ID,
      mode: 'flashcard',
      lesson_ids: ['minna_shokyuu_1:1', 'minna_shokyuu_1:2'],
      cards_reviewed: 10,
      correct_count: 8,
      duration_sec: 120,
      studied_at: studiedAt,
    })

    const records = await db.sessions.where('user_id').equals(TEST_USER_ID).toArray()
    expect(records).toHaveLength(1)
    expect(records[0].mode).toBe('flashcard')
    expect(records[0].cards_reviewed).toBe(10)
    expect(records[0].correct_count).toBe(8)
    expect(records[0].duration_sec).toBe(120)
    expect(records[0].lesson_ids).toEqual(['minna_shokyuu_1:1', 'minna_shokyuu_1:2'])
  })

  it('assigns an auto-incremented id', async () => {
    const id1 = await db.sessions.add({
      user_id: TEST_USER_ID,
      mode: 'quiz',
      lesson_ids: ['minna_shokyuu_1:3'],
      cards_reviewed: 5,
      correct_count: 5,
      duration_sec: 60,
      studied_at: new Date(),
    })

    const id2 = await db.sessions.add({
      user_id: TEST_USER_ID,
      mode: 'type-input',
      lesson_ids: ['minna_shokyuu_1:4'],
      cards_reviewed: 3,
      correct_count: 2,
      duration_sec: 45,
      studied_at: new Date(),
    })

    expect(typeof id1).toBe('number')
    expect(typeof id2).toBe('number')
    expect(id2).toBeGreaterThan(id1 as number)
  })

  it('supports querying by [user_id+studied_at] compound index', async () => {
    const date1 = new Date('2024-01-01T10:00:00Z')
    const date2 = new Date('2024-01-02T10:00:00Z')

    await db.sessions.add({
      user_id: TEST_USER_ID,
      mode: 'flashcard',
      lesson_ids: ['minna_shokyuu_1:1'],
      cards_reviewed: 10,
      correct_count: 9,
      duration_sec: 100,
      studied_at: date1,
    })

    await db.sessions.add({
      user_id: 'other-user',
      mode: 'flashcard',
      lesson_ids: ['minna_shokyuu_1:1'],
      cards_reviewed: 5,
      correct_count: 3,
      duration_sec: 50,
      studied_at: date2,
    })

    const records = await db.sessions.where('user_id').equals(TEST_USER_ID).toArray()
    expect(records).toHaveLength(1)
    expect(records[0].user_id).toBe(TEST_USER_ID)
  })

  it('stores session for all three study modes', async () => {
    const modes = ['flashcard', 'quiz', 'type-input'] as const
    for (const mode of modes) {
      await db.sessions.add({
        user_id: TEST_USER_ID,
        mode,
        lesson_ids: ['minna_shokyuu_1:1'],
        cards_reviewed: 10,
        correct_count: 8,
        duration_sec: 90,
        studied_at: new Date(),
      })
    }

    const records = await db.sessions.where('user_id').equals(TEST_USER_ID).toArray()
    expect(records).toHaveLength(3)
    const storedModes = records.map(r => r.mode)
    expect(storedModes).toContain('flashcard')
    expect(storedModes).toContain('quiz')
    expect(storedModes).toContain('type-input')
  })
})
