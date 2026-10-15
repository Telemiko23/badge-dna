# Roadmap

Status as of 2026-10-15. "Owner" = Liran Telem. Items marked **(owner request)** come from the owner's playtest feedback on 2026-10-15 and are not in the original spec's first-release scope (spec §3.3), so each needs a short design check before building.

## Done
- **M1** engine: scoring-v1, round state machine, content schemas, validator.
- **M2** practice mode, Hebrew/English, search, local storage.
- **M4** daily challenge (UTC date, frozen records, resume, summary, share text, tab lock) — works with dev fixtures; real schedule needs real puzzles.
- **UI refresh (owner request)**: dark theme, press/hover feedback on every button, language dropdown, controls that keep their physical position when the language flips.

## Next
1. **Real content pipeline (M3)** — the PNG-v2 package for 20 Premier League clubs is imported as drafts (`docs/png-v2-review.md`). Remaining: owner review of pieces and orders, rights decision, publish gate, real daily schedule.
2. **M5** — Playwright end-to-end tests, visual QA at 360/390/768/1440 and 200% zoom, accessibility pass, asset security pass.

## Owner requests, designed but not built

### A. Categories by league / competition, with progression (owner request)
- **Data (started):** `content/competitions/*.json` (schema `Competition`: id, kind league|cup|national, season, name he/en, clubIds). The first one, `premier-league-2026-27` (20 clubs), exists and is validated. `content/sources/premier-league-2026-27.json` records which source file each club's logo came from (+ size and SHA-256).
- **To build:** category picker on Home; practice pool filtered by competition; per-competition progress stored locally (solved clubs / total); an unlock rule in config (e.g. "solve ≥ 80 % of a league to open the next one"), kept in `src/domain/config.ts` so it can be tuned; a "finished" state per competition.
- **Open questions:** unlock threshold; whether a club belongs to several competitions (yes, e.g. league + cup); how national teams/cups are grouped; whether the daily challenge draws from all categories (proposed: yes).

### B. Online 1-vs-1 (owner request)
Not possible in the current local-only architecture (spec §16.1: answers live in the client; no accounts, no server). It needs a backend and a decision about privacy and scope.
- **Prerequisites:** server (answers and scoring server-side, so the client never receives the answer before a round ends); player identity (anonymous device id vs accounts); matchmaking or invite link; storage; abuse/privacy review.
- **Design questions for the owner:** live (both at once) or asynchronous (same puzzles, compare scores)? Does speed matter (today there is deliberately no timer)? Rated/leaderboard or casual? Which categories?
- **Suggested path:** (1) async "challenge a friend" with a share link and server-held puzzle set; (2) live matches only after (1) proves demand.
- Not started; no network code exists today.

### C. Varying which element opens a puzzle (owner request) — **built (engine), needs content**
- **Rule change, approved by the owner on 2026-10-15:** a puzzle revision still has ONE fixed, reviewed order, but a club may have several approved **variants** (separate puzzles, different reveal orders). Practice prefers the variant with the most elements the player hasn't seen, weighting early positions more (`noveltyScore`). Seen elements are remembered locally (`badge-dna:v1:seen-elements`).
- The daily challenge keeps fixed, scheduled puzzles so everyone plays the same thing.
- **Content implication:** each variant must be reviewed like any puzzle. Cheapest way to get variety: give each club 2–3 variants that start from different elements.
- Fixtures include a second variant for one invented club to exercise this.

### D. Logo intake at scale (hundreds–thousands)
- Raw files live in `logos/` (git-ignored: origin and usage rights are not documented, so they are not published). 632 PNGs today.
- Needed: a script that indexes the folder (name → club id, size, SHA-256), flags duplicates and age-group/reserve variants (`*_U21`, national teams), and maps clubs to competitions. Club display names (Hebrew/English) and aliases must be reviewed by the owner.
- **Quality gate:** the first logo dump was **150×150 px**, too small to split. The owner's PNG-v2 package solved this for 20 clubs (1024×1024). Importer: `scripts/import-package.ts`.

### E. Element extraction workbench (dev tool)
Dev-only screen/CLI: load a crest, show its structure, select parts, export each as its own element file with `parentElementId` for natural sub-elements, record `sourceMapping`, and compare against the source. Human review flags (`fidelityReviewed`, `visualReviewed`) are set by the owner, never automatically.
- **Works well with SVG** (paths/groups can be selected exactly; lossless; colours preserved).
- **Raster-only sources** need manual masks and are limited by resolution.

## Decisions needed from the owner
1. Are vector (SVG) or high-resolution (≥ 600 px) crest sources available, and what is the usage basis for them?
2. Unlock rule for league progression (A).
3. 1-vs-1: live or asynchronous, and is a backend acceptable (B)?
4. Review of the Hebrew club names/aliases in `content/clubs/clubs.json`.
