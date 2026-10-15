# Deploying to GitHub Pages

The site is a static build (`dist/`) published by `.github/workflows/deploy.yml`. Address: `https://telemiko23.github.io/badge-dna/` (the repository is public).

## One-time setup (owner)
1. Repository **Settings -> Pages -> Build and deployment -> Source: GitHub Actions** (not "Deploy from a branch": this project needs a build step, unlike `sports-trip`).
2. Push the workflow (it is in `master`). The first run starts by itself; watch it in the **Actions** tab. Green = live.

## What every push to master does
Type-check, lint, content validation, all tests, then `npm run build` with `BASE_PATH=/badge-dna/`, then publish. **Every push to master goes live.** If a check fails, nothing is published and the previous version stays up.

## What goes live
Only what `npm run build` produces: the app, the published puzzles and the PNG files in `public/assets/`. Never included: the raw `logos/` folder, the draft candidates, test fixtures, the review screen and its save endpoint, the development clock override.

## Before pushing new content
`npm run promote -- --dry-run`, then `npm run promote`, `npm run validate:content`, `npm test`. The daily schedule has a limited number of dated entries (14 from 2026-10-16): run the promotion again before it runs out, or the daily card will say "not available yet".

## Taking it down or rolling back
- Roll back: `git revert <bad commit>` and push; the workflow redeploys the previous state. No history rewriting.
- Remove one puzzle or crest quickly (for example after a rights holder asks): set the puzzle's `status` to `retired` in `content/puzzles/promoted.json` (published puzzle revisions are otherwise immutable), delete its files from `public/assets/`, push.
- Take the whole site down: Settings -> Pages -> unpublish, or disable the workflow in the Actions tab.
- Files already pushed stay in the repository history. Removing them from history is a separate, destructive operation that needs the owner's explicit decision.

## Contact address
`LEGAL.contactEmail` in `src/legal.ts` is shown on the legal notice page.
