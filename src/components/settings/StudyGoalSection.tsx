import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useSettingsStore } from '../../stores/settingsStore'

const PRESETS = [5, 10, 15, 20, 30, 50, 100] as const
const MIN_GOAL = 5
const MAX_GOAL = 200

export function StudyGoalSection() {
  const dailyReviewGoal = useSettingsStore(s => s.dailyReviewGoal)
  const setDailyReviewGoal = useSettingsStore(s => s.setDailyReviewGoal)
  const [inputValue, setInputValue] = useState(String(dailyReviewGoal))

  function handlePreset(n: number) {
    setDailyReviewGoal(n)
    setInputValue(String(n))
  }

  function handleInputBlur() {
    const raw = Number(inputValue)
    if (Number.isNaN(raw)) {
      setInputValue(String(dailyReviewGoal))
      return
    }
    const clamped = Math.min(MAX_GOAL, Math.max(MIN_GOAL, Math.round(raw)))
    setDailyReviewGoal(clamped)
    setInputValue(String(clamped))
  }

  const isCustomValue = !PRESETS.includes(dailyReviewGoal as typeof PRESETS[number])

  return (
    <Card className="p-4">
      <CardContent className="p-0 flex flex-col gap-4">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)]">
          MỤC TIÊU HỌC TẬP
        </h2>

        <p className="text-xs font-[var(--br-mono-font)] text-muted-foreground uppercase">
          Số lần ôn tập mỗi ngày
        </p>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => handlePreset(n)}
              className={`px-3 py-1.5 text-sm font-bold font-[var(--br-mono-font)] border transition-colors ${
                dailyReviewGoal === n
                  ? 'bg-destructive text-destructive-foreground border-destructive'
                  : 'bg-background text-foreground border-border hover:border-foreground'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-[var(--br-mono-font)] text-muted-foreground uppercase shrink-0">
            Tùy chỉnh (5–200):
          </span>
          <Input
            type="number"
            min={MIN_GOAL}
            max={MAX_GOAL}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onBlur={handleInputBlur}
            className={`w-20 font-[var(--br-mono-font)] text-center ${isCustomValue ? 'border-destructive' : ''}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
