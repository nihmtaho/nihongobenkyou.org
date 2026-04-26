import { useOfflineAuthNotice } from '../../hooks/useOfflineAuthNotice'

export function OfflineAuthNotice() {
  const { showNotice } = useOfflineAuthNotice()

  if (!showNotice)
    return null

  return (
    <div role="alert" className="alert alert-warning rounded-none border-0 border-b border-base-content/10 py-2 px-4">
      <span className="font-[var(--br-mono-font)] text-[11px] uppercase">
        Kết nối lại để tiếp tục đồng bộ
      </span>
    </div>
  )
}
