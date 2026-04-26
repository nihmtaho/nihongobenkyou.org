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
