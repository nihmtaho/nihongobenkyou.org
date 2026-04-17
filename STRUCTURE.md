# Project Structure

Japanese vocabulary learning PWA — offline-first, React 19 + TanStack Router + Supabase + Dexie.js.

SOLID(s) principles applied throughout: single-responsibility directories, open-for-extension dataset registry, interface-segregated type modules, and dependency inversion through hooks (components never import Dexie or Supabase directly).

---

## Root

```
nihongobenkyou.org/
├── .claude/                   # Claude Code rules and agent configs
├── .specify/                  # Speckit extension config
├── .github/
│   └── workflows/
│       └── deploy.yml         # S3 + CloudFront CI/CD (push to main → deploy)
├── datasets/                  # YAML vocabulary source files (never commit to remote)
│   └── minna-no-ds.yaml       # MinnaNoDS fork — MnN Shokyuu I & II
├── scripts/                   # Build pipeline — each file = one pipeline step (SRP)
│   ├── build-dataset.ts       # Orchestrator: runs all steps in order
│   ├── parse-yaml.ts          # Step 1: YAML → vocab-raw.json
│   ├── enrich-pitch.ts        # Step 2: Kanjium accents.txt lookup → vocab-pitched.json
│   ├── generate-vocab-id.ts   # Step 3: sha256 hash → vocab-id.json
│   ├── map-audio.ts           # Step 4: Jitendex manifest lookup → vocab-audio.json
│   ├── validate.ts            # Step 5: reject missing fields + duplicate vocab_id
│   ├── split-lessons.ts       # Step 6: partition by lesson → lesson-XX.json
│   └── write-manifest.ts      # Step 7: manifest.json with checksums + versions
├── public/
│   ├── data/                  # Generated JSON — gitignored, rebuilt by build:dataset
│   │   ├── manifest.json
│   │   └── mnn1/
│   │       ├── lesson-01.json
│   │       └── ...
│   ├── audio/                 # Audio files — gitignored
│   └── icons/                 # PWA icons
├── e2e/                       # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── flashcard-review.spec.ts
│   └── offline.spec.ts
├── src/                       # Application source — see detail below
├── CLAUDE.md
├── STRUCTURE.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## `src/`

```
src/
├── main.tsx                   # React root — mounts app, sets QueryClient + RouterProvider
├── app.css                    # DaisyUI themes (brutalist-mnn/tango/mimikara/custom) + :root font vars
├── vite-env.d.ts
│
├── routes/                    # TanStack Router file-based routes (SRP: one screen per file)
│   ├── __root.tsx             # Root layout: auth guard, Navbar/Dock/Sidebar shell
│   ├── index.tsx              # /            Home dashboard
│   ├── books/
│   │   ├── index.tsx          # /books       Book selection grid
│   │   └── $book/
│   │       ├── index.tsx      # /books/$book Lesson list with progress
│   │       └── $lesson.tsx    # /books/$book/$lesson  Lesson vocab + pitch + audio
│   ├── study/
│   │   └── $mode.tsx          # /study/$mode Flashcard / Quiz / TypeInput session
│   ├── srs/
│   │   └── index.tsx          # /srs         SRS review queue (due today)
│   ├── custom/
│   │   └── index.tsx          # /custom      Custom decks
│   ├── leaderboard/
│   │   └── index.tsx          # /leaderboard Weekly XP leaderboard (Realtime)
│   ├── stats/
│   │   └── index.tsx          # /stats       Study statistics + heatmap
│   ├── auth/
│   │   ├── login.tsx          # /auth/login
│   │   └── register.tsx       # /auth/register
│   ├── settings/
│   │   └── index.tsx          # /settings    Theme, language, SRS config
│   └── kanji/
│       ├── index.tsx          # /kanji       Kanji list
│       ├── $char.tsx          # /kanji/$char Kanji detail
│       ├── $char/
│       │   └── stroke.tsx     # /kanji/$char/stroke  Stroke order animation
│       └── graph.tsx          # /kanji/graph Network graph (radical/component links)
│
├── components/                # Reusable UI components — DaisyUI semantic classes, no raw CSS
│   ├── layout/                # Application shell pieces
│   │   ├── RootLayout.tsx     # Sidebar (≥1024px) + BottomDock (<1024px) toggle
│   │   ├── Sidebar.tsx        # Desktop sidebar — menu, active book badge
│   │   ├── BottomDock.tsx     # Mobile 3-tab dock: Home · Study · Profile
│   │   └── Navbar.tsx         # Top bar: logo + active dataset badge
│   │
│   ├── vocabulary/            # Vocabulary content display (read-only, content layer)
│   │   ├── VocabCard.tsx      # Single vocab item: kanji + furigana + pitch + audio + meaning
│   │   ├── VocabList.tsx      # Scrollable list of VocabCard — used in lesson page
│   │   ├── PitchAccentBars.tsx # H/L mora bar visualization from pitch_pattern number
│   │   └── AudioButton.tsx    # Howler.js play button — lazy-loads audio on first interaction
│   │
│   ├── flashcard/             # Study session UI (SRP: one component per interaction pattern)
│   │   ├── FlipCard.tsx       # Framer Motion 3D flip — front: word+pitch, back: meaning+audio
│   │   ├── SRSButtons.tsx     # Again / Hard / Good / Easy join row — emits SRSRating
│   │   ├── SessionSummary.tsx # End-of-session stats: correct/total, time, retry-wrong button
│   │   └── StudyConfigModal.tsx # Pre-session config: mode, card count, lesson filter
│   │
│   ├── quiz/                  # Quiz and typing study modes
│   │   ├── QuizCard.tsx       # 4-option multiple choice with smart distractors
│   │   └── TypeInputCard.tsx  # Furigana typing via Wanakana IME — mora-level grading
│   │
│   ├── srs/                   # SRS status widgets (dashboard use)
│   │   ├── DueCardsWidget.tsx # Count of cards due today — links to /srs
│   │   └── StreakWidget.tsx   # Current streak + max streak stat block
│   │
│   ├── kanji/                 # Kanji feature components
│   │   ├── KanjiCard.tsx      # Kanji character + readings + meaning + stroke count
│   │   ├── StrokeOrderCanvas.tsx # Animated SVG stroke order (frame-by-frame)
│   │   └── KanjiGraph.tsx     # D3/canvas network: kanji ↔ radical ↔ component edges
│   │
│   └── shared/                # Generic stateless UI primitives
│       ├── Badge.tsx          # DaisyUI badge wrapper — enforces mono font + uppercase
│       ├── ProgressBar.tsx    # DaisyUI progress — lesson/book completion
│       ├── Skeleton.tsx       # DaisyUI skeleton — async loading placeholder
│       └── Toast.tsx          # DaisyUI toast — dataset update prompt, streak alerts
│
├── hooks/                     # TanStack Query hooks — data layer interface (DIP applied)
│   │                          # Components never import db/ or api/ directly; only hooks
│   ├── useVocabulary.ts       # query key: ['vocabulary', bookId, lessonId] → VocabItem[]
│   ├── useLesson.ts           # query key: ['lesson', bookId, lessonId] → LessonMeta
│   ├── useDueCards.ts         # query key: ['srs-cards', userId, today] → VocabWithSRS[]
│   ├── useSRSMutation.ts      # mutation: optimistic Dexie write → pending_sync=true
│   ├── useUserCards.ts        # batch query: ['user-cards', userId, vocabIds[]] → Map<id, CardState>
│   ├── useStreak.ts           # query key: ['streak', userId] → StreakData
│   ├── useLeaderboard.ts      # query + Supabase Realtime subscription → LeaderboardEntry[]
│   ├── useCustomDecks.ts      # CRUD queries for custom decks and custom vocabulary
│   ├── useKanji.ts            # query key: ['kanji', char] → KanjiItem
│   ├── useKanjiCards.ts       # Kanji SRS due cards + mutation
│   └── useDatasetSync.ts      # Fetch manifest → compare checksum → trigger toast + re-seed
│
├── stores/                    # Zustand stores — synchronous UI state only (SRP per domain)
│   ├── studySessionStore.ts   # queue: VocabItem[], currentIndex, mode, sessionStats
│   ├── settingsStore.ts       # activeTheme, language, srsConfig → persisted to localStorage
│   └── authStore.ts           # Supabase session mirror — userId, isAuthenticated
│
├── db/                        # Dexie.js — schema, seed, migrations, sync engine
│   ├── schema.ts              # Dexie class definition: all 8 tables + compound indexes
│   ├── seed.ts                # seedDatabase(lessonJson[]): bulk insert vocabulary + lessons
│   ├── migrations.ts          # Dexie version upgrade handlers (addIndex, addTable, etc.)
│   └── sync.ts                # flushPendingSync(): reads pending_sync=true → upserts to Supabase
│
├── api/                       # Supabase client + typed query functions (one file per table)
│   ├── supabase.ts            # createClient() singleton — typed with Database generic
│   ├── user-cards.ts          # fetchUserCards(), upsertUserCard() — SRS sync target
│   ├── profiles.ts            # fetchProfile(), updateProfile(), uploadAvatar()
│   ├── leaderboard.ts         # fetchLeaderboard(), subscribeLeaderboard() (Realtime)
│   └── custom-decks.ts        # CRUD: createDeck, addWord, shareDeck, importCSV
│
├── lib/                       # Pure functions — no side effects, fully testable (SRP)
│   ├── vocab-id.ts            # FROZEN: generateVocabId(bookSource, lesson, kanji, kana)
│   ├── srs.ts                 # calculateNextReview(card, rating) → ReviewResult (SM-2)
│   ├── pitch.ts               # parsePitchPattern(number, moraCount) → ('H'|'L')[]
│   └── datasets.config.ts     # Dataset registry — add new book here, no code changes elsewhere
│
├── types/                     # TypeScript types — interface segregation, one file per domain
│   ├── vocabulary.ts          # VocabItem, VocabWithSRS, Example, PitchType
│   ├── srs.ts                 # CardState, SRSRating (0–3), ReviewResult
│   ├── dataset.ts             # DatasetConfig, Manifest, LessonMeta, DatasetId
│   ├── kanji.ts               # KanjiItem, KanjiCardState, StrokeData
│   └── user.ts                # UserProfile, AuthState, LeaderboardEntry
│
└── __tests__/
    ├── integration/           # Integration tests — real Dexie via fake-indexeddb + MSW
    │   ├── useVocabulary.test.ts
    │   ├── useSRSMutation.test.ts
    │   └── sync-queue.test.ts
    └── fixtures/
        └── vocabulary.ts      # 3–5 real MinnaNoDS entries; vocab_id computed by real hash
