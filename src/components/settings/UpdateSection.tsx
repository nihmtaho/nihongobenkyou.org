import { Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { db } from '../../db/schema'
import { checkForUpdates } from '../../db/seed'
import { useUpdateStore } from '../../stores/updateStore'

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1)
    return 'vừa xong'
  if (minutes < 60)
    return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return `${hours} giờ trước`
  return `${Math.floor(hours / 24)} ngày trước`
}

function useVersionInfo() {
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [v, ts] = await Promise.all([
        db.settings.get('app_version'),
        db.settings.get('last_update_check'),
      ])
      setAppVersion((v?.value as string | undefined) ?? null)
      setLastCheck((ts?.value as string | undefined) ?? null)
    }
    load().catch(() => {})
  }, [])

  return { appVersion, lastCheck }
}

export function UpdateSection() {
  const phase = useUpdateStore(s => s.phase)
  const [isChecking, setIsChecking] = useState(false)
  const { appVersion, lastCheck } = useVersionInfo()

  async function handleCheckUpdates() {
    setIsChecking(true)
    try {
      await checkForUpdates()
    }
    catch {
      // checkForUpdates handles its own errors silently
    }
    finally {
      setIsChecking(false)
    }
  }

  const isUpdating = phase === 'updating'

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
          CẬP NHẬT DỮ LIỆU
        </h2>
        <div className="flex flex-col gap-3">
          {appVersion && (
            <p className="text-[11px] font-[var(--br-mono-font)] text-muted-foreground uppercase">
              Phiên bản:
              {' '}
              <span className="text-foreground">{appVersion}</span>
            </p>
          )}
          {lastCheck && (
            <p className="text-[11px] font-[var(--br-mono-font)] text-muted-foreground uppercase">
              Lần kiểm tra cuối:
              {' '}
              <span className="text-foreground">{formatRelativeTime(lastCheck)}</span>
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCheckUpdates}
            disabled={isChecking || isUpdating}
            className="font-[var(--br-mono-font)] uppercase self-start"
          >
            {isChecking || isUpdating
              ? <Loader2 className="animate-spin h-3 w-3 mr-1" />
              : <RefreshCw className="h-3 w-3 mr-1" />}
            {isUpdating ? 'Đang cập nhật...' : 'Kiểm tra cập nhật'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
