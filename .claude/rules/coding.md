---
alwaysApply: true
description: "This is the coding style and technology stack for the project. Follow these guidelines when writing, reviewing, or refactoring code to ensure consistency and maintainability across the codebase."
paths:
  - "src/**/*.{ts,tsx}"
  - "scripts/**/*.{ts,tsx}"
  - "**/*test.{ts,tsx}"
  - "playwright/**/*.{ts,tsx}"
  - "vite.config.ts"
  - "tsconfig.json"
---

- Use TypeScript for all code, with strict mode enabled.
- Use Node.js for backend development and React for frontend development.
- Use Vite as the bundler and development server for the frontend.
- Use TanStack Router for file-based routing and type safety in the frontend.
- Use TanStack Query for async state management and server caching in the frontend.
- Use TanStack Virtual for windowed list rendering in the frontend.
- Use Zustand for UI and session state management in the frontend.
- Use Framer Motion for animations in the frontend.
- Use wanakana for kana/romaji conversion in the frontend.
- Use Tailwind CSS for styling in the frontend, with DaisyUI as the component library and the "Raw Brutalist Editorial" theme.
- Use Lucide React for icons in the frontend.
- Use Howler.js for audio playback in the frontend, with mocking in tests.
- Use Dexie.js as an IndexedDB wrapper for the local database, with tables for vocabulary, lessons, user cards, kanji, kanji cards, sync queue, streaks, and settings.
- Use Supabase for remote/backend services, including Auth, PostgreSQL, and Realtime, with the `@supabase/supabase-js` library and tables for profiles, user cards, review log, and user sync packages, with RLS on every table.
- Use vite-plugin-pwa for service worker and offline shell caching in the frontend.
- Use Vitest for unit and integration testing, with `@testing-library/react` for component testing, `@testing-library/user-event` for user interaction simulation, MSW for Supabase REST interception, fake-indexeddb for in-memory IndexedDB for Dexie tests, and Playwright for E2E tests.
- Use ESLint with the `@antfu/eslint-config` flat config for linting, and Husky with lint-staged for Git hooks.