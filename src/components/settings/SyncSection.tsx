import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { syncPackage } from '../../db/package-sync'
import { uploadPendingReviews } from '../../db/sync'
import { useSyncStatus } from '../../hooks/useSyncStatus'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'

export function SyncSection() {
  const { email, userId } = useAuthStore()
  const { syncEnabled } = useSettingsStore()
  const { syncJustCompleted, isSyncing, lastError, pendingCount } = useSyncStatus()
  const isRealUser = email !== null && userId !== null

  async function handleManualSync() {
    if (!isRealUser || !syncEnabled)
      return
    try {
      await uploadPendingReviews()
      await syncPackage(userId!)
    }
    catch {
      // Silent — sync-error event is dispatched by sync modules; hook captures it
    }
  }

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
          ĐỒNG BỘ ĐÁM MÂY
        </h2>
        {isRealUser
          ? (
              <div className="flex flex-col gap-3">
                <Label className="flex items-center justify-between cursor-pointer">
                  <span className="font-[var(--br-mono-font)] text-sm uppercase">Bật đồng bộ</span>
                  <Switch
                    checked={syncEnabled}
                    onCheckedChange={() => useSettingsStore.setState({ syncEnabled: !syncEnabled })}
                  />
                </Label>
                {syncEnabled && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="font-[var(--br-mono-font)] uppercase self-start"
                      >
                        {isSyncing
                          ? (
                              <>
                                <Loader2 className="animate-spin h-3 w-3" />
                                Đang đồng bộ...
                              </>
                            )
                          : syncJustCompleted
                            ? '✓ Đã đồng bộ'
                            : 'Đồng bộ ngay'}
                      </Button>
                      {pendingCount > 0 && !isSyncing && (
                        <Badge variant="secondary" className="font-[var(--br-mono-font)] text-[10px]">
                          {pendingCount}
                          {' '}
                          chờ
                        </Badge>
                      )}
                    </div>
                    {lastError && (
                      <p className="text-[10px] font-[var(--br-mono-font)] text-destructive">
                        {lastError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-[var(--br-mono-font)] text-[10px]">
                    KHÓA
                  </Badge>
                  <span className="text-sm text-muted-foreground font-[var(--br-mono-font)]">
                    Chỉ dành cho tài khoản đã đăng nhập
                  </span>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="font-[var(--br-heading-font)] uppercase self-start mt-1"
                >
                  <Link to="/auth/login">Đăng nhập để đồng bộ</Link>
                </Button>
              </div>
            )}
      </CardContent>
    </Card>
  )
}
