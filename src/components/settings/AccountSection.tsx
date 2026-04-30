import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { deleteAccount, signOut } from '../../api/auth'
import { markProgressReset } from '../../api/profiles'
import { supabase } from '../../api/supabase'
import { db } from '../../db/schema'
import { useAuthStore } from '../../stores/authStore'

const RESET_CONFIRM_PHRASE = 'ĐẶT LẠI'
const DELETE_CONFIRM_PHRASE = 'XÓA'

export function AccountSection() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { userId, email } = useAuthStore()
  const isRealUser = email !== null && userId !== null

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleLogout() {
    await signOut()
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
    navigate({ to: '/auth/login' })
  }

  async function handleResetProgress() {
    if (!userId || resetConfirmText !== RESET_CONFIRM_PHRASE)
      return
    setIsResetting(true)
    try {
      await db.user_cards.where('userId').equals(userId).delete()
      await db.kanji_cards.where('userId').equals(userId).delete()
      await db.streaks.where('userId').equals(userId).delete()
      await db.sync_queue.clear()
      await db.review_log.where('userId').equals(userId).delete()

      const now = new Date().toISOString()
      await db.settings.put({ key: 'progress_reset_at', value: now })
      await db.settings.delete('review_log_cursor')
      await db.settings.delete('sync_package_version')

      await Promise.allSettled([
        markProgressReset(userId),
        supabase.from('user_card_snapshots').delete().eq('user_id', userId),
        supabase.from('user_sync_packages').delete().eq('user_id', userId),
        supabase.from('user_cards').delete().eq('user_id', userId),
        supabase.from('kanji_cards').delete().eq('user_id', userId),
      ])

      try {
        const { data } = await supabase
          .from('review_log')
          .select('id')
          .eq('user_id', userId)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data?.id)
          await db.settings.put({ key: 'review_log_cursor', value: data.id })
      }
      catch {
        // Offline — progress_reset_at filter in downloadNewReviews handles this
      }

      queryClient.invalidateQueries({ queryKey: ['due-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['kanji-srs-due', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['streak', userId] })
      queryClient.invalidateQueries({ queryKey: ['total-user-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['future-due-cards', userId] })

      setShowResetModal(false)
      setResetConfirmText('')
    }
    catch (err) {
      console.error(err)
    }
    finally {
      setIsResetting(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== DELETE_CONFIRM_PHRASE || !userId)
      return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await db.vocabulary.clear()
      await db.user_cards.clear()
      await db.kanji_cards.clear()
      await db.sessions.clear()
      await db.streaks.clear()
      await db.review_log.clear()
      await db.settings.clear()

      await deleteAccount()

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
      navigate({ to: '/auth/login' })
    }
    catch (err) {
      setDeleteError((err as Error).message ?? 'Xóa tài khoản thất bại')
    }
    finally {
      setIsDeleting(false)
    }
  }

  function handleOpenResetModal() {
    setShowResetModal(true)
    setResetConfirmText('')
  }

  function handleOpenDeleteModal() {
    setShowDeleteModal(true)
    setDeleteConfirmText('')
    setDeleteError(null)
  }

  if (!isRealUser)
    return null

  return (
    <>
      <div className="card bg-base-200 border border-base-content/10 p-4">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">TÀI KHOẢN</h2>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleOpenResetModal}
            className="btn btn-warning btn-outline w-full font-[var(--br-heading-font)] uppercase"
          >
            Đặt lại tiến trình
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-outline w-full font-[var(--br-heading-font)] uppercase"
          >
            Đăng xuất
          </button>
          <button
            type="button"
            onClick={handleOpenDeleteModal}
            className="btn btn-error btn-outline w-full font-[var(--br-heading-font)] uppercase"
          >
            Xóa tài khoản
          </button>
        </div>
      </div>

      {showResetModal && (
        <dialog open className="modal modal-open">
          <div className="modal-box border border-base-content/10 max-w-sm">
            <h3 className="font-[var(--br-heading-font)] text-xl uppercase font-bold mb-4">
              ĐẶT LẠI TIẾN TRÌNH
            </h3>
            <p className="text-sm text-base-content/70 mb-2">Hành động này sẽ xóa:</p>
            <ul className="text-sm text-base-content/70 mb-4 list-disc list-inside font-[var(--br-mono-font)] space-y-1">
              <li>Toàn bộ thẻ ôn tập từ vựng và kanji</li>
              <li>Lịch sử streak học tập</li>
              <li>Dữ liệu đồng bộ trên Supabase</li>
            </ul>
            <p className="text-xs text-warning font-[var(--br-mono-font)] uppercase mb-4">
              Nhập &quot;
              {RESET_CONFIRM_PHRASE}
              &quot; để xác nhận.
            </p>
            <input
              type="text"
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value.toUpperCase())}
              placeholder={RESET_CONFIRM_PHRASE}
              className="input input-bordered w-full mb-4 font-[var(--br-mono-font)] uppercase"
              disabled={isResetting}
            />
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="btn btn-ghost font-[var(--br-mono-font)] uppercase"
                disabled={isResetting}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleResetProgress}
                disabled={resetConfirmText !== RESET_CONFIRM_PHRASE || isResetting}
                className="btn btn-warning font-[var(--br-heading-font)] uppercase"
              >
                {isResetting
                  ? <span className="loading loading-spinner loading-sm" />
                  : 'Xác nhận đặt lại'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !isResetting && setShowResetModal(false)} />
        </dialog>
      )}

      {showDeleteModal && (
        <dialog open className="modal modal-open" aria-modal="true">
          <div className="modal-box border border-base-content/10 max-w-sm">
            <h3 className="font-[var(--br-heading-font)] text-xl uppercase font-bold mb-4">
              XÁC NHẬN XÓA TÀI KHOẢN
            </h3>
            <p className="text-sm text-base-content/70 mb-4">
              Xóa vĩnh viễn — không thể khôi phục. Nhập
              {' '}
              <strong className="font-[var(--br-mono-font)]">{DELETE_CONFIRM_PHRASE}</strong>
              {' '}
              để xác nhận.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
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
                className="btn btn-error btn-sm font-[var(--br-heading-font)] uppercase"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== DELETE_CONFIRM_PHRASE || isDeleting}
              >
                {isDeleting
                  ? <span className="loading loading-spinner loading-xs" />
                  : 'Xóa vĩnh viễn'}
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
    </>
  )
}
