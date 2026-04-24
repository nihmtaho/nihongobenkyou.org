import type { DatasetConfig, FileEntry, Manifest } from '../src/types/dataset'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

function zeroPad(n: number): string {
  return String(n).padStart(2, '0')
}

export async function run(config: DatasetConfig): Promise<void> {
  const outputBase = path.join(process.cwd(), 'public', 'data', config.book_code_prefix)
  const [rangeStart, rangeEnd] = config.lesson_range

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

  const manifest: Manifest = {
    schema_version: '1.0',
    built_at: new Date().toISOString(),
    built_by: 'build:dataset',
    built_from: config.id,
    datasets: [
      {
        id: config.id,
        version: config.version,
        book_code_prefix: config.book_code_prefix,
        lesson_count: rangeEnd - rangeStart + 1,
        vocab_count: vocabCount,
        checksum: datasetChecksum,
        files,
      },
    ],
  }

  const manifestPath = path.join(process.cwd(), 'public', 'data', 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}
