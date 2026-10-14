# Known gaps and limitations

## Not done yet (planned)
- **Milestone 3** — real puzzles (blocked on source/rights/review, see `content-status.md`) and the internal review screen (full crest, elements, sequence; dev-only).
- **Milestone 5** — Playwright end-to-end suite, visual QA at 360/390/768/1440 (+ 200% zoom), security pass on assets, final docs.

## Limitations of the current build
- **Daily challenge has no real schedule.** The code (milestone 4) is done and works against the synthetic fixtures, whose dev-only schedule is generated around "today" and rotates three clubs. Production builds show "the daily challenge isn't available yet" until real dated entries exist in `content/daily/` (needs ≥ 7 days of real published puzzles, none exist).
- The daily lock, one record per date and "complete an unfinished earlier day" are local-only reliability features. Clearing storage, switching device or changing the clock bypasses them (spec §11).
- Old daily records are never pruned.
- Local-only: answers and assets are visible to anyone who inspects the code; no anti-cheat, no leaderboard (spec §16.1).
- Visual QA so far: manual passes at 375×812 mobile in the dev build (home, round, reveal, wrong guess, solve, reload-restore, Hebrew↔English) and a DOM-level pass over the daily flow (intro, three rounds incl. give-up dialog, summary, share-text fallback, two tabs, UTC rollover mid-round via `?now=`). Not yet checked: 5-clue layout at 360, 768, 1440, 200% zoom, mobile keyboard overlap, screen reader pass, contrast measurement.
- The zoom (enlarge) view of a clue and the give-up dialog use the native `<dialog>` element; their keyboard behaviour is untested beyond Esc.
- Fonts rely on the system stack; Hebrew rendering differs slightly between devices.
- Fixture SVGs are simple hand-drawn shapes; they test mechanics, not the look of real crests.
- Club aliases are unverified starter data.
- The event log (`badge-dna:v1:events`) exists for development; export button appears only in dev builds.
- Test-runner flake: on a cold start (e.g. right after a build) the two jsdom-based test files (`storage`, `daily`) have occasionally failed to start their worker within vitest's 60 s limit on the dev machine, reporting "Failed to start forks worker". Re-running passes (104/104 on three consecutive reruns). Not a code failure; if it recurs in CI, switch those files to a lighter DOM or serialise them.
