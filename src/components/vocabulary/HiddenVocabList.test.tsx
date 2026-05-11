import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { HiddenVocabList } from './HiddenVocabList'
import 'fake-indexeddb/auto'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const VOCAB_FIXTURE = {
  vocab_id: 'mnn1_abc123',
  book_source: 'minna_shokyuu_1',
  lesson_number: 3,
  word: '食べる',
  reading: 'たべる',
  romaji: 'taberu',
  meaning_vi: 'ăn',
  meaning_en: 'to eat',
  pos: [] as string[],
  pitch_pattern: null,
  pitch_type: null as null,
  audio_filename: null,
  examples: [] as never[],
  tags: [] as string[],
  sort_order: 1,
  deprecated: false,
  jlpt_level: null,
  han_viet: null,
}

const HIDDEN_FIXTURE = {
  userId: 'u1',
  item_id: 'mnn1_abc123',
  source: 'lesson' as const,
  hidden_at: '2026-05-11T00:00:00.000Z',
}

beforeEach(async () => {
  await db.hidden_vocab.clear()
  await db.vocabulary.clear()
})

describe('hiddenVocabList — lesson', () => {
  it('shows empty message when nothing is hidden', async () => {
    render(<HiddenVocabList source="lesson" userId="u1" />, { wrapper })
    expect(await screen.findByText(/không có từ nào/i)).toBeInTheDocument()
  })

  it('renders hidden vocab items with HIỆN button', async () => {
    await db.vocabulary.put(VOCAB_FIXTURE)
    await db.hidden_vocab.put(HIDDEN_FIXTURE)

    render(<HiddenVocabList source="lesson" userId="u1" />, { wrapper })

    expect(await screen.findByText('食べる')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bỏ ẩn 食べる/i })).toBeInTheDocument()
  })

  it('removes item from list after clicking HIỆN', async () => {
    await db.vocabulary.put(VOCAB_FIXTURE)
    await db.hidden_vocab.put(HIDDEN_FIXTURE)

    const user = userEvent.setup()
    render(<HiddenVocabList source="lesson" userId="u1" />, { wrapper })

    const btn = await screen.findByRole('button', { name: /bỏ ẩn 食べる/i })
    await user.click(btn)

    await waitFor(async () => {
      const entry = await db.hidden_vocab.get(['u1', 'mnn1_abc123'])
      expect(entry).toBeUndefined()
    })
  })
})
