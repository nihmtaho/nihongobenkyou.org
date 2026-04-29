import type { KanjiItem, StrokeData } from '../src/types/kanji'
import type { Kanjidic2Entry } from './parse-kanjidic2'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import yaml from 'js-yaml'

interface KanjiViExample {
  ja: string
  en: string
  vi: string
  fr?: string
}

interface RelatedVocabItemYaml {
  word?: string | null
  kana: string
  han_viet?: string | null
  meaning_vi: string
  example?: { ja: string, vi: string } | null
}

interface KanjiViEntry {
  char: string
  level?: 'n5' | 'n4' | 'n3' | 'n2' | 'n1'
  meaning_vi: string[]
  han_viet: string | null
  mnemonic_vi: string | null
  components: { char: string, meaning_en: string, meaning_vi: string, han_viet: string | null }[] | null
  examples?: KanjiViExample[] | null
  related_vocab?: RelatedVocabItemYaml[] | null
}

interface LessonMeta {
  key: string
  id: number
}

interface KanjiViYaml {
  lessons: LessonMeta[]
  [lessonKey: string]: KanjiViEntry[] | LessonMeta[] | unknown
}

// Standard 214 Kangxi radical characters by classical number (1-indexed)
const KANGXI_RADICALS: string[] = [
  '',
  '一',
  '丨',
  '丶',
  '丿',
  '乙',
  '亅',
  '二',
  '亠',
  '人',
  '儿',
  '入',
  '八',
  '冂',
  '冖',
  '冫',
  '几',
  '凵',
  '刀',
  '力',
  '勺',
  '匕',
  '匚',
  '匸',
  '十',
  '卜',
  '卩',
  '厂',
  '厶',
  '又',
  '口',
  '囗',
  '土',
  '士',
  '夂',
  '夊',
  '夕',
  '大',
  '女',
  '子',
  '宀',
  '寸',
  '小',
  '尢',
  '尸',
  '屮',
  '山',
  '巛',
  '工',
  '己',
  '巾',
  '干',
  '幺',
  '广',
  '廴',
  '廾',
  '弋',
  '弓',
  '彐',
  '彡',
  '彳',
  '心',
  '戈',
  '戶',
  '手',
  '支',
  '攴',
  '文',
  '斗',
  '斤',
  '方',
  '无',
  '日',
  '曰',
  '月',
  '木',
  '欠',
  '止',
  '歹',
  '殳',
  '毋',
  '比',
  '毛',
  '氏',
  '气',
  '水',
  '火',
  '爪',
  '父',
  '爻',
  '爿',
  '片',
  '牙',
  '牛',
  '犬',
  '玄',
  '玉',
  '瓜',
  '瓦',
  '甘',
  '生',
  '用',
  '田',
  '疋',
  '疒',
  '癶',
  '白',
  '皮',
  '皿',
  '目',
  '矛',
  '矢',
  '石',
  '示',
  '禸',
  '禾',
  '穴',
  '立',
  '竹',
  '米',
  '糸',
  '缶',
  '网',
  '羊',
  '羽',
  '老',
  '而',
  '耒',
  '耳',
  '聿',
  '肉',
  '臣',
  '自',
  '至',
  '臼',
  '舌',
  '舛',
  '舟',
  '艮',
  '色',
  '艸',
  '虍',
  '虫',
  '血',
  '行',
  '衣',
  '襾',
  '見',
  '角',
  '言',
  '谷',
  '豆',
  '豕',
  '豸',
  '貝',
  '赤',
  '走',
  '足',
  '身',
  '車',
  '辛',
  '辰',
  '辵',
  '邑',
  '酉',
  '釆',
  '里',
  '金',
  '長',
  '門',
  '阜',
  '隶',
  '隹',
  '雨',
  '青',
  '非',
  '面',
  '革',
  '韋',
  '韭',
  '音',
  '頁',
  '風',
  '飛',
  '食',
  '首',
  '香',
  '馬',
  '骨',
  '高',
  '髟',
  '鬥',
  '鬯',
  '鬲',
  '鬼',
  '魚',
  '鳥',
  '鹵',
  '鹿',
  '麥',
  '麻',
  '黃',
  '黍',
  '黑',
  '黹',
  '黽',
  '鼎',
  '鼓',
  '鼠',
  '鼻',
  '齊',
  '齒',
  '龍',
  '龜',
  '龠',
]

function radicalChar(num: number): string | null {
  return KANGXI_RADICALS[num] ?? null
}

