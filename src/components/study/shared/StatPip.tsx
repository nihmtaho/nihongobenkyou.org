export function StatPip({ count, label, className }: { count: number, label: string, className: string }) {
  return (
    <span className={`text-[10px] font-[var(--br-mono-font)] ${className}`}>
      {count}
      {' '}
      {label}
    </span>
  )
}
