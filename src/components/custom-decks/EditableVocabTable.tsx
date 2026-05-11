import type { CustomVocabItem } from '../../types/custom-deck'
import { EyeOffIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface EditState {
  wordId: string
  kanji: string
  kana: string
  han_viet: string
  meaning_vi: string
}

interface Props {
  words: CustomVocabItem[]
  onUpdate: (wordId: string, updates: Partial<Pick<CustomVocabItem, 'kana' | 'kanji' | 'han_viet' | 'meaning_vi'>>) => void
  onDelete: (wordId: string) => void
  onHide: (wordId: string) => void
  isPending?: boolean
}

export function EditableVocabTable({ words, onUpdate, onDelete, onHide, isPending }: Props) {
  const [editing, setEditing] = useState<EditState | null>(null)

  function startEdit(word: CustomVocabItem) {
    setEditing({
      wordId: word.id,
      kanji: word.kanji ?? '',
      kana: word.kana,
      han_viet: word.han_viet ?? '',
      meaning_vi: word.meaning_vi,
    })
  }

  function commitEdit() {
    if (!editing)
      return
    onUpdate(editing.wordId, {
      kanji: editing.kanji.trim() || null,
      kana: editing.kana.trim(),
      han_viet: editing.han_viet.trim() || null,
      meaning_vi: editing.meaning_vi.trim(),
    })
    setEditing(null)
  }

  function cancelEdit() {
    setEditing(null)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/30 text-[10px] font-[var(--br-mono-font)] text-muted-foreground uppercase tracking-widest">
            <th className="text-left p-2">WORD</th>
            <th className="text-left p-2">KANA</th>
            <th className="text-left p-2">HÁN VIỆT</th>
            <th className="text-left p-2">NGHĨA</th>
            <th className="p-2 w-16" />
          </tr>
        </thead>
        <tbody>
          {words.map((word) => {
            const isEditing = editing?.wordId === word.id

            if (isEditing) {
              return (
                <tr key={word.id} className="border-b border-border/20 border-l-2 border-l-primary bg-primary/5">
                  <td className="p-1.5">
                    <input
                      className="w-full bg-background border border-primary/50 px-1.5 py-0.5 text-xs focus:outline-none focus:border-primary"
                      value={editing.kanji}
                      onChange={e => setEditing(s => s ? { ...s, kanji: e.target.value } : s)}
                      placeholder="kanji"
                      style={{ fontFamily: 'var(--br-jp-font)' }}
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      className="w-full bg-background border border-primary/50 px-1.5 py-0.5 text-xs focus:outline-none focus:border-primary"
                      value={editing.kana}
                      onChange={e => setEditing(s => s ? { ...s, kana: e.target.value } : s)}
                      style={{ fontFamily: 'var(--br-jp-font)' }}
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      className="w-full bg-background border border-primary/50 px-1.5 py-0.5 text-xs focus:outline-none focus:border-primary"
                      value={editing.han_viet}
                      onChange={e => setEditing(s => s ? { ...s, han_viet: e.target.value } : s)}
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      className="w-full bg-background border border-primary/50 px-1.5 py-0.5 text-xs focus:outline-none focus:border-primary"
                      value={editing.meaning_vi}
                      onChange={e => setEditing(s => s ? { ...s, meaning_vi: e.target.value } : s)}
                    />
                  </td>
                  <td className="p-1.5">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="icon-xs"
                        className="bg-primary text-primary-foreground"
                        aria-label="✓"
                        onClick={commitEdit}
                        disabled={isPending}
                      >
                        ✓
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="hủy"
                        onClick={cancelEdit}
                        disabled={isPending}
                      >
                        ✕
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            }

            return (
              <tr
                key={word.id}
                className="border-b border-border/20 hover:bg-accent/30 cursor-pointer group"
                onClick={() => startEdit(word)}
              >
                <td className="p-2" style={{ fontFamily: 'var(--br-jp-font)' }}>
                  {word.kanji ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="p-2" style={{ fontFamily: 'var(--br-jp-font)' }}>{word.kana}</td>
                <td className="p-2 text-muted-foreground">{word.han_viet ?? '—'}</td>
                <td className="p-2">{word.meaning_vi}</td>
                <td className="p-2">
                  <div className="flex gap-1 justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onHide(word.id)
                      }}
                      disabled={isPending}
                      title="Ẩn từ này"
                      aria-label={`Ẩn ${word.kanji ?? word.kana}`}
                      className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <EyeOffIcon className="h-3 w-3" />
                    </button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                      aria-label="xóa"
                      disabled={isPending}
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(word.id)
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}

          {words.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">
                Chưa có từ nào — nhập từ vựng bên trên
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
