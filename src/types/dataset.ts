export interface DatasetConfig {
  id: string
  title: string
  title_vi: string
  source_file: string
  lesson_key_prefix: string
  lesson_range: [number, number]
  jlpt_level: number | null
  version: string
  book_code_prefix: string
  output_dir: string
  enabled: boolean
  kanjium_file?: string
  jitendex_file?: string
  /** Which textbook editions to include. Omit to include all editions. */
  edition_filter?: number[]
}

export interface LessonMeta {
  lesson_id: string
  book_source: string
  lesson_number: number
  title: string
  vocab_count: number
}

export interface KanjiManifestSection {
  n5_checksum: string
  n5_count: number
  generated_at: string
  version: string
}

export interface Manifest {
  schema_version: '1.0' | '2.0'
  app_version?: string
  built_at: string
  built_by: string
  built_from: string
  datasets: DatasetManifest[]
  kanji?: KanjiManifestSection
}

export interface DatasetManifest {
  id: string
  version: string
  book_code_prefix: string
  lesson_count: number
  vocab_count: number
  checksum: string
  files: FileEntry[]
}

export interface FileEntry {
  filename: string
  size_bytes: number
  checksum: string
}
