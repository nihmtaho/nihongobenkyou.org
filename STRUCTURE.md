# Project Structure

Japanese vocabulary learning PWA — offline-first, React 19 + TanStack Router + Supabase + Dexie.js.

Components and routes never import `db/` or `api/` directly — all data access goes through `hooks/`.

---

## Root

```
nihongobenkyou.org/
├── .claude/                   # Claude Code rules and agent configs
├── .specify/                  # Speckit extension config
├── .github/
│   └── workflows/deploy.yml   # S3 + CloudFront CI/CD (push to main → deploy)
├── datasets/                  # YAML vocabulary source (never commit to remote)
│   └── minna-no-ds.yaml
├── scripts/                   # Build pipeline — one file per step (SRP)
│   ├── run-pipeline.ts        # Orchestrator
│   ├── parse-yaml.ts          # Step 1: YAML → raw JSON
│   ├── enrich-pitch.ts        # Step 2: Kanjium accents lookup
│   ├── generate-vocab-id.ts   # Step 3: sha256 vocab_id
│   ├── map-audio.ts           # Step 4: Jitendex manifest
│   ├── validate.ts            # Step 5: reject bad entries
│   ├── split-lessons.ts       # Step 6: lesson-XX.json
│   └── write-manifest.ts      # Step 7: manifest.json + checksums
├── supabase/
│   ├── functions/             # Edge Functions (e.g. delete-account)
│   └── migrations/            # Sequential SQL migrations
│       ├── 20260426000001_initial_schema.sql
│       ├── 20260426000002_custom_deck.sql
│       ├── 20260426000003_word_count_trigger.sql
│       ├── 20260426000004_kanji_cards.sql
│       ├── 20260430000005_upsert_user_cards_lww.sql
│       ├── 20260430000006_review_log.sql
│       ├── 20260430000007_user_sync_packages.sql
│       └── 20260430000008_progress_reset.sql
├── public/
│   ├── data/                  # Generated JSON — gitignored, rebuilt by build:dataset
│   └── icons/                 # PWA icons
├── e2e/                       # Playwright E2E tests
└── src/                       # Application source — see below
```

---

## `src/`

