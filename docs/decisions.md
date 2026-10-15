# Decisions and assumptions

Decisions made while building milestones 1–2. None change the core mechanic. "Spec" = `Badge-DNA-Build-Spec.md`.

## Owner instructions in chat (2026-10-15)
- Hebrew first, RTL. English is supported in the code from day one (`src/i18n`), toggled in the header.

## Stack (spec §14)
- React 19 + TypeScript + Vite 8, plain CSS, zod 4 for schemas, vitest 5 for tests, oxlint. Node 24.19 / npm 11.17.
- No router library: a tiny hash router (`#/`, `#/practice`, `#/how-to`, `#/settings`) so refresh and the back button work.
- System font stack (Segoe UI / Arial Hebrew / system-ui). No web fonts or CDNs, in line with the no-network-calls rule.

## Engine
- Round state is a plain object transformed by pure functions (`src/domain/round.ts`). The answer club is never stored in state; it is passed in only when a guess is judged.
- Scoring uses integer arithmetic so half-way values round up exactly (e.g. 825 → 830).
- A guess carries the number of elements the player was looking at; if that no longer matches the state it is ignored (spec §15). A pending reveal blocks guesses and further reveals.
- A repeated wrong guess returns `duplicate`: no mistake, no score change, a message.
- `technical_error` (first clue failed to load) is not a game attempt and can be retried.
- Additional clues are preloaded before they are shown; a failed preload keeps the same state and offers a retry, never charging the player.

## Practice
- One puzzle per club per cycle, shuffled once from a stored seed; order survives refresh. A new cycle avoids starting with the last club played.
- Session progress is stored under `badge-dna:v1:practice` (zod-validated). A stored session is resumed only if its content source, puzzle revision and scoring version still match; otherwise a restore-problem screen appears and the original record is moved to `…:practice-backup`, never silently mapped to another puzzle.
- Results are recorded once per `roundId`; re-rendering or reloading a finished round never re-adds points.

## Search
- Normalisation is for matching only: NFKD, accents/niqqud stripped, Hebrew geresh/gershayim and apostrophes removed, hyphens and other punctuation become spaces. Words are never dropped.
- Ranking: exact → prefix → word-prefix → substring; ties alphabetical in the UI language. Max 8 suggestions, from 2 characters. Choosing a suggestion never submits; a second Enter or the button does.
- Club names/aliases in `content/clubs/clubs.json` are **starter data written without a source check**; the owner should review them (see content-status).

## Content pipeline
- Fixtures are synthetic: invented clubs ("Sea Dragons", "Highland Eagles", "Oak Rovers"), hand-drawn SVG. They are loaded through a dynamic import guarded by a build-time flag and verified absent from `dist/`.
- In a development build with no published real puzzles the app falls back to fixtures with a visible banner and a "test puzzle" badge. If real published puzzles exist, fixtures are not used.
- Fixture crests carry `rightsStatus: approved_for_project` because they are invented drawings made for this project; the validator's real-content publish gates do not apply to them, and a test asserts fixtures would *fail* those gates as real content.

## Daily challenge (milestone 4)
- Game date = UTC date (`src/domain/dates.ts`); the changeover is 00:00 UTC and local time is only used to *display* when the next one starts. Home re-evaluates every 30 s, so cards follow the rollover without a reload.
- One stored record per game date (`badge-dna:v1:daily:YYYY-MM-DD`) holding a **frozen copy** of the schedule's puzzle refs, so later content changes never swap a puzzle mid-challenge. The schedule itself is explicit dated entries (`content/daily/*.json`), never computed from array positions; only the dev fixtures get a generated window.
- `getValidDaily(date)` returns an entry only if it has exactly three published, loadable puzzles of three different clubs; otherwise the app says "not available yet" and never invents a day.
- An unfinished earlier day can be completed (marked with its date, listed on Home); an earlier day that was never started cannot be started; the future cannot be played. A started challenge cannot be restarted.
- Starting is an explicit button, so merely opening the screen doesn't start a round. If local storage is unavailable the daily challenge is disabled (practice still works), because progress would not be kept.
- Single-writer lease per date in localStorage (15 s TTL, 5 s heartbeat, `storage` events). A second tab is read-only, follows the writer's saves, and can "move control" or inherit it when the lease expires. Reliability only, not anti-cheat.
- Round reloaded mid-reveal: `restoreRound` clears `pendingReveal` (the preload promise is gone; nothing was charged).
- Share text carries only date, counts, score and clue ratios (a test asserts no club names or puzzle ids). If copying fails, a selectable text box appears.
- Dev-only `?now=<ISO time>` overrides the app clock (production builds ignore it), used to test the rollover.

