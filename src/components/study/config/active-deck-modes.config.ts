import type { StudySection } from '../study-modal.types'

export const ACTIVE_DECK_VOCAB_SECTIONS: StudySection[] = [
  {
    id: 'main',
    modes: [
      { id: 'flashcard', mode: 'flashcard', name: 'Flashcard', desc: 'Lật thẻ · ghi nhớ theo SRS', tag: 'SRS' },
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

export const CUSTOM_DECK_SECTIONS: StudySection[] = [
  {
    id: 'main',
    modes: [
      { id: 'flashcard', mode: 'flashcard', name: 'Flashcard', desc: 'Lật thẻ · ghi nhớ theo SRS', tag: 'SRS' },
      { id: 'quiz', mode: 'quiz', name: 'Trắc nghiệm', desc: 'Chọn nghĩa đúng · 4 đáp án', tag: '4×' },
    ],
  },
  {
    id: 'type-input',
    label: 'GÕ TỪ',
    modes: [
      { id: 'type-input:word→hira', mode: 'type-input', subMode: 'word→hira', name: 'Từ vựng → Hiragana', desc: 'Nhìn chữ Nhật, gõ cách đọc', tag: 'かな', isSubMode: true },
      { id: 'type-input:vi→hira', mode: 'type-input', subMode: 'vi→hira', name: 'Tiếng Việt → Hiragana', desc: 'Nhìn nghĩa tiếng Việt, gõ hiragana', tag: 'かな', isSubMode: true },
      { id: 'type-input:word→vi', mode: 'type-input', subMode: 'word→vi', name: 'Từ vựng → Tiếng Việt', desc: 'Nhìn chữ Nhật, gõ nghĩa tiếng Việt', tag: 'VI', isSubMode: true },
      { id: 'type-input:word→han_viet', mode: 'type-input', subMode: 'word→han_viet', name: 'Từ vựng → Hán Việt', desc: 'Nhìn chữ Nhật, gõ âm Hán Việt', tag: 'HV', isSubMode: true },
    ],
  },
]

export const ACTIVE_DECK_KANJI_SECTIONS: StudySection[] = [
  {
    id: 'kanji',
    icon: '単漢字',
    sublabel: 'KANJI ĐƠN',
    modes: [
      { id: 'kanji:flashcard', mode: 'flashcard', name: 'Flashcard', desc: 'Lật thẻ · ghi nhớ theo SRS', tag: 'SRS' },
      { id: 'kanji:quiz', mode: 'quiz', name: 'Trắc nghiệm', desc: 'Chọn Hán Việt đúng · 4 đáp án', tag: '4×' },
      { id: 'kanji:type', mode: 'type', name: 'Gõ Hán Việt', desc: 'Gõ Hán Việt · không cần dấu', tag: 'GÕ' },
    ],
  },
]
  {
    id: 'kanji',
    icon: '単漢字',
    sublabel: 'KANJI ĐƠN',
    modes: [
      { id: 'kanji:flashcard', mode: 'flashcard', name: 'Flashcard', desc: 'Lật thẻ · ghi nhớ theo SRS', tag: 'SRS' },
      { id: 'kanji:quiz', mode: 'quiz', name: 'Trắc nghiệm', desc: 'Chọn Hán Việt đúng · 4 đáp án', tag: '4×' },
      { id: 'kanji:type', mode: 'type', name: 'Gõ Hán Việt', desc: 'Gõ Hán Việt · không cần dấu', tag: 'GÕ' },
    ],
  },
]
