import { createFileRoute, redirect } from '@tanstack/react-router'
import { useCallback, useRef, useState } from 'react'
import { AvatarUpload } from '../../components/profile/AvatarUpload'
import { useProfile } from '../../hooks/useProfile'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/profile/')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: ProfilePage,
})

function ProfilePage() {
  const { displayName, avatarUrl } = useAuthStore()
  const { updateDisplayName } = useProfile()
  const [nameValue, setNameValue] = useState(displayName ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNameChange = useCallback((value: string) => {
    setNameValue(value)
    if (debounceRef.current)
      clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        updateDisplayName.mutate(value.trim())
      }
    }, 800)
  }, [updateDisplayName])

  function handleNameBlur() {
    if (debounceRef.current)
      clearTimeout(debounceRef.current)
    if (nameValue.trim() && nameValue.trim() !== displayName) {
      updateDisplayName.mutate(nameValue.trim())
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">
      <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight">
        HỒ SƠ
      </h1>

      <div className="card bg-base-200 border border-base-content/10 p-6">
        <AvatarUpload currentUrl={avatarUrl} displayName={displayName} />
      </div>

      <div className="card bg-base-200 border border-base-content/10 p-4">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
          TÊN HIỂN THỊ
        </h2>
        <div className="form-control">
          <input
            type="text"
            value={nameValue}
            maxLength={50}
            onChange={e => handleNameChange(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="Tên của bạn"
            className="input input-bordered w-full"
          />
          {updateDisplayName.isPending && (
            <span className="label-text-alt mt-1 font-[var(--br-mono-font)] text-[10px] text-base-content/50">
              Đang lưu...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
