import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { gunzipSync } from 'node:zlib'
import { XMLParser } from 'fast-xml-parser'

export interface Kanjidic2Entry {
  char: string
  stroke_count: number
  radical_classical: number
  jlpt: number | null
  onyomi: string[]
  kunyomi: string[]
  meaning_en: string[]
}

// Old KANJIDIC2 4-level JLPT → new 5-level (N5=5, N4=4, N3=3, N2=2, N1=1)
const JLPT_OLD_TO_NEW: Record<number, number> = { 4: 5, 3: 4, 2: 2, 1: 1 }

function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null)
    return []
  return Array.isArray(val) ? val : [val]
}

function parseFromXml(xmlText: string): Kanjidic2Entry[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: name => ['character', 'rad_value', 'reading', 'meaning', 'stroke_count'].includes(name),
    parseAttributeValue: false,
    trimValues: true,
  })

  const root = parser.parse(xmlText)
  const characters: unknown[] = toArray(root?.kanjidic2?.character)
  const entries: Kanjidic2Entry[] = []

  for (const ch of characters) {
    const c = ch as Record<string, unknown>
    const literal = c.literal as string | undefined
    if (!literal)
      continue

    // Stroke count — take first value when multiple exist
    const strokeValues = toArray(c.misc ? (c.misc as Record<string, unknown>).stroke_count : undefined)
    const strokeRaw = strokeValues[0]
    const stroke_count = Number(typeof strokeRaw === 'object' ? (strokeRaw as Record<string, unknown>)['#text'] : strokeRaw)
    if (!stroke_count || stroke_count < 1)
      continue

    // Classical radical number
    const radical = c.radical as Record<string, unknown> | undefined
    const radValues = toArray(radical?.rad_value)
    const classicalRad = radValues.find((r) => {
      const rv = r as Record<string, unknown>
      return rv['@_rad_type'] === 'classical'
    })
    const radical_classical = classicalRad
      ? Number((classicalRad as Record<string, unknown>)['#text'] ?? classicalRad)
      : 0

    // JLPT level (old 4-level → new 5-level)
    const misc = c.misc as Record<string, unknown> | undefined
    const jlptRaw = misc?.jlpt
    const jlpt = jlptRaw !== undefined && jlptRaw !== null
      ? (JLPT_OLD_TO_NEW[Number(jlptRaw)] ?? null)
      : null

    // Readings
    const rmgroup = (c.reading_meaning as Record<string, unknown> | undefined)?.rmgroup as Record<string, unknown> | undefined
    const readings = toArray(rmgroup?.reading)
    const onyomi = readings
      .filter(r => (r as Record<string, unknown>)['@_r_type'] === 'ja_on')
      .map((r) => {
        const rv = r as Record<string, unknown>
        return String(rv['#text'] ?? rv)
      })
    const kunyomi = readings
      .filter(r => (r as Record<string, unknown>)['@_r_type'] === 'ja_kun')
      .map((r) => {
        const rv = r as Record<string, unknown>
        return String(rv['#text'] ?? rv)
      })

    // English meanings: nodes with no m_lang attribute
    const meanings = toArray(rmgroup?.meaning)
    const meaning_en = meanings
      .filter(m => typeof m === 'string' || !(m as Record<string, unknown>)['@_m_lang'])
      .map(m => typeof m === 'string' ? m : String((m as Record<string, unknown>)['#text'] ?? m))

    if (meaning_en.length === 0)
      continue

    entries.push({ char: literal, stroke_count, radical_classical, jlpt, onyomi, kunyomi, meaning_en })
  }

  return entries
}

function parseFromJson(jsonText: string): Kanjidic2Entry[] {
  interface LocalEntry {
    char: string
    stroke_count: number
    radical: string
    jlpt: number
    onyomi: string[]
    kunyomi: string[]
    meaning_en: string[]
  }
  const RADICAL_TO_NUM: Record<string, number> = {
    一: 1,
    丨: 2,
    丶: 3,
    丿: 4,
    乙: 5,
    亅: 6,
    二: 7,
    亠: 8,
    人: 9,
    儿: 10,
    入: 11,
    八: 12,
    冂: 13,
    冖: 14,
    冫: 15,
    几: 16,
    凵: 17,
    刀: 18,
    力: 19,
    十: 24,
    卜: 25,
    卩: 26,
    厂: 27,
    厶: 28,
    又: 29,
    口: 30,
    囗: 31,
    土: 32,
    大: 37,
    女: 38,
    子: 39,
    宀: 40,
    寸: 41,
    小: 42,
    山: 46,
    工: 48,
    己: 49,
    巾: 50,
    干: 51,
    广: 53,
    廴: 54,
    弓: 57,
    彳: 60,
    心: 61,
    手: 64,
    方: 70,
    日: 72,
    月: 74,
    木: 75,
    水: 85,
    火: 86,
    父: 88,
    牛: 93,
    犬: 94,
    生: 100,
    田: 102,
    白: 106,
    目: 109,
    石: 112,
    禾: 115,
    立: 117,
    竹: 118,
    米: 119,
    糸: 120,
    羊: 123,
    耳: 128,
    肉: 130,
    見: 147,
    言: 149,
    貝: 154,
    赤: 155,
    足: 157,
    車: 159,
    金: 167,
    長: 168,
    門: 169,
    雨: 173,
    青: 174,
    食: 184,
    馬: 187,
    高: 189,
    魚: 195,
  }

  const raw: LocalEntry[] = JSON.parse(jsonText)
  return raw
    .filter(e => e.char)
    .map(e => ({
      char: e.char,
      stroke_count: e.stroke_count,
      radical_classical: RADICAL_TO_NUM[e.radical] ?? 0,
      jlpt: e.jlpt,
      onyomi: e.onyomi,
      kunyomi: e.kunyomi,
      meaning_en: e.meaning_en,
    }))
}

export async function run(inputPath: string, outputPath: string): Promise<void> {
  const isGz = inputPath.endsWith('.gz')
  const buffer = readFileSync(inputPath)

  let entries: Kanjidic2Entry[]

  if (isGz) {
    const xmlText = gunzipSync(buffer).toString('utf-8')
    entries = parseFromXml(xmlText)
    process.stdout.write(`  Parsed ${entries.length} kanji from KANJIDIC2 XML\n`)
  }
  else {
    entries = parseFromJson(buffer.toString('utf-8'))
    const n5Count = entries.filter(e => e.jlpt === 5).length
    process.stdout.write(`  Loaded ${entries.length} kanji from local base (${n5Count} N5)\n`)
  }

  writeFileSync(outputPath, JSON.stringify(entries, null, 2), 'utf-8')
}
