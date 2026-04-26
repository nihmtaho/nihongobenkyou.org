import type { QueryClient } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  checkAccountStatus,
  reactivateAccount,
  signIn,
  signOut,
  signUp,
} from '../api/auth'
import { supabase } from '../api/supabase'
import { db } from '../db/schema'
import { migrateAnonymousData } from '../lib/auth-migration'
import { useAuthStore } from '../stores/authStore'

async function handleFirstSignIn(userId: string, queryClient: QueryClient): Promise<void> {
  // 1. Migrate anonymous SRS data if this is a first-time login
  const anonSetting = await db.settings.get('anonymous_user_id')
  const anonId = anonSetting?.value as string | undefined
  if (anonId && anonId !== userId) {
    await migrateAnonymousData(anonId, userId)
  }

  // 2. Check if account was soft-deleted within grace period — reactivate silently
  try {
    const status = await checkAccountStatus(userId)
    if (status.isDeleted && status.isWithinGracePeriod) {
      await reactivateAccount()
      useAuthStore.setState({ reactivationBannerVisible: true })
    }
  }
  catch {
    // NetworkError during status check — do not block login
  }

  // 3. Trigger profile hydration query
  await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
}

export function useAuth() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        useAuthStore.setState({
          userId: session.user.id,
          email: session.user.email ?? null,
          isAuthenticated: true,
          isLoading: false,
        })

        if (event === 'SIGNED_IN') {
          void handleFirstSignIn(session.user.id, queryClient)
        }

        if (event === 'TOKEN_REFRESHED') {
          void queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] })
        }
      }
      else {
        // Anonymous user ID is set by initAnonymousUser() before React renders.
        // Only clear auth state when there is truly no identity.
        const existingUserId = useAuthStore.getState().userId
        if (!existingUserId) {
          useAuthStore.setState({
            userId: null,
            email: null,
            isAuthenticated: false,
            isLoading: false,
            displayName: null,
            avatarUrl: null,
            reactivationBannerVisible: false,
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
    onSuccess: () => {
      useAuthStore.setState({
        userId: null,
        email: null,
        isAuthenticated: false,
        displayName: null,
        avatarUrl: null,
        reactivationBannerVisible: false,
      })
      queryClient.clear()
    },
    retry: 0,
  })

  return { loginMutation, registerMutation, logoutMutation }
}
