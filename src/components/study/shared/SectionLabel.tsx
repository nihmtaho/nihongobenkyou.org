export function SectionLabel({ label, count }: { label: string, count: number }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
        {label}
      </p>
      <span className="badge badge-neutral badge-sm font-[var(--br-mono-font)] text-[9px]">
        {count}
      </span>
      <div className="h-px flex-1 bg-base-content/10" />
    </div>
  )
}
