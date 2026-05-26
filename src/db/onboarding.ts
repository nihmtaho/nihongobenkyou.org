import type { QueryClient } from '@tanstack/react-query'
import type { RemoteUserCard } from '../api/user-cards'
import type { RemoteSnapshot } from '../types/review-log'
import type { SRSCard } from '../types/srs'
import { NetworkError } from '../api/auth'
import { fetchProfile } from '../api/profiles'
import { fetchUserCardSnapshots } from '../api/review-log'
import { supabase } from '../api/supabase'
import { fetchRemoteUserCards } from '../api/user-cards'
import { db } from './schema'
import { seedDatasetLazy } from './seed'
import { downloadNewReviews } from './sync'

const DEFAULT_DIFFICULTY = 5
const DEFAULT_STABILITY = 1

// ----------------------------------------------------------------
// Merge remote user_cards state into Dexie (legacy: used by
// useUserCards background sync when no review_log cursor exists)
// ----------------------------------------------------------------
export async function mergeRemoteCardsIntoDexie(
  userId: string,
  remoteCards: RemoteUserCard[],
): Promise<void> {
  if (remoteCards.length === 0)
    return

  for (const remote of remoteCards) {
    const local = await db.srs_cards.get([userId, remote.vocab_id])

    if (!local || remote.updated_at > local.updated_at) {
      const card: SRSCard = {
        userId,
        cardId: remote.vocab_id,
        cardType: 'vocab',
        deckId: null,
        state: 'review',
        stability: remote.interval_days || DEFAULT_STABILITY,
        difficulty: DEFAULT_DIFFICULTY,
        elapsed_days: 0,
        scheduled_days: remote.interval_days || DEFAULT_STABILITY,
        reps: remote.review_count,
        lapses: 0,
        last_review: remote.updated_at.slice(0, 10),
        due: remote.due_date.slice(0, 10),
        last_rating: remote.last_rating != null ? Math.max(1, Math.min(4, remote.last_rating + 1)) as SRSCard['last_rating'] : null,
        is_known: remote.is_known,
        consecutive_correct: 0, // intentional: client-side only, not stored on server
        pending_sync: false,
        updated_at: remote.updated_at,
      }
      await db.srs_cards.put(card)
    }
  }
}

// ----------------------------------------------------------------
// Seed Dexie from server-side snapshots (fast bootstrap)
// ----------------------------------------------------------------
async function seedFromSnapshots(userId: string, snapshots: RemoteSnapshot[]): Promise<void> {
  for (const s of snapshots) {
    const cardType = s.card_type === 'kanji' ? 'kanji' : 'vocab'
    const existing = await db.srs_cards.get([userId, s.vocab_id])
    if (!existing || s.snapshot_at > existing.updated_at) {
      const card: SRSCard = {
        userId,
        cardId: s.vocab_id,
        cardType,
        deckId: null,
        state: 'review',
        stability: s.interval_days || DEFAULT_STABILITY,
        difficulty: DEFAULT_DIFFICULTY,
        elapsed_days: 0,
        scheduled_days: s.interval_days || DEFAULT_STABILITY,
        reps: s.review_count,
        lapses: 0,
        last_review: s.snapshot_at.slice(0, 10),
        due: s.due_date.slice(0, 10),
        last_rating: s.last_rating != null ? Math.max(1, Math.min(4, s.last_rating + 1)) as SRSCard['last_rating'] : null,
        is_known: s.is_known,
        consecutive_correct: 0, // intentional: client-side only, not stored on server
        pending_sync: false,
        updated_at: s.snapshot_at,
      }
      await db.srs_cards.put(card)
    }
  }
}

// ----------------------------------------------------------------
// New device onboarding: snapshot → cursor → delta events → datasets
// ----------------------------------------------------------------
export async function onboardNewDevice(
  userId: string,
  queryClient: QueryClient,
): Promise<void> {
  // Apply progress_reset_at from remote profile so pre-reset events are skipped
  try {
    const profile = await fetchProfile(userId)
    if (profile.progress_reset_at) {
      await db.settings.put({ key: 'progress_reset_at', value: profile.progress_reset_at })

      // Advance cursor past all pre-reset review_log entries
      const { data: cursorRow } = await supabase
        .from('review_log')
        .select('id')
        .eq('user_id', userId)
        .lte('reviewed_at', profile.progress_reset_at)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cursorRow?.id) {
        const existingCursor = (await db.settings.get('review_log_cursor'))?.value as number ?? 0
        if (cursorRow.id > existingCursor) {
          await db.settings.put({ key: 'review_log_cursor', value: cursorRow.id })
        }
      }
    }
  }
  catch {
    // Network error or profile not found — the local progress_reset_at (if any) still applies
  }

  let snapshots: RemoteSnapshot[] = []

  try {
    snapshots = await fetchUserCardSnapshots(userId)
  }
  catch (err) {
    if (err instanceof NetworkError) {
      // No network — fall back to legacy user_cards fetch
      try {
        const remoteCards = await fetchRemoteUserCards(userId)
        await mergeRemoteCardsIntoDexie(userId, remoteCards)
      }
      catch {
        // Still no network — skip onboarding, retry on next login
        return
      }
      queryClient.invalidateQueries({ queryKey: ['user-cards', userId] })
      return
    }
    throw err
  }

  if (snapshots.length > 0) {
    // Seed Dexie from snapshots
    await seedFromSnapshots(userId, snapshots)

    // Set the cursor to the max cursor_id from snapshots so downloadNewReviews
    // only fetches events after the snapshot (not the full history)
    const maxCursor = snapshots.reduce((m, s) => Math.max(m, s.cursor_id), 0)
    const existingCursor = (await db.settings.get('review_log_cursor'))?.value as number ?? 0
    if (maxCursor > existingCursor) {
      await db.settings.put({ key: 'review_log_cursor', value: maxCursor })
    }
  }

  // Download any review events newer than the snapshot cursor
  try {
    await downloadNewReviews(userId)
  }
  catch (err) {
    if (err instanceof NetworkError)
      return
    throw err
  }

  // Identify which datasets are needed and seed any that are missing
  const allCards = await db.srs_cards.where('[userId+cardType]').equals([userId, 'vocab']).toArray()
  const neededPrefixes = new Set(allCards.map(c => c.cardId.split('_')[0]))

  if (neededPrefixes.size > 0) {
    await Promise.all(
      [...neededPrefixes].map(prefix =>
        seedDatasetLazy(prefix).catch((err) => {
          if (err instanceof NetworkError)
            return
          throw err
        }),
      ),
    )
  }

  queryClient.invalidateQueries({ queryKey: ['user-cards', userId] })
}
