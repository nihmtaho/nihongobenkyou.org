import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useSettingsStore } from '../../stores/settingsStore'

export function DarkModeSection() {
  const darkMode = useSettingsStore(s => s.darkMode)
  const setDarkMode = useSettingsStore(s => s.setDarkMode)

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
          GIAO DIỆN TỐI
        </h2>
        <Label className="flex items-center gap-3 cursor-pointer">
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          <span className="font-[var(--br-mono-font)] text-sm uppercase">
            {darkMode ? 'Bật' : 'Tắt'}
          </span>
        </Label>
      </CardContent>
    </Card>
  )
}
