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

## Not built yet (by design)
Review/preview screen for content, Playwright end-to-end suite, 360/390/768/1440 visual QA pass — see `docs/limitations.md`.
