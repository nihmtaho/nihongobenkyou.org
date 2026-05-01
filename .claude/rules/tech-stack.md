---
alwaysApply: true
description: This file describes the technology stack for the project.
paths: 
  - "**/*"
---

## Runtime

- **TypeScript** 6.x (strict mode)
- **Node.js** 22.x (pinned via `.nvmrc`)
- **React** 19.x
- **Vite** 6.x — bundler + dev server

## Frontend

- **TanStack Router** v1 — file-based routing, type-safe
- **TanStack Query** v5 — async state + server cache
- **TanStack Virtual** v3 — windowed list rendering
- **Zustand** v5 — UI and session state (`studySessionStore`, `settingsStore`, `authStore`)
- **Framer Motion** v12 — animations
- **wanakana** v5 — kana/romaji conversion

## UI & Styling

- **Tailwind CSS** v4
- **DaisyUI** v5 — component library, theme: "Raw Brutalist Editorial"
- **Lucide React** v1 — icons
- All custom styles in `src/app.css` — no per-component CSS

## Audio

- **Howler.js** v2 — audio playback (mocked in tests)

## Local Database

- **Dexie.js** v4 — IndexedDB wrapper; tables: `vocabulary`, `lessons`, `user_cards`, `kanji`, `kanji_cards`, `sync_queue`, `streaks`, `settings`

## Remote / Backend

- **Supabase** — Auth, PostgreSQL, Realtime
  - `@supabase/supabase-js` v2
  - Tables: `profiles`, `user_cards`, `review_log`, `user_sync_packages`
  - RLS on every table

## PWA

- **vite-plugin-pwa** v1 — service worker + offline shell caching

## Testing

- **Vitest** v4 — unit + integration runner
- **@testing-library/react** v16 — component testing
- **@testing-library/user-event** v14 — user interaction simulation
- **MSW** v2 — Supabase REST interception
- **fake-indexeddb** v6 — in-memory IndexedDB for Dexie tests
- **Playwright** v1 — E2E tests

## Linting & Git Hooks

- **ESLint** v10 with `@antfu/eslint-config` v8 (flat config)
- **Husky** v9 + **lint-staged** v16

## Dataset Pipeline (build-time only)

- **js-yaml** v4 — YAML parsing
- **tsx** v4 — run pipeline scripts directly
- **fast-xml-parser** v5 — Jitendex audio manifest

## Deploy

- **AWS S3 + CloudFront + Route 53** — static hosting + CDN
