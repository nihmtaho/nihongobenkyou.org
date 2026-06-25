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
import { useTranslation } from '../../hooks/useTranslation'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'

export function SyncSection() {
  const { t } = useTranslation()
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
          {t('settings.sync.title')}
        </h2>
        {isRealUser
          ? (
              <div className="flex flex-col gap-3">
                <Label className="flex items-center justify-between cursor-pointer">
                  <span className="font-[var(--br-mono-font)] text-sm uppercase">{t('settings.sync.enable')}</span>
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
                                {t('settings.sync.syncing')}
                              </>
                            )
                          : syncJustCompleted
                            ? t('settings.sync.done')
                            : t('settings.sync.syncNow')}
                      </Button>
                      {pendingCount > 0 && !isSyncing && (
                        <Badge variant="secondary" className="font-[var(--br-mono-font)] text-[10px]">
                          {pendingCount}
                          {' '}
                          {t('settings.sync.pending')}
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
                    {t('settings.sync.locked')}
                  </Badge>
                  <span className="text-sm text-muted-foreground font-[var(--br-mono-font)]">
                    {t('settings.sync.loginRequired')}
                  </span>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="font-[var(--br-heading-font)] uppercase self-start mt-1"
                >
                  <Link to="/auth/login">{t('settings.sync.loginToSync')}</Link>
                </Button>
              </div>
            )}
      </CardContent>
    </Card>
  )
}
