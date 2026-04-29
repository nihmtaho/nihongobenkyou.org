export function removeDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036F]/gu, '').toLowerCase()
}

// Strips parenthetical annotations from a Vietnamese meaning for answer comparison.
// Does NOT strip [] \u2014 brackets mark load-bearing placeholders (e.g. "\u00D4ng/b\u00E0 [t\u00EAn]").
// Case-insensitive (toLowerCase) but preserves diacritics (\u0103 \u2260 a).
export function normalizeViMeaning(text: string): string {
  return text
    .replace(/\(.*?\)/g, '') // strip ASCII (\u2026)
    .replace(/\uFF08.*?\uFF09/g, '') // strip full-width \uFF08\u2026\uFF09
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
    .toLowerCase()
}
