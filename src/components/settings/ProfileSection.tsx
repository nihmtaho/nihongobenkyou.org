import { Link } from '@tanstack/react-router'
import { useCallback, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
    <Card className="p-4">
      <CardContent className="p-0">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">HỒ SƠ</h2>
        {isRealUser
          ? (
              <>
                {profileLoading && <Skeleton className="h-24 w-full mb-4" />}
                <AvatarUpload currentUrl={avatarUrl} displayName={displayName} />
                <div className="flex flex-col gap-1 mt-4">
                  <Label className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">
                    TÊN HIỂN THỊ
                  </Label>
                  <Input
                    type="text"
                    value={nameValue}
                    maxLength={50}
                    onChange={e => handleNameChange(e.target.value)}
                    onBlur={handleNameBlur}
                    placeholder="Tên của bạn"
                  />
                  {updateDisplayName.isPending && (
                    <span className="text-[10px] font-[var(--br-mono-font)] text-foreground/50 mt-1">
                      Đang lưu...
                    </span>
                  )}
                </div>
                {email && (
                  <p className="text-xs text-muted-foreground font-[var(--br-mono-font)] mt-2 truncate">
                    {email}
                  </p>
                )}
              </>
            )
          : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground font-[var(--br-mono-font)]">
                  Đang dùng với tư cách Khách — tiến trình lưu trên thiết bị này.
                </p>
                <div className="flex gap-2">
                  <Button asChild size="sm" className="font-[var(--br-heading-font)] uppercase flex-1">
                    <Link to="/auth/login">Đăng nhập</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="font-[var(--br-heading-font)] uppercase flex-1">
                    <Link to="/auth/register">Tạo tài khoản</Link>
                  </Button>
                </div>
              </div>
            )}
      </CardContent>
    </Card>
  )
}
