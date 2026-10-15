# Badge DNA

Football-badge guessing game: each clue is a real graphic element of a club crest, shown on its own card. Reveal more elements for a lower possible score, or guess now. Hebrew first (RTL), English supported. Runs locally in the browser; no server, accounts or network calls.

Working name — see `docs/Badge-DNA-Build-Spec.md` for the product spec. **Status: technical prototype** (see `docs/content-status.md`).

## Run locally

Requires Node 24+ and npm 11+ (developed on Node 24.19, npm 11.17).

```bash
npm install
npm run dev        # http://localhost:5173
```

With no approved real puzzles yet, the dev build plays **synthetic test puzzles** (invented clubs, invented crests) behind a "development build" banner. Production builds (`npm run build`) contain no fixtures; with no published real puzzles they show "no puzzles available yet".

## Reviewing the draft puzzles (development only)
Run `npm run dev` and open `http://localhost:5173/?content=candidate#/review` (once puzzles are published the app shows the real content by default, and `?content=candidate` switches to the drafts). Enter the reviewer name, open a club, look at the crest and every piece in order, tick the three confirmations and approve, or mark the puzzle as needing changes or rejected. Decisions are saved to `content/reviews/review.json` by the dev server; the screen and the save endpoint do not exist in production builds.

## Publishing approved puzzles (stage C)
After approving puzzles in the review screen:

```bash
npm run promote -- --dry-run   # shows what would be published and validates it, writes nothing
npm run promote                # copies the approved puzzles, their crests and pieces into the real content
```

It publishes only puzzles marked "approved" in `content/reviews/review.json` that are unchanged since the approval, copies their PNG files to `public/assets/` (these become part of the repository and of any deployed site), records the rights basis from `content/reviews/rights-basis.json`, and adds new dated daily challenges (14 by default; `--days=N`, `--no-daily`) after today and after the last released date. A published puzzle revision never changes; released daily dates are never edited.

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests (rules, scoring, search, storage, content validation) |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint |
| `npm run validate:content` | Schema, reference, asset and publish-gate checks on `content/` and fixtures |
| `npm run build` | Production build into `dist/` (no fixtures) |
| `node scripts/import-package.ts <folder>` | Imports an owner-provided PNG package as draft candidate content |
| `npm run promote` | Publishes the owner-approved puzzles (see above) |
| `npm run build:dev` | Build with fixtures into `dist-dev/` for QA |

## Project layout

```
src/domain     pure rules: scoring, round state machine, search, practice order
src/content    zod schemas, validator, repository, loaders
src/storage    safe localStorage, stored-state schemas, local event log
src/i18n       he (source) / en dictionaries, provider
src/components UI pieces (clue card, combobox, round view, dialogs)
src/screens    home, practice, how-to, settings
content/       clubs, crests, elements, puzzles, daily (JSON) and fixtures/
public/assets  neutral-id crest assets (real content, empty for now)
docs/          decisions, content status, content guide
tests/         vitest suites
```

## Docs
- `CLAUDE.md` — approved product rules for contributors
- `docs/decisions.md` — implementation decisions and assumptions
- `docs/content-status.md` — what content exists, what blocks real puzzles
- `docs/content-guide.md` — how to add a puzzle
- `docs/legal-notice.md` — the in-app legal notice and what it does not settle
- `docs/png-v2-review.md` — review of the owner's PNG package and what it needs
- `docs/roadmap.md` — what is done, next, and owner requests being designed
- `docs/limitations.md` — known gaps
