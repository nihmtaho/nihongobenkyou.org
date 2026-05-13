import type { ReviewLogEntry } from '../types/review-log'
import type { SRSCard } from '../types/srs'
import { AuthError, getCurrentUserId } from '../api/auth'
import {
  fetchReviewEventsSince,
  insertReviewEvents,
  upsertUserCardSnapshots,
} from '../api/review-log'
import { db } from './schema'

export { SyncError } from '../api/user-cards'

const UPLOAD_CHUNK_SIZE = 200
const DEFAULT_FSRS_DIFFICULTY = 5
const DEFAULT_STABILITY_DAYS  = 1

let isSyncing = false

export async function uploadPendingReviews(): Promise<void> {
  if (isSyncing)
    return
  isSyncing = true

  try {
    const userId = await getCurrentUserId()
    if (!userId)
      return

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
        user_id:       e.userId,
        vocab_id:      e.vocabId,
        book_source:   e.bookSource,
        card_type:     e.cardType,
        rating:        e.rating,
        scheduled_days: e.scheduledDays,
        stability:     e.stability,
        difficulty:    e.difficulty,
        due_date:      e.dueDate.slice(0, 10),
        review_count:  e.reviewCount,
        is_known:      e.isKnown,
        reviewed_at:   e.reviewedAt,
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
    if (progressResetAt && event.reviewed_at <= progressResetAt)
      continue

    const cardType = event.card_type === 'vocab' ? 'vocab' : 'kanji'
    const existing = await db.srs_cards.get([userId, event.vocab_id])

    if (!existing || event.reviewed_at > (existing.updated_at ?? '')) {
      await db.srs_cards.put({
        userId,
        cardId:              event.vocab_id,
        cardType,
        deckId:              null,
        state:               'review',
        stability:           event.stability      ?? event.interval_days ?? DEFAULT_STABILITY_DAYS,
        difficulty:          event.difficulty     ?? DEFAULT_FSRS_DIFFICULTY,
        elapsed_days:        0,
        scheduled_days:      event.scheduled_days ?? event.interval_days ?? DEFAULT_STABILITY_DAYS,
        reps:                event.review_count,
        lapses:              0,
        last_review:         event.reviewed_at.slice(0, 10),
        due:                 event.due_date.slice(0, 10),
        last_rating:         event.rating as SRSCard['last_rating'],
        is_known:            event.is_known ?? false,
        consecutive_correct: 0,
        pending_sync:        false,
        updated_at:          event.reviewed_at,
      } satisfies SRSCard)
    }
  }

  const maxId = events[events.length - 1].id
  await db.settings.put({ key: 'review_log_cursor', value: maxId })
}

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

  const affectedIds = [...new Set(uploadedEntries.map(e => e.vocabId))]
  const cards = await db.srs_cards
    .filter(c => c.userId === userId && affectedIds.includes(c.cardId))
    .toArray()

  if (cards.length === 0)
    return

  const snapshots = cards.map(card => ({
    user_id:       userId,
    vocab_id:      card.cardId,
    card_type:     card.cardType === 'kanji' ? 'kanji' as const : 'vocab' as const,
    interval_days: card.scheduled_days,
    ease_factor:   Math.max(1.3, 3.18 - (card.difficulty - 1) * 0.188),
    due_date:      card.due,
    review_count:  card.reps,
    last_rating:   card.last_rating,
    is_known:      card.is_known,
    snapshot_at:   card.updated_at,
    cursor_id:     maxRemoteId,
  }))

  await upsertUserCardSnapshots(snapshots)
  await db.settings.put({ key: 'review_log_cursor', value: maxRemoteId })
}
