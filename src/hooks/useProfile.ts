import { useMutation, useQuery } from '@tanstack/react-query'
import { AuthError } from '../api/auth'
import { fetchProfile, getSignedAvatarUrl, updateProfile } from '../api/profiles'
import { uploadAvatar } from '../api/storage'
import { useAuthStore } from '../stores/authStore'

export function useProfileQuery() {
  const userId = useAuthStore(s => s.userId)
  const email = useAuthStore(s => s.email)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  // Only query for real (non-anonymous) authenticated users
  const isRealUser = isAuthenticated && email !== null && userId !== null

  return useQuery({
    queryKey: ['profile', userId],
    enabled: isRealUser,
    staleTime: 300_000, // 5 min
    retry: 0,
    queryFn: async () => {
      try {
        const profile = await fetchProfile(userId!)
        let signedAvatarUrl: string | null = null
        if (profile.avatar_url) {
          signedAvatarUrl = await getSignedAvatarUrl(profile.avatar_url)
        }
        useAuthStore.setState({
          displayName: profile.display_name,
          avatarUrl: signedAvatarUrl,
        })
        return { ...profile, signedAvatarUrl }
      }
      catch (err) {
        if (err instanceof AuthError)
          throw err
        // NetworkError — serve cached store values without blocking
        return null
      }
    },
  })
}

export function useProfile() {
  const userId = useAuthStore(s => s.userId)

  const updateDisplayName = useMutation({
    mutationFn: async (name: string) => {
      if (!userId)
        throw new Error('Chưa đăng nhập')
      const updated = await updateProfile(userId, { display_name: name })
      useAuthStore.setState({ displayName: updated.display_name })
      return updated
    },
    retry: 0,
  })

  const updateAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!userId)
        throw new Error('Chưa đăng nhập')
      const path = await uploadAvatar(userId, file)
      await updateProfile(userId, { avatar_url: path })
      const signedUrl = await getSignedAvatarUrl(path)
      useAuthStore.setState({ avatarUrl: signedUrl })
      return signedUrl
    },
    retry: 0,
  })

  return { updateDisplayName, updateAvatar }
}
