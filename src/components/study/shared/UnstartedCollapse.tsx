import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

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
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
          {label}
        </p>
        <span className="badge badge-neutral badge-sm font-[var(--br-mono-font)] text-[9px]">
          {count}
        </span>
        <div className="h-px flex-1 bg-base-content/10" />
        <span className={`text-[10px] font-[var(--br-mono-font)] text-neutral transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border border-base-content/10">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
