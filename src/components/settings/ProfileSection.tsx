import { Link } from '@tanstack/react-router'
import { useCallback, useRef, useState } from 'react'

import { useProfile, useProfileQuery } from '../../hooks/useProfile'
import { useAuthStore } from '../../stores/authStore'
import { AvatarUpload } from '../profile/AvatarUpload'

export function ProfileSection() {
  const { userId, email, displayName, avatarUrl } = useAuthStore()
  const isRealUser = email !== null && userId !== null

  const { updateDisplayName } = useProfile()
  const { isLoading: profileLoading } = useProfileQuery()

  const [nameValue, setNameValue] = useState(displayName ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNameChange = useCallback((value: string) => {
    setNameValue(value)
    if (debounceRef.current)
      clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (value.trim())
        updateDisplayName.mutate(value.trim())
    }, 800)
  }, [updateDisplayName])

  function handleNameBlur() {
    if (debounceRef.current)
      clearTimeout(debounceRef.current)
    if (nameValue.trim() && nameValue.trim() !== displayName)
      updateDisplayName.mutate(nameValue.trim())
  }

  return (
    <div className="card bg-base-200 border border-base-content/10 p-4">
      <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">HỒ SƠ</h2>
      {isRealUser
        ? (
            <>
              {profileLoading && <div className="skeleton h-24 w-full mb-4" />}
              <AvatarUpload currentUrl={avatarUrl} displayName={displayName} />
              <div className="form-control mt-4">
                <label className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral mb-1">
                  TÊN HIỂN THỊ
                </label>
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
                  <span className="text-[10px] font-[var(--br-mono-font)] text-base-content/50 mt-1">
                    Đang lưu...
                  </span>
                )}
              </div>
              {email && (
                <p className="text-xs text-neutral font-[var(--br-mono-font)] mt-2 truncate">
                  {email}
                </p>
              )}
            </>
          )
        : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-neutral font-[var(--br-mono-font)]">
                Đang dùng với tư cách Khách — tiến trình lưu trên thiết bị này.
              </p>
              <div className="flex gap-2">
                <Link
                  to="/auth/login"
                  className="btn btn-primary btn-sm font-[var(--br-heading-font)] uppercase flex-1"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/auth/register"
                  className="btn btn-outline btn-sm font-[var(--br-heading-font)] uppercase flex-1"
                >
                  Tạo tài khoản
                </Link>
              </div>
            </div>
          )}
    </div>
  )
}
