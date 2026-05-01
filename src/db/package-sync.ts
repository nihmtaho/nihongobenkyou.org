import type { SyncPackagePayload } from '../types/sync-package'

import { AuthError, NetworkError } from '../api/auth'
import { supabase } from '../api/supabase'
import { fetchRemotePackage, uploadSyncPackage } from '../api/sync-package'
import { db } from './schema'

const DEVICE_ID_KEY = 'sync_device_id'
const PACKAGE_VERSION_KEY = 'sync_package_version'

async function getOrCreateDeviceId(): Promise<string> {
  const setting = await db.settings.get(DEVICE_ID_KEY)
  if (setting?.value)
    return setting.value as string

  const id = crypto.randomUUID()
  await db.settings.put({ key: DEVICE_ID_KEY, value: id })
  return id
}

async function getLocalVersion(): Promise<number> {
  const setting = await db.settings.get(PACKAGE_VERSION_KEY)
  return (setting?.value as number | undefined) ?? 0
}

async function setLocalVersion(version: number): Promise<void> {
  await db.settings.put({ key: PACKAGE_VERSION_KEY, value: version })
}

export async function buildPackage(userId: string): Promise<SyncPackagePayload> {
  const [userCards, kanjiCards, customDecks, customVocab, reviewLog, streaks] = await Promise.all([
    db.user_cards.toCollection().filter(c => c.userId === userId).toArray(),
    db.kanji_cards.toCollection().filter(c => c.userId === userId).toArray(),
    db.custom_decks.where('user_id').equals(userId).toArray(),
    db.custom_vocabulary.where('user_id').equals(userId).toArray(),
    db.review_log.filter(e => e.userId === userId).toArray(),
    db.streaks.where('userId').equals(userId).toArray(),
  ])

  return {
    user_cards: userCards,
    kanji_cards: kanjiCards,
    custom_decks: customDecks,
    custom_vocabulary: customVocab,
    review_log: reviewLog,
    streaks,
  }
}

export async function mergePackageIntoDexie(
  userId: string,
  payload: SyncPackagePayload,
): Promise<number> {
  return db.transaction('rw', [
    'user_cards',
    'kanji_cards',
    'custom_decks',
    'custom_vocabulary',
    'review_log',
    'streaks',
  ], async () => {
    let imported = 0

    for (const remote of payload.user_cards ?? []) {
      if (remote.userId !== userId)
        continue
      const local = await db.user_cards.get([userId, remote.vocabId])
      if (!local || remote.updated_at > local.updated_at) {
        await db.user_cards.put({ ...remote, pending_sync: false })
        imported++
      }
    }

    for (const remote of payload.kanji_cards ?? []) {
      if (remote.userId !== userId)
        continue
      const local = await db.kanji_cards.get([userId, remote.char])
      if (!local || (remote.updated_at ?? '') > (local.updated_at ?? '')) {
        await db.kanji_cards.put({ ...remote, pending_sync: false })
        imported++
      }
    }

    for (const remote of payload.custom_decks ?? []) {
      if (remote.user_id !== userId)
        continue
      const local = await db.custom_decks.get(remote.id)
      if (!local || remote.updated_at > local.updated_at) {
        await db.custom_decks.put(remote)
        imported++
      }
    }

    // custom_vocabulary: append-only — add items that don't exist locally
    for (const remote of payload.custom_vocabulary ?? []) {
      if (remote.user_id !== userId)
        continue
      const local = await db.custom_vocabulary.get(remote.id)
      if (!local) {
        await db.custom_vocabulary.put(remote)
        imported++
      }
    }

    // review_log: append-only — dedup by (vocabId, cardType, reviewedAt).
    // Build a Set of existing natural keys to avoid a per-entry async lookup.
    const existingKeys = new Set(
      (await db.review_log.filter(e => e.userId === userId).toArray())
        .map(e => `${e.vocabId}:${e.cardType}:${e.reviewedAt}`),
    )
    for (const remote of payload.review_log ?? []) {
      if (remote.userId !== userId)
        continue
      const key = `${remote.vocabId}:${remote.cardType}:${remote.reviewedAt}`
      if (!existingKeys.has(key)) {
        const { id: _id, ...entry } = remote
        await db.review_log.add({ ...entry, pendingSync: false })
        existingKeys.add(key)
        imported++
      }
    }

    // streaks: upsert by date — keep whichever has the higher current_streak.
    for (const remote of payload.streaks ?? []) {
      if (remote.userId !== userId)
        continue
      const local = await db.streaks.get(remote.date)
      if (!local || remote.current_streak > local.current_streak) {
        await db.streaks.put({ ...remote, userId })
        imported++
      }
    }

    return imported
  })
}

let isSyncing = false

export async function syncPackage(userId: string): Promise<void> {
  if (isSyncing)
    return
  isSyncing = true

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session)
      return

    const [deviceId, localVersion] = await Promise.all([
      getOrCreateDeviceId(),
      getLocalVersion(),
    ])

    let remoteVersion = 0
    let remotePayload: SyncPackagePayload | null = null

    try {
      const remote = await fetchRemotePackage(userId)
      remoteVersion = remote?.version ?? 0
      remotePayload = remote?.payload ?? null
    }
    catch (err) {
      if (err instanceof NetworkError)
        return
      throw err
    }

    // If remote is newer, merge into local before building the upload payload
    if (remoteVersion > localVersion && remotePayload) {
      await mergePackageIntoDexie(userId, remotePayload)
    }

    const payload = await buildPackage(userId)
    const uploadVersion = Math.max(remoteVersion, localVersion) + 1

    try {
      const confirmedVersion = await uploadSyncPackage(deviceId, uploadVersion, payload)

      if (confirmedVersion !== uploadVersion) {
        // Upload rejected — another device holds a newer version
        // Download it so next cycle builds from merged state
        try {
          const newerRemote = await fetchRemotePackage(userId)
          if (newerRemote?.payload) {
            await mergePackageIntoDexie(userId, newerRemote.payload)
          }
        }
        catch {
          // NetworkError — leave local version as-is, retry next cycle
        }
      }

      await setLocalVersion(confirmedVersion)
    }
    catch (err) {
      if (err instanceof AuthError)
        throw err
      // NetworkError or SyncError — leave version unchanged, retry next cycle
    }

    window.dispatchEvent(new Event('sync-complete'))
  }
  finally {
    isSyncing = false
  }
}

// Used on new device login: download and apply the remote package without uploading.
export async function downloadPackageForNewDevice(userId: string): Promise<void> {
  let remote: Awaited<ReturnType<typeof fetchRemotePackage>>
  try {
    remote = await fetchRemotePackage(userId)
  }
  catch (err) {
    if (err instanceof NetworkError)
      return
    throw err
  }

  if (!remote?.payload)
    return

  await mergePackageIntoDexie(userId, remote.payload)
  await setLocalVersion(remote.version)
}
