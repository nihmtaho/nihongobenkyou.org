import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { datasets } from '../src/lib/datasets.config'
import { run as buildKanji } from './build-kanji'
import { run as enrichPitch } from './enrich-pitch'
import { run as generateVocabId } from './generate-vocab-id'
import { run as mapAudio } from './map-audio'
import { run as parseYaml } from './parse-yaml'
import { run as splitLessons } from './split-lessons'
import { run as validate } from './validate'
import { run as writeManifest } from './write-manifest'

const BUILD_DIR = path.join(process.cwd(), '.build')

function ensureBuildDir(): void {
  if (!existsSync(BUILD_DIR))
    mkdirSync(BUILD_DIR, { recursive: true })
}

function buildPath(filename: string): string {
  return path.join(BUILD_DIR, filename)
}

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

async function runPipeline(): Promise<void> {
  ensureBuildDir()

  const enabledDatasets = datasets.filter(d => d.enabled)
  if (enabledDatasets.length === 0) {
    process.stderr.write('No enabled datasets found in datasets.config.ts\n')
    process.exit(1)
  }

  // Kanji pipeline runs first so write-manifest can include it in the manifest
  await runStep('build-kanji', () => buildKanji())

  for (const config of enabledDatasets) {
    process.stdout.write(`\nBuilding dataset: ${config.id} (${config.version})\n`)

    const raw = buildPath('01-raw.json')
    const pitched = buildPath('02-pitched.json')
    const withIds = buildPath('03-vocab-id.json')
    const withAudio = buildPath('04-audio.json')
    const validated = buildPath('05-validated.json')

    await runStep('parse-yaml', () => parseYaml(config.source_file, raw, config))
    await runStep('enrich-pitch', () => enrichPitch(raw, pitched, config))
    await runStep('generate-vocab-id', () => generateVocabId(pitched, withIds, config))
    await runStep('map-audio', () => mapAudio(withIds, withAudio, config))
    await runStep('validate', () => validate(withAudio, validated, config))
    await runStep('split-lessons', () => splitLessons(validated, config))
    await runStep('write-manifest', () => writeManifest(config))

    process.stdout.write(`✓ ${config.id}: built successfully\n`)
  }

  process.stdout.write('\nAll datasets built.\n')
}

runPipeline().catch((err) => {
  process.stderr.write(`Pipeline failed: ${String(err)}\n`)
  process.exit(1)
})
