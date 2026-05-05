import { beforeEach, describe, expect, it } from 'vitest'
import {
  addWords,
  createDeck,
  deleteDeck,
  deleteWord,
  getDecks,
  getDeckWords,
  migrateGuestDecks,
  updateDeck,
  updateWord,
} from './custom-decks-local'
import { db } from './schema'
import 'fake-indexeddb/auto'

const USER_ID = 'user-123'
const GUEST_ID = 'guest'

beforeEach(async () => {
  await db.custom_decks.clear()
  await db.custom_vocabulary.clear()
})

describe('createDeck', () => {
  it('creates a deck with is_active false by default', async () => {
    const deck = await createDeck(USER_ID, { title: 'Test Deck' })
    expect(deck.id).toBeTruthy()
    expect(deck.user_id).toBe(USER_ID)
    expect(deck.title).toBe('Test Deck')
    expect(deck.is_active).toBe(false)
    expect(deck.word_count).toBe(0)
  })

  it('persists the deck in Dexie', async () => {
    const deck = await createDeck(USER_ID, { title: 'Persisted' })
    const found = await db.custom_decks.get(deck.id)
    expect(found?.title).toBe('Persisted')
  })
})

describe('getDecks', () => {
  it('returns only decks for the given user_id', async () => {
    await createDeck(USER_ID, { title: 'Mine' })
    await createDeck('other-user', { title: 'Theirs' })
    const decks = await getDecks(USER_ID)
    expect(decks).toHaveLength(1)
    expect(decks[0].title).toBe('Mine')
  })
})

describe('updateDeck', () => {
  it('updates title and description', async () => {
    const deck = await createDeck(USER_ID, { title: 'Old' })
    await updateDeck(deck.id, { title: 'New', description: 'desc' })
    const updated = await db.custom_decks.get(deck.id)
    expect(updated?.title).toBe('New')
    expect(updated?.description).toBe('desc')
  })
})

describe('deleteDeck', () => {
  it('deletes deck and its words', async () => {
    const deck = await createDeck(USER_ID, { title: 'ToDelete' })
    await addWords(deck.id, USER_ID, [
      { word: null, kana: 'てすと', han_viet: null, meaning_vi: 'test' },
    ])
    await deleteDeck(deck.id)
    expect(await db.custom_decks.get(deck.id)).toBeUndefined()
    const words = await getDeckWords(deck.id)
    expect(words).toHaveLength(0)
  })
})

describe('addWords', () => {
  it('bulk inserts words and updates word_count on deck', async () => {
    const deck = await createDeck(USER_ID, { title: 'Vocab' })
    await addWords(deck.id, USER_ID, [
      { word: '会議', kana: 'かいぎ', han_viet: 'hội nghị', meaning_vi: 'cuộc họp' },
      { word: null, kana: 'てすと', han_viet: null, meaning_vi: 'test' },
    ])
    const words = await getDeckWords(deck.id)
    expect(words).toHaveLength(2)
    const updated = await db.custom_decks.get(deck.id)
    expect(updated?.word_count).toBe(2)
  })

  it('sets source to "json" by default', async () => {
    const deck = await createDeck(USER_ID, { title: 'D' })
    await addWords(deck.id, USER_ID, [
      { word: null, kana: 'てすと', han_viet: null, meaning_vi: 'test' },
    ], 'json')
    const [word] = await getDeckWords(deck.id)
    expect(word.source).toBe('json')
  })
})

describe('deleteWord', () => {
  it('deletes word and decrements word_count', async () => {
    const deck = await createDeck(USER_ID, { title: 'D' })
    await addWords(deck.id, USER_ID, [
      { word: null, kana: 'てすと', han_viet: null, meaning_vi: 'test' },
    ])
    const [word] = await getDeckWords(deck.id)
    await deleteWord(word.id, deck.id)
    expect(await getDeckWords(deck.id)).toHaveLength(0)
    const d = await db.custom_decks.get(deck.id)
    expect(d?.word_count).toBe(0)
  })
})

describe('updateWord', () => {
  it('updates word fields', async () => {
    const deck = await createDeck(USER_ID, { title: 'D' })
    await addWords(deck.id, USER_ID, [
      { word: null, kana: 'old', han_viet: null, meaning_vi: 'old' },
    ])
    const [word] = await getDeckWords(deck.id)
    await updateWord(word.id, { kana: 'new', meaning_vi: 'new meaning' })
    const [updated] = await getDeckWords(deck.id)
    expect(updated.kana).toBe('new')
    expect(updated.meaning_vi).toBe('new meaning')
  })
})

describe('migrateGuestDecks', () => {
  it('migrates guest decks to real user_id', async () => {
    const deck = await createDeck(GUEST_ID, { title: 'Guest Deck' })
    await addWords(deck.id, GUEST_ID, [
      { word: null, kana: 'てすと', han_viet: null, meaning_vi: 'test' },
    ])
    await migrateGuestDecks(USER_ID)
    const decks = await getDecks(USER_ID)
    expect(decks.some(d => d.title === 'Guest Deck')).toBe(true)
    const words = await getDeckWords(deck.id)
    expect(words.every(w => w.user_id === USER_ID)).toBe(true)
  })

  it('does not migrate if already done', async () => {
    await createDeck(GUEST_ID, { title: 'Guest' })
    await migrateGuestDecks(USER_ID)
    await migrateGuestDecks(USER_ID) // second call
    const decks = await getDecks(USER_ID)
    // Should not duplicate
    expect(decks.filter(d => d.title === 'Guest')).toHaveLength(1)
  })
})