```

---

## Architecture Decisions

### Dependency Inversion (DIP)

```
Routes / Components
      ↓ (import only)
    hooks/          ← public interface for all data needs
      ↓
  db/   api/        ← Dexie and Supabase implementations
      ↓
  lib/              ← pure functions (vocab-id, srs, pitch)
```

Components and routes never import `db/` or `api/` directly. Swapping Dexie for another local store, or Supabase for another backend, requires changes only in `hooks/` and `db/`|`api/` — not in the UI layer.

### Open / Closed — Adding a New Dataset

1. Create `datasets/<name>.yaml` following the schema in `rules/yaml-database.md`
2. Add one entry to `src/lib/datasets.config.ts`
3. Run `npm run build:dataset` — all other code is automatically aware

No route, hook, component, or store changes required.

### Single Responsibility — `scripts/`

Each pipeline step is an isolated script with one input and one output artifact. Steps can be tested, debugged, or replaced independently. The orchestrator `build-dataset.ts` only calls them in sequence.

### Interface Segregation — `types/`

Types are split by domain. A component that only renders vocabulary never imports `SRSRating`. A sync function never imports `UserProfile`. Each type file is minimal and scoped.

---

## Key File Locations

| Concern | File |
|---|---|
| `vocab_id` algorithm (FROZEN) | `src/lib/vocab-id.ts` |
| SM-2 SRS algorithm | `src/lib/srs.ts` |
| Dataset registry | `src/lib/datasets.config.ts` |
| Dexie schema | `src/db/schema.ts` |
| Offline sync engine | `src/db/sync.ts` |
| Supabase client | `src/api/supabase.ts` |
| DaisyUI themes | `src/app.css` |
| Auth guard | `src/routes/__root.tsx` |
| Study session state | `src/stores/studySessionStore.ts` |
| Test fixtures | `src/__tests__/fixtures/vocabulary.ts` |
