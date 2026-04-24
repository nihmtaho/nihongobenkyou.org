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
  },
]
