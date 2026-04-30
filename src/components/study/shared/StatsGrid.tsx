import { motion } from 'framer-motion'

interface StatItem {
  label: string
  value: number
  color: string
}

export function StatsGrid({ items, isLoading }: { items: StatItem[], isLoading: boolean }) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 border border-base-content/10 mb-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={[
            'p-3 text-center',
            i < items.length - 1 ? 'border-r border-base-content/10' : '',
            i >= 3 ? 'border-t border-base-content/10 lg:border-t-0' : '',
          ].join(' ')}
        >
          {isLoading
            ? <div className="skeleton h-6 w-8 mx-auto mb-1" />
            : (
                <motion.p
                  className={`text-xl font-bold font-[var(--br-mono-font)] leading-none ${item.color}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {item.value}
                </motion.p>
              )}
          <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-neutral mt-1 leading-tight">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  )
}
