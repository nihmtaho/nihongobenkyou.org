---
alwaysApply: true
paths:
  - "src/components/**"
  - "src/pages/**"
  - "src/routes/**"
  - "src/layouts/**"
  - "src/**/*.css"
---

# Frontend Design Rules

## Component Architecture

**must** extract every distinct UI element into its own reusable component — never inline complex UI directly in route/page files.

**must not** create a new component if an existing one can be reused. Always check `src/components/` before creating a new one.

**must** name components by function, not by location: `VocabCard` ✓, `HomePageCard` ✗.

---

## Design Vision

Raw Brutalist Editorial — inspired by Zine culture + Swiss Brutalism. Condensed bold all-caps typography in the style of fashion/art magazines. Beige/cream vintage-film background. Accent color varies per dataset/book. Asymmetric editorial grid.

**Component library: DaisyUI v5** on Tailwind CSS v4. Use semantic DaisyUI classes (`btn`, `card`, `badge`, `navbar`, `stats`, `dock`, `join`...) as base. Visual styling is controlled entirely via custom DaisyUI theme — no per-component CSS.

**Fonts:**
- Heading: **Barlow Condensed** (or Bebas Neue) — Black/ExtraBold, all-caps, CSS var `--br-heading-font`
- Metadata/tag: **IBM Plex Mono** — monospace technical, CSS var `--br-mono-font`
- Body: **Inter** — readable, neutral
- JP Content: **Noto Sans JP** — required for all Japanese characters, CSS var `--br-jp-font`

Never use heading font for Japanese text. Barlow Condensed has no kana/kanji glyphs.

---

## DaisyUI Theming

### Setup (`app.css`)

```css
@import "tailwindcss";
@plugin "daisyui";

:root {
  --br-heading-font: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  --br-mono-font: 'IBM Plex Mono', 'Courier New', monospace;
  --br-jp-font: 'Noto Sans JP', sans-serif;
}

@plugin "daisyui/theme" {
  name: "brutalist-mnn";
  default: true;
  color-scheme: light;

  --color-base-100: oklch(91% 0.012 80);   /* #e8e6df — beige */
  --color-base-200: oklch(93% 0.010 80);   /* #f0ede6 — cream */
  --color-base-300: oklch(86% 0.012 80);   /* #d9d6ce — warm gray */
  --color-base-content: oklch(13% 0.001 0); /* #111 */

  --color-primary: oklch(71% 0.12 200);    /* teal — MnN accent */
  --color-primary-content: oklch(13% 0.001 0);

  --color-neutral: oklch(43% 0.010 75);    /* #666560 muted text */
  --color-neutral-content: oklch(91% 0.012 80);

  --color-error:   oklch(60% 0.18 35);     /* AGAIN / DUE */
  --color-warning: oklch(75% 0.15 65);     /* HARD */
  --color-success: oklch(63% 0.15 150);    /* GOOD */
  --color-info:    oklch(65% 0.12 240);    /* EASY */

  --radius-selector: 0;  /* square corners on all btn, badge */
  --radius-field: 0;     /* square corners on inputs */
  --radius-box: 0;       /* square corners on cards */
  --border: 1px;
  --depth: 0;            /* disable soft shadows */
  --noise: 0;
}
```

Per-dataset theme: add to same file, only change `--color-primary`:
- `brutalist-tango`: `oklch(60% 0.18 35)` (coral)
- `brutalist-mimikara`: `oklch(58% 0.10 145)` (sage)
- `brutalist-custom`: `oklch(58% 0.16 295)` (purple)
- Dark variants: suffix `-dark`, `--color-base-100: oklch(14% 0.008 80)`

Apply: set `data-theme="brutalist-{dataset}"` on `<html>`. State via Zustand `settingsStore`. Persist: `localStorage`. Load before first render to avoid FOUC.

---

## Color Token Reference

