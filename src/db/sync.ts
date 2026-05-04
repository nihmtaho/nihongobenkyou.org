import type { KanjiCardState } from '../types/kanji'
import type { ReviewLogEntry } from '../types/review-log'
import type { CardState, SRSRating } from '../types/srs'
import { AuthError } from '../api/auth'
import {
  fetchReviewEventsSince,
  insertReviewEvents,
  upsertUserCardSnapshots,
} from '../api/review-log'
import { supabase } from '../api/supabase'
import { db } from './schema'

export { SyncError } from '../api/user-cards'

const UPLOAD_CHUNK_SIZE = 200

let isSyncing = false

// ----------------------------------------------------------------
// Upload: pending review_log entries → Supabase review_log INSERT
// ----------------------------------------------------------------
export async function uploadPendingReviews(): Promise<void> {
  if (isSyncing)
    return
  isSyncing = true

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session)
      return

    const userId = session.user.id

    const pending = await db.review_log
      .toCollection()
      .filter(e => e.userId === userId && e.pendingSync === true && e.remoteId === null)
      .toArray()

    if (pending.length === 0)
      return

    const queueId = await db.sync_queue.add({
      payload: JSON.stringify({ count: pending.length }),
      created_at: new Date().toISOString(),
      status: 'pending',
    })

    let hasFailed = false

    for (let i = 0; i < pending.length; i += UPLOAD_CHUNK_SIZE) {
      const chunk = pending.slice(i, i + UPLOAD_CHUNK_SIZE)

      const remoteRows = chunk.map(e => ({
        user_id: e.userId,
        vocab_id: e.vocabId,
        book_source: e.bookSource,
        card_type: e.cardType,
        rating: e.rating,
        interval_days: e.intervalDays,
        ease_factor: e.easeFactor,
        due_date: e.dueDate.slice(0, 10),
        review_count: e.reviewCount,
        is_known: e.isKnown,
        reviewed_at: e.reviewedAt,
      }))

      try {
        const remoteIds = await insertReviewEvents(remoteRows)

        await db.transaction('rw', db.review_log, async () => {
          for (let j = 0; j < chunk.length; j++) {
            const localId = chunk[j].id!
            await db.review_log.update(localId, {
              pendingSync: false,
              remoteId: remoteIds[j] ?? null,
            })
          }
        })
      }
      catch (err) {
        if (err instanceof AuthError)
          throw err
        hasFailed = true
      }
    }

    await db.sync_queue.update(queueId, { status: hasFailed ? 'failed' : 'done' })

    if (!hasFailed) {
      await exportCurrentStateAsSnapshot(userId, pending).catch(() => {})
    }

    window.dispatchEvent(new Event('sync-complete'))
  }
  finally {
    isSyncing = false
  }
}

