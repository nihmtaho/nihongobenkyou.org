import { useAuthStore } from '../../stores/authStore'

export function ReactivationBanner() {
  const visible = useAuthStore(s => s.reactivationBannerVisible)

  if (!visible)
    return null

  return (
    <div role="alert" className="alert alert-success rounded-none border-0 border-b border-base-content/10 py-2 px-4">
      <span className="font-[var(--br-mono-font)] text-[11px] uppercase">
        Tài khoản đã được khôi phục thành công
      </span>
      <button
        type="button"
        aria-label="Đóng thông báo"
        className="btn btn-ghost btn-xs ml-auto font-[var(--br-mono-font)] text-[10px]"
        onClick={() => useAuthStore.setState({ reactivationBannerVisible: false })}
      >
        ✕
      </button>
    </div>
  )
}
