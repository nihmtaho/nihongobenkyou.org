import type { SyncPackagePayload } from '../types/sync-package'

import { AuthError, getCurrentUserId, NetworkError } from '../api/auth'
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
  const [srsCards, customDecks, customVocab, streaks] = await Promise.all([
    db.srs_cards.filter(c => c.userId === userId).toArray(),
    db.custom_decks.where('user_id').equals(userId).toArray(),
    db.custom_vocabulary.where('user_id').equals(userId).toArray(),
    db.streaks.where('userId').equals(userId).toArray(),
  ])
  return { srs_cards: srsCards, custom_decks: customDecks, custom_vocabulary: customVocab, streaks }
}

export async function mergePackageIntoDexie(
  userId: string,
  payload: SyncPackagePayload,
): Promise<number> {
  return db.transaction('rw', [
    'srs_cards',
    'custom_decks',
    'custom_vocabulary',
    'streaks',
  ], async () => {
    let imported = 0

    // srs_cards: bulkGet → Map → filter winners → bulkPut (2 bulk ops instead of n individual ops)
    const remoteSrsCards = (payload.srs_cards ?? []).filter(r => r.userId === userId)
    if (remoteSrsCards.length > 0) {
      // NOTE: srs_cards uses a compound primary key [userId+cardId]; Dexie types it as `never`
      // so we must cast — bulkGet with compound keys works correctly at runtime.
      const remoteKeys = remoteSrsCards.map(r => [userId, r.cardId]) as never[]
      const localCards = await db.srs_cards.bulkGet(remoteKeys)
      const localSrsMap = new Map(localCards.filter(Boolean).map(c => [c!.cardId, c!]))
      const srsWinners = remoteSrsCards
        .filter((remote) => {
          const local = localSrsMap.get(remote.cardId)
          return !local || remote.updated_at > local.updated_at
        })
        .map(remote => ({ ...remote, pending_sync: false as const }))
      if (srsWinners.length > 0) {
        await db.srs_cards.bulkPut(srsWinners)
        imported += srsWinners.length
      }
    }

    // custom_decks: bulkGet → Map → filter winners → bulkPut
    const remoteDecks = (payload.custom_decks ?? []).filter(r => r.user_id === userId)
    if (remoteDecks.length > 0) {
      const localDecks = await db.custom_decks.bulkGet(remoteDecks.map(r => r.id))
      const localDecksMap = new Map(localDecks.filter(Boolean).map(d => [d!.id, d!]))
      const deckWinners = remoteDecks.filter((remote) => {
        const local = localDecksMap.get(remote.id)
        return !local || remote.updated_at > local.updated_at
      })
      if (deckWinners.length > 0) {
        await db.custom_decks.bulkPut(deckWinners)
        imported += deckWinners.length
      }
    }

    // custom_vocabulary: bulkGet → Map → filter winners → bulkPut
    const remoteVocab = (payload.custom_vocabulary ?? []).filter(r => r.user_id === userId)
    if (remoteVocab.length > 0) {
      const localVocab = await db.custom_vocabulary.bulkGet(remoteVocab.map(r => r.id))
      const localVocabMap = new Map(localVocab.filter(Boolean).map(v => [v!.id, v!]))
      const vocabWinners = remoteVocab.filter((remote) => {
        const local = localVocabMap.get(remote.id)
        return !local || (remote.updated_at ?? '') >= (local.updated_at ?? '')
      })
      if (vocabWinners.length > 0) {
        await db.custom_vocabulary.bulkPut(vocabWinners)
        imported += vocabWinners.length
      }
    }

    // streaks: keep per-record logic (non-trivial max_streak merge requires reading each local record)
    for (const remote of payload.streaks ?? []) {
      if (remote.userId !== userId)
        continue
      const local = await db.streaks.get(remote.date)
      if (!local || remote.current_streak > local.current_streak) {
        await db.streaks.put({
          ...remote,
          userId,
          max_streak: local ? Math.max(local.max_streak, remote.max_streak) : remote.max_streak,
        })
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
    const authedUserId = await getCurrentUserId()
    if (!authedUserId)
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

      let mergedRejectedVersion = true
      if (confirmedVersion !== uploadVersion) {
        // Upload rejected — another device holds a newer version.
        // Download it and merge so next cycle builds from merged state.
        try {
          const newerRemote = await fetchRemotePackage(userId)
          if (newerRemote?.payload) {
            await mergePackageIntoDexie(userId, newerRemote.payload)
          }
        }
        catch {
          // NetworkError — don't advance local version; retry next cycle with merged state
          mergedRejectedVersion = false
        }
      }

      if (mergedRejectedVersion) {
        await setLocalVersion(confirmedVersion)
      }
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
