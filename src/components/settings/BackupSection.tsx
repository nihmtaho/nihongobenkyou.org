import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { buildPackage, mergePackageIntoDexie } from '../../db/package-sync'
import { useAuthStore } from '../../stores/authStore'

export function BackupSection() {
  const { userId } = useAuthStore()
  const queryClient = useQueryClient()
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  async function handleExportBackup() {
    if (!userId)
      return
    const payload = await buildPackage(userId)
    const json = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), data: payload })
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nihongo-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file)
      return
    if (!userId) {
      setImportError('Cần đăng nhập để nhập dữ liệu sao lưu.')
      if (importInputRef.current)
        importInputRef.current.value = ''
      return
    }
    setImportError(null)
    setImportSuccess(null)
    setIsImporting(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Record<string, unknown>
      const raw = (parsed.data ?? parsed) as Parameters<typeof mergePackageIntoDexie>[1]
      // Remap all stored userIds to the current userId so backup files
      // created under a different session/device still import correctly.
      const payload = {
        srs_cards: (raw.srs_cards ?? []).map(c => ({ ...c, userId })),
        custom_decks: (raw.custom_decks ?? []).map(d => ({ ...d, user_id: userId })),
        custom_vocabulary: (raw.custom_vocabulary ?? []).map(v => ({ ...v, user_id: userId })),
        review_log: (raw.review_log ?? []).map(e => ({ ...e, userId })),
        streaks: (raw.streaks ?? []).map(s => ({ ...s, userId })),
      }
      const count = await mergePackageIntoDexie(userId, payload)
      queryClient.invalidateQueries({ queryKey: ['due-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['kanji-srs-due', userId] })
      queryClient.invalidateQueries({ queryKey: ['review-stats', userId] })
      setImportSuccess(`Đã nhập ${count} mục thành công.`)
    }
    catch (err) {
      setImportError((err as Error).message ?? 'File không hợp lệ')
    }
    finally {
      setIsImporting(false)
      if (importInputRef.current)
        importInputRef.current.value = ''
    }
  }

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-2">
          SAO LƯU & NHẬP
        </h2>
        <p className="text-xs text-muted-foreground font-[var(--br-mono-font)] mb-4 uppercase">
          Xuất / nhập dữ liệu SRS dưới dạng file JSON — không cần tài khoản.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportBackup}
            className="font-[var(--br-mono-font)] uppercase self-start"
          >
            Xuất sao lưu (.json)
          </Button>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
              className="font-[var(--br-mono-font)] uppercase self-start"
            >
              {isImporting
                ? <Loader2 className="animate-spin h-3 w-3" />
                : 'Nhập từ file (.json)'}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportBackup}
            />
            {importError && (
              <p className="text-destructive text-xs font-[var(--br-mono-font)] mt-1">{importError}</p>
            )}
            {importSuccess && (
              <p className="text-green-600 text-xs font-[var(--br-mono-font)] mt-1">{importSuccess}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
