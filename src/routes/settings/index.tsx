import type { FontSize } from '../../types/study'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { signOut } from '../../api/auth'
import { supabase } from '../../api/supabase'
import { db } from '../../db/schema'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'

export const Route = createFileRoute('/settings/')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: SettingsPage,
})

const FONT_SIZE_OPTIONS: { value: FontSize, label: string }[] = [
  { value: 'sm', label: 'Nhỏ' },
  { value: 'md', label: 'Vừa' },
  { value: 'lg', label: 'Lớn' },
]

function SettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userId = useAuthStore(s => s.userId)
  const meaningLanguage = useSettingsStore(s => s.meaningLanguage)
  const fontSize = useSettingsStore(s => s.fontSize)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  function handleLanguageChange(value: 'vi' | 'en') {
    useSettingsStore.setState({ meaningLanguage: value })
  }

  function handleFontSizeChange(value: FontSize) {
    useSettingsStore.setState({ fontSize: value })
  }

  async function handleResetData() {
    if (!userId)
      return
    setIsResetting(true)
    try {
      await db.user_cards.clear()
      await db.kanji_cards.clear()
      await db.streaks.clear()
      await db.sync_queue.clear()

      // Best-effort Supabase delete — non-blocking, offline safe
      await Promise.allSettled([
        supabase.from('user_cards').delete().eq('user_id', userId),
        supabase.from('kanji_cards').delete().eq('user_id', userId),
      ])

      queryClient.invalidateQueries({ queryKey: ['due-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['kanji-srs-due', userId] })
      queryClient.invalidateQueries({ queryKey: ['kanji-list', userId] })
      queryClient.invalidateQueries({ queryKey: ['streak', userId] })
      queryClient.invalidateQueries({ queryKey: ['total-user-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['future-due-cards', userId] })

      setShowResetModal(false)
    }
    catch (err) {
      console.error(err)
    }
    finally {
      setIsResetting(false)
    }
  }

  async function handleLogout() {
    await signOut()
    useAuthStore.setState({
      userId: null,
      email: null,
      isAuthenticated: false,
      isLoading: false,
      displayName: null,
      avatarUrl: null,
    })
    navigate({ to: '/auth/login' })
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'XÓA')
      return
    setIsDeleting(true)
    try {
      await db.vocabulary.clear()
      await db.user_cards.clear()
      await db.sessions.clear()
      await db.streaks.clear()
      await db.settings.clear()
      await signOut()
      useAuthStore.setState({
        userId: null,
        email: null,
        isAuthenticated: false,
        isLoading: false,
        displayName: null,
        avatarUrl: null,
      })
      navigate({ to: '/auth/login' })
    }
    catch (err) {
      console.error(err)
    }
    finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">
      <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight">
        CÀI ĐẶT
      </h1>

      {/* Data attribution — required by KanjiVG (CC BY-SA 3.0) and KANJIDIC2 (CC BY-SA 3.0) */}
      <div className="card bg-base-200 border border-base-content/10 p-4">
        <h2 className="text-[11px] font-bold uppercase font-[var(--br-mono-font)] mb-3 text-neutral">
          DATA CREDITS
        </h2>
        <div className="flex flex-col gap-2 text-xs font-[var(--br-mono-font)] text-neutral">
          <p>
            Kanji stroke data:
            <strong>KanjiVG</strong>
            {' '}
            — Ulrich Apel (CC BY-SA 3.0)
          </p>
          <p>
            Kanji dictionary:
            <strong>KANJIDIC2</strong>
            {' '}
            — The Electronic Dictionary Research and Development Group (CC BY-SA 3.0)
          </p>
          <p>
            Vocabulary source:
            <strong>Minna no Nihongo</strong>
            {' '}
            — 3A Corporation
          </p>
        </div>
      </div>

      {/* Meaning Language */}
      <div className="card bg-base-200 border border-base-content/10 p-4">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
          NGÔN NGỮ NGHĨA
        </h2>
        <div className="flex gap-4">
          {(['vi', 'en'] as const).map(lang => (
            <label key={lang} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                className="radio radio-primary"
                name="language"
                value={lang}
                checked={meaningLanguage === lang}
                onChange={() => handleLanguageChange(lang)}
              />
              <span className="font-[var(--br-mono-font)] text-sm uppercase">
                {lang === 'vi' ? 'Tiếng Việt' : 'English'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="card bg-base-200 border border-base-content/10 p-4">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
          CỠ CHỮ
        </h2>
        <div className="flex gap-4">
          {FONT_SIZE_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                className="radio radio-primary"
                name="fontSize"
                value={value}
                checked={fontSize === value}
                onChange={() => handleFontSizeChange(value)}
              />
              <span className="font-[var(--br-mono-font)] text-sm uppercase">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Dark Mode — disabled placeholder */}
      <div className="card bg-base-200 border border-base-content/10 p-4">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
          GIAO DIỆN TỐI
        </h2>
        <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
          <input type="checkbox" className="toggle toggle-primary" disabled />
          <span className="font-[var(--br-mono-font)] text-sm uppercase">
            Sắp ra mắt
          </span>
        </label>
      </div>

      {/* Reset data */}
      <div className="card bg-base-200 border border-base-content/10 p-4">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-2">
          ĐẶT LẠI DỮ LIỆU
        </h2>
        <p className="text-xs text-neutral font-[var(--br-mono-font)] mb-4 uppercase">
          Xóa toàn bộ tiến trình ôn tập và streak. Tài khoản vẫn được giữ lại.
        </p>
        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          className="btn btn-warning btn-outline w-full font-[var(--br-heading-font)] uppercase"
        >
          Đặt lại tiến trình
        </button>
      </div>

      {/* Account */}
      <div className="card bg-base-200 border border-base-content/10 p-4">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
          TÀI KHOẢN
        </h2>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogout}
            className="btn btn-outline w-full font-[var(--br-heading-font)] uppercase"
          >
            Đăng xuất
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-error btn-outline w-full font-[var(--br-heading-font)] uppercase"
          >
            Xóa tài khoản
          </button>
        </div>
      </div>

      {/* Reset data modal */}
      {showResetModal && (
        <dialog open className="modal modal-open">
          <div className="modal-box border border-base-content/10">
            <h3 className="font-[var(--br-heading-font)] text-xl uppercase font-bold mb-4">
              ĐẶT LẠI TIẾN TRÌNH
            </h3>
            <p className="text-sm text-base-content/70 mb-2">
              Hành động này sẽ xóa:
            </p>
            <ul className="text-sm text-base-content/70 mb-4 list-disc list-inside font-[var(--br-mono-font)] space-y-1">
              <li>Toàn bộ thẻ ôn tập từ vựng và kanji</li>
              <li>Lịch sử streak học tập</li>
            </ul>
            <p className="text-sm text-warning font-[var(--br-mono-font)] uppercase mb-4">
              Dữ liệu từ vựng và tài khoản không bị ảnh hưởng.
            </p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="btn btn-ghost font-[var(--br-mono-font)] uppercase"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleResetData}
                disabled={isResetting}
                className="btn btn-warning font-[var(--br-heading-font)] uppercase"
              >
                {isResetting
                  ? <span className="loading loading-spinner loading-sm" />
                  : 'Xác nhận đặt lại'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowResetModal(false)} />
        </dialog>
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <dialog open className="modal modal-open">
          <div className="modal-box border border-base-content/10">
            <h3 className="font-[var(--br-heading-font)] text-xl uppercase font-bold mb-4">
              XÁC NHẬN XÓA TÀI KHOẢN
            </h3>
            <p className="text-sm text-base-content/70 mb-4">
              Hành động này không thể hoàn tác. Nhập
              {' '}
              <strong>XÓA</strong>
              {' '}
              để xác nhận.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="XÓA"
              className="input input-bordered w-full mb-4"
            />
            <div className="modal-action">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                className="btn btn-ghost font-[var(--br-mono-font)] uppercase"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'XÓA' || isDeleting}
                className="btn btn-error font-[var(--br-heading-font)] uppercase"
              >
                {isDeleting ? <span className="loading loading-spinner loading-sm" /> : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