```
src/
├── main.tsx                   # React root — QueryClient, RouterProvider, online sync listener
├── app.css                    # DaisyUI themes (brutalist-mnn/tango/mimikara) + font vars
│
├── routes/                    # TanStack Router file-based routes
│   ├── __root.tsx             # Root layout: QueryClient, auth init
│   ├── _authenticated.tsx     # Layout guard — redirects to /auth/login if not authed
│   ├── index.tsx              # / — Home dashboard
│   ├── srs/index.tsx          # /srs — SRS review queue
│   ├── profile/index.tsx      # /profile — User profile + avatar
│   ├── settings/index.tsx     # /settings — Theme, language, SRS config
│   ├── books/
│   │   ├── index.tsx          # /books — Book selection grid
│   │   └── $book/
│   │       ├── index.tsx      # /books/$book — Lesson list + progress
│   │       └── $lesson.tsx    # /books/$book/$lesson — Lesson vocab
│   ├── _authenticated/
│   │   ├── study/
│   │   │   ├── index.tsx      # /study — Session config
│   │   │   └── $mode.tsx      # /study/$mode — Flashcard/Quiz/TypeInput session
│   │   └── custom/
│   │       ├── index.tsx      # /custom — Custom deck list
│   │       └── $deckId.tsx    # /custom/$deckId — Deck editor
│   ├── auth/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   └── callback.tsx       # Supabase OAuth callback handler
│   ├── custom/
│   │   └── shared.$shareCode.tsx  # /custom/shared/:code — Public deck view
│   └── kanji/
│       ├── index.tsx          # /kanji — Kanji list
│       ├── $char.tsx          # /kanji/$char — Kanji detail
│       ├── $char.stroke.tsx   # /kanji/$char/stroke — Stroke order
│       ├── lesson-study.tsx   # /kanji/lesson-study — Lesson-based kanji session
│       ├── review.tsx         # /kanji/review — Kanji SRS review
│       └── graph.tsx          # /kanji/graph — Radical/component network
│
├── components/
│   ├── navigation/            # Sidebar (desktop) + BottomDock (mobile)
│   ├── home/                  # Dashboard widgets: DueCards, Streak, ReviewActivity, Analytics
│   ├── vocabulary/            # VocabCard, VocabList, PitchAccentBars, AudioButton
│   ├── study/                 # FlipCard, VocabFlipCard, QuizCard, TypeInputCard,
│   │                          # ListeningCard, SentenceFlashcard, PitchDiscriminationCard,
│   │                          # ReadingComprehensionCard, SessionSummary, StudyConfigModal
│   ├── kanji/                 # KanjiCard, KanjiFlipCard, KanjiQuizCard, KanjiTypeInputCard,
│   │                          # KanjiVocabFlipCard, KanjiVocabTypeInputCard, KanjiStudyModal,
│   │                          # StrokeOrderAnimation, KanjiGraph, KanjiLessonPanel
│   ├── auth/                  # AuthForm, GoogleSignInButton, OfflineAuthNotice, ReactivationBanner
│   ├── custom-decks/          # DeckEditor, DeckList, WordEntry, CsvImport, SharedDeckView
│   ├── profile/               # AvatarUpload
│   ├── offline/               # OfflineIndicator
│   └── common/                # SRSProgressBar
│
├── hooks/                     # TanStack Query hooks — only data layer interface for components
│   ├── useVocabulary.ts       # Lesson vocabulary from Dexie
│   ├── useLesson.ts / useLessons.ts
│   ├── useBookProgress.ts
│   ├── useDueCards.ts         # SRS cards due today
│   ├── useSRS.ts              # SRS state for a set of vocab ids
│   ├── useSRSMutation.ts      # Optimistic Dexie write → pending_sync=true
│   ├── useUserCards.ts        # Batch card state query
│   ├── useStudySession.ts     # Session queue management
│   ├── useTypeInput.ts        # Kana IME input grading logic
│   ├── useKanji.ts / useKanjiList.ts
│   ├── useKanjiSRS.ts         # Kanji SRS due cards + mutation
│   ├── useKanjiLessonStats.ts / useVocabLessonStats.ts
│   ├── useKnownCards.ts
│   ├── useStreak.ts
│   ├── useReviewStats.ts      # Review history stats
│   ├── useLearningStats.ts
│   ├── useAuth.ts             # Supabase auth session
│   ├── useProfile.ts
│   ├── usePassages.ts
│   ├── useCustomDecks.ts / useCustomDeckMutations.ts / useCustomVocabulary.ts
│   ├── useSyncStatus.ts       # pending_sync count for UI indicator
│   ├── useOnlineStatus.ts
│   └── useOfflineAuthNotice.ts
│
├── stores/
│   ├── studySessionStore.ts   # queue, currentIndex, mode, sessionStats
│   ├── settingsStore.ts       # theme, language, srsConfig — persisted to localStorage
│   └── authStore.ts           # userId, isAuthenticated (mirrors Supabase session)
│
├── db/                        # Dexie.js — schema, seed, domain operations
│   ├── schema.ts              # All tables + compound indexes
│   ├── seed.ts                # seedDatabase(): bulk insert vocabulary + lessons
│   ├── migrations.ts          # Dexie version upgrade handlers
│   ├── sync.ts                # flushPendingSync(): pending_sync → Supabase UPSERT
│   ├── onboarding.ts          # New-device onboarding: fetch user_cards → seed
│   ├── package-sync.ts        # Sync package download + apply
│   ├── kanji.ts               # Kanji Dexie operations
│   ├── custom-decks.ts        # Custom deck Dexie operations
│   └── passages.ts            # Passage Dexie operations
│
├── api/                       # Supabase client + typed query functions (one file per table)
│   ├── supabase.ts            # createClient() singleton
│   ├── auth.ts                # signIn, signOut, onAuthStateChange
│   ├── user-cards.ts          # fetchUserCards(), upsertUserCard()
│   ├── profiles.ts            # fetchProfile(), updateProfile(), uploadAvatar()
│   ├── review-log.ts          # insertReviewLog()
│   ├── sync-package.ts        # fetchSyncPackage(), uploadSyncPackage()
│   ├── kanji-cards.ts         # fetchKanjiCards(), upsertKanjiCard()
│   ├── custom-decks.ts        # CRUD + share
│   ├── custom-vocabulary.ts   # Custom vocab CRUD
│   └── storage.ts             # Supabase Storage helpers (avatars)
│
├── lib/                       # Pure functions — no side effects
│   ├── vocab-id.ts            # FROZEN: generateVocabId()
│   ├── srs.ts                 # calculateNextReview(card, rating) — SM-2
│   ├── pitch.ts               # parsePitchPattern()
│   ├── auth-migration.ts      # Anonymous → authenticated account migration
│   └── datasets.config.ts     # Dataset registry (add new book here only)
│
├── types/                     # TypeScript interfaces — one file per domain
│   ├── vocabulary.ts          # VocabItem, VocabWithSRS, PitchType
│   ├── srs.ts                 # CardState, SRSRating (0–3), ReviewResult
│   ├── dataset.ts             # DatasetConfig, Manifest, LessonMeta
│   ├── kanji.ts               # KanjiItem, KanjiCardState, StrokeData
│   ├── user.ts                # UserProfile, AuthState
│   ├── study.ts               # StudyMode, SessionConfig, SessionStats
│   ├── custom-deck.ts         # CustomDeck, CustomWord
│   ├── passages.ts            # Passage, PassageWord
│   ├── review-log.ts          # ReviewLogEntry
│   └── sync-package.ts        # SyncPackage, SyncDiff
│
└── __tests__/
    ├── integration/           # Real Dexie (fake-indexeddb) + MSW
    │   ├── auth-migration.test.ts
    │   ├── onboarding.test.ts
    │   ├── sync-cycle.test.ts
    │   ├── srsReviewPage.test.tsx
    │   ├── studySessionWrite.test.ts
    │   ├── useKanjiSRS.test.ts
    │   └── ...
    └── (unit tests co-located with source files)

src/__fixtures__/vocabulary.ts # 3–5 real MinnaNoDS entries; vocab_id from real hash
```

---

## Key File Locations

| Concern | File |
|---|---|
| `vocab_id` algorithm (FROZEN) | `src/lib/vocab-id.ts` |
| SM-2 SRS algorithm | `src/lib/srs.ts` |
| Dataset registry | `src/lib/datasets.config.ts` |
| Dexie schema | `src/db/schema.ts` |
| Offline sync engine | `src/db/sync.ts` |
| New-device onboarding | `src/db/onboarding.ts` |
| Supabase client | `src/api/supabase.ts` |
| Auth guard layout | `src/routes/_authenticated.tsx` |
| DaisyUI themes | `src/app.css` |
| Study session state | `src/stores/studySessionStore.ts` |
| Test fixtures | `src/__fixtures__/vocabulary.ts` |
