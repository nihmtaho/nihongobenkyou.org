import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useCallback, useRef, useState } from 'react'
import { deleteAccount } from '../../api/auth'
import { AvatarUpload } from '../../components/profile/AvatarUpload'
import { db } from '../../db/schema'
import { useProfile, useProfileQuery } from '../../hooks/useProfile'
import { useAuthStore } from '../../stores/authStore'

const DELETE_CONFIRM_PHRASE = 'XÓA'

export const Route = createFileRoute('/profile/')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: ProfilePage,
})

function ProfilePage() {
  const navigate = useNavigate()
  const { displayName, avatarUrl } = useAuthStore()
  const { updateDisplayName } = useProfile()
  const { isLoading: profileLoading } = useProfileQuery()

  const [nameValue, setNameValue] = useState(displayName ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  async function handleDeleteConfirm() {
    if (deleteConfirm !== DELETE_CONFIRM_PHRASE)
      return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount()
      await db.user_cards.clear()
      await db.settings.clear()
      await db.streaks.clear()
      navigate({ to: '/auth/login' })
    }
    catch (err) {
      setDeleteError((err as Error).message)
    }
    finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">
      <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight">
        HỒ SƠ
      </h1>

      {profileLoading && (
        <div className="skeleton h-24 w-full" />
      )}

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

      <div className="card bg-base-200 border border-base-content/10 p-4">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-2 text-error">
          VÙNG NGUY HIỂM
        </h2>
        <p className="text-sm text-base-content/60 mb-4">
          Xóa tài khoản sẽ xóa tất cả dữ liệu cục bộ ngay lập tức. Bạn có thể khôi phục trong vòng 30 ngày bằng cách đăng nhập lại.
        </p>
        <button
          type="button"
          className="btn btn-error btn-outline btn-sm font-[var(--br-mono-font)] uppercase self-start"
          onClick={() => {
            setShowDeleteModal(true)
            setDeleteConfirm('')
            setDeleteError(null)
          }}
        >
          Xóa tài khoản
        </button>
      </div>

      {/* Account deletion modal */}
      {showDeleteModal && (
        <dialog className="modal modal-open" aria-modal="true">
          <div className="modal-box max-w-sm">
            <h3 className="font-[var(--br-heading-font)] text-xl uppercase font-bold">
              Xác nhận xóa tài khoản
            </h3>
            <p className="py-4 text-sm text-base-content/70">
              Gõ
              {' '}
              <strong className="font-[var(--br-mono-font)]">{DELETE_CONFIRM_PHRASE}</strong>
              {' '}
              để xác nhận. Dữ liệu cục bộ sẽ bị xóa ngay lập tức.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value.toUpperCase())}
              placeholder={DELETE_CONFIRM_PHRASE}
              className="input input-bordered input-error w-full mb-4 font-[var(--br-mono-font)] uppercase"
              disabled={isDeleting}
            />
            {deleteError && (
              <div role="alert" className="alert alert-error py-2 mb-4">
                <span className="text-sm font-[var(--br-mono-font)]">{deleteError}</span>
              </div>
            )}
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost btn-sm font-[var(--br-mono-font)] uppercase"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-error btn-sm font-[var(--br-mono-font)] uppercase"
                onClick={handleDeleteConfirm}
                disabled={deleteConfirm !== DELETE_CONFIRM_PHRASE || isDeleting}
              >
                {isDeleting
                  ? <span className="loading loading-spinner loading-xs" />
                  : 'Xóa tài khoản'}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              if (!isDeleting)
                setShowDeleteModal(false)
            }}
          />
        </dialog>
      )}
    </div>
  )
}
