import type { QueryClient } from '@tanstack/react-query'
import type { RemoteUserCard } from '../api/user-cards'
import type { RemoteSnapshot } from '../types/review-log'
import { NetworkError } from '../api/auth'
import { fetchProfile } from '../api/profiles'
import { fetchUserCardSnapshots } from '../api/review-log'
import { supabase } from '../api/supabase'
import { fetchRemoteUserCards } from '../api/user-cards'
import { bookCodePrefixToSource } from '../lib/datasets.config'
import { db } from './schema'
import { seedDatabase } from './seed'
import { downloadNewReviews } from './sync'

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
    const local = await db.user_cards.get([userId, remote.vocab_id])

    if (!local || remote.updated_at > local.updated_at) {
      await db.user_cards.put({
        userId,
        vocabId: remote.vocab_id,
        interval_days: remote.interval_days,
        ease_factor: remote.ease_factor,
        due_date: remote.due_date,
        review_count: remote.review_count,
        last_rating: remote.last_rating as (0 | 1 | 2 | 3 | null),
        pending_sync: false,
        updated_at: remote.updated_at,
        is_known: remote.is_known,
      })
    }
  }
}

// ----------------------------------------------------------------
// Seed Dexie from server-side snapshots (fast bootstrap)
// ----------------------------------------------------------------
async function seedFromSnapshots(userId: string, snapshots: RemoteSnapshot[]): Promise<void> {
  for (const s of snapshots) {
    if (s.card_type === 'vocab') {
      const local = await db.user_cards.get([userId, s.vocab_id])
      if (!local || s.snapshot_at > local.updated_at) {
        await db.user_cards.put({
          userId,
          vocabId: s.vocab_id,
          interval_days: s.interval_days,
          ease_factor: s.ease_factor,
          due_date: s.due_date,
          review_count: s.review_count,
          last_rating: s.last_rating as (0 | 1 | 2 | 3 | null),
          pending_sync: false,
          updated_at: s.snapshot_at,
          is_known: s.is_known,
        })
      }
    }
    else if (s.card_type === 'kanji') {
      const local = await db.kanji_cards.get([userId, s.vocab_id])
      if (!local || s.snapshot_at > (local.updated_at ?? '')) {
        await db.kanji_cards.put({
          userId,
          char: s.vocab_id,
          interval_days: s.interval_days,
          ease_factor: s.ease_factor,
          due_date: s.due_date,
          review_count: s.review_count,
          last_rating: s.last_rating as (0 | 1 | 2 | 3 | null),
          pending_sync: false,
          updated_at: s.snapshot_at,
        })
      }
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
  const allCards = await db.user_cards.where({ userId }).toArray()
  const neededPrefixes = new Set(allCards.map(c => c.vocabId.split('_')[0]))
  const neededSources = [...neededPrefixes]
    .map(prefix => bookCodePrefixToSource[prefix])
    .filter(Boolean)

  if (neededSources.length > 0) {
    await Promise.all(neededSources.map(() => seedDatabase().catch(() => {})))
  }

  queryClient.invalidateQueries({ queryKey: ['user-cards', userId] })
}