## Owner feedback round 1 (2026-10-15)
- **Visual direction:** dark theme (no bright full-screen backgrounds). Clue artwork sits on a mid-tone tile so both white and very dark elements remain visible; interface colours never recolour the artwork.
- **Press feedback:** every button has hover (pointer devices only), pressed (scale + brightness) and keyboard focus states; motion respects `prefers-reduced-motion`.
- **Language:** a dropdown (native `<select>`), not buttons. Rows of controls (header, stats, guess row, button rows, dialog actions) are laid out in a fixed physical order (`direction: ltr` container, text direction restored on children), so nothing jumps when Hebrew ⇄ English changes direction. Verified by measuring element positions in both languages.
- **Home navigation:** a home icon in the header replaces the "← back" text button (its position and glyph don't depend on direction).
- **Variants:** see roadmap C. This relaxes the original "one fixed order per club" wording; each variant is still one fixed, reviewed order.
- **Logos folder:** `logos/` is git-ignored; the Premier League 2026/27 list was verified against a news article (3 promoted: Coventry City, Ipswich Town, Hull City; 3 relegated: West Ham, Burnley, Wolves) and should be confirmed against the league's site.

## PNG-v2 package import (2026-10-15)
- New content kind **candidate**: real crests that are still drafts. Playable only in dev builds, only when the local asset files exist; production builds exclude the module and files (checked in `dist/`). Priority in dev: published real > candidates > invented fixtures; `?content=real|candidate|fixture` forces one.
- Candidate assets are **git-ignored** (rights undocumented); their JSON metadata and provenance are tracked.
- Elements gained optional `tileTone` (backdrop tone for the clue tile; artwork unchanged) and `autoSelectable` (false = source flagged the piece as incomplete; the validator forbids using it).
- The owner's `EXTRACTION-RULES.md` is treated as superseding spec §4.2 (completing background under removed text) and §4.4 (single original letters as clues) for this package. See `png-v2-review.md`.
- Reveal orders for the 37 drafts were written by the assistant and are marked as such in `editorialNotes`.
- Dev daily schedule for any pool without a hand-made one: `devDailySchedule` (explicit dated entries, three clubs a day, deterministic).

## Review screen (stage B, 2026-10-15)
- Dev-only (`import.meta.env.DEV`; verified absent from `dist/`), route `#/review`, available when the candidate drafts are loaded.
- Decisions go to `content/reviews/review.json` through a dev-server-only endpoint (`scripts/review-plugin.ts`): one fixed file, body validated with the same zod schema, requests from other origins refused, saves sent one at a time in order.
- An approval needs three explicit confirmations (crest matches the source; every piece faithful and readable at phone size; order acceptable) and a reviewer name; the schema rejects anything else. "Needs changes" and "rejected" need neither.
- Approving a puzzle is a human act: nobody (including the assistant) fills it in.
- Draft notes are now written in Hebrew (from the piece labels in the package) so the screen doesn't mix languages.

## Promotion tool (stage C, 2026-10-15)
- `npm run promote` (`scripts/promote.ts`, planning in `scripts/promote-lib.ts`, unit-tested). Reads the owner's approvals from `content/reviews/review.json`; with no approvals it does nothing.
- Approvals are bound to the puzzle's crest + reveal order (`signature`), so an approval is never applied to a puzzle that was changed or regenerated afterwards.
- Copies approved puzzles, their crest and only the pieces they use. Review flags (reviewer, date, fidelity, visual) come from the owner's decision. Rights basis text comes from `content/reviews/rights-basis.json` (the owner's recorded decision): crest `rightsStatus: approved_for_project` with that text as evidence. No licence exists.
- Published puzzle revisions are immutable (a changed order is refused: add a new revision). A withdrawn approval warns but never unpublishes.
- Output goes to `promoted.json` files in `content/crests`, `elements`, `puzzles`, `daily`; assets to `public/assets` (tracked by git, deployed with the site). The result is validated with the real-content rules before anything is written.
- Daily schedule: explicit dates only after today and after the last released date; three different clubs a day; clubs used longest ago go first so a club does not return on consecutive days when there are enough clubs.
- Review screen: group approval (three confirmations + reviewer name + a confirmation dialog) for the pending puzzles currently shown.

## Blanket approval and first publication (2026-10-15)
- The owner approved all 38 drafts in one written message and asked to proceed. Decisions were recorded in `content/reviews/review.json` by a script from that instruction (reviewer "Liran Telem", all three confirmations true, note on each decision stating how it was given). CLAUDE.md now allows this only for an explicit written owner instruction.
- `npm run promote` published them: 38 puzzles, 20 crests, 109 pieces, 129 PNG files in `public/assets/`, 14 daily dates from 2026-10-16. Validation: 0 errors, 0 warnings.
- With published puzzles present the app runs in **real** mode in every build (no banners, no draft badge). The drafts are still reachable in development with `?content=candidate` (needed by the review screen).
- Verified in a production build served locally: no banner or draft badge, real crests load, the review screen and its endpoint are absent, and the dev clock override is ignored.

## Not built yet (by design)
Review/preview screen for content, Playwright end-to-end suite, 360/390/768/1440 visual QA pass — see `docs/limitations.md`.
