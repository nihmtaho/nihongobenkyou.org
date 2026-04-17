# YAML Dataset Rules

## Overview

```
YAML source → npm run build:dataset → public/data/{book_id}/lesson-XX.json + manifest.json
```

Vocabulary lives in YAML → JSON bundles → Dexie. Supabase never sees vocabulary content.

---

## YAML Schema

| Field | Type | Required |
|---|---|---|
| `id` | `[lesson, index]` | YES — sort order only |
| `kanji` | `string \| null` | YES — use `~` if none |
| `kana` | `string` | YES — primary reading |
| `romaji` | `string` | YES |
| `meaning.en` | `string` | YES |
| `meaning.vi` | `string` | YES — mandatory |
| `meaning.fr` | `string` | NO |

Top-level blocks: `languages` (must include `en` + `vi`), `lessons[]`, `<lesson-key>[]`.
If `examples` block exists: `ja`, `en`, `vi` all required. Phase 1 ships without examples.

---

## `datasets.config.ts` — Required Fields

`id` (immutable, used as `book_source`), `title`, `title_vi`, `source_file`, `lesson_key_prefix`, `lesson_range`, `jlpt_level`, `version` (semver), `output_dir`, `enabled`.

---

## Build Pipeline

| Step | Input → Output |
|---|---|
| 1. Parse YAML | `datasets/*.yaml` → raw JSON |
| 2. Enrich pitch | + Kanjium `accents.txt` |
| 3. Generate `vocab_id` | frozen algorithm |
| 4. Map audio | + Jitendex manifest |
| 5. **Validate** | Fail loudly — log full entry + field |
| 6. Split by lesson | → `public/data/{book_id}/lesson-XX.json` |
| 7. Write manifest | → `public/data/manifest.json` |

Validation rejects: missing `kana`/`meaning.en`/`meaning.vi`, duplicate `vocab_id`, incomplete `examples`. Collect all errors before `process.exit(1)`.

---

## `vocab_id` Generation

```ts
const input = `${bookSource}:${lessonNumber}:${kanji ?? kana}:${kana}`
const vocabId = `${bookCodePrefix}_${sha256(input).slice(0, 16)}`
```

Algorithm is **frozen** — shared between pipeline and client (`src/lib/vocab-id.ts`). Use `kanji ?? kana` to distinguish identical kana with different kanji.

---

## Manifest — `public/data/manifest.json`

`checksum` = SHA-256 of all lesson files concatenated in order. Client caches in Dexie `settings` — mismatch triggers update toast.
Cache strategy: **Network First** manifest (5 min TTL), **Cache First** lesson files.

---

## Versioning Rules

| Change | Version | Client action |
|---|---|---|
| Content fix | Patch | Update changed lessons |
| New field / new lessons | Minor | Re-seed (SRS unaffected) |
| Rename/remove field | Major | Drop + re-seed + migration script |
| Change `vocab_id` algorithm | **FORBIDDEN** | Destroys all SRS state |

**Deprecation over deletion** — add `deprecated: true`, never remove a word.

---

## Pitch Accent — Kanjium

Source: `github.com/mifunetoshiro/kanjium` `data/accents.txt`. Lookup: `(kana, kanji)` pair, fall back to kana-only. Store as `pitch_pattern: number | null` — null is valid, do not fail build. License: CC BY-SA 4.0.

---

## Planned Datasets

| `id` | Book | Phase |
|---|---|---|
| `minna_shokyuu_1` | MnN Shokyuu I (1–25) | 1 |
| `minna_shokyuu_2` | MnN Shokyuu II (26–50) | 2 |
| `tango_n5` / `tango_n4` | JLPT Tango N5/N4 | 4 |
| `mimikara_n3` | Mimikara Oboeru N3 | 4 |
