import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { run as merge } from './merge-kanji'
import { run as parseKanjidic2 } from './parse-kanjidic2'
import { run as parseKanjivg } from './parse-kanjivg'

const BUILD_DIR = path.join(process.cwd(), '.build', 'kanji')
const DATASET_DIR = path.join(process.cwd(), 'dataset')
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data', 'kanji')

// KANJIDIC2 source — prefer full XML.gz if present, fall back to local N5 JSON
const KANJIDIC2_XML_PATH = path.join(DATASET_DIR, 'kanjidic2.xml.gz')
const KANJI_BASE_PATH = existsSync(KANJIDIC2_XML_PATH)
  ? KANJIDIC2_XML_PATH
  : path.join(DATASET_DIR, 'kanji-n5-base.json')
// KanjiVG stroke data — optional external download
const KANJIVG_DIR = path.join(DATASET_DIR, 'kanjivg')
const VI_YAML_PATH = path.join(DATASET_DIR, 'kanji-vi.yaml')

async function runStep(name: string, fn: () => Promise<void>): Promise<void> {
  process.stdout.write(`  → ${name}... `)
  try {
    await fn()
    process.stdout.write('done\n')
  }
  catch (err) {
    process.stdout.write('FAILED\n')
    process.stderr.write(`Step '${name}' failed: ${String(err)}\n`)
    process.exit(1)
  }
}

export async function run(): Promise<void> {
  if (!existsSync(KANJI_BASE_PATH)) {
    process.stderr.write(`ERROR: kanji base data not found at ${KANJI_BASE_PATH}\n`)
    process.exit(1)
  }

  if (!existsSync(BUILD_DIR))
    mkdirSync(BUILD_DIR, { recursive: true })
  if (!existsSync(OUTPUT_DIR))
    mkdirSync(OUTPUT_DIR, { recursive: true })

  const baseOut = path.join(BUILD_DIR, '01-kanjidic2-n5.json')
  const kanjivgOut = path.join(BUILD_DIR, '02-kanjivg-strokes.json')
  const mergedOut = path.join(OUTPUT_DIR, 'n5-kanji.json')

  process.stdout.write('\nBuilding kanji dataset: N5 (~80 kanji)\n')

  await runStep('parse-base', () => parseKanjidic2(KANJI_BASE_PATH, baseOut))

  // Stroke data is optional — use empty map if KanjiVG directory not present
  if (existsSync(KANJIVG_DIR)) {
    await runStep('parse-kanjivg', () => parseKanjivg(KANJIVG_DIR, kanjivgOut))
  }
  else {
    process.stdout.write(`  → parse-kanjivg... skipped (dataset/kanjivg/ not found — stroke_paths will be null)\n`)
    const { writeFileSync } = await import('node:fs')
    writeFileSync(kanjivgOut, '{}', 'utf-8')
  }

  await runStep('merge-kanji', () => merge(baseOut, kanjivgOut, VI_YAML_PATH, mergedOut))

  process.stdout.write(`✓ kanji: built successfully → ${mergedOut}\n`)
}
