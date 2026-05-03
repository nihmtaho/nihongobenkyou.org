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

**Component library: shadcn/ui (Lyra style)** on Tailwind CSS v4. Import from `src/components/ui/`. Use `cn()` from `src/lib/utils` to combine classNames. Visual styling is controlled via CSS variables in `src/app.css`.

**Fonts:**
- Heading: **Barlow Condensed** (or Bebas Neue) — Black/ExtraBold, all-caps, CSS var `--br-heading-font`
- Metadata/tag: **IBM Plex Mono** — monospace technical, CSS var `--br-mono-font`
- Body/mono: **IBM Plex Mono** — Lyra style uses monospace throughout, CSS var `--font-mono`
- JP Content: **Noto Sans JP** — required for all Japanese characters, CSS var `--br-jp-font`

Never use heading font for Japanese text. Barlow Condensed has no kana/kanji glyphs.

---

## Theme Setup (`src/app.css`)

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@layer base {
  :root {
    --background:    oklch(91% 0.012 80);   /* beige */
    --foreground:    oklch(13% 0.001 0);
    --card:          oklch(93% 0.010 80);   /* cream */
    --card-foreground: oklch(13% 0.001 0);
    --primary:       oklch(68% 0.12 195);   /* teal — MnN dataset */
    --primary-foreground: oklch(13% 0.001 0);
    --secondary:     oklch(86% 0.012 80);
    --secondary-foreground: oklch(13% 0.001 0);
    --muted:         oklch(86% 0.012 80);
    --muted-foreground: oklch(43% 0.010 75);
    --destructive:   oklch(60% 0.18 35);    /* error / again */
    --border:        oklch(86% 0.012 80);
    --ring:          oklch(68% 0.12 195);
    --radius:        0rem;                  /* brutalist — square corners */
    /* SRS semantic colors */
    --warning:       oklch(75% 0.15 65);    /* hard */
    --success:       oklch(63% 0.15 150);   /* good */
    --info:          oklch(65% 0.12 240);   /* easy */
  }
}

/* Per-dataset theming — only --primary and --ring change */
[data-theme="brutalist-tango"]    { --primary: oklch(60% 0.18 35); }
[data-theme="brutalist-mimikara"] { --primary: oklch(58% 0.10 145); }
[data-theme="brutalist-custom"]   { --primary: oklch(58% 0.16 295); }
```

Apply dataset theme: set `data-theme="brutalist-{dataset}"` on `<html>`. State via Zustand `settingsStore`. Persist: `localStorage`.

---

## Color Token Reference

| CSS Variable | Brutalist Meaning | Tailwind |
|---|---|---|
| `--background` | App background (beige) | `bg-background` |
| `--card` | Card / panel background (cream) | `bg-card` |
| `--secondary` | Warm gray / input bg | `bg-secondary` |
| `--foreground` | Primary text, ink | `text-foreground` |
| `--primary` | Dataset accent color | `bg-primary` `text-primary` `border-primary` |
| `--primary-foreground` | Text on primary | `text-primary-foreground` |
| `--muted-foreground` | Muted / metadata text | `text-muted-foreground` |
| `--destructive` | Error / AGAIN | `text-destructive` `bg-destructive` |
| `--warning` | HARD button | `text-warning` `bg-warning` |
| `--success` | GOOD button | `text-success` `bg-success` |
| `--info` | EASY button | `text-info` `bg-info` |
| `--border` | Structural borders | `border-border` `border-border/10` |

Subtle border: `border-border/10`. Accent border rail: `border-l-4 border-primary`.

---

## shadcn/ui Component Usage

**Import from `src/components/ui/` — never directly from `@radix-ui/*`.**

```tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
```

### Button variants

| Variant | Use case |
|---|---|
| `default` | Primary action |
| `outline` | Secondary action |
| `ghost` | Tertiary / icon buttons |
| `destructive` | Delete / error actions |
| `warning` | Hard SRS rating |
| `success` | Good SRS rating |
| `info` | Easy SRS rating |

```tsx
<Button>Primary</Button>
<Button variant="outline" size="sm">Secondary</Button>
<Button variant="ghost" size="icon" aria-label="Close">✕</Button>
<Button variant="destructive">Delete</Button>
```

### Connected buttons (SRS rating bar / mode selector)

Use `ButtonGroup` from `src/components/ui/button-group`:

```tsx
import { ButtonGroup } from '@/components/ui/button-group'

<ButtonGroup className="w-full">
  <Button variant="destructive" className="flex-1 ...">Again</Button>
  <Button variant="warning" className="flex-1 ...">Hard</Button>
  <Button variant="success" className="flex-1 ...">Good</Button>
  <Button variant="info" className="flex-1 ...">Easy</Button>
</ButtonGroup>
```

### Flashcard pattern

```tsx
<div className="bg-card border border-border/10">
  <div className="h-1 bg-primary w-full" />
  <div className="p-4 flex flex-col gap-3">
    {/* header */}
    <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground bg-secondary -mx-4 -mt-4 px-4 py-2">
      動詞 · LESSON 05
    </p>
    {/* main word */}
    <p className="text-5xl font-bold font-[var(--br-jp-font)] text-foreground leading-none">食べる</p>
    <p className="text-sm font-[var(--br-jp-font)] text-muted-foreground">たべる · taberu</p>
    {/* pitch bars — custom component */}
    <Button variant="outline" size="sm" className="font-[var(--br-mono-font)] self-start">▶ PLAY</Button>
    <Separator className="opacity-20" />
    {/* SRS buttons */}
    <ButtonGroup className="w-full mt-2">
      <Button variant="destructive" className="flex-1 font-[var(--br-mono-font)] text-[11px]">AGAIN</Button>
      <Button variant="warning" className="flex-1 font-[var(--br-mono-font)] text-[11px]">HARD</Button>
      <Button variant="success" className="flex-1 font-[var(--br-mono-font)] text-[11px]">GOOD</Button>
      <Button variant="info" className="flex-1 font-[var(--br-mono-font)] text-[11px]">EASY</Button>
    </ButtonGroup>
  </div>
