import { Alert, AlertDescription } from '@/components/ui/alert'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useSyncStatus } from '../../hooks/useSyncStatus'

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus()
  const { syncJustCompleted } = useSyncStatus()

  if (!isOnline) {
    return (
      <Alert
        role="alert"
        className="fixed top-0 left-0 right-0 z-50 rounded-none py-2 justify-center bg-warning/10 border-warning/50"
      >
        <AlertDescription className="font-[var(--br-mono-font)] text-[11px] uppercase text-center">
          Đang ngoại tuyến — Dữ liệu sẽ được đồng bộ khi có kết nối
        </AlertDescription>
      </Alert>
    )
  }

  if (syncJustCompleted) {
    return (
      <div className="toast toast-top toast-center z-50 pointer-events-none">
        <Alert className="py-2 bg-success/10 border-success/50">
          <AlertDescription className="font-[var(--br-mono-font)] text-[11px]">
            Đã đồng bộ ✓
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return null
}
