import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { run } from './enrich-pitch'

const TMP = join(tmpdir(), `enrich-pitch-test-${process.pid}`)
const INPUT = join(TMP, 'input.json')
const OUTPUT = join(TMP, 'output.json')
const KANJIUM = join(TMP, 'accents.txt')

const BASE_CONFIG = {
  id: 'minna_shokyuu_1',
  title: 'Minna',
  title_vi: 'Minna VI',
  source_file: '',
  lesson_key_prefix: 'lesson',
  lesson_range: [1, 1] as [number, number],
  jlpt_level: 5,
  version: '1.0.0',
  book_code_prefix: 'mnn1',
  output_dir: '',
  enabled: true,
}

const SAMPLE_ENTRY = {
  id: [1, 1],
  kanji: '先生',
  kana: 'せんせい',
  romaji: 'sensei',
  meaning: { en: 'teacher', vi: 'giáo viên' },
  pos: ['noun'],
  jlpt: 5,
  examples: [],
  lesson_number: 1,
}

beforeEach(() => {
  mkdirSync(TMP, { recursive: true })
})

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true })
})

function writeInput(entries: unknown[]): void {
  writeFileSync(INPUT, JSON.stringify(entries), 'utf-8')
}

function writeKanjium(lines: string[]): void {
  writeFileSync(KANJIUM, lines.join('\n'), 'utf-8')
}

function readOutput(): Array<{ pitch_pattern: number | null }> {
  return JSON.parse(readFileSync(OUTPUT, 'utf-8'))
}

describe('enrich-pitch', () => {
  it('sets pitch_pattern from kanji:kana composite key', async () => {
    writeInput([SAMPLE_ENTRY])
    writeKanjium(['先生\tせんせい\t0'])

    await run(INPUT, OUTPUT, { ...BASE_CONFIG, kanjium_file: KANJIUM })

    const result = readOutput()
    expect(result[0].pitch_pattern).toBe(0)
  })

  it('falls back to kana-only lookup when composite key missing', async () => {
    writeInput([{ ...SAMPLE_ENTRY, kanji: null }])
    writeKanjium(['\tせんせい\t2'])

    await run(INPUT, OUTPUT, { ...BASE_CONFIG, kanjium_file: KANJIUM })

    const result = readOutput()
    expect(result[0].pitch_pattern).toBe(2)
  })

  it('sets pitch_pattern to null when entry not found in Kanjium', async () => {
    writeInput([SAMPLE_ENTRY])
    writeKanjium(['ほかのことば\tなにか\t1'])

    await run(INPUT, OUTPUT, { ...BASE_CONFIG, kanjium_file: KANJIUM })

    const result = readOutput()
    expect(result[0].pitch_pattern).toBeNull()
  })

  it('sets pitch_pattern to null for all entries when no kanjium_file configured', async () => {
    writeInput([SAMPLE_ENTRY])

    await run(INPUT, OUTPUT, BASE_CONFIG)

    const result = readOutput()
    expect(result[0].pitch_pattern).toBeNull()
  })

  it('does not throw when kanjium entry is missing — graceful null', async () => {
    writeInput([SAMPLE_ENTRY, { ...SAMPLE_ENTRY, kana: 'ほかことば', kanji: null }])
    writeKanjium(['先生\tせんせい\t0'])

    await expect(run(INPUT, OUTPUT, { ...BASE_CONFIG, kanjium_file: KANJIUM })).resolves.toBeUndefined()
    const result = readOutput()
    expect(result[1].pitch_pattern).toBeNull()
  })
})
