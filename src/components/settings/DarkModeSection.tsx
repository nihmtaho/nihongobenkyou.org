import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function DarkModeSection() {
  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
          GIAO DIỆN TỐI
        </h2>
        <Label className="flex items-center gap-3 cursor-not-allowed opacity-50">
          <Switch disabled />
          <span className="font-[var(--br-mono-font)] text-sm uppercase">Sắp ra mắt</span>
        </Label>
      </CardContent>
    </Card>
  )
}
