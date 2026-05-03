import type { StudySection } from '../study-modal.types'

export const KANJI_STUDY_SECTIONS: StudySection[] = [
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
  {
    id: 'vocab',
    icon: '語彙',
    sublabel: 'TỪ VỰNG KANJI',
    modes: [
      { id: 'vocab:flashcard', mode: 'flashcard', name: 'Flashcard', desc: 'Lật thẻ · ghi nhớ theo SRS', tag: 'SRS' },
      { id: 'vocab:quiz', mode: 'quiz', name: 'Trắc nghiệm', desc: 'Chọn nghĩa tiếng Việt đúng', tag: '4×' },
      { id: 'vocab:type:word→hira', mode: 'type', subMode: 'word→hira', name: 'Gõ cách đọc', desc: 'Từ vựng Kanji → gõ hiragana', tag: 'かな', isSubMode: true },
      { id: 'vocab:type:vi→hira', mode: 'type', subMode: 'vi→hira', name: 'Gõ từ vựng', desc: 'Nghĩa tiếng Việt → gõ hiragana', tag: 'かな', isSubMode: true },
      { id: 'vocab:type:word→vi+hanviet', mode: 'type', subMode: 'word→vi+hanviet', name: 'Gõ nghĩa + Hán Việt', desc: 'Từ vựng Kanji → 2 ô nhập liệu', tag: '2+', isSubMode: true },
    ],
  },
]