| DaisyUI Token | Brutalist Meaning | Tailwind Usage |
|---|---|---|
| `base-100` | App background (beige) | `bg-base-100` |
| `base-200` | Card, panel | `bg-base-200` |
| `base-300` | Card header, input bg | `bg-base-300` |
| `base-content` | Primary text, ink | `text-base-content` |
| `primary` | Dataset accent color | `bg-primary` `text-primary` `border-primary` |
| `primary-content` | Text on primary | `text-primary-content` |
| `neutral` | Muted text, metadata | `text-neutral` |
| `error` | AGAIN, DUE badge | `btn-error` `badge-error` |
| `warning` | HARD button | `btn-warning` |
| `success` | GOOD button | `btn-success` |
| `info` | EASY button | `btn-info` |

Subtle border: `border-base-content/10`. Accent border rail: `border-l-4 border-primary`.

---

## Typography Scale

| Role | Font var | Tailwind | Notes |
|---|---|---|---|
| Display | `--br-heading-font` | `text-7xl font-black tracking-tighter` | Lesson number 80px |
| Heading L | `--br-heading-font` | `text-4xl font-bold uppercase` | Section title |
| Heading M | `--br-heading-font` | `text-xl font-bold uppercase` | Card title |
| Label/Tag | `--br-mono-font` | `text-[11px] uppercase` | Tag, counter, metadata |
| Body | Inter | `text-sm` / `text-base` | Description, secondary |
| JP Word | `--br-jp-font` | `text-5xl font-bold` | Flashcard main word 42px |
| JP Furigana | `--br-jp-font` | `text-sm` | 14px |
| JP Romaji | `--br-jp-font` | `text-xs` | 12px |
| JP Meaning VI | `--br-jp-font` | `text-base font-bold` | 17px |
| JP Meaning EN | `--br-jp-font` | `text-xs text-neutral` | 12px |
| JP Example | `--br-jp-font` | `text-sm` | 13px |

Apply custom font: `font-[var(--br-heading-font)]` — Tailwind arbitrary value. Minimum IBM Plex Mono: **10px**.

---

## DaisyUI Component → Class Mapping

### Flashcard

```html
<div class="card bg-base-200 border border-base-content/10">
  <div class="h-1 bg-primary w-full"></div>  <!-- accent top bar -->
  <div class="card-body p-4 gap-3">
    <!-- header -->
    <p class="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral bg-base-300 -mx-4 -mt-4 px-4 py-2">
      動詞 · LESSON 05
    </p>
    <!-- main word -->
    <p class="text-5xl font-bold font-[var(--br-jp-font)] text-base-content leading-none">食べる</p>
    <!-- furigana + romaji -->
    <p class="text-sm font-[var(--br-jp-font)] text-neutral">たべる · taberu</p>
    <!-- pitch bars — custom component -->
    <!-- audio -->
    <button class="btn btn-outline btn-sm font-[var(--br-mono-font)] self-start">▶ PLAY</button>
    <div class="divider my-0 opacity-20"></div>
    <!-- meanings -->
    <p class="text-base font-bold font-[var(--br-jp-font)]">ăn</p>
    <p class="text-xs text-neutral font-[var(--br-jp-font)]">to eat</p>
    <!-- example -->
    <div class="border-l-4 border-primary pl-3">
      <p class="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral mb-1">EXAMPLE</p>
      <p class="text-sm font-[var(--br-jp-font)]">毎日ご飯を食べます。</p>
      <p class="text-xs text-neutral font-[var(--br-jp-font)]">Tôi ăn cơm mỗi ngày.</p>
    </div>
    <!-- SRS buttons -->
    <div class="join w-full mt-2">
      <button class="btn join-item flex-1 btn-error font-[var(--br-mono-font)] text-[11px]">AGAIN</button>
      <button class="btn join-item flex-1 btn-warning font-[var(--br-mono-font)] text-[11px]">HARD</button>
      <button class="btn join-item flex-1 btn-success font-[var(--br-mono-font)] text-[11px]">GOOD</button>
      <button class="btn join-item flex-1 btn-info font-[var(--br-mono-font)] text-[11px]">EASY</button>
    </div>
  </div>
</div>
```

