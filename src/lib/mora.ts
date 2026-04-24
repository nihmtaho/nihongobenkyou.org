import { toHiragana } from 'wanakana'

const SMALL_KANA = new Set('ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ')

function splitMorae(kana: string): string[] {
  const hira = toHiragana(kana)
  const result: string[] = []
  let i = 0
  while (i < hira.length) {
    let mora = hira[i]
    i++
    if (i < hira.length && SMALL_KANA.has(hira[i])) {
      mora += hira[i]
      i++
    }
    result.push(mora)
  }
  return result
}

export function moraCount(kana: string): number {
  return splitMorae(kana).length
}

export interface GradeResult {
  correct: boolean
  wrongMorae: number[]
}

export function gradeReading(typed: string, correct: string): GradeResult {
  const typedMorae = splitMorae(toHiragana(typed))
  const correctMorae = splitMorae(toHiragana(correct))

  if (typedMorae.join('') === correctMorae.join('')) {
    return { correct: true, wrongMorae: [] }
  }

  const wrongMorae: number[] = []
  const len = Math.max(typedMorae.length, correctMorae.length)
  for (let i = 0; i < len; i++) {
    if (typedMorae[i] !== correctMorae[i])
      wrongMorae.push(i)
  }

  return { correct: false, wrongMorae }
}
