import type { DatasetConfig } from '../types/dataset'

export const datasets: DatasetConfig[] = [
  {
    id: 'minna_shokyuu_1',
    title: 'Minna no Nihongo Shokyuu I',
    title_vi: 'Minna no Nihongo Sơ cấp I',
    source_file: 'dataset/minna-no-ds.yaml',
    lesson_key_prefix: 'lesson',
    lesson_range: [1, 25],
    jlpt_level: 5,
    version: '1.0.0',
    book_code_prefix: 'mnn1',
    output_dir: 'public/data/mnn1',
    enabled: true,
    kanjium_file: '.kanjium/data/accents.txt',
    edition_filter: [2],
  },
  // NOTE: flip `enabled` to true after YAML content and meaning.vi translations are ready (FR-014)
  {
    id: 'minna_shokyuu_2',
    title: 'Minna no Nihongo Shokyuu II',
    title_vi: 'Minna no Nihongo Sơ cấp II',
    source_file: 'dataset/minna-no-ds-2.yaml',
    lesson_key_prefix: 'lesson',
    lesson_range: [26, 50],
    jlpt_level: 4,
    version: '1.0.0',
    book_code_prefix: 'mnn2',
    output_dir: 'public/data/mnn2',
    enabled: false,
  },
]

export const bookCodePrefixToSource: Record<string, string> = Object.fromEntries(
  datasets.map(d => [d.book_code_prefix, d.id]),
)