### Tags (Badge)

```html
<!-- JLPT -->
<span class="badge badge-primary badge-outline font-[var(--br-mono-font)] text-[10px]">#N5</span>
<!-- Dataset -->
<span class="badge badge-primary font-[var(--br-mono-font)] text-[10px]">#MNN</span>
<!-- Part of speech -->
<span class="badge badge-neutral badge-outline font-[var(--br-mono-font)] text-[10px]">#動詞</span>
<!-- Status -->
<span class="badge badge-info font-[var(--br-mono-font)] text-[10px]">#NEW</span>
<span class="badge badge-error font-[var(--br-mono-font)] text-[10px]">#DUE</span>
```

`border-radius = 0` automatically applied via `--radius-selector: 0` in theme.

### Navigation

```html
<!-- Top Navbar -->
<div class="navbar bg-base-100 border-b border-base-content/10 px-4">
  <div class="navbar-start">
    <span class="text-2xl font-black font-[var(--br-heading-font)] tracking-tighter">NIHONGO.</span>
  </div>
  <div class="navbar-end">
    <span class="badge badge-primary font-[var(--br-mono-font)] text-[10px]">#MNN</span>
  </div>
</div>

<!-- Bottom Dock (mobile) — 3 tabs -->
<div class="dock">
  <button class="dock-active"><HomeIcon/><span class="dock-label font-[var(--br-mono-font)] text-[9px] uppercase">HOME</span></button>
  <button><BookIcon/><span class="dock-label font-[var(--br-mono-font)] text-[9px] uppercase">STUDY</span></button>
  <button><UserIcon/><span class="dock-label font-[var(--br-mono-font)] text-[9px] uppercase">PROFILE</span></button>
</div>

<!-- Sidebar (desktop ≥1024px) -->
<ul class="menu bg-base-100 border-r border-base-content/10 w-56 min-h-full p-2">
  <li class="menu-title font-[var(--br-mono-font)] text-[10px] uppercase">Books</li>
  <li><a class="border-l-4 border-primary bg-base-200 font-[var(--br-heading-font)]">MnN Shokyuu I</a></li>
</ul>
```

### Lesson Card (3-col Stat)

```html
<div class="card bg-base-200 border border-base-content/10 transition-colors hover:border-l-4 hover:border-l-primary">
  <div class="card-body p-4 gap-2">
    <div class="flex gap-1">
      <span class="badge badge-primary font-[var(--br-mono-font)] text-[10px]">#MNN</span>
      <span class="badge badge-outline font-[var(--br-mono-font)] text-[10px]">#N5</span>
    </div>
    <h2 class="card-title font-[var(--br-heading-font)] text-xl uppercase tracking-tight leading-tight">
      LESSON 05 — Family
    </h2>
    <p class="text-sm text-neutral">Home and rooms in the house</p>
    <div class="divider my-0 opacity-20"></div>
    <div class="stats stats-horizontal -mx-4 -mb-4">
      <div class="stat p-3">
        <div class="stat-value text-base font-[var(--br-mono-font)]">23</div>
        <div class="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">WORDS</div>
      </div>
      <div class="stat p-3">
        <div class="stat-value text-base font-[var(--br-mono-font)] text-primary">8</div>
        <div class="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">NEW</div>
      </div>
      <div class="stat p-3">
        <div class="stat-value text-base font-[var(--br-mono-font)] text-error">15</div>
        <div class="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">DUE</div>
      </div>
    </div>
  </div>
</div>
```

### Gamification

