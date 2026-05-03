export interface StudyModeItem {
  id: string
  name: string
  desc: string
  tag: string
  mode: string
  subMode?: string
  isSubMode?: boolean
}

export interface StudySection {
  id: string
  label?: string
  icon?: string
  sublabel?: string
  modes: StudyModeItem[]
}

export interface StudyLaunchOptions {
  order: 'random' | 'sequential'
  sectionId: string
  subMode?: string
  cardCount?: number | 'all'
  lessonIds?: string[]
  language?: 'vi' | 'en' | 'both'
}
