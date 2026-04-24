import { createFileRoute, Link } from '@tanstack/react-router'

import { datasets } from '../../lib/datasets.config'

export const Route = createFileRoute('/books/')({
  component: BooksPage,
})

function BooksPage() {
  const enabled = datasets.filter(d => d.enabled)

  return (
    <div className="p-4">
      <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight mb-6">
        BOOKS
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {enabled.map(dataset => (
          <Link key={dataset.id} to="/books/$book" params={{ book: dataset.id }}>
            <div className="card bg-base-200 border border-base-content/10 transition-colors hover:border-l-4 hover:border-l-primary cursor-pointer">
              <div className="card-body p-4 gap-2">
                <div className="flex gap-1">
                  {dataset.jlpt_level && (
                    <span className="badge badge-primary badge-outline font-[var(--br-mono-font)] text-[10px]">
                      #N
                      {dataset.jlpt_level}
                    </span>
                  )}
                </div>
                <h2 className="card-title font-[var(--br-heading-font)] text-xl uppercase tracking-tight leading-tight">
                  {dataset.title}
                </h2>
                <p className="text-sm text-neutral font-[var(--br-jp-font)]">
                  {dataset.title_vi}
                </p>
                <p className="text-[11px] font-[var(--br-mono-font)] text-neutral uppercase mt-1">
                  LESSONS
                  {' '}
                  {dataset.lesson_range[0]}
                  –
                  {dataset.lesson_range[1]}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
