export function DarkModeSection() {
  return (
    <div className="card bg-base-200 border border-base-content/10 p-4">
      <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
        GIAO DIỆN TỐI
      </h2>
      <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
        <input type="checkbox" className="toggle toggle-primary" disabled />
        <span className="font-[var(--br-mono-font)] text-sm uppercase">Sắp ra mắt</span>
      </label>
    </div>
  )
}
