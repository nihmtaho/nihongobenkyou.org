import type { MeaningLanguage, StudyConfig, StudyMode } from '../../types/study'
import { useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'

const CARD_COUNTS = [5, 10, 20, 50, 'all'] as const
type CardCountOption = (typeof CARD_COUNTS)[number]

interface StudyConfigModalProps {
  availableLessons: { lesson_id: string, lesson_number: number, title?: string }[]
  defaultMode?: StudyMode
  defaultLessonIds?: string[]
  onConfirm: (config: StudyConfig) => void
  onClose: () => void
}

export function StudyConfigModal({
  availableLessons,
  defaultMode = 'flashcard',
  defaultLessonIds = [],
  onConfirm,
  onClose,
}: StudyConfigModalProps) {
  const { meaningLanguage } = useSettingsStore()

  const [mode, setMode] = useState<StudyMode>(defaultMode)
  const [cardCount, setCardCount] = useState<CardCountOption>(10)
  const [order, setOrder] = useState<'random' | 'sequential'>('random')
  const [lessonIds, setLessonIds] = useState<string[]>(defaultLessonIds)
  const [lang, setLang] = useState<MeaningLanguage>(meaningLanguage)

  function toggleLesson(id: string) {
    setLessonIds(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }

  function handleConfirm() {
    useSettingsStore.setState({ meaningLanguage: lang })
    onConfirm({
      mode,
      cardCount: cardCount === 'all' ? 'all' : cardCount,
      order,
      lessonIds,
    })
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg">Study Configuration</h3>

        {/* Mode */}
        <div className="form-control gap-1">
          <label className="label-text font-semibold">Mode</label>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { value: 'flashcard', label: 'Thẻ từ' },
                { value: 'quiz', label: 'Trắc nghiệm' },
                { value: 'type-input', label: 'Gõ từ' },
                { value: 'sentence-flashcard', label: 'Thẻ câu' },
                { value: 'listening', label: 'Nghe hiểu' },
                { value: 'reading-comprehension', label: 'Đọc hiểu' },
                { value: 'pitch-discrimination', label: 'Thanh điệu' },
              ] as { value: StudyMode, label: string }[]
            ).map(({ value: m, label }) => (
              <button
                key={m}
                className={`btn btn-sm font-[var(--br-mono-font)] ${mode === m ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setMode(m)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Card count */}
        <div className="form-control gap-1">
          <label className="label-text font-semibold">Cards</label>
          <div className="flex gap-2 flex-wrap">
            {CARD_COUNTS.map(c => (
              <button
                key={String(c)}
                className={`btn btn-sm ${cardCount === c ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setCardCount(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Order */}
        <div className="form-control gap-1">
          <label className="label-text font-semibold">Order</label>
          <div className="flex gap-2">
            {(['random', 'sequential'] as const).map(o => (
              <button
                key={o}
                className={`btn btn-sm ${order === o ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setOrder(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Meaning language */}
        <div className="form-control gap-1">
          <label className="label-text font-semibold">Meaning Language</label>
          <div className="flex gap-2">
            {(['vi', 'en', 'both'] as MeaningLanguage[]).map(l => (
              <button
                key={l}
                className={`btn btn-sm ${lang === l ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setLang(l)}
              >
                {l === 'vi' ? 'Vietnamese' : l === 'en' ? 'English' : 'Both'}
              </button>
            ))}
          </div>
        </div>

        {/* Lesson filter */}
        {availableLessons.length > 0 && (
          <div className="form-control gap-1">
            <label className="label-text font-semibold">Lessons (leave empty for all)</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {availableLessons.map(l => (
                <button
                  key={l.lesson_id}
                  className={`btn btn-xs ${lessonIds.includes(l.lesson_id) ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => toggleLesson(l.lesson_id)}
                >
                  L
                  {l.lesson_number}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm}>Start</button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose} />
    </dialog>
  )
}
