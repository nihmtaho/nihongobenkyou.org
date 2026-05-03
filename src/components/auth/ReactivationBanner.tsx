import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import { useAuthStore } from '../../stores/authStore'

export function ReactivationBanner() {
  const visible = useAuthStore(s => s.reactivationBannerVisible)

  if (!visible)
    return null

  return (
    <Alert className="rounded-none border-0 border-b border-border py-2 px-4 bg-[var(--success)]/10 border-[var(--success)]/50 text-[var(--success)]">
      <AlertDescription className="font-[var(--br-mono-font)] text-[11px] uppercase">
        Tài khoản đã được khôi phục thành công
      </AlertDescription>
      <AlertAction>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Đóng thông báo"
          className="font-[var(--br-mono-font)] text-[10px] h-6 w-6"
          onClick={() => useAuthStore.setState({ reactivationBannerVisible: false })}
        >
          ✕
        </Button>
      </AlertAction>
    </Alert>
  )
}
