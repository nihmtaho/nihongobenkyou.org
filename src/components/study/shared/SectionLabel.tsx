import { Badge } from '@/components/ui/badge'

export function SectionLabel({ label, count }: { label: string, count: number }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
        {label}
      </p>
      <Badge variant="secondary" className="font-[var(--br-mono-font)] text-[9px]">
        {count}
      </Badge>
      <div className="h-px flex-1 bg-border/10" />
    </div>
  )
}
