import { supabase } from './supabase'

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (error)
    throw new Error(error.message)

  const { data } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 3600)

  if (!data?.signedUrl)
    throw new Error('Không thể tạo URL avatar')
  return data.signedUrl
}

export async function deleteAvatar(userId: string): Promise<void> {
  const { error } = await supabase.storage
    .from('avatars')
    .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.webp`])

  if (error)
    throw new Error(error.message)
}
