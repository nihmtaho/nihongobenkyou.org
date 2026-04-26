import { useState } from 'react'
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
        <div className="alert alert-warning text-sm">
          Bạn đang ngoại tuyến. Không thể thêm từ mới.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="form-control">
          <span className="label-text mb-1">Kana *</span>
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

        <label className="form-control">
          <span className="label-text mb-1">Kanji</span>
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

      <label className="form-control">
        <span className="label-text mb-1">Nghĩa tiếng Việt *</span>
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

      <label className="form-control">
        <span className="label-text mb-1">Nghĩa tiếng Anh</span>
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
        <button
          type="submit"
          className="btn btn-primary"
          disabled={disabled || !kana.trim() || !meaningVi.trim()}
        >
          {isPending ? <span className="loading loading-spinner loading-sm" /> : 'Thêm từ'}
        </button>
        {pitchLoading && (
          <span className="text-sm text-base-content/60 flex items-center gap-1">
            <span className="loading loading-dots loading-xs" />
            Đang tra pitch accent…
          </span>
        )}
      </div>
    </form>
  )
}
