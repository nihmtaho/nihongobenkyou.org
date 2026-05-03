import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'

interface Props {
  count: number
  label: string
  children: React.ReactNode
}

export function UnstartedCollapse({ count, label, children }: Props) {
  return (
    <Accordion type="single" collapsible className="mt-4">
      <AccordionItem value="unstarted" className="border-0">
        <AccordionTrigger className="py-2 hover:no-underline [&>svg]:hidden">
          <div className="flex items-center gap-3 w-full">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
              {label}
            </p>
            <Badge variant="secondary" className="font-[var(--br-mono-font)] text-[9px]">
              {count}
            </Badge>
            <div className="h-px flex-1 bg-border" />
          </div>
        </AccordionTrigger>
        <AccordionContent className="border border-border pb-0">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
