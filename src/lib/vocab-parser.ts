import type { ParsedVocabItem, VocabParseResult } from '../types/custom-deck'

export function parseJsonVocab(text: string): VocabParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  }
  catch {
    return {
      items: [],
      errors: [{ row: 0, reason: 'JSON không hợp lệ — kiểm tra lại cú pháp' }],
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      items: [],
      errors: [{ row: 0, reason: 'JSON phải là một array [...] ' }],
    }
  }

  const items: ParsedVocabItem[] = []
  const errors: VocabParseResult['errors'] = []

  ;(parsed as Record<string, unknown>[]).forEach((row, i) => {
    const rowNum = i + 1
    const kana = typeof row.kana === 'string' ? row.kana.trim() : ''
    if (!kana) {
      errors.push({ row: rowNum, reason: `Hàng ${rowNum}: thiếu trường "kana"` })
      return
    }
    items.push({
      word: typeof row.word === 'string' && row.word.trim() ? row.word.trim() : null,
      kana,
      han_viet: typeof row.han_viet === 'string' && row.han_viet.trim() ? row.han_viet.trim() : null,
      meaning_vi: typeof row.meaning_vi === 'string' ? row.meaning_vi.trim() : '',
    })
  })

  return { items, errors }
}

export function parseCsvVocab(text: string): VocabParseResult {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean)

  if (lines.length < 2) {
    return {
      items: [],
      errors: [{ row: 0, reason: 'CSV trống hoặc thiếu header row' }],
    }
  }

  const [headerLine, ...dataLines] = lines
  const cols = headerLine.split(',').map(c => c.trim().toLowerCase())

  const kanaIdx = cols.indexOf('kana')
  if (kanaIdx === -1) {
    return {
      items: [],
      errors: [{ row: 0, reason: 'Thiếu cột bắt buộc: kana' }],
    }
  }

  const wordIdx = cols.indexOf('word')
  const hanVietIdx = cols.indexOf('han_viet')
  const meaningViIdx = cols.indexOf('meaning_vi')

  const items: ParsedVocabItem[] = []
  const errors: VocabParseResult['errors'] = []

  dataLines.forEach((line, i) => {
    const rowNum = i + 2
    const cells = line.split(',').map(c => c.trim())
    const kana = cells[kanaIdx] ?? ''
    if (!kana) {
      errors.push({ row: rowNum, reason: `Hàng ${rowNum}: kana trống` })
      return
    }
    items.push({
      word: wordIdx !== -1 && cells[wordIdx] ? cells[wordIdx] : null,
      kana,
      han_viet: hanVietIdx !== -1 && cells[hanVietIdx] ? cells[hanVietIdx] : null,
      meaning_vi: meaningViIdx !== -1 ? (cells[meaningViIdx] ?? '') : '',
    })
  })

  return { items, errors }
}
