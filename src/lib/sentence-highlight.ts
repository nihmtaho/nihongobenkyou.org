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
