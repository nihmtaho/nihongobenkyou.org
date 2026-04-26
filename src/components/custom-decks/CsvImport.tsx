import type { ChangeEvent } from 'react'
import type { CsvImportResult } from '../../types/custom-deck'
import { useState } from 'react'
import { bulkImport } from '../../api/custom-vocabulary'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { parseCsvRows } from '../../lib/csv-parser'

interface Props {
  deckId: string
  userId: string
  onSuccess: (result: CsvImportResult) => void
}

type State = 'idle' | 'preview' | 'importing' | 'done' | 'error'

export function CsvImport({ deckId, userId, onSuccess }: Props) {
  const { isOnline } = useOnlineStatus()
  const [state, setState] = useState<State>('idle')
  const [rowCount, setRowCount] = useState(0)
  const [result, setResult] = useState<CsvImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [parsedText, setParsedText] = useState('')

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file)
      return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const { rows, result: parseResult } = parseCsvRows(text)
      if (rows.length === 0 && parseResult.errors.length > 0) {
        setErrorMsg(parseResult.errors[0]?.reason ?? 'Lỗi đọc CSV')
        setState('error')
        return
      }
      setParsedText(text)
      setRowCount(rows.length)
      setState('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImport() {
    setState('importing')
    try {
      const { rows } = parseCsvRows(parsedText)
      const importResult = await bulkImport(deckId, userId, rows)
      setResult(importResult)
      setState('done')
      onSuccess(importResult)
    }
    catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi nhập CSV')
      setState('error')
    }
  }

  if (!isOnline) {
    return (
      <div className="alert alert-warning text-sm">
        Bạn đang ngoại tuyến. Không thể nhập CSV.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-base-content/60">
        Định dạng: cột
        {' '}
        <code>kana</code>
        {' '}
        (bắt buộc),
        {' '}
        <code>kanji</code>
        ,
        {' '}
        <code>meaning_vi</code>
        {' '}
        (bắt buộc),
        {' '}
        <code>meaning_en</code>
      </p>

      {state === 'idle' && (
        <input
          type="file"
          accept=".csv"
          className="file-input file-input-bordered file-input-sm"
          onChange={handleFileChange}
        />
      )}

      {state === 'preview' && (
        <div className="flex items-center gap-3">
          <span className="text-sm">
            {rowCount}
            {' '}
            hàng sẵn sàng nhập
          </span>
          <button className="btn btn-primary btn-sm" onClick={handleImport}>
            Xác nhận nhập
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setState('idle')}>
            Hủy
          </button>
        </div>
      )}

      {state === 'importing' && (
        <div className="flex items-center gap-2 text-sm">
          <span className="loading loading-spinner loading-sm" />
          Đang nhập…
        </div>
      )}

      {state === 'done' && result && (
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-success">
            ✓ Nhập
            {result.imported}
            {' '}
            từ thành công
          </span>
          {result.skipped > 0 && (
            <span className="text-warning">
              Bỏ qua
              {result.skipped}
              {' '}
              từ
            </span>
          )}
          {result.errors.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-base-content/60">
                Chi tiết (
                {result.errors.length}
                {' '}
                lỗi)
              </summary>
              <ul className="mt-1 ml-3 list-disc text-xs text-base-content/60">
                {result.errors.map(err => (
                  <li key={`${err.row}-${err.reason}`}>
                    Hàng
                    {' '}
                    {err.row}
                    :
                    {' '}
                    {err.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-3">
          <span className="text-error text-sm">{errorMsg}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setState('idle')}>
            Thử lại
          </button>
        </div>
      )}
    </div>
  )
}
