import type { QueryClient } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  checkAccountStatus,
  NetworkError,
  reactivateAccount,
  resendConfirmationEmail,
  signIn,
  signInWithOAuth,
  signOut,
  signUp,
} from '../api/auth'
import { supabase } from '../api/supabase'
import { onboardNewDevice } from '../db/onboarding'
import { downloadPackageForNewDevice } from '../db/package-sync'
import { db } from '../db/schema'
import { SeedError } from '../db/seed'
import { migrateAnonymousData } from '../lib/auth-migration'
import { useAuthStore } from '../stores/authStore'
import { runGuestMigration } from './useMigrateGuestDecks'

async function handleFirstSignIn(userId: string, queryClient: QueryClient): Promise<void> {
  // 1. Migrate anonymous SRS data if this is a first-time login
  const anonSetting = await db.settings.get('anonymous_user_id')
  const anonId = anonSetting?.value as string | undefined
  if (anonId && anonId !== userId) {
    await migrateAnonymousData(anonId, userId)
  }

  // Migrate any custom decks created as guest → real user
  await runGuestMigration(userId)

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

  // 3. Fetch remote SRS state and seed required datasets on this device
  try {
    await onboardNewDevice(userId, queryClient)
  }
  catch (err) {
    if (err instanceof SeedError)
      throw err
    console.error('onboardNewDevice failed (non-blocking):', err)
  }

  // 4. Download sync package (includes custom_decks + custom_vocabulary)
  try {
    await downloadPackageForNewDevice(userId)
  }
  catch (err) {
    if (!(err instanceof NetworkError))
      console.error('downloadPackageForNewDevice failed (non-blocking):', err)
  }

  // 5. Trigger profile hydration query
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

  const oauthMutation = useMutation({
    mutationFn: (provider: Parameters<typeof signInWithOAuth>[0]) =>
      signInWithOAuth(provider),
    retry: 0,
  })

  const resendMutation = useMutation({
    mutationFn: (email: string) => resendConfirmationEmail(email),
    retry: 0,
  })

  return { loginMutation, registerMutation, logoutMutation, oauthMutation, resendMutation }
}
