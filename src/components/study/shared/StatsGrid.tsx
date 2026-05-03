import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

interface StatItem {
  label: string
  value: number
  color: string
}

export function StatsGrid({ items, isLoading }: { items: StatItem[], isLoading: boolean }) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 border border-border/10 mb-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={[
            'p-3 text-center',
            i < items.length - 1 ? 'border-r border-border/10' : '',
            i >= 3 ? 'border-t border-border/10 lg:border-t-0' : '',
          ].join(' ')}
        >
          {isLoading
            ? <Skeleton className="h-6 w-8 mx-auto mb-1" />
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
          <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground mt-1 leading-tight">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  )
}
