import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

import { DueCardsWidget } from '../components/home/DueCardsWidget'
import { StreakWidget } from '../components/home/StreakWidget'
import { useDueCards } from '../hooks/useDueCards'
import { useAuthStore } from '../stores/authStore'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const userId = useAuthStore(s => s.userId) ?? ''
  const { data: dueCards } = useDueCards(userId)
  const hasDueCards = (dueCards?.length ?? 0) > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="p-4"
    >
      <h1 className="text-7xl font-black font-[var(--br-heading-font)] tracking-tighter leading-none mb-8">
        NIHONGO.
      </h1>

      <div className="flex flex-col gap-4">
        <DueCardsWidget userId={userId} />
        <StreakWidget userId={userId} />

        <Link
          to={hasDueCards ? '/srs' : '/books'}
          className="btn btn-primary font-[var(--br-mono-font)] uppercase"
        >
          QUICK START
        </Link>
      </div>
    </motion.div>
  )
}
