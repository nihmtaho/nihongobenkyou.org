import type { ParsedVocabItem, VocabParseResult } from '../../types/custom-deck'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { parseCsvVocab, parseJsonVocab } from '../../lib/vocab-parser'

interface Props {
  deckId: string
  userId: string
  onSave: (items: ParsedVocabItem[], source: 'json' | 'csv') => Promise<void>
  isPending?: boolean
}

type Format = 'json' | 'csv'

const HINT = `// Dán mảng từ vựng hoặc CSV vào đây.
// Ví dụ mảng:
[{"word":"会議","kana":"かいぎ","han_viet":"hội nghị","meaning_vi":"cuộc họp"}]

// Ví dụ CSV (dòng đầu là header):
word,kana,han_viet,meaning_vi
会議,かいぎ,hội nghị,cuộc họp`

function detectFormat(text: string): Format {
  const trimmed = text.trimStart()
  if (trimmed.startsWith('[') || trimmed.startsWith('{'))
    return 'json'
  if (trimmed.includes('\n') && trimmed.includes(','))
    return 'csv'
  // Default to json — shows a JSON parse error for ambiguous/invalid input
  return 'json'
}

export function VocabInputArea({ onSave, isPending }: Props) {
  const [text, setText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const format = useMemo<Format>(() => detectFormat(text), [text])

  const parseResult = useMemo<VocabParseResult | null>(() => {
    if (!text.trim())
      return null
    return format === 'json' ? parseJsonVocab(text) : parseCsvVocab(text)
  }, [text, format])

  const hasItems = (parseResult?.items.length ?? 0) > 0
  const hasErrors = (parseResult?.errors.length ?? 0) > 0

  async function handleSave() {
    if (!parseResult || !hasItems)
      return
    setIsSaving(true)
    try {
      await onSave(parseResult.items, format)
      setText('')
    }
    finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground">
        NHẬP TỪ VỰNG
      </span>

      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={HINT}
        className="font-mono text-xs min-h-[120px] resize-y"
      />

      {parseResult && (
        <div className="text-xs">
          {hasItems && (
            <span className="text-primary">
              {parseResult.items.length}
              {' '}
              từ sẵn sàng thêm
              {hasErrors ? ` (${parseResult.errors.length} hàng lỗi bị bỏ qua)` : ''}
            </span>
          )}
          {!hasItems && hasErrors && (
            <span className="text-destructive">⚠ Cú pháp không hợp lệ — kiểm tra lại định dạng</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!hasItems || isSaving || isPending}
          onClick={handleSave}
        >
          {isSaving ? 'Đang lưu…' : 'Lưu vào deck →'}
        </Button>
        {text && (
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => setText('')}
          >
            Xóa
          </button>
        )}
      </div>
    </div>
  )
}