```html
<!-- XP Bar -->
<progress class="progress progress-primary h-0.5 w-full" value="60" max="100"></progress>
<p class="text-[10px] font-[var(--br-mono-font)] text-neutral">LV.12 — 2,340 XP</p>

<!-- Streak -->
<div class="stat">
  <div class="stat-value font-[var(--br-mono-font)] text-2xl">37</div>
  <div class="stat-desc font-[var(--br-mono-font)] text-[10px] uppercase">DAY STREAK</div>
</div>

<!-- Toast -->
<div class="toast toast-top toast-center">
  <div class="alert alert-success gap-2">
    <span class="font-[var(--br-mono-font)] text-[11px]">37 DAY STREAK!</span>
  </div>
</div>

<!-- Skeleton -->
<div class="skeleton h-32 w-full"></div>
```

---

## Pitch Accent Bars (Custom Component)

No DaisyUI equivalent — implement custom:

- High (H): `w-[18px] h-[11px] bg-primary border border-base-content/30`
- Low (L): `w-[18px] h-[5px] bg-base-300 border border-base-content/15 opacity-70`
- Kana label: `text-[11px] font-[var(--br-jp-font)] mt-[3px]`
- Container: `flex items-end gap-px`

---

## Component States

### Focus-visible
**must** preserve DaisyUI's default `focus-visible` ring — do not override with `focus:outline-none` or `focus:ring-0`. For custom interactive elements not using DaisyUI: **must** add `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`.

### Disabled
**must** use `disabled` HTML attribute combined with `disabled:opacity-40 disabled:cursor-not-allowed`. Do not use `pointer-events-none` as a substitute — screen readers still need to announce the disabled state.

### Loading
**must** set `disabled` on the button when loading to prevent double-submit:
```html
<button class="btn btn-primary" disabled>
  <span class="loading loading-spinner loading-xs"></span>
  LOADING
</button>
```

### Error (inputs)
**must** use `input-error` + `label-text-alt text-error`:
```html
<input class="input input-bordered input-error w-full" />
<label class="label">
  <span class="label-text-alt text-error font-[var(--br-mono-font)] text-[10px]">ERROR: ...</span>
</label>
```

### Hover
Cards: `hover:border-l-4 hover:border-l-primary transition-colors duration-[120ms]` — already in Lesson Card pattern. Buttons: DaisyUI handles hover — **should not** add custom hover styles.

---

## Anti-patterns

**must not:**
- Use `rounded-*` — theme already sets `--radius-*: 0`, will override
- Use `shadow-*` — theme already sets `--depth: 0`, will override
- Use `--br-heading-font` (Barlow Condensed) for Japanese text — no kana/kanji glyphs
- Use arbitrary colors (`text-[#FF0000]`) — **must** use semantic tokens (`text-error`)
- Use `text-black` / `text-white` — use `text-base-content` / `text-primary-content`
- Add `border-radius` via inline style — theme controls all radius
- Skip `font-[var(--br-mono-font)]` on labels, tags, counters, metadata

**should not:**
- Mix heading font and body font in the same UI element
- Add animations without wrapping in `@media (prefers-reduced-motion: no-preference)`
- Override `card-body` padding (`p-4`) with other utility classes

---

## Border Rules (Summary)

| Situation | Class |
|---|---|
| Structural card border | `border border-base-content/10` |
| Active/hover accent rail | `border-l-4 border-primary` |
| Example blockquote | `border-l-4 border-primary` |
| No shadow | `shadow-none` (or omit shadow utility entirely) |
| No border-radius | Set in theme — no need to add `rounded-none` |

---

## Animation

Wrap in `@media (prefers-reduced-motion: no-preference)`. Do not use `steps()`.

| Interaction | Tailwind / Custom | Duration |
|---|---|---|
| Button press | `active:scale-[.98] active:opacity-70 transition-all` | 80ms |
| Card hover border | `transition-colors duration-[120ms]` | 120ms |
| Screen transition | Framer Motion `opacity + y: 8→0` | 180ms `ease-out` |
| Flashcard flip | Framer Motion `rotateY` two-phase | 250ms |
| Shake (wrong) | Custom CSS keyframe `translateX` | 280ms linear |
| Toast | DaisyUI Toast + Framer | 200ms |

