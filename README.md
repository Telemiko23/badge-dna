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

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests (rules, scoring, search, storage, content validation) |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint |
| `npm run validate:content` | Schema, reference, asset and publish-gate checks on `content/` and fixtures |
| `npm run build` | Production build into `dist/` (no fixtures) |
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
- `docs/roadmap.md` — what is done, next, and owner requests being designed
- `docs/limitations.md` — known gaps
