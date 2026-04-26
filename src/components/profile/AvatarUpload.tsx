import { useRef, useState } from 'react'
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
      <div className="avatar placeholder">
        <div className="bg-base-300 text-base-content w-20 h-20 border border-base-content/10">
          {avatarSrc && !imgFailed
            ? (
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="object-cover w-full h-full"
                  onError={() => setImgFailed(true)}
                />
              )
            : <span className="text-2xl font-[var(--br-heading-font)]">{initials}</span>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {sizeError && (
        <p className="text-error text-xs font-[var(--br-mono-font)]">{sizeError}</p>
      )}

      {updateAvatar.isError && (
        <p className="text-error text-xs font-[var(--br-mono-font)]">
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
              <button
                type="button"
                onClick={handleConfirm}
                disabled={updateAvatar.isPending}
                className="btn btn-primary btn-sm font-[var(--br-mono-font)] uppercase"
              >
                {updateAvatar.isPending ? <span className="loading loading-spinner loading-xs" /> : 'Xác nhận'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-ghost btn-sm font-[var(--br-mono-font)] uppercase"
              >
                Hủy
              </button>
            </div>
          )
        : (
            <button
              type="button"
              aria-label="Tải lên ảnh đại diện"
              onClick={() => inputRef.current?.click()}
              className="btn btn-outline btn-sm font-[var(--br-mono-font)] uppercase"
            >
              📷 Đổi ảnh
            </button>
          )}
    </div>
  )
}
