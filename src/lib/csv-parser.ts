import type { CsvImportResult, CsvRow } from '../types/custom-deck'

interface ParseResult {
  rows: CsvRow[]
  result: CsvImportResult
}

export function parseCsvRows(text: string): ParseResult {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean)

  if (lines.length < 2) {
    return {
      rows: [],
      result: { imported: 0, skipped: 0, errors: [{ row: 0, reason: 'CSV is empty or missing header row' }] },
    }
  }

  const [headerLine, ...dataLines] = lines
  const cols = headerLine.split(',').map(c => c.trim().toLowerCase())

  const kanaIdx = cols.indexOf('kana')
  if (kanaIdx === -1) {
    return {
      rows: [],
      result: { imported: 0, skipped: 0, errors: [{ row: 0, reason: 'Missing required column: kana' }] },
    }
  }

  const meaningViIdx = cols.indexOf('meaning_vi')
  if (meaningViIdx === -1) {
    return {
      rows: [],
      result: { imported: 0, skipped: 0, errors: [{ row: 0, reason: 'Missing required column: meaning_vi' }] },
    }
  }

  const kanjiIdx = cols.indexOf('kanji')
  const meaningEnIdx = cols.indexOf('meaning_en')

  const rows: CsvRow[] = []
  const errors: Array<{ row: number, reason: string }> = []
  let skipped = 0

  dataLines.forEach((line, i) => {
    const rowNumber = i + 2
    const cells = line.split(',').map(c => c.trim())

    const kana = cells[kanaIdx] ?? ''
    const meaning_vi = cells[meaningViIdx] ?? ''

    if (!kana) {
      errors.push({ row: rowNumber, reason: 'Missing required field: kana' })
      skipped++
      return
    }

    if (!meaning_vi) {
      errors.push({ row: rowNumber, reason: 'Missing required field: meaning_vi' })
      skipped++
      return
    }

    const row: CsvRow = { kana, meaning_vi }

    if (kanjiIdx !== -1 && cells[kanjiIdx])
      row.kanji = cells[kanjiIdx]

    if (meaningEnIdx !== -1 && cells[meaningEnIdx])
      row.meaning_en = cells[meaningEnIdx]

    rows.push(row)
  })

  return {
    rows,
    result: { imported: rows.length, skipped, errors },
  }
}
