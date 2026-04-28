import type { DatasetConfig } from '../src/types/dataset'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

interface RawVocabEntry {
  id: [number, number]
  edition?: number[]
  kanji: string | null
  kana: string
  romaji: string
  meaning: { en: string, vi: string, fr?: string }
  pos: string[]
  jlpt: number | null
  examples: Array<{ ja: string, en: string, vi: string }>
  lesson_number: number
  han_viet: string | null
}

interface PitchedEntry extends RawVocabEntry {
  pitch_pattern: number | null
}

// Kanjium indexes dictionary (plain) forms. Minna no Nihongo YAML stores ます-forms.
// This table maps the last mora of a ます-stem to its godan dictionary ending.
const GODAN_MASU_TO_DICT: Record<string, string> = {
  き: 'く',
  ぎ: 'ぐ',
  し: 'す',
  ち: 'つ',
  に: 'ぬ',
  び: 'ぶ',
  み: 'む',
  り: 'る',
  い: 'う',
}

// Some YAML kana fields include usage annotations, e.g. おしえます［じゅうしょを～］
const BRACKET_RE = /[(（[［【〔].*/u

function stripAnnotations(kana: string): string {
  return kana.replace(BRACKET_RE, '').trim()
}

// Returns dictionary-form candidates to try against Kanjium.
// Non-ます strings are returned as-is (nouns, adverbs, etc.).
function dictFormCandidates(masu: string): string[] {
  if (!masu.endsWith('ます'))
    return [masu]
  const stem = masu.slice(0, -2)
  if (!stem)
    return [masu]

  const lastMora = stem.slice(-1)

  // します → する (pure suru verb)
  if (stem === 'し')
    return ['する']

  const candidates: string[] = []

  // Compound suru verbs: コピーします → コピーする
  if (lastMora === 'し')
    candidates.push(`${stem.slice(0, -1)}する`)

  // Godan verbs: replace ます-stem last mora with u-row equivalent
  if (GODAN_MASU_TO_DICT[lastMora])
    candidates.push(`${stem.slice(0, -1)}${GODAN_MASU_TO_DICT[lastMora]}`)

  // Ichidan verbs: stem + る
  candidates.push(`${stem}る`)

  return candidates
}

function buildKanjiumMap(filePath: string): Map<string, number> {
  const map = new Map<string, number>()
  const lines = readFileSync(filePath, 'utf-8').split('\n')
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 3)
      continue
    const [kanji, kana, patternStr] = parts
    const pattern = Number.parseInt(patternStr.split(',')[0] ?? patternStr, 10)
    if (Number.isNaN(pattern))
      continue
    if (kanji && kanji.trim())
      map.set(`${kanji.trim()}:${kana.trim()}`, pattern)
    map.set(kana.trim(), pattern)
  }
  return map
}

function lookupPitch(kanjiumMap: Map<string, number>, kanji: string | null, kana: string): number | null {
  const cleanKana = stripAnnotations(kana)
  for (const dictKana of dictFormCandidates(cleanKana)) {
    const compositeKey = kanji ? `${kanji}:${dictKana}` : null
    if (compositeKey && kanjiumMap.has(compositeKey))
      return kanjiumMap.get(compositeKey)!
    if (kanjiumMap.has(dictKana))
      return kanjiumMap.get(dictKana)!
  }
  return null
}

export async function run(inputPath: string, outputPath: string, config: DatasetConfig): Promise<void> {
  const entries: RawVocabEntry[] = JSON.parse(readFileSync(inputPath, 'utf-8'))

  const hasKanjium = config.kanjium_file && existsSync(config.kanjium_file)
  const kanjiumMap = hasKanjium ? buildKanjiumMap(config.kanjium_file!) : null

  const pitched: PitchedEntry[] = entries.map(entry => ({
    ...entry,
    pitch_pattern: kanjiumMap ? lookupPitch(kanjiumMap, entry.kanji, entry.kana) : null,
  }))

  writeFileSync(outputPath, JSON.stringify(pitched, null, 2), 'utf-8')
}