---

## Responsive

| Breakpoint | Layout | Key classes |
|---|---|---|
| < 640px (mobile) | Single col + Dock 3 tabs | `w-full`, `pb-16` (dock clearance) |
| 640px–1024px | `max-w-lg mx-auto` + Dock | `sm:grid-cols-2` for lesson grid |
| > 1024px | Sidebar `w-56` + `flex-1` main | `lg:hidden` Dock, `lg:block` Sidebar |

Min touch target: `min-h-[44px]` — DaisyUI `btn` meets this by default.

---

## Accessibility

- Minimum contrast 4.5:1 — beige background is sufficiently dark against ink `#111`
- `aria-label` on all icon-only buttons (Audio, nav icons)
- Keyboard navigable — DaisyUI components support this out of the box
- `prefers-reduced-motion` — wrap all animations

---

## Route Structure (TanStack Router)

| File Route | Path | Screen |
|---|---|---|
| `routes/__root.tsx` | `/` | Root layout (auth guard, nav) |
| `routes/index.tsx` | `/` | Home dashboard |
| `routes/books/index.tsx` | `/books` | Book selection |
| `routes/books/$book/index.tsx` | `/books/$book` | Lesson list |
| `routes/books/$book/$lesson.tsx` | `/books/$book/$lesson` | Lesson vocab |
| `routes/study/$mode.tsx` | `/study/$mode` | Study session |
| `routes/srs/index.tsx` | `/srs` | SRS review |
| `routes/custom/index.tsx` | `/custom` | Custom decks |
| `routes/leaderboard/index.tsx` | `/leaderboard` | Leaderboard |
| `routes/stats/index.tsx` | `/stats` | Study statistics |
| `routes/auth/login.tsx` | `/auth/login` | Login |
| `routes/auth/register.tsx` | `/auth/register` | Register |
| `routes/settings/index.tsx` | `/settings` | Settings |
| `routes/kanji/index.tsx` | `/kanji` | Kanji list |
| `routes/kanji/$char.tsx` | `/kanji/$char` | Kanji detail |
| `routes/kanji/$char/stroke.tsx` | `/kanji/$char/stroke` | Stroke order |
| `routes/kanji/graph.tsx` | `/kanji/graph` | Network graph |

---

## QA Checklist

Run when reviewing any change in `src/components/**`, `src/routes/**`, `src/**/*.css`:

- [ ] No `rounded-*` classes (theme sets `--radius-*: 0`)
- [ ] No `shadow-*` classes (theme sets `--depth: 0`)
- [ ] Japanese text uses `font-[var(--br-jp-font)]`, not heading/mono font
- [ ] Icon-only buttons have `aria-label`
- [ ] DaisyUI `focus-visible` ring not overridden
- [ ] Disabled state uses HTML `disabled` attribute + `disabled:opacity-40`
- [ ] Loading state button has `disabled` attribute
- [ ] Colors use semantic tokens, not arbitrary hex values
- [ ] Animations wrapped in `@media (prefers-reduced-motion: no-preference)`
- [ ] Mobile touch targets ≥ `min-h-[44px]`
- [ ] New component uses DaisyUI base + theme tokens + `--br-*` font vars
- [ ] No complex UI inlined in route/page — extracted into a component
- [ ] No duplicate component created — checked `src/components/` first

---

## Performance Targets

- Bundle: ≤ 500KB gzip (DaisyUI tree-shakes via Tailwind v4 — only builds used classes)
- LCP ≤ 2.5s. CLS ≤ 0.1
- Lighthouse: PWA ≥ 90 | Performance ≥ 85 | Accessibility ≥ 90 | SEO ≥ 90
- Vocabulary JSON: lazy-load per book
- Audio: lazy-load after first interaction, < 80KB total
