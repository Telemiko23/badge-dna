# Known gaps and limitations

## Not done yet (planned)
- **Milestone 3** — real puzzles (blocked on source/rights/review, see `content-status.md`) and the internal review screen (full crest, elements, sequence; dev-only).
- **Milestone 4** — daily challenge: frozen dated schedule, UTC date, resume, day rollover mid-round, summary + spoiler-free share text, single-writer tab lock. The home screen currently shows "the daily challenge isn't available yet".
- **Milestone 5** — Playwright end-to-end suite, visual QA at 360/390/768/1440 (+ 200% zoom), security pass on assets, final docs.

## Limitations of the current build
- Local-only: answers and assets are visible to anyone who inspects the code; no anti-cheat, no leaderboard (spec §16.1).
- Visual QA so far: one manual pass at 375×812 mobile in the dev build (home, round, reveal, wrong guess, solve, reload-restore, Hebrew↔English). Not yet checked: 5-clue layout at 360, 768, 1440, 200% zoom, mobile keyboard overlap, screen reader pass, contrast measurement.
- The zoom (enlarge) view of a clue and the give-up dialog use the native `<dialog>` element; their keyboard behaviour is untested beyond Esc.
- Fonts rely on the system stack; Hebrew rendering differs slightly between devices.
- Fixture SVGs are simple hand-drawn shapes; they test mechanics, not the look of real crests.
- Club aliases are unverified starter data.
- The event log (`badge-dna:v1:events`) exists for development; export button appears only in dev builds.
