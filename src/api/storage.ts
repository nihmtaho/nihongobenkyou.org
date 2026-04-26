import { supabase } from './supabase'

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (error)
    throw new Error(error.message)

  // Return the storage path, NOT a signed URL.
  // Callers use getSignedAvatarUrl(path) from src/api/profiles.ts to derive a signed URL on demand.
  return path
}

export async function deleteAvatar(userId: string): Promise<void> {
  const { error } = await supabase.storage
    .from('avatars')
    .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.webp`])

  if (error)
    throw new Error(error.message)
}
