import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

interface Props {
  onAdd: (input: { kana: string, kanji?: string, meaning_vi: string, meaning_en?: string }) => void
  isPending?: boolean
  pitchLoading?: boolean
}

export function WordEntry({ onAdd, isPending, pitchLoading }: Props) {
  const { isOnline } = useOnlineStatus()
  const [kana, setKana] = useState('')
  const [kanji, setKanji] = useState('')
  const [meaningVi, setMeaningVi] = useState('')
  const [meaningEn, setMeaningEn] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!kana.trim() || !meaningVi.trim())
      return
    onAdd({
      kana: kana.trim(),
      kanji: kanji.trim() || undefined,
      meaning_vi: meaningVi.trim(),
      meaning_en: meaningEn.trim() || undefined,
    })
    setKana('')
    setKanji('')
    setMeaningVi('')
    setMeaningEn('')
  }

  const disabled = !isOnline || !!isPending

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {!isOnline && (
        <Alert className="bg-warning/10 border-warning/50 text-sm">
          <AlertDescription>
            Bạn đang ngoại tuyến. Không thể thêm từ mới.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm mb-1">Kana *</span>
          <input
            type="text"
            className="input input-bordered"
            style={{ fontFamily: 'var(--br-jp-font)' }}
            value={kana}
            onChange={e => setKana(e.target.value)}
            placeholder="かいぎ"
            required
            disabled={disabled}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm mb-1">Kanji</span>
          <input
            type="text"
            className="input input-bordered"
            style={{ fontFamily: 'var(--br-jp-font)' }}
            value={kanji}
            onChange={e => setKanji(e.target.value)}
            placeholder="会議"
            disabled={disabled}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm mb-1">Nghĩa tiếng Việt *</span>
        <input
          type="text"
          className="input input-bordered"
          value={meaningVi}
          onChange={e => setMeaningVi(e.target.value)}
          placeholder="cuộc họp"
          required
          disabled={disabled}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm mb-1">Nghĩa tiếng Anh</span>
        <input
          type="text"
          className="input input-bordered"
          value={meaningEn}
          onChange={e => setMeaningEn(e.target.value)}
          placeholder="meeting"
          disabled={disabled}
        />
      </label>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={disabled || !kana.trim() || !meaningVi.trim()}
        >
          {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Thêm từ'}
        </Button>
        {pitchLoading && (
          <span className="text-sm text-foreground/60 flex items-center gap-1">
            <Loader2 className="animate-spin h-3 w-3" />
            Đang tra pitch accent…
          </span>
        )}
      </div>
    </form>
  )
}
