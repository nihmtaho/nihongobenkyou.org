import { toHiragana } from 'wanakana'

const SMALL_KANA = new Set('ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ')

export function moraCount(kana: string): number {
  const hira = toHiragana(kana)
  let count = 0
  let i = 0
  while (i < hira.length) {
    i++
    count++
    if (i < hira.length && SMALL_KANA.has(hira[i]))
      i++
  }
  return count
}