export async function run(
  kanjidic2Path: string,
  kanjivgPath: string,
  viYamlPath: string,
  outputPath: string,
): Promise<void> {
  const errors: string[] = []
  const warnings: string[] = []

  // Load all sources
  const kanjidic2: Kanjidic2Entry[] = JSON.parse(readFileSync(kanjidic2Path, 'utf-8'))
  const strokeMap: Record<string, StrokeData[]> = JSON.parse(readFileSync(kanjivgPath, 'utf-8'))
  const yamlContent = yaml.load(readFileSync(viYamlPath, 'utf-8')) as KanjiViYaml

  // YAML is the source of truth — build ordered list preserving lesson structure
  const viList: Array<KanjiViEntry & { lesson_number: number }> = []
  const viMap = new Map<string, KanjiViEntry & { lesson_number: number }>()
  for (const lessonMeta of (yamlContent.lessons ?? [])) {
    const lessonEntries = yamlContent[lessonMeta.key] as KanjiViEntry[] | undefined
    if (!Array.isArray(lessonEntries))
      continue
    for (const entry of lessonEntries) {
      if (viMap.has(entry.char)) {
        warnings.push(`Duplicate char in YAML: ${entry.char} — lesson ${lessonMeta.key} skipped, keeping first occurrence`)
        continue
      }
      const resolved = { ...entry, lesson_number: lessonMeta.id }
      viMap.set(entry.char, resolved)
      viList.push(resolved)
    }
  }

  // Build KANJIDIC2 lookup — enriches readings, meanings, stroke count, radical
  const kanjidic2Map = new Map<string, Kanjidic2Entry>(kanjidic2.map(e => [e.char, e]))

  const results: KanjiItem[] = []

  for (const vi of viList) {
    const { char } = vi

    if (!vi.meaning_vi || vi.meaning_vi.length === 0) {
      warnings.push(`${char}: no meaning_vi — skipped`)
      continue
    }

    // Look up KANJIDIC2 for readings, English meanings, stroke count, radical
    const k = kanjidic2Map.get(char)
    if (!k) {
      warnings.push(`${char}: not found in KANJIDIC2 — stroke/reading data unavailable`)
    }

    const stroke_count = k?.stroke_count ?? 0
    const radical_classical = k?.radical_classical ?? 0
    const jlpt = k?.jlpt ?? null
    const onyomi = k?.onyomi ?? []
    const kunyomi = k?.kunyomi ?? []
    const meaning_en = k?.meaning_en ?? []

    if (!vi.han_viet) {
      warnings.push(`${char}: han_viet is null`)
    }
    if (!vi.mnemonic_vi) {
      warnings.push(`${char}: mnemonic_vi is null`)
    }

    const stroke_paths = strokeMap[char] ?? null
    if (!stroke_paths) {
      warnings.push(`${char}: no KanjiVG stroke data`)
    }

    const jlptFromKanjidic: KanjiItem['jlpt_level'] = jlpt === 5
      ? 'N5'
      : jlpt === 4
        ? 'N4'
        : jlpt === 3
          ? 'N3'
          : jlpt === 2
            ? 'N2'
            : jlpt === 1
              ? 'N1'
              : null
    const jlptLevel: KanjiItem['jlpt_level'] = vi.level
      ? vi.level.toUpperCase() as KanjiItem['jlpt_level']
      : jlptFromKanjidic

    results.push({
      char,
      jlpt_level: jlptLevel,
      lesson_number: vi.lesson_number,
      radical: radicalChar(radical_classical),
      stroke_count,
      onyomi,
      kunyomi,
      meaning_en,
      meaning_vi: vi.meaning_vi,
      han_viet: vi.han_viet ?? null,
      mnemonic_vi: vi.mnemonic_vi ?? null,
      components: vi.components ?? null,
      stroke_paths,
      examples: vi.examples ?? null,
      related_vocab: vi.related_vocab?.map(rv => ({
        word: rv.word ?? null,
        kana: rv.kana,
        han_viet: rv.han_viet ?? null,
        meaning_vi: rv.meaning_vi,
        example: rv.example ?? null,
      })) ?? null,
    })
  }

  // Report
  if (warnings.length > 0) {
    process.stderr.write(`Kanji merge warnings (${warnings.length}):\n${warnings.map(w => `  ⚠ ${w}`).join('\n')}\n`)
  }
  if (errors.length > 0) {
    process.stderr.write(`Kanji merge ERRORS:\n${errors.map(e => `  ✗ ${e}`).join('\n')}\n`)
    process.exit(1)
  }

  process.stdout.write(`  Merged ${results.length} kanji from ${viList.length} YAML entries (${warnings.length} warnings)\n`)
  writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8')
}
