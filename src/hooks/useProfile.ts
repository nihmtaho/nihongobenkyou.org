import { useMutation } from '@tanstack/react-query'
import { uploadAvatar } from '../api/storage'
import { supabase } from '../api/supabase'
import { useAuthStore } from '../stores/authStore'

export function useProfile() {
  const userId = useAuthStore(s => s.userId)

  const updateDisplayName = useMutation({
    mutationFn: async (name: string) => {
      if (!userId)
        throw new Error('Chưa đăng nhập')
      const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: userId, display_name: name }, { onConflict: 'user_id' })
      if (error)
        throw new Error(error.message)
      useAuthStore.setState({ displayName: name })
    },
    retry: 0,
  })

  const updateAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!userId)
        throw new Error('Chưa đăng nhập')
      const signedUrl = await uploadAvatar(userId, file)
      const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: userId, avatar_url: signedUrl }, { onConflict: 'user_id' })
      if (error)
        throw new Error(error.message)
      useAuthStore.setState({ avatarUrl: signedUrl })
      return signedUrl
    },
    retry: 0,
  })

  return { updateDisplayName, updateAvatar }
}
