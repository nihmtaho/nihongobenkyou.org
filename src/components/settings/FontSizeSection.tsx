import type { FontSize } from '../../types/study'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSettingsStore } from '../../stores/settingsStore'

const FONT_SIZE_OPTIONS: { value: FontSize, label: string }[] = [
  { value: 'sm', label: 'Nhỏ' },
  { value: 'md', label: 'Vừa' },
  { value: 'lg', label: 'Lớn' },
]

export function FontSizeSection() {
  const fontSize = useSettingsStore(s => s.fontSize)

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">CỠ CHỮ</h2>
        <RadioGroup
          value={fontSize}
          onValueChange={value => useSettingsStore.setState({ fontSize: value as FontSize })}
          className="flex gap-4"
        >
          {FONT_SIZE_OPTIONS.map(({ value, label }) => (
            <Label key={value} className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value={value} />
              <span className="font-[var(--br-mono-font)] text-sm uppercase">{label}</span>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
