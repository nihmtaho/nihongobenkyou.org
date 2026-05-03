import type { StudyMode } from '../../../types/study'

export const STUDY_CONFIG_MODE_OPTIONS: { value: StudyMode, label: string }[] = [
  { value: 'flashcard', label: 'Thẻ từ' },
  { value: 'quiz', label: 'Trắc nghiệm' },
  { value: 'type-input', label: 'Gõ từ' },
  { value: 'sentence-flashcard', label: 'Thẻ câu' },
  { value: 'listening', label: 'Nghe hiểu' },
  { value: 'reading-comprehension', label: 'Đọc hiểu' },
  { value: 'pitch-discrimination', label: 'Thanh điệu' },
]
