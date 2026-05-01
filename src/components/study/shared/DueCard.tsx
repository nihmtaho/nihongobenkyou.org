import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

interface Props {
  count: number
  label: string
  reviewLink: string
  streak?: number
}

export function DueCard({ count, label, reviewLink, streak = 0 }: Props) {
  return (
    <div className="border-t-4 border-primary bg-primary/5 p-4 lg:p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-wider leading-tight max-w-[70%]">
          {label}
        </p>
        {streak > 0 && (
          <span className="badge badge-warning badge-sm font-[var(--br-mono-font)] text-[9px]">
            {streak}
            {' '}
            NGÀY
          </span>
        )}
      </div>
      <motion.p
        className="text-5xl font-black font-[var(--br-mono-font)] leading-none mb-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {count}
      </motion.p>
      {count > 0
        ? (
            <Link
              to={reviewLink}
              className="btn btn-primary btn-sm font-[var(--br-mono-font)] uppercase tracking-wide"
            >
              ÔN NGAY →
            </Link>
          )
        : (
            <p className="text-xs font-[var(--br-jp-font)] text-neutral">
              すごい！ Đã xong rồi.
            </p>
          )}
    </div>
  )
}
