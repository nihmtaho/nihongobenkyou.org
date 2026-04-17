export type DatasetId = string & { readonly _brand: 'DatasetId' }

export interface DatasetConfig {
  id: string
  title: string
  title_vi: string
  source_file: string
  lesson_key_prefix: string
  lesson_range: [number, number]
  jlpt_level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  version: string
  output_dir: string
  enabled: boolean
}

export interface LessonMeta {
  lesson_id: string
  book_source: string
  lesson_number: number
  title: string
  vocab_count: number
}

export interface Manifest {
  version: string
  checksum: string
  datasets: Array<{
    id: string
    version: string
    lesson_count: number
  }>
  generated_at: string
}
