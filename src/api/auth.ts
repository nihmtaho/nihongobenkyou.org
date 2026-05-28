import type { AccountDeletionState, OAuthProvider } from '../types/user'
import { supabase } from './supabase'

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials'))
    return 'Email hoặc mật khẩu không đúng'
  if (message.includes('Email not confirmed'))
    return 'Vui lòng xác nhận email trước khi đăng nhập'
  if (message.includes('User already registered') || message.includes('already been registered'))
    return 'Email này đã được đăng ký'
  if (message.includes('Password should be at least'))
    return 'Mật khẩu phải có ít nhất 8 ký tự'
  if (message.includes('Unable to validate email address'))
    return 'Địa chỉ email không hợp lệ'
  if (message.includes('Token has expired') || message.includes('token_expired'))
    return 'Liên kết hết hạn'
  if (message.includes('over_request_rate_limit') || message.includes('rate limit'))
    return 'Quá nhiều yêu cầu, vui lòng thử lại sau'
  if (message.includes('Unsupported provider') || message.includes('provider is not enabled'))
    return 'Đăng nhập Google chưa được kích hoạt trên hệ thống'
  return 'Đã xảy ra lỗi. Vui lòng thử lại'
}

function getAppUrl(): string {
  return (import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin
}

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getAppUrl()}/auth/callback` },
  })
  if (error) {
    if (error.status === 0 || error.status === undefined || error.status >= 500)
      throw new NetworkError(mapAuthError(error.message))
    throw new AuthError(mapAuthError(error.message))
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.status === 0 || error.status === undefined || error.status >= 500)
      throw new NetworkError(mapAuthError(error.message))
    throw new AuthError(mapAuthError(error.message))
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error)
    throw new NetworkError(mapAuthError(error.message))
}

export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${getAppUrl()}/auth/callback` },
  })
  if (error)
    throw new NetworkError(mapAuthError(error.message))
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error)
    throw new AuthError(mapAuthError(error.message))
}

/** @deprecated Use signInWithOAuth('google') instead */
export async function signInWithGoogle(): Promise<void> {
  return signInWithOAuth('google')
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  // Always resolves — never reveal whether email exists
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${import.meta.env.VITE_APP_URL as string}/auth/reset-password`,
  })
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    if (error.message.includes('expired') || error.message.includes('token'))
      throw new AuthError(mapAuthError(error.message))
    throw new NetworkError(mapAuthError(error.message))
  }
}

export async function checkAccountStatus(userId: string): Promise<AccountDeletionState> {
  const { data, error } = await supabase
    .from('profiles')
    .select('deleted_at')
    .eq('user_id', userId)
    .single()

  if (error) {
    // Profile not found — new user, not deleted
    if (error.code === 'PGRST116')
      return { isDeleted: false, deletedAt: null, isWithinGracePeriod: false }
    throw new NetworkError(error.message)
  }

  if (!data?.deleted_at)
    return { isDeleted: false, deletedAt: null, isWithinGracePeriod: false }

  const deletedAt = new Date(data.deleted_at)
  const gracePeriodCutoff = new Date()
  gracePeriodCutoff.setDate(gracePeriodCutoff.getDate() - 30)

  return {
    isDeleted: true,
    deletedAt: data.deleted_at,
    isWithinGracePeriod: deletedAt > gracePeriodCutoff,
  }
}

export async function reactivateAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user)
    throw new AuthError('Phải đăng nhập để khôi phục tài khoản')

  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: null })
    .eq('user_id', session.user.id)

  if (error) {
    if (error.code === 'PGRST116')
      throw new AuthError('Tài khoản không tồn tại hoặc đã bị xóa vĩnh viễn')
    throw new NetworkError(error.message)
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user.id ?? null
}

export async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user)
    throw new AuthError('Phải đăng nhập để xóa tài khoản')

  const { error } = await supabase.functions.invoke('delete-account')
  if (error)
    throw new NetworkError(error.message)

  await supabase.auth.signOut()
}
