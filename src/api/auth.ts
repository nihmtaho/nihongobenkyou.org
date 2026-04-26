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
  return 'Đã xảy ra lỗi. Vui lòng thử lại'
}

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password })
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

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${import.meta.env.VITE_APP_URL as string}/auth/callback` },
  })
  if (error)
    throw new NetworkError(mapAuthError(error.message))
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
