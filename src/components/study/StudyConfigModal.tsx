import type { MeaningLanguage, StudyConfig, StudyMode, TypeInputSubMode } from '../../types/study'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogFooter as DialogFooter,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from '@/components/ui/responsive-dialog'
import { useSettingsStore } from '../../stores/settingsStore'
import { STUDY_CONFIG_MODE_OPTIONS } from './config/study-config-modes.config'

const CARD_COUNTS = [5, 10, 20, 50, 'all'] as const
type CardCountOption = (typeof CARD_COUNTS)[number]

const TYPE_INPUT_SUB_MODES: { value: TypeInputSubMode, label: string, desc: string }[] = [
  { value: 'word→hira', label: 'Từ vựng → Hiragana', desc: 'Nhìn chữ Nhật, gõ cách đọc' },
  { value: 'vi→hira', label: 'Tiếng Việt → Hiragana', desc: 'Nhìn nghĩa tiếng Việt, gõ hiragana' },
  { value: 'word→vi', label: 'Từ vựng → Tiếng Việt', desc: 'Nhìn chữ Nhật, gõ nghĩa tiếng Việt' },
]

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
  const [typeInputSubMode, setTypeInputSubMode] = useState<TypeInputSubMode>('word→hira')

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
      typeInputSubMode: mode === 'type-input' ? typeInputSubMode : undefined,
    })
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex flex-col gap-4 max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold text-lg">Study Configuration</DialogTitle>
        </DialogHeader>

        {/* Mode */}
        <div className="flex flex-col gap-1">
          <Label className="font-semibold">Mode</Label>
          <div className="flex gap-2 flex-wrap">
            {STUDY_CONFIG_MODE_OPTIONS.map(({ value: m, label }) => (
              <Button
                key={m}
                size="sm"
                variant={mode === m ? 'default' : 'outline'}
                className="font-[var(--br-mono-font)]"
                onClick={() => setMode(m)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Type-input sub-mode */}
        {mode === 'type-input' && (
          <div className="flex flex-col gap-2">
            <Label className="font-semibold">Hướng gõ</Label>
            <div className="flex flex-col gap-2">
              {TYPE_INPUT_SUB_MODES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  className={`flex flex-col items-start p-3 border text-left transition-colors ${
                    typeInputSubMode === value
                      ? 'border-primary bg-primary/10 border-l-4'
                      : 'border-border/20 hover:border-border/40'
                  }`}
                  onClick={() => setTypeInputSubMode(value)}
                >
                  <span className="text-sm font-semibold font-[var(--br-mono-font)]">{label}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Card count */}
        <div className="flex flex-col gap-1">
          <Label className="font-semibold">Cards</Label>
          <div className="flex gap-2 flex-wrap">
            {CARD_COUNTS.map(c => (
              <Button
                key={String(c)}
                size="sm"
                variant={cardCount === c ? 'default' : 'outline'}
                onClick={() => setCardCount(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>

        {/* Order */}
        <div className="flex flex-col gap-1">
          <Label className="font-semibold">Order</Label>
          <div className="flex gap-2">
            {(['random', 'sequential'] as const).map(o => (
              <Button
                key={o}
                size="sm"
                variant={order === o ? 'default' : 'outline'}
                onClick={() => setOrder(o)}
              >
                {o}
              </Button>
            ))}
          </div>
        </div>

        {/* Meaning language */}
        <div className="flex flex-col gap-1">
          <Label className="font-semibold">Meaning Language</Label>
          <div className="flex gap-2">
            {(['vi', 'en', 'both'] as MeaningLanguage[]).map(l => (
              <Button
                key={l}
                size="sm"
                variant={lang === l ? 'default' : 'outline'}
                onClick={() => setLang(l)}
              >
                {l === 'vi' ? 'Vietnamese' : l === 'en' ? 'English' : 'Both'}
              </Button>
            ))}
          </div>
        </div>

        {/* Lesson filter */}
        {availableLessons.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label className="font-semibold">Lessons (leave empty for all)</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {availableLessons.map(l => (
                <Button
                  key={l.lesson_id}
                  size="xs"
                  variant={lessonIds.includes(l.lesson_id) ? 'default' : 'outline'}
                  onClick={() => toggleLesson(l.lesson_id)}
                >
                  L
                  {l.lesson_number}
                </Button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Start</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
