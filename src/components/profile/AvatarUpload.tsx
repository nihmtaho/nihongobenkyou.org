import { Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useProfile } from '../../hooks/useProfile'

const MAX_SIZE_BYTES = 5 * 1024 * 1024

interface AvatarUploadProps {
  currentUrl: string | null
  displayName: string | null
}

export function AvatarUpload({ currentUrl, displayName }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const { updateAvatar } = useProfile()

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : '?'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file)
      return

    setSizeError(null)
    if (file.size > MAX_SIZE_BYTES) {
      setSizeError('Tệp quá lớn (tối đa 5MB)')
      return
    }

    const url = URL.createObjectURL(file)
    setPreview(url)
    setPendingFile(file)
    setImgFailed(false)
  }

  function handleConfirm() {
    if (!pendingFile)
      return
    updateAvatar.mutate(pendingFile, {
      onSuccess: () => {
        setPreview(null)
        setPendingFile(null)
        if (inputRef.current)
          inputRef.current.value = ''
      },
    })
  }

  function handleCancel() {
    setPreview(null)
    setPendingFile(null)
    if (inputRef.current)
      inputRef.current.value = ''
  }

  const avatarSrc = preview ?? currentUrl

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar className="w-20 h-20 border border-border/10">
        {avatarSrc && !imgFailed
          ? (
              <AvatarImage
                src={avatarSrc}
                alt="Avatar"
                className="object-cover"
                onError={() => setImgFailed(true)}
              />
            )
          : null}
        <AvatarFallback className="bg-secondary text-foreground text-2xl font-[var(--br-heading-font)]">
          {initials}
        </AvatarFallback>
      </Avatar>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {sizeError && (
        <p className="text-destructive text-xs font-[var(--br-mono-font)]">{sizeError}</p>
      )}

      {updateAvatar.isError && (
        <p className="text-destructive text-xs font-[var(--br-mono-font)]">
          {updateAvatar.error?.message ?? 'Tải lên thất bại'}
          <button
            type="button"
            onClick={handleConfirm}
            className="ml-2 underline"
          >
            Thử lại
          </button>
        </p>
      )}

      {preview
        ? (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={updateAvatar.isPending}
                className="font-[var(--br-mono-font)] uppercase"
              >
                {updateAvatar.isPending ? <Loader2 className="animate-spin h-3 w-3" /> : 'Xác nhận'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="font-[var(--br-mono-font)] uppercase"
              >
                Hủy
              </Button>
            </div>
          )
        : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Tải lên ảnh đại diện"
              onClick={() => inputRef.current?.click()}
              className="font-[var(--br-mono-font)] uppercase"
            >
              📷 Đổi ảnh
            </Button>
          )}
    </div>
  )
}
