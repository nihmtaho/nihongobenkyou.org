export function parsePitchPattern(n: number | null, moraCount: number): ('H' | 'L')[] | null {
  if (n === null)
    return null

  const pattern: ('H' | 'L')[] = []

  if (n === 0) {
    for (let i = 0; i < moraCount; i++) {
      pattern.push(i === 0 ? 'L' : 'H')
    }
    return pattern
  }

  if (n === 1) {
    for (let i = 0; i < moraCount; i++) {
      pattern.push(i === 0 ? 'H' : 'L')
    }
    return pattern
  }

  // n >= 2: drop after mora n (LH…HL…L)
  for (let i = 0; i < moraCount; i++) {
    if (i === 0) {
      pattern.push('L')
    }
    else if (i < n) {
      pattern.push('H')
    }
    else {
      pattern.push('L')
    }
  }
  return pattern
}
