import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { createDeck, addWords, migrateGuestDecks } from '../db/custom-decks-local'

beforeEach(async () => {
  await db.custom_decks.clear()
  await db.custom_vocabulary.clear()
  await db.settings.clear()
})

describe('migrateGuestDecks (via db layer)', () => {
  it('migrates all guest decks to real userId', async () => {
    const deck = await createDeck('guest', { title: 'G' })
    await addWords(deck.id, 'guest', [{ word: null, kana: 'a', han_viet: null, meaning_vi: 'm' }])
    await migrateGuestDecks('real-user')
    const realDecks = await db.custom_decks.where('user_id').equals('real-user').toArray()
    expect(realDecks).toHaveLength(1)
    const words = await db.custom_vocabulary.where('deck_id').equals(deck.id).toArray()
    expect(words[0].user_id).toBe('real-user')
  })

  it('is idempotent — second call does nothing extra', async () => {
    const deck = await createDeck('guest', { title: 'G' })
    await migrateGuestDecks('real-user')
    await migrateGuestDecks('real-user')
    const realDecks = await db.custom_decks.where('user_id').equals('real-user').toArray()
    expect(realDecks).toHaveLength(1)
  })
})
