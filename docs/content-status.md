# Content status

**Readiness: technical prototype only.** Technical readiness and content readiness are separate (spec §13.5, §18.6).

| Item | Status |
| --- | --- |
| Real published puzzles | **0** (target for first release: 15; first playtest: 5) |
| Draft puzzles of real crests (candidates) | **37** for the 20 Premier League 2026/27 clubs, from the owner's PNG-v2 package; assistant-written orders, unreviewed (see `png-v2-review.md`). Dev builds only |
| Real crest assets in `public/assets/` | none (candidate PNGs live in `content/candidates/assets/`, git-ignored) |
| Rights / usage basis for any real crest | **not established** — the package names footylogos.com as the source; availability to download is not permission |
| Human review (fidelity, visual, reviewer sign-off) | none given; no puzzle has `reviewedBy` |
| Synthetic test puzzles | 3 (fixtures: 3, 4 and 5 reveals) — dev only |
| Daily schedule | none for real content (needs ≥ 7 dated entries once puzzles are published); dev fixtures get a generated schedule |
| Club names for the guess list | 33 clubs, he/en names + a few aliases — **unverified starter data**, owner should review |

## Candidates to evaluate (not approved; some may be dropped)
Arsenal, Liverpool, Manchester United, Chelsea, Manchester City, Tottenham, Real Madrid, Barcelona, Atlético Madrid, Benfica, Porto, Sporting, Roma, Valencia, Borussia Dortmund.
Arsenal in particular: a sequence like frame → wheel → cannon must be checked against a specific file and crest version; do not assume other ornaments exist.

## What blocks real puzzles
1. **Decide the crest source and usage basis** per club (official site, club press kit, licensed set, …) and record `sourceUrl`, `retrievedAt`, `sourceSha256`, `rightsStatus`, `rightsEvidence`.
2. **Provide or approve source files** (SVG preferred). Check SVG group structure; where it is not semantic, elements must be isolated manually/with masks and visually reviewed.
3. **Human editorial pass**: choose elements and reveal order, review fidelity to the source, review at mobile size, set `reviewedBy/At`.
4. **Playtest** the sequences (spec §17) before calling any puzzle `tested`.

Nothing here has been done by the build; nothing was downloaded or sent anywhere.
