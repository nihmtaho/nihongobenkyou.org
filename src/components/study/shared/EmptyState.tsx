import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

interface Props {
  jp: string
  label: string
  hint: string
  cta: string
  ctaLink: string
}

export function EmptyState({ jp, label, hint, cta, ctaLink }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-16 flex flex-col items-center text-center gap-3"
    >
      <p className="text-4xl font-[var(--br-jp-font)] text-foreground/20 leading-none">
        {jp.charAt(0)}
      </p>
      <p className="text-sm font-[var(--br-jp-font)] text-foreground/50">{jp}</p>
      <p className="font-[var(--br-heading-font)] text-lg font-bold uppercase tracking-tight">
        {label}
      </p>
      <p className="text-xs font-[var(--br-mono-font)] text-muted-foreground max-w-xs">{hint}</p>
      <Link
        to={ctaLink}
        className="btn btn-primary btn-sm font-[var(--br-mono-font)] uppercase tracking-wide mt-2"
      >
        {cta}
      </Link>
    </motion.div>
  )
}
