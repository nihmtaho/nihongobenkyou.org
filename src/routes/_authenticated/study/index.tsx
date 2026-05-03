import type { ActiveTab } from '../../../components/study/study.config'
import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { DecksStudyTab } from '../../../components/study/DecksStudyTab'
import { KanjiStudyTab } from '../../../components/study/KanjiStudyTab'
import { TABS } from '../../../components/study/study.config'
import { VocabStudyTab } from '../../../components/study/VocabStudyTab'
import { useAuthStore } from '../../../stores/authStore'

const VALID_TABS: ActiveTab[] = ['vocab', 'kanji', 'decks']

export const Route = createFileRoute('/_authenticated/study/')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: VALID_TABS.includes(search.tab as ActiveTab) ? (search.tab as ActiveTab) : undefined,
  }),
  component: StudyDashboardPage,
})

function StudyDashboardPage() {
  const { tab } = Route.useSearch()
  const userId = useAuthStore(s => s.userId) ?? ''
  const [activeTab, setActiveTab] = useState<ActiveTab>(tab ?? 'vocab')

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-background border-b border-border/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex-1 flex flex-col items-center gap-0.5 py-3 lg:py-4 transition-colors border-b-4',
                  activeTab === tab.id
                    ? 'bg-primary border-primary'
                    : 'bg-background border-transparent hover:bg-card',
                ].join(' ')}
              >
                <span
                  className={[
                    'font-[var(--br-jp-font)] text-xl font-bold leading-none',
                    activeTab === tab.id ? 'text-primary-content' : 'text-foreground',
                  ].join(' ')}
                >
                  {tab.jp}
                </span>
                <span
                  className={[
                    'text-[9px] font-[var(--br-mono-font)] uppercase tracking-widest',
                    activeTab === tab.id ? 'text-primary-content/70' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="flex-1"
        >
          {activeTab === 'vocab' && <VocabStudyTab userId={userId} />}
          {activeTab === 'kanji' && <KanjiStudyTab userId={userId} />}
          {activeTab === 'decks' && <DecksStudyTab userId={userId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
