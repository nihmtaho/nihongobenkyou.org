interface Props { onUpdate: () => void }

export function SWUpdateBanner({ onUpdate }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-foreground text-background px-4 py-3 font-[var(--br-mono-font)] text-sm border border-border shadow-lg">
      <span className="uppercase tracking-wide text-xs">Có phiên bản mới!</span>
      <button type="button" onClick={onUpdate} className="uppercase text-xs font-bold underline hover:no-underline">
        Tải lại
      </button>
    </div>
  )
}
