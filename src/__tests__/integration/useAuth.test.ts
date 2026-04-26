import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/authStore'

// Mock at the API boundary — tests hook behaviour without needing a live Supabase connection
vi.mock('../../api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/auth')>()
  return {
    ...actual,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }
})

// Stub onAuthStateChange so the effect doesn't try to connect
vi.mock('../../api/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}))

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeEach(() => {
  useAuthStore.setState({
    userId: null,
    email: null,
    isAuthenticated: false,
    isLoading: false,
    displayName: null,
    avatarUrl: null,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useAuth — loginMutation', () => {
  it('resolves successfully when signIn succeeds', async () => {
    const { signIn } = await import('../../api/auth')
    vi.mocked(signIn).mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() })

    result.current.loginMutation.mutate({ email: 'test@example.com', password: 'password123' })
    await waitFor(() => expect(result.current.loginMutation.isSuccess).toBe(true))
    expect(signIn).toHaveBeenCalledWith('test@example.com', 'password123')
  })

  it('exposes Vietnamese error message when signIn fails with AuthError', async () => {
    const { signIn } = await import('../../api/auth')
    vi.mocked(signIn).mockRejectedValue(new AuthError('Email hoặc mật khẩu không đúng'))

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() })

    result.current.loginMutation.mutate({ email: 'test@example.com', password: 'wrong' })
    await waitFor(() => expect(result.current.loginMutation.isError).toBe(true))
    expect(result.current.loginMutation.error?.message).toBe('Email hoặc mật khẩu không đúng')
  })

  it('does not retry on failure (retry: 0)', async () => {
    const { signIn } = await import('../../api/auth')
    vi.mocked(signIn).mockRejectedValue(new AuthError('Đã xảy ra lỗi'))

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() })

    result.current.loginMutation.mutate({ email: 'test@example.com', password: 'pass' })
    await waitFor(() => expect(result.current.loginMutation.isError).toBe(true))
    expect(signIn).toHaveBeenCalledTimes(1)
  })
})

describe('useAuth — registerMutation', () => {
  it('resolves successfully when signUp succeeds', async () => {
    const { signUp } = await import('../../api/auth')
    vi.mocked(signUp).mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() })

    result.current.registerMutation.mutate({ email: 'new@example.com', password: 'password123' })
    await waitFor(() => expect(result.current.registerMutation.isSuccess).toBe(true))
    expect(signUp).toHaveBeenCalledWith('new@example.com', 'password123')
  })

  it('exposes error when email already registered', async () => {
    const { signUp } = await import('../../api/auth')
    vi.mocked(signUp).mockRejectedValue(new AuthError('Email này đã được đăng ký'))

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() })

    result.current.registerMutation.mutate({ email: 'existing@example.com', password: 'password123' })
    await waitFor(() => expect(result.current.registerMutation.isError).toBe(true))
    expect(result.current.registerMutation.error?.message).toBe('Email này đã được đăng ký')
  })
})

describe('useAuth — logoutMutation', () => {
  it('calls signOut when logout is triggered', async () => {
    const { signOut } = await import('../../api/auth')
    vi.mocked(signOut).mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() })

    result.current.logoutMutation.mutate()
    await waitFor(() => expect(result.current.logoutMutation.isSuccess).toBe(true))
    expect(signOut).toHaveBeenCalledTimes(1)
  })
})
