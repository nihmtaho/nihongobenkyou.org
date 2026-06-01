import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useNotifications } from '../../hooks/useNotifications'

const DAILY_TARGET_PRESETS = [5, 10, 15, 20, 30, 50] as const

export function NotificationSection() {
  const {
    supported,
    permission,
    notificationsEnabled,
    reminderTime,
    dailyTarget,
    toggle,
    updateTime,
    updateTarget,
  } = useNotifications()

  if (!supported) {
    return (
      <Card className="p-4">
        <CardContent className="p-0">
          <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
            THÔNG BÁO HỌC TẬP
          </h2>
          <p className="text-xs font-[var(--br-mono-font)] text-muted-foreground uppercase">
            Trình duyệt của bạn không hỗ trợ thông báo đẩy.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <CardContent className="p-0 flex flex-col gap-4">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)]">
          THÔNG BÁO HỌC TẬP
        </h2>

        {/* Enable/disable toggle */}
        <Label className="flex items-center gap-3 cursor-pointer">
          <Switch checked={notificationsEnabled} onCheckedChange={toggle} />
          <span className="font-[var(--br-mono-font)] text-sm uppercase">
            {notificationsEnabled ? 'Đang bật' : 'Đang tắt'}
          </span>
        </Label>

        {/* Denied permission warning */}
        {permission === 'denied' && (
          <p className="text-xs font-[var(--br-mono-font)] text-destructive uppercase">
            Quyền thông báo đã bị chặn. Vui lòng cấp quyền trong cài đặt trình duyệt.
          </p>
        )}

        {/* Settings only visible when enabled */}
        {notificationsEnabled && (
          <>
            {/* Reminder time */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-[var(--br-mono-font)] text-muted-foreground uppercase">
                Giờ nhắc nhở hàng ngày
              </span>
              <input
                type="time"
                value={reminderTime}
                onChange={e => updateTime(e.target.value)}
                className="w-32 px-2 py-1.5 text-sm font-[var(--br-mono-font)] border border-border bg-background text-foreground"
              />
            </div>

            {/* Daily target presets */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-[var(--br-mono-font)] text-muted-foreground uppercase">
                Mục tiêu thẻ mỗi ngày
              </span>
              <div className="flex flex-wrap gap-2">
                {DAILY_TARGET_PRESETS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateTarget(n)}
                    className={`px-3 py-1.5 text-sm font-bold font-[var(--br-mono-font)] border transition-colors ${
                      dailyTarget === n
                        ? 'bg-destructive text-destructive-foreground border-destructive'
                        : 'bg-background text-foreground border-border hover:border-foreground'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification preview */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-[var(--br-mono-font)] text-muted-foreground uppercase">
                Xem trước thông báo
              </span>
              <div className="border border-border bg-muted p-3 flex flex-col gap-1">
                <span className="text-sm font-bold font-[var(--br-mono-font)]">
                  🗓️ Nhắc nhở học tiếng Nhật
                </span>
                <span className="text-xs font-[var(--br-mono-font)] text-muted-foreground">
                  Đã đến giờ ôn tập rồi! Hãy vào ứng dụng để học nhé.
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
