import { createHash } from 'node:crypto'

// FROZEN: sha256(bookSource:lesson:kanji??kana:kana).slice(0,16) — NEVER CHANGE after user data exists
export function generateVocabId(
  bookCodePrefix: string,
  bookSource: string,
  lessonNumber: number,
  kanji: string | null,
  kana: string,
): string {
  const input = `${bookSource}:${lessonNumber}:${kanji ?? kana}:${kana}`
  const hash = createHash('sha256').update(input).digest('hex')
  return `${bookCodePrefix}_${hash.slice(0, 16)}`
}
