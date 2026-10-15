# Review of the owner's PNG-v2 package (2026-10-15)

Package: `Badge-DNA-PNG-v2` — 20 Premier League 2026/27 clubs, 20 full logos, 121 objects, all 1024×1024 transparent PNG, no SVG. Imported with `node scripts/import-package.ts <folder>` as **candidate content** (real crests, status `draft`).

## What was checked
- Package integrity: every file listed in the manifests exists, no extra files, every SHA-256 matches, per-club manifests equal their entry in the main manifest, no duplicate files, all 1024×1024 RGBA, none fully transparent. **No problems.**
- Visual review of all 141 images on contact sheets (logo + each object on a neutral tile). Quality is high, clean edges, original colours.
- Shape analysis (scattered tiny parts, tone, edge contact).

## How the package is used
- Elements are trimmed to their visible bounds (transparent margin removed, pixels untouched) and renamed with neutral ids (`e_<sha8>.png`, `c_<sha8>.png`): no club names in asset paths.
- Stored under `content/candidates/` (JSON tracked, **PNG files git-ignored**, because usage rights are undocumented). Provenance (package file, SHA-256, Hebrew label, source URL, flags) is in `content/sources/png-v2.json`.
- Every crest: `rightsStatus: review_required`; every element: `fidelityReviewed = visualReviewed = false`; every puzzle: `draft`, no reviewer, difficulty uncalibrated.
- The 7 pieces the package flags as incomplete (`eligibleForAutomaticSelection = false`: Arsenal cannon, Newcastle lion crest, Sunderland striped shield and upper monument, Coventry castle, elephant, football) are imported but blocked: the validator rejects any puzzle that uses one.
- **37 draft puzzles** (1–2 variants per club, 3–5 reveals) were written by the assistant from the piece names. They are proposals for you to edit; nothing was tested with players.
- The dev build shows them in a new "candidate" mode (banner + "unapproved draft" badge). Production builds contain neither the code nor the files. `?content=fixture` forces the invented test puzzles.
- Tile backdrop adapts to the artwork: light pieces on a dark tile, dark pieces on a light tile, others on a mid tile (`tileTone`, computed from luminance; can be overridden per element).

## Things that need the owner's decision
1. **Rights.** The manifests point to `assets.footylogos.com` SVGs. Nothing in the package states a usage basis. Not downloaded or checked by the assistant.
2. **Rules in `EXTRACTION-RULES.md` that differ from the original spec** (treated as the owner's later decision, recorded here):
   - Completing the colour under removed text/animals is allowed (spec §4.2 said not to complete hidden parts by guesswork).
   - A single original letter may be a clue (spec §4.4 said not to cut words into letters). 18 of 20 clubs have one; Manchester United's N is rotated as in the original arched text.
   - Splitting figures (bee, tiger, Liverpool bird, Spurs cockerel and ball) is allowed for the listed clubs.
3. **Thin or scattered pieces** are legible only at full size, not on a ~140 px card. Left out of the drafts but kept in the library: Man City year, Brentford year, Chelsea roses and footballs, Man United footballs / ornament group / curled scrolls, Everton laurels, Crystal Palace year. After exclusions Manchester United has only 3 clean pieces (ship, N, devil), so one 3-reveal draft.
4. **Liverpool torso and Tottenham body** touch the top edge of their canvas (possible clipping). Looks intentional (shapes cut at the split) but worth a glance in the source.
5. **Very thin outlines** (rings, outlines, white bands) say little on their own; they are used mid-sequence in the drafts, not as the opener.
6. Reveal orders and difficulty: the package deliberately has none. The drafts above are only a starting point.
