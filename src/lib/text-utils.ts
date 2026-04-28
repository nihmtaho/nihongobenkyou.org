export function removeDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036F]/gu, '').toLowerCase()
}
