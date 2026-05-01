import type { RemoteSyncPackage, SyncPackagePayload } from '../types/sync-package'
import { AuthError, NetworkError } from './auth'
import { supabase } from './supabase'
import { SyncError } from './user-cards'

function classifyError(error: { status?: number, message: string }): never {
  if (error.status === 401)
    throw new AuthError(error.message)
  if (!error.status || error.status >= 500)
    throw new NetworkError(error.message)
  throw new SyncError(error.message)
}

export async function fetchRemotePackage(userId: string): Promise<RemoteSyncPackage | null> {
  const { data, error } = await supabase
    .from('user_sync_packages')
    .select('user_id,version,device_id,updated_at,payload')
    .eq('user_id', userId)
    .maybeSingle()

  if (error)
    classifyError(error)

  return data as RemoteSyncPackage | null
}

// Returns the version stored on the server after the attempt.
// If the returned value differs from p_version, the upload was rejected
// because another device holds a newer version.
export async function uploadSyncPackage(
  deviceId: string,
  version: number,
  payload: SyncPackagePayload,
): Promise<number> {
  const { data, error } = await supabase.rpc('upload_sync_package', {
    p_device_id: deviceId,
    p_version: version,
    p_payload: payload,
  })

  if (error)
    classifyError(error)

  return (data as number) ?? version
}
