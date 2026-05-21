import type { DatasetConfig, FileEntry, KanjiManifestSection, Manifest } from '../src/types/dataset'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export function bumpPatch(version: string): string {
  const parts = version.split('.')
  if (parts.length !== 3)
    return '1.0.0'
  const [major, minor, patchStr] = parts
  if (Number.isNaN(Number(major)) || Number.isNaN(Number(minor)))
    return '1.0.0'
  const patch = Number(patchStr)
  if (Number.isNaN(patch))
    return '1.0.0'
  return `${major}.${minor}.${patch + 1}`
}

function readOldManifest(manifestPath: string): Manifest | undefined {
  if (!existsSync(manifestPath))
    return undefined
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest
  }
  catch {
    return undefined
  }
}

function buildKanjiSection(outputBase: string, version: string): KanjiManifestSection | undefined {
  const kanjiPath = path.join(outputBase, 'kanji', 'n5-kanji.json')
  if (!existsSync(kanjiPath))
    return undefined

  const content = readFileSync(kanjiPath)
  const n5Checksum = createHash('sha256').update(content as Buffer).digest('hex')
  const items: unknown[] = JSON.parse(content.toString('utf-8'))

  return {
    n5_checksum: n5Checksum,
    n5_count: items.length,
    generated_at: new Date().toISOString(),
    version,
  }
}

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

function zeroPad(n: number): string {
  return String(n).padStart(2, '0')
}

export async function run(config: DatasetConfig): Promise<void> {
  const manifestPath = path.join(process.cwd(), 'public', 'data', 'manifest.json')
  const outputBase = path.join(process.cwd(), 'public', 'data', config.book_code_prefix)
  const [rangeStart, rangeEnd] = config.lesson_range

  const oldManifest = readOldManifest(manifestPath)
  const oldDatasetVersion = oldManifest?.datasets.find(d => d.id === config.id)?.version ?? config.version
  const newDatasetVersion = bumpPatch(oldDatasetVersion)
  const oldKanjiVersion = oldManifest?.kanji?.version ?? '1.0.0'
  const newKanjiVersion = bumpPatch(oldKanjiVersion)
  const oldAppVersion = oldManifest?.app_version ?? '1.0.0'
  const newAppVersion = bumpPatch(oldAppVersion)

  const files: FileEntry[] = []
  const fileContents: Buffer[] = []

  for (let lessonNum = rangeStart; lessonNum <= rangeEnd; lessonNum++) {
    const filename = `lesson-${zeroPad(lessonNum)}.json`
    const filePath = path.join(outputBase, filename)

    if (!existsSync(filePath)) {
      process.stderr.write(`MANIFEST_ERROR: missing expected lesson file: ${filePath}\n`)
      process.exit(1)
    }

    const content = readFileSync(filePath)
    const fileChecksum = sha256(content)

    files.push({
      filename,
      size_bytes: content.length,
      checksum: fileChecksum,
    })
    fileContents.push(content)
  }

  const lessonFilesContent = Buffer.concat(fileContents)
  const datasetChecksum = sha256(lessonFilesContent)

  const lessonMetaPath = path.join(outputBase, 'lessons-meta.json')
  const lessonMeta: Array<{ vocab_count: number }> = existsSync(lessonMetaPath)
    ? JSON.parse(readFileSync(lessonMetaPath, 'utf-8'))
    : []

  const vocabCount = lessonMeta.reduce((sum, m) => sum + m.vocab_count, 0)

  const kanjiSection = buildKanjiSection(
    path.join(process.cwd(), 'public', 'data'),
    newKanjiVersion,
  )

  const manifest: Manifest = {
    schema_version: '2.0',
    app_version: newAppVersion,
    built_at: new Date().toISOString(),
    built_by: 'build:dataset',
    built_from: config.id,
    datasets: [
      {
        id: config.id,
        version: newDatasetVersion,
        book_code_prefix: config.book_code_prefix,
        lesson_count: rangeEnd - rangeStart + 1,
        vocab_count: vocabCount,
        checksum: datasetChecksum,
        files,
      },
    ],
    ...(kanjiSection && { kanji: kanjiSection }),
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}
