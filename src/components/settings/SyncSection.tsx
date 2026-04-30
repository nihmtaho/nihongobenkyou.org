import { Link } from '@tanstack/react-router'

import { useState } from 'react'

import { uploadPendingReviews } from '../../db/sync'
import { useSyncStatus } from '../../hooks/useSyncStatus'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'

export function SyncSection() {
  const { email, userId } = useAuthStore()
  const { syncEnabled } = useSettingsStore()
  const { syncJustCompleted } = useSyncStatus()
  const isRealUser = email !== null && userId !== null
  const [isSyncing, setIsSyncing] = useState(false)

  async function handleManualSync() {
    if (!isRealUser || !syncEnabled)
      return
    setIsSyncing(true)
    try {
      await uploadPendingReviews()
    }
    catch {
      // Silent — will retry on next online event
    }
    finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="card bg-base-200 border border-base-content/10 p-4">
      <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
        ĐỒNG BỘ ĐÁM MÂY
      </h2>
      {isRealUser
        ? (
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-[var(--br-mono-font)] text-sm uppercase">Bật đồng bộ</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={syncEnabled}
                  onChange={() => useSettingsStore.setState({ syncEnabled: !syncEnabled })}
                />
              </label>
              {syncEnabled && (
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="btn btn-outline btn-sm font-[var(--br-mono-font)] uppercase self-start"
                >
                  {isSyncing
                    ? <span className="loading loading-spinner loading-xs" />
                    : syncJustCompleted
                      ? '✓ Đã đồng bộ'
                      : 'Đồng bộ ngay'}
                </button>
              )}
            </div>
          )
        : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="badge badge-neutral font-[var(--br-mono-font)] text-[10px]">
                  KHÓA
                </span>
                <span className="text-sm text-neutral font-[var(--br-mono-font)]">
                  Chỉ dành cho tài khoản đã đăng nhập
                </span>
              </div>
              <Link
                to="/auth/login"
                className="btn btn-primary btn-sm font-[var(--br-heading-font)] uppercase self-start mt-1"
              >
                Đăng nhập để đồng bộ
              </Link>
            </div>
          )}
    </div>
  )
}
