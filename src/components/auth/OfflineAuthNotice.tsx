import { Alert, AlertDescription } from '@/components/ui/alert'

import { useOfflineAuthNotice } from '../../hooks/useOfflineAuthNotice'

export function OfflineAuthNotice() {
  const { showNotice } = useOfflineAuthNotice()

  if (!showNotice)
    return null

  return (
    <Alert
      className="rounded-none border-0 border-b border-border py-2 px-4 bg-[var(--warning)]/10 border-[var(--warning)]/50 text-[var(--warning)]"
    >
      <AlertDescription className="font-[var(--br-mono-font)] text-[11px] uppercase">
        Kết nối lại để tiếp tục đồng bộ
      </AlertDescription>
    </Alert>
  )
}
