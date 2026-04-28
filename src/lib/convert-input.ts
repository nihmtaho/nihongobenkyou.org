import * as wanakana from 'wanakana'

/**
 * Processes a DOM input value for display in a controlled input field.
 *
 * Supports inline mode markers that stay visible in the stored string so
 * subsequent keystrokes always know which conversion to apply per segment:
 *
 *   default  → hiragana (wanakana IME mode)
 *   `#text`  → raw bypass — text kept exactly as typed (romaji, symbols, etc.)
 *   `@text`  → katakana (wanakana IME mode)
 *   `!text`  → hiragana (explicit, used to switch back from # or @ mode)
 *
 * Markers are preserved in the result so the next onChange can re-parse them
 * without losing segment-mode context.
 *
 * Example:  "#ABC!sutoa"  →  "#ABC!すとあ"
 *           "#ABC@suto"   →  "#ABC@スト"
 *           "hira@kata!hira" → "ひら@カタ!ひら"
 */

const MARKERS = new Set(['#', '@', '!'])

// ASCII shorthand symbols that wanakana does not map — converted before
// passing to wanakana so they appear as proper Japanese characters.
// Uses U+FF5E (Fullwidth Tilde ～) to match the dataset standard.
const SYMBOL_MAP: Record<string, string> = {
  '~': '～', // ～ fullwidth tilde — matches dataset encoding
}

function applySymbolMap(text: string): string {
  return text.replace(/~/g, ch => SYMBOL_MAP[ch] ?? ch)
}

export function processTypeInput(domValue: string): string {
  const out: string[] = []
  let i = 0

  while (i < domValue.length) {
    const ch = domValue[i]

    if (MARKERS.has(ch)) {
      const marker = ch
      out.push(marker)
      i++

      const segStart = i
      while (i < domValue.length && !MARKERS.has(domValue[i])) {
        i++
      }
      const seg = domValue.slice(segStart, i)

      if (marker === '#') {
        out.push(seg)
      }
      else if (marker === '@') {
        out.push(wanakana.toKatakana(applySymbolMap(seg), { IMEMode: true }))
      }
      else {
        // '!' → explicit hiragana (switch back from # or @ mode)
        out.push(wanakana.toHiragana(applySymbolMap(seg), { IMEMode: true }))
      }
    }
    else {
      // Default hiragana segment — stops at any marker
      const segStart = i
      while (i < domValue.length && !MARKERS.has(domValue[i])) {
        i++
      }
      const seg = domValue.slice(segStart, i)
      out.push(wanakana.toHiragana(applySymbolMap(seg), { IMEMode: true }))
    }
  }

  return out.join('')
}

/**
 * Strips all inline mode markers (`#`, `@`, `!`) from a processed input string
 * and normalizes wave-dash variants to produce the bare text for comparison.
 *
 * "#ABC@スト!あ"  →  "ABCストあ"
 * "〜ごろ" (U+301C)  →  "～ごろ" (U+FF5E, dataset standard)
 */
export function extractAnswer(processed: string): string {
  return processed
    .replace(/[#@!]/g, '')
    .replace(/〜/g, '～') // normalize wave dash → fullwidth tilde
}
