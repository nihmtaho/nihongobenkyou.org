import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { datasets } from '@/lib/datasets.config'

interface BookInfoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookPrefix: string
}

export function BookInfoSheet({ open, onOpenChange, bookPrefix }: BookInfoSheetProps) {
  const dataset = datasets.find(d => d.id === bookPrefix)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader className="sr-only">
          <SheetTitle>{dataset ? dataset.title : 'Book Info'}</SheetTitle>
        </SheetHeader>
        {dataset && (
          <div className="flex flex-col gap-3 pt-2">
            <div>
              <p className="font-[var(--br-heading-font)] text-2xl font-black uppercase leading-tight">
                {dataset.title.toUpperCase()}
              </p>
              <p className="font-[var(--br-jp-font)] text-sm text-muted-foreground mt-0.5">
                {dataset.title_vi}
              </p>
            </div>

            <div className="flex gap-2">
              <span className="font-[var(--br-mono-font)] text-[10px] bg-primary text-primary-foreground px-2 py-0.5">
                {`N${dataset.jlpt_level}`}
              </span>
              <span className="font-[var(--br-mono-font)] text-[10px] border border-border px-2 py-0.5">
                {`L${dataset.lesson_range[0]}–${dataset.lesson_range[1]}`}
              </span>
            </div>

            <div className="flex gap-6 border-t border-border/20 pt-3">
              <div>
                <p className="font-[var(--br-mono-font)] text-[18px] font-bold">
                  {dataset.lesson_range[1] - dataset.lesson_range[0] + 1}
                </p>
                <p className="font-[var(--br-mono-font)] text-[9px] uppercase text-muted-foreground">
                  Bài học
                </p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
