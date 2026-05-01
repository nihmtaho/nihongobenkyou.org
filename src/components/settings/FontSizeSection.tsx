import type { FontSize } from '../../types/study'
import { useSettingsStore } from '../../stores/settingsStore'

const FONT_SIZE_OPTIONS: { value: FontSize, label: string }[] = [
  { value: 'sm', label: 'Nhỏ' },
  { value: 'md', label: 'Vừa' },
  { value: 'lg', label: 'Lớn' },
]

export function FontSizeSection() {
  const fontSize = useSettingsStore(s => s.fontSize)

  return (
    <div className="card bg-base-200 border border-base-content/10 p-4">
      <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">CỠ CHỮ</h2>
      <div className="flex gap-4">
        {FONT_SIZE_OPTIONS.map(({ value, label }) => (
          <label key={value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              className="radio radio-primary"
              name="fontSize"
              value={value}
              checked={fontSize === value}
              onChange={() => useSettingsStore.setState({ fontSize: value })}
            />
            <span className="font-[var(--br-mono-font)] text-sm uppercase">{label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
