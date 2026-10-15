# Badge DNA — project rules

Source of truth for product and build: `docs/Badge-DNA-Build-Spec.md` (v1.0, 2026-10-15, owner: Liran Telem).
This file lists the approved rules a contributor must not break. It does not claim that any
editor approval or usage rights have been given; none have (see `docs/content-status.md`).

## Core mechanic (approved — do not change silently)
- Clues are real, meaningful graphic **elements** of one defined version of a club crest (sub-elements such as a wheel or a leaf are allowed). No blur, pixelation, zoom or random crops.
- Each reveal adds exactly one element on its own card. Earlier elements stay visible. Elements are never assembled into the crest during the round.
- The full crest is shown only at the end of the round, in a separate answer area.
- One fixed, approved reveal order per puzzle revision; no shuffling inside a puzzle. A club may have several approved *variants* (separate puzzles with different orders); practice prefers variants the player hasn't seen (owner decision, 2026-10-15). The daily challenge uses fixed scheduled puzzles.
- Club name is never a clue. Nothing in the DOM (text, `alt`, `title`, ids, asset names, debug output) may reveal the answer before the round ends. Asset paths use neutral ids.
- Any change to this mechanic is a written proposal to the owner, not a quiet change.

## Defaults (build defaults, not product decisions — keep them in `src/domain/config.ts`)
- 3 mistakes end the round; reveal after a mistake is manual; no timer; no accounts; local progress only.
- scoring-v1: `baseScore = round10(1000 - 700*(K-1)/(N-1))`, `success = max(100, base - 100*W)`; failed/gave-up = 0. One pure function is used for the live preview and the final score (`src/domain/scoring.ts`).
- Hebrew first (RTL), English supported through `src/i18n`. UI strings live in the dictionaries only.
- Guess is judged by `clubId` chosen from the search list; never by string comparison and never by AI.

## Architecture
`src/domain` pure rules (no React, no storage) · `src/content` schemas, validator, repository · `src/storage` safe localStorage + zod · `src/i18n` · `src/components`, `src/screens` UI · `content/` JSON · `public/assets/` neutral-id crest assets.

## Content rules
- Never invent crests, reviewers, rights evidence, difficulty ratings or player data. `rightsStatus`, `fidelityReviewed`, `visualReviewed`, `reviewedBy/At` are set by a human, never by a script or by AI.
- Synthetic fixtures (`content/fixtures`) use invented clubs only, are excluded from production builds (`__INCLUDE_FIXTURES__`), and must never enter the published pool or a daily schedule.
- A single-letter clue must never be the first letter of the club's name (owner rule; validator `letter-is-initial`).
- Published puzzle revisions are immutable; change a puzzle by adding a new `revision`.
- After editing `content/`, run `npm run validate:content`.

## Commands
`npm run dev` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run validate:content`

## Review decisions
`content/reviews/review.json` holds the owner's approvals. It is normally written through the development review screen (`#/review`), by the owner. Never create, edit or fill in approvals, reviewer names or confirmations on your own initiative. The only exception is an explicit written instruction from the owner; then every decision must carry a note saying how it was given (as in the 2026-10-15 blanket approval).

## Publishing
`npm run promote` is the only way puzzles become published. It needs the owner's approvals and copies real crest files into `public/assets/`, which then ship with any deployment: run it with `--dry-run` first and never commit or push promoted files without the owner's go-ahead. Published puzzle revisions and released daily dates are never edited.

## Legal
The footer link and the `#/legal` page (texts in `src/i18n`, settings in `src/legal.ts`) must stay on every build. They are a disclaimer, not a licence: they never change a crest's `rightsStatus` (see `docs/legal-notice.md`). Do not edit them to claim permissions that were not given.

## Raw material
`logos/` holds owner-provided source images. It is git-ignored on purpose (usage rights undocumented): never commit or publish it. Extracted assets go to `public/assets/` with neutral ids only after human review.

## Do not
Deploy, publish, add analytics/network calls, add third-party fonts/CDNs, or add features from spec §3.3 without an explicit owner decision.
