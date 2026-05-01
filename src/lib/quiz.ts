import type { KanjiItem } from '../types/kanji'
import type { VocabItem } from '../types/vocabulary'

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function selectDistractors(
  correct: VocabItem,
  pool: VocabItem[],
  count = 3,
): VocabItem[] {
  const exclude = (v: VocabItem) => v.vocab_id !== correct.vocab_id

  const sameLesson = pool.filter(
    v => exclude(v) && v.book_source === correct.book_source && v.lesson_number === correct.lesson_number,
  )

  let candidates = sameLesson
  if (candidates.length < count) {
    const sameJlpt = pool.filter(
      v => exclude(v) && v.jlpt_level === correct.jlpt_level && !sameLesson.some(s => s.vocab_id === v.vocab_id),
    )
    candidates = [...candidates, ...sameJlpt]
  }
  if (candidates.length < count) {
    const rest = pool.filter(v => exclude(v) && !candidates.some(c => c.vocab_id === v.vocab_id))
    candidates = [...candidates, ...rest]
  }

  return shuffle(candidates).slice(0, count)
}

export function selectKanjiDistractors(target: KanjiItem, pool: KanjiItem[], count = 3): KanjiItem[] {
  const candidates = pool.filter(k => k.char !== target.char && k.han_viet != null)
  const sameLevel = candidates.filter(k => k.jlpt_level === target.jlpt_level)
  const rest = candidates.filter(k => k.jlpt_level !== target.jlpt_level)
  return [...shuffle(sameLevel), ...shuffle(rest)].slice(0, count)
}
