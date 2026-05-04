import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { exportActiveDeck, importActiveDeck } from '../../db/active-deck'

export function ActiveDeckBackupSection({ userId }: { userId: string | null }) {
  const queryClient = useQueryClient()
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    if (!userId)
      return
    const json = await exportActiveDeck(userId)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hoc-chu-dong-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file)
      return
    if (!userId) {
      setImportError('Cần đăng nhập để nhập dữ liệu.')
      if (fileInputRef.current)
        fileInputRef.current.value = ''
      return
    }
    setImportError(null)
    setImportSuccess(null)
    setIsImporting(true)
    try {
      const text = await file.text()
      const result = await importActiveDeck(userId, text)
      queryClient.invalidateQueries({ queryKey: ['active-deck-vocab', userId] })
      queryClient.invalidateQueries({ queryKey: ['active-deck-kanji', userId] })
      queryClient.invalidateQueries({ queryKey: ['active-deck-due', userId] })
      const skippedNote = result.skipped > 0 ? ` (${result.skipped} bỏ qua)` : ''
      setImportSuccess(`Đã import ${result.imported} mục${skippedNote}.`)
    }
    catch {
      setImportError('File không hợp lệ')
    }
    finally {
      setIsImporting(false)
      if (fileInputRef.current)
        fileInputRef.current.value = ''
    }
  }

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-2">
          HỌC CHỦ ĐỘNG — SAO LƯU
        </h2>
        <p className="text-xs text-muted-foreground font-[var(--br-mono-font)] mb-4 uppercase">
          Xuất / nhập danh sách từ vựng và kanji đang học chủ động.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!userId}
            className="font-[var(--br-mono-font)] uppercase self-start"
          >
            Xuất danh sách (.json)
          </Button>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting || !userId}
              className="font-[var(--br-mono-font)] uppercase self-start"
            >
              {isImporting
                ? <Loader2 className="animate-spin h-3 w-3" />
                : 'Nhập từ file (.json)'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
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
