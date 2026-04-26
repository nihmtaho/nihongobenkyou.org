import { describe, expect, it } from 'vitest'
import { parseCsvRows } from './csv-parser'

const VALID_CSV = `kanji,kana,meaning_vi,meaning_en
会議,かいぎ,cuộc họp,meeting
食べる,たべる,ăn,to eat
,みず,nước,water`

const CRLF_CSV = `kanji,kana,meaning_vi,meaning_en\r\n会議,かいぎ,cuộc họp,meeting\r\n食べる,たべる,ăn,to eat`

describe('parseCsvRows', () => {
  it('parses a valid CSV with all columns', () => {
    const { rows, result } = parseCsvRows(VALID_CSV)
    expect(rows).toHaveLength(3)
    expect(result.imported).toBe(3)
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('maps fields correctly', () => {
    const { rows } = parseCsvRows(VALID_CSV)
    expect(rows[0]).toEqual({ kanji: '会議', kana: 'かいぎ', meaning_vi: 'cuộc họp', meaning_en: 'meeting' })
    expect(rows[2]).toEqual({ kana: 'みず', meaning_vi: 'nước', meaning_en: 'water' })
    expect(rows[2]?.kanji).toBeUndefined()
  })

  it('handles CRLF line endings', () => {
    const { rows } = parseCsvRows(CRLF_CSV)
    expect(rows).toHaveLength(2)
  })

  it('returns error for missing kana column', () => {
    const csv = `kanji,meaning_vi\n会議,cuộc họp`
    const { rows, result } = parseCsvRows(csv)
    expect(rows).toHaveLength(0)
    expect(result.errors[0]?.reason).toMatch(/kana/)
  })

  it('returns error for missing meaning_vi column', () => {
    const csv = `kana,meaning_en\nかいぎ,meeting`
    const { rows, result } = parseCsvRows(csv)
    expect(rows).toHaveLength(0)
    expect(result.errors[0]?.reason).toMatch(/meaning_vi/)
  })

  it('skips rows with missing kana value', () => {
    const csv = `kana,meaning_vi\n,cuộc họp\nたべる,ăn`
    const { rows, result } = parseCsvRows(csv)
    expect(rows).toHaveLength(1)
    expect(result.skipped).toBe(1)
    expect(result.errors[0]?.reason).toMatch(/kana/)
  })

  it('skips rows with missing meaning_vi value', () => {
    const csv = `kana,meaning_vi\nかいぎ,\nたべる,ăn`
    const { rows, result } = parseCsvRows(csv)
    expect(rows).toHaveLength(1)
    expect(result.skipped).toBe(1)
  })

  it('trims whitespace from fields', () => {
    const csv = `kana , meaning_vi \n かいぎ , cuộc họp `
    const { rows } = parseCsvRows(csv)
    expect(rows[0]?.kana).toBe('かいぎ')
    expect(rows[0]?.meaning_vi).toBe('cuộc họp')
  })

  it('skips blank lines', () => {
    const csv = `kana,meaning_vi\nかいぎ,cuộc họp\n\nたべる,ăn`
    const { rows } = parseCsvRows(csv)
    expect(rows).toHaveLength(2)
  })

  it('handles empty CSV', () => {
    const { rows, result } = parseCsvRows('')
    expect(rows).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
  })

  it('handles CSV with only header', () => {
    const { rows, result } = parseCsvRows('kana,meaning_vi')
    expect(rows).toHaveLength(0)
    expect(result.imported).toBe(0)
  })
})
