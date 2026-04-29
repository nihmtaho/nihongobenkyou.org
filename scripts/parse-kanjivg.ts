import type { StrokeData } from '../src/types/kanji'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { XMLParser } from 'fast-xml-parser'

// Mapping from KanjiVG kvg:type values to Vietnamese stroke type names
const STROKE_TYPE_VI: Record<string, string> = {
  '㇐': 'nét ngang',
  '㇑': 'nét sổ',
  '㇒': 'nét phẩy',
  '㇓': 'nét phẩy ngắn',
  '㇔': 'nét chấm',
  '㇕': 'nét gấp ngang-xuống',
  '㇖': 'nét gấp xuống-ngang',
  '㇗': 'nét gấp ngang-xuống dài',
  '㇘': 'nét móc ngược',
  '㇙': 'nét cong lên',
  '㇚': 'nét gấp chéo',
  '㇛': 'nét cong phải',
  '㇜': 'nét cong trái',
  '㇝': 'nét vòng',
  '㇞': 'nét ngang-sổ-ngang',
  '㇟': 'nét sổ-ngang',
  '㇠': 'nét phẩy dài',
  '㇡': 'nét móc phẩy',
}

function strokeTypeVi(jaType: string): string {
  return STROKE_TYPE_VI[jaType] ?? jaType
}

function collectPaths(node: unknown, strokes: Array<{ path: string, type: string }>): void {
  if (!node || typeof node !== 'object')
    return
  const n = node as Record<string, unknown>

  if ('path' in n && typeof n.path === 'object') {
    const paths = Array.isArray(n.path) ? n.path : [n.path]
    for (const p of paths) {
      const pm = p as Record<string, unknown>
      const d = String(pm['@_d'] ?? '')
      const kvgType = String(pm['@_kvg:type'] ?? '')
      if (d)
        strokes.push({ path: d, type: kvgType })
    }
  }

  if ('g' in n) {
    const gs = Array.isArray(n.g) ? n.g : [n.g]
    for (const g of gs)
      collectPaths(g, strokes)
  }
}

function codePointToFilename(char: string): string {
  const cp = char.codePointAt(0)!
  return `${cp.toString(16).padStart(5, '0')}.svg`
}

export async function run(kanjivgDir: string, outputPath: string): Promise<void> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: name => ['g', 'path'].includes(name),
  })

  const result: Record<string, StrokeData[]> = {}
  let parsed = 0
  let missing = 0

  const files = readdirSync(kanjivgDir).filter(f => f.endsWith('.svg'))

  for (const file of files) {
    const char = String.fromCodePoint(Number.parseInt(path.basename(file, '.svg'), 16))
    const content = readFileSync(path.join(kanjivgDir, file), 'utf-8')

    const svg = parser.parse(content)
    const svgRoot = svg?.svg ?? {}

    const rawStrokes: Array<{ path: string, type: string }> = []
    collectPaths(svgRoot, rawStrokes)

    if (rawStrokes.length === 0) {
      missing++
      continue
    }

    result[char] = rawStrokes.map((s, i): StrokeData => ({
      stroke_index: i,
      path: s.path,
      stroke_type_ja: s.type,
      stroke_type_vi: strokeTypeVi(s.type),
    }))

    parsed++
  }

  // Also attempt lookup by char filename for any char not yet parsed
  process.stdout.write(`  KanjiVG: ${parsed} characters parsed, ${missing} missing stroke data\n`)
  writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8')
}

export function lookupStrokeData(char: string, strokeMap: Record<string, StrokeData[]>): StrokeData[] | null {
  return strokeMap[char] ?? null
}

export { codePointToFilename }
