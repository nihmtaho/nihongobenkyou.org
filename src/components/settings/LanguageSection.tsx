import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSettingsStore } from '../../stores/settingsStore'

export function LanguageSection() {
  const meaningLanguage = useSettingsStore(s => s.meaningLanguage)

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
          NGÔN NGỮ NGHĨA
        </h2>
        <RadioGroup
          value={meaningLanguage}
          onValueChange={value => useSettingsStore.setState({ meaningLanguage: value as 'vi' | 'en' })}
          className="flex gap-4"
        >
          {(['vi', 'en'] as const).map(lang => (
            <Label key={lang} className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value={lang} />
              <span className="font-[var(--br-mono-font)] text-sm uppercase">
                {lang === 'vi' ? 'Tiếng Việt' : 'English'}
              </span>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
