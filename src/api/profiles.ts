import type { UserProfile } from '../types/user'
import { AuthError, NetworkError } from './auth'
import { supabase } from './supabase'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

function classifyError(error: { message: string, status?: number, code?: string }): never {
  if (error.status === 401 || error.code === 'PGRST301')
    throw new AuthError(error.message)
  throw new NetworkError(error.message)
}

export async function fetchProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url, created_at, updated_at, deleted_at, progress_reset_at')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116')
      throw new AuthError('Hồ sơ không tồn tại')
    classifyError(error)
  }

  return data as UserProfile
}

export async function markProgressReset(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ progress_reset_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error)
    classifyError(error)
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>,
): Promise<UserProfile> {
  if (updates.display_name !== undefined && updates.display_name !== null) {
    if (updates.display_name.length > 50)
      throw new ValidationError('Tên hiển thị tối đa 50 ký tự')

    if (updates.display_name.length === 0)
      throw new ValidationError('Tên hiển thị không được để trống')
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select('user_id, display_name, avatar_url, created_at, updated_at, deleted_at, progress_reset_at')
    .single()

  if (error)
    classifyError(error)

  return data as UserProfile
}

export async function softDeleteProfile(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error)
    classifyError(error)
}

export async function reactivateProfile(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ deleted_at: null })
    .eq('user_id', userId)
    .select('user_id')
    .single()

  if (error) {
    if (error.code === 'PGRST116')
      throw new AuthError('Tài khoản không tồn tại hoặc đã bị xóa vĩnh viễn')
    classifyError(error)
  }

  if (!data)
    throw new AuthError('Tài khoản không tồn tại hoặc đã bị xóa vĩnh viễn')
}

export async function getSignedAvatarUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 3600)

  if (error || !data?.signedUrl)
    throw new NetworkError('Không thể tạo URL avatar')

  return data.signedUrl
}