// ----------------------------------------------------------------
// Download: Supabase review_log events since cursor → Dexie state
// ----------------------------------------------------------------
export async function downloadNewReviews(userId: string): Promise<void> {
  const cursorSetting = await db.settings.get('review_log_cursor')
  const cursor = (cursorSetting?.value as number | undefined) ?? 0

  let events
  try {
    events = await fetchReviewEventsSince(userId, cursor)
  }
  catch (err) {
    if (err instanceof AuthError)
      throw err
    return
  }

  if (events.length === 0)
    return

  const localEventRemoteIds = new Set(
    (await db.review_log
      .toCollection()
      .filter(e => e.userId === userId && e.remoteId !== null)
      .toArray()
    ).map(e => e.remoteId),
  )

  const progressResetAtSetting = await db.settings.get('progress_reset_at')
  const progressResetAt = progressResetAtSetting?.value as string | undefined

  for (const event of events) {
    if (localEventRemoteIds.has(event.id))
      continue

    // Skip events from before the last progress reset
    if (progressResetAt && event.reviewed_at <= progressResetAt)
      continue

    if (event.card_type === 'vocab') {
      const existing = await db.user_cards.get([userId, event.vocab_id])
      if (!existing || event.reviewed_at > (existing.updated_at ?? '')) {
        await db.user_cards.put({
          userId,
          vocabId: event.vocab_id,
          interval_days: event.interval_days,
          ease_factor: event.ease_factor,
          due_date: event.due_date,
          review_count: event.review_count,
          last_rating: event.rating as SRSRating,
          pending_sync: false,
          updated_at: event.reviewed_at,
          is_known: event.is_known,
          consecutive_correct: 0, // intentional: client-side only, not stored on server
        } satisfies CardState)
      }
    }
    else if (event.card_type === 'kanji') {
      const existing = await db.kanji_cards.get([userId, event.vocab_id])
      if (!existing || event.reviewed_at > (existing.updated_at ?? '')) {
        await db.kanji_cards.put({
          userId,
          char: event.vocab_id,
          interval_days: event.interval_days,
          ease_factor: event.ease_factor,
          due_date: event.due_date,
          review_count: event.review_count,
          last_rating: event.rating as SRSRating,
          pending_sync: false,
          updated_at: event.reviewed_at,
          consecutive_correct: 0, // intentional: client-side only, not stored on server
        } satisfies KanjiCardState)
      }
    }
  }

  const maxId = events[events.length - 1].id
  await db.settings.put({ key: 'review_log_cursor', value: maxId })
}

// ----------------------------------------------------------------
// Snapshot: write current Dexie state back as server-side snapshot
// Called after a successful upload so new devices bootstrap faster.
// ----------------------------------------------------------------
async function exportCurrentStateAsSnapshot(
  userId: string,
  uploadedEntries: ReviewLogEntry[],
): Promise<void> {
  const cursorSetting = await db.settings.get('review_log_cursor')
  const cursor = (cursorSetting?.value as number | undefined) ?? 0

  const maxRemoteId = uploadedEntries.reduce<number>(
    (max, e) => (e.remoteId !== null && e.remoteId > max ? e.remoteId : max),
    cursor,
  )

  const affectedVocabIds = [...new Set(
    uploadedEntries
      .filter((e): e is ReviewLogEntry & { cardType: 'vocab' } => e.cardType === 'vocab')
      .map(e => e.vocabId),
  )]
  const affectedKanjiIds = [...new Set(
    uploadedEntries
      .filter((e): e is ReviewLogEntry & { cardType: 'kanji' } => e.cardType === 'kanji')
      .map(e => e.vocabId),
  )]

  const snapshots = []

  if (affectedVocabIds.length > 0) {
    const cards = await db.user_cards
      .toCollection()
      .filter(c => c.userId === userId && affectedVocabIds.includes(c.vocabId))
      .toArray()

    for (const card of cards) {
      snapshots.push({
        user_id: userId,
        vocab_id: card.vocabId,
        card_type: 'vocab' as const,
        interval_days: card.interval_days,
        ease_factor: card.ease_factor,
        due_date: card.due_date.slice(0, 10),
        review_count: card.review_count,
        last_rating: card.last_rating,
        is_known: card.is_known,
        snapshot_at: card.updated_at,
        cursor_id: maxRemoteId,
      })
    }
  }

  if (affectedKanjiIds.length > 0) {
    const cards = await db.kanji_cards
      .toCollection()
      .filter(c => c.userId === userId && affectedKanjiIds.includes(c.char))
      .toArray()

    for (const card of cards) {
      snapshots.push({
        user_id: userId,
        vocab_id: card.char,
        card_type: 'kanji' as const,
        interval_days: card.interval_days,
        ease_factor: card.ease_factor,
        due_date: card.due_date.slice(0, 10),
        review_count: card.review_count,
        last_rating: card.last_rating ?? null,
        is_known: false,
        snapshot_at: card.updated_at,
        cursor_id: maxRemoteId,
      })
    }
  }

  if (snapshots.length > 0) {
    await upsertUserCardSnapshots(snapshots)
    await db.settings.put({ key: 'review_log_cursor', value: maxRemoteId })
  }
}
