import type { StudySection } from '../study-modal.types'

export const VOCAB_STUDY_SECTIONS: StudySection[] = [
  {
    id: 'main',
    modes: [
      { id: 'flashcard', mode: 'flashcard', name: 'Flashcard', desc: 'Lật thẻ · ghi nhớ theo SRS', tag: 'SRS' },
      { id: 'quiz', mode: 'quiz', name: 'Trắc nghiệm', desc: 'Chọn nghĩa đúng · 4 đáp án', tag: '4×' },
      { id: 'listening', mode: 'listening', name: 'Nghe hiểu', desc: 'Nghe audio, chọn nghĩa đúng', tag: '♪' },
    ],
  },
  {
    id: 'type-input',
    label: 'GÕ TỪ',
    modes: [
      { id: 'type-input:word→hira', mode: 'type-input', subMode: 'word→hira', name: 'Từ vựng → Hiragana', desc: 'Nhìn chữ Nhật, gõ cách đọc', tag: 'かな', isSubMode: true },
      { id: 'type-input:vi→hira', mode: 'type-input', subMode: 'vi→hira', name: 'Tiếng Việt → Hiragana', desc: 'Nhìn nghĩa tiếng Việt, gõ hiragana', tag: 'かな', isSubMode: true },
      { id: 'type-input:word→vi', mode: 'type-input', subMode: 'word→vi', name: 'Từ vựng → Tiếng Việt', desc: 'Nhìn chữ Nhật, gõ nghĩa tiếng Việt', tag: 'VI', isSubMode: true },
    ],
  },
]
