import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

interface Props {
  count: number
  label: string
  children: React.ReactNode
}

export function UnstartedCollapse({ count, label, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-4">
      <button
        className="w-full flex items-center gap-3 py-2 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
          {label}
        </p>
        <Badge variant="secondary" className="font-[var(--br-mono-font)] text-[9px]">
          {count}
        </Badge>
        <div className="h-px flex-1 bg-border/10" />
        <span className={`text-[10px] font-[var(--br-mono-font)] text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="overflow-hidden">
          <div className="border border-border/10">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