</div>
```

### Tags (Badge)

```tsx
{/* JLPT */}
<Badge variant="outline" className="font-[var(--br-mono-font)] text-[10px] text-primary border-primary">N5</Badge>
{/* Part of speech */}
<Badge variant="secondary" className="font-[var(--br-mono-font)] text-[10px]">動詞</Badge>
{/* Status */}
<Badge className="bg-info text-foreground font-[var(--br-mono-font)] text-[10px]">NEW</Badge>
<Badge className="bg-destructive text-destructive-foreground font-[var(--br-mono-font)] text-[10px]">DUE</Badge>
```

### Navigation

```tsx
{/* Bottom Dock (mobile) — custom component, pure Tailwind */}
{/* src/components/navigation/BottomDock.tsx */}
{/* Active: border-t-2 border-primary text-primary */}

{/* Sidebar (desktop ≥1024px) */}
{/* src/components/navigation/Sidebar.tsx */}
{/* Active nav item: border-l-4 border-primary bg-card */}
```

### Modals

```tsx
<Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* content */}
    <DialogFooter>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button onClick={onConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Study Modal (unified)

Use `StudyModal` from `src/components/study/StudyModal.tsx` with mode sections from `src/components/study/config/`:

```tsx
import { StudyModal } from '@/components/study/StudyModal'
import { VOCAB_STUDY_SECTIONS } from '@/components/study/config/vocab-study-modes.config'

<StudyModal
  open
  title="BÀI 05"
  context="all"        // or 'due'
  cardCount={stats.total}
  stats={srsStats}
  sections={VOCAB_STUDY_SECTIONS}
  onLaunch={({ mode, subMode, order }) => { /* ... */ }}
  onClose={onClose}
/>
```

### Skeleton loading

```tsx
{isLoading
  ? <Skeleton className="h-24 w-full" />
  : <ActualContent />}
```

### Alerts

```tsx
{/* Error */}
<Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>
{/* Warning */}
<Alert className="bg-warning/10 border-warning/50 text-warning"><AlertDescription>{message}</AlertDescription></Alert>
{/* Success */}
<Alert className="bg-success/10 border-success/50 text-success"><AlertDescription>{message}</AlertDescription></Alert>
```

---

## `cn()` Usage

Always use `cn()` when combining classNames:

```tsx
import { cn } from '@/lib/utils'

// ✓ correct
className={cn('base', isActive && 'text-primary', className)}

// ✗ wrong
className={`base ${isActive ? 'text-primary' : ''}`}
```

---

## Typography Scale

| Role | Font var | Tailwind | Notes |
|---|---|---|---|
| Display | `--br-heading-font` | `text-7xl font-black tracking-tighter` | Lesson number 80px |
| Heading L | `--br-heading-font` | `text-4xl font-bold uppercase` | Section title |
| Heading M | `--br-heading-font` | `text-xl font-bold uppercase` | Card title |
| Label/Tag | `--br-mono-font` | `text-[11px] uppercase` | Tag, counter, metadata |
| Body | Inter / IBM Plex Mono | `text-sm` / `text-base` | Description, secondary |
| JP Word | `--br-jp-font` | `text-5xl font-bold` | Flashcard main word |
| JP Furigana | `--br-jp-font` | `text-sm` | 14px |
| JP Meaning | `--br-jp-font` | `text-base font-bold` | 17px |
| JP Example | `--br-jp-font` | `text-sm` | 13px |

---

## Component States

### Disabled
Use HTML `disabled` attribute + `disabled:opacity-40 disabled:cursor-not-allowed`. shadcn `Button` handles this automatically.

### Loading
```tsx
<Button disabled>
  <Loader2 className="animate-spin h-4 w-4 mr-2" />
  Loading...
</Button>
```

### Error (inputs)
```tsx
<Input className="border-destructive" />
<p className="text-[10px] font-[var(--br-mono-font)] text-destructive mt-1">Error message</p>
```

### Hover
Cards: `hover:border-l-4 hover:border-l-primary transition-colors duration-[120ms]`. shadcn `Button` handles hover automatically — do not add custom hover styles to buttons.

---

## Anti-patterns

**must not:**
- Use `rounded-*` — `--radius: 0rem` enforces zero radius globally
- Use `shadow-*` — brutalist design has no shadows
- Use `--br-heading-font` (Barlow Condensed) for Japanese text — no kana/kanji glyphs
- Use arbitrary hex colors (`text-[#FF0000]`) — use CSS vars (`text-destructive`)
- Use `text-black` / `text-white` — use `text-foreground` / `text-primary-foreground`
- Import directly from `@radix-ui/*` — always use the shadcn wrapper in `src/components/ui/`
- Skip `cn()` when combining classNames

**should not:**
- Add animations without `@media (prefers-reduced-motion: no-preference)`
- Use `ButtonGroup` for non-connected buttons — only for visually joined button groups

---

## Border Rules

| Situation | Class |
|---|---|
| Structural card border | `border border-border/10` |
| Active/hover accent rail | `border-l-4 border-primary` |
| Example blockquote | `border-l-4 border-primary` |
| No shadow | omit shadow utility entirely |
| No border-radius | enforced via `--radius: 0rem` |

---

## Animation

Wrap in `@media (prefers-reduced-motion: no-preference)`.

| Interaction | Implementation | Duration |
|---|---|---|
| Button press | `active:scale-[.98] active:opacity-70 transition-all` | 80ms |
| Card hover border | `transition-colors duration-[120ms]` | 120ms |
| Screen transition | Framer Motion `opacity + y: 8→0` | 180ms `ease-out` |
| Flashcard flip | Framer Motion `rotateY` two-phase | 250ms |
| SRS progress bar | Framer Motion `scaleX` per segment | 650ms `ease-out` |

---

## Responsive

| Breakpoint | Layout |
|---|---|
| < 640px | Single col + BottomDock |
| 640px–1024px | `max-w-lg mx-auto` + BottomDock |
| > 1024px | Sidebar `w-56` + `flex-1` main; `lg:hidden` BottomDock |

Min touch target: `min-h-[44px]` — shadcn `Button` default size meets this.

---

## Accessibility

- Minimum contrast 4.5:1
- `aria-label` on all icon-only buttons
- Keyboard navigable — shadcn/Radix components support this by default
- `prefers-reduced-motion` — wrap all custom animations

---

## QA Checklist

Run when reviewing any change in `src/components/**`, `src/routes/**`, `src/**/*.css`:

- [ ] No `rounded-*` classes (`--radius: 0rem` handles it)
- [ ] No `shadow-*` classes (brutalist — no shadows)
- [ ] Japanese text uses `font-[var(--br-jp-font)]`, not heading/mono font
- [ ] Icon-only buttons have `aria-label`
- [ ] `disabled` attribute used (not just visual opacity)
- [ ] Loading state button has `disabled` attribute
- [ ] Colors use CSS vars (`text-primary`, `text-foreground`, `text-warning`) not arbitrary hex
- [ ] Animations wrapped in `@media (prefers-reduced-motion: no-preference)`
- [ ] Mobile touch targets ≥ `min-h-[44px]`
- [ ] Component uses shadcn from `src/components/ui/` — not hand-rolled if equivalent exists
- [ ] Never import from `@radix-ui/*` directly — always via shadcn wrapper
- [ ] `ButtonGroup` used for all connected-button patterns
- [ ] `cn()` used when combining classNames (not template literals)
- [ ] No DaisyUI classes: `btn`, `card`, `badge`, `modal`, `join`, `dock`, `loading-spinner`, `skeleton`, `divider`, `alert`, `text-base-content`, `bg-base-*`, `text-neutral`, `text-error`, `border-base-content`
- [ ] No complex UI inlined in route/page — extracted into a component
- [ ] No duplicate component created — checked `src/components/` first

---

## Performance Targets

- LCP ≤ 2.5s. CLS ≤ 0.1
- Lighthouse: PWA ≥ 90 | Performance ≥ 85 | Accessibility ≥ 90
- Vocabulary JSON: lazy-load per book
- Audio: lazy-load after first interaction
