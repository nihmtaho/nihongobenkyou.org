import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { signIn, signOut, signUp } from '../api/auth'
import { supabase } from '../api/supabase'
import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        useAuthStore.setState({
          userId: session.user.id,
          email: session.user.email ?? null,
          isAuthenticated: true,
          isLoading: false,
        })
      }
      else {
        // In Phase 1, anonymous user ID is set by initAnonymousUser() before React renders.
        // Only clear auth state when there is truly no identity (no Supabase session AND no anonymous ID).
        const existingUserId = useAuthStore.getState().userId
        if (!existingUserId) {
          useAuthStore.setState({
            userId: null,
            email: null,
            isAuthenticated: false,
            isLoading: false,
            displayName: null,
            avatarUrl: null,
          })
          queryClient.clear()
        }
        else {
          useAuthStore.setState({ isLoading: false })
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [queryClient])

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string, password: string }) =>
      signIn(email, password),
    retry: 0,
  })

  const registerMutation = useMutation({
    mutationFn: ({ email, password }: { email: string, password: string }) =>
      signUp(email, password),
    retry: 0,
  })

  const logoutMutation = useMutation({
    mutationFn: () => signOut(),
    retry: 0,
  })

  return { loginMutation, registerMutation, logoutMutation }
}
