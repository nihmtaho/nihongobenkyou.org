# YAML Dataset Rules

- `vocab_id` algorithm is **frozen** — never change it; any change destroys all SRS state
- Required YAML fields: `id`, `kanji` (or `~`), `kana`, `romaji`, `meaning.en`, `meaning.vi`
- `examples` block requires `ja`, `en`, `vi` — Phase 1 ships without examples
- `pitch_pattern: null` is valid — never fail the build on missing pitch data
- Validation: collect all errors before `process.exit(1)`; reject missing `kana`/`meaning.en`/`meaning.vi` and duplicate `vocab_id`
- Deprecation over deletion — add `deprecated: true`, never remove vocabulary entries
- Patch: content fix; Minor: new field (re-seed, SRS unaffected); Major: schema change (drop + re-seed + migration script); `vocab_id` algorithm change: **FORBIDDEN**
