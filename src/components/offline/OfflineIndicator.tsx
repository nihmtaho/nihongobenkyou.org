import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useSyncStatus } from '../../hooks/useSyncStatus'

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus()
  const { syncJustCompleted } = useSyncStatus()

  if (!isOnline) {
    return (
      <div
        role="alert"
        className="alert alert-warning fixed top-0 left-0 right-0 z-50 rounded-none py-2 justify-center"
      >
        <span className="font-[var(--br-mono-font)] text-[11px] uppercase">
          Đang ngoại tuyến — Dữ liệu sẽ được đồng bộ khi có kết nối
        </span>
      </div>
    )
  }

  if (syncJustCompleted) {
    return (
      <div className="toast toast-top toast-center z-50 pointer-events-none">
        <div className="alert alert-success py-2">
          <span className="font-[var(--br-mono-font)] text-[11px]">Đã đồng bộ ✓</span>
        </div>
      </div>
    )
  }

  return null
}
