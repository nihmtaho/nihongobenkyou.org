import type { SyncPackagePayload } from '../../types/sync-package'
import { describe, expect, it } from 'vitest'

describe('syncPackagePayload shape', () => {
  it('includes review_log and streaks arrays', () => {
    const payload: SyncPackagePayload = {
      user_cards: [],
      kanji_cards: [],
      custom_decks: [],
      custom_vocabulary: [],
      review_log: [],
      streaks: [],
    }
    expect(Array.isArray(payload.review_log)).toBe(true)
    expect(Array.isArray(payload.streaks)).toBe(true)
  })
})
