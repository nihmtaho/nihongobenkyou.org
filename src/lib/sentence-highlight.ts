export function highlightSentence(sentence: string, target: string): string[] {
  const idx = sentence.indexOf(target)
  if (idx === -1)
    return [sentence]
  return [
    sentence.slice(0, idx),
    target,
    sentence.slice(idx + target.length),
  ]
}

export interface Segment {
  text: string
  kind: 'plain' | 'target' | 'known'
  /** Tooltip content for 'known' segments — e.g. "にほんご → tiếng Nhật" */
  meaning?: string
}

/**
 * Splits `text` into annotated segments by marking every occurrence of
 * `targetTerm` (primary highlight) and each entry in `knownTerms` (secondary
 * underline). When spans overlap, longer matches win; ties go to the earlier
 * start position.
 */
export function annotatePassage(
  text: string,
  targetTerm: string,
  knownTerms: ReadonlyArray<{ term: string, meaning: string }>,
): Segment[] {
  interface Span { start: number, end: number, kind: 'target' | 'known', meaning?: string }
  const spans: Span[] = []

  // Collect all target occurrences
  let pos = text.indexOf(targetTerm)
  while (pos !== -1) {
    spans.push({ start: pos, end: pos + targetTerm.length, kind: 'target' })
    pos = text.indexOf(targetTerm, pos + 1)
  }

  // Collect all known-term occurrences
  for (const { term, meaning } of knownTerms) {
    if (!term)
      continue
    pos = text.indexOf(term)
    while (pos !== -1) {
      spans.push({ start: pos, end: pos + term.length, kind: 'known', meaning })
      pos = text.indexOf(term, pos + 1)
    }
  }

  if (spans.length === 0)
    return [{ text, kind: 'plain' }]

  // Prefer longer matches; tie-break: earlier start position wins
  spans.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start)

  // Greedy non-overlapping selection
  const occupied = Array.from({ length: text.length }).fill(false)
  const selected: Span[] = []
  for (const span of spans) {
    let overlaps = false
    for (let i = span.start; i < span.end; i++) {
      if (occupied[i]) {
        overlaps = true
        break
      }
    }
    if (overlaps)
      continue
    selected.push(span)
    for (let i = span.start; i < span.end; i++) occupied[i] = true
  }

  // Rebuild text as ordered segments
  selected.sort((a, b) => a.start - b.start)

  const result: Segment[] = []
  let cursor = 0
  for (const span of selected) {
    if (cursor < span.start)
      result.push({ text: text.slice(cursor, span.start), kind: 'plain' })
    result.push({ text: text.slice(span.start, span.end), kind: span.kind, meaning: span.meaning })
    cursor = span.end
  }
  if (cursor < text.length)
    result.push({ text: text.slice(cursor), kind: 'plain' })

  return result
}
