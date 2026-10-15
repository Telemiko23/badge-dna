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

## Owner decisions (2026-10-15, in chat)
1. **Rights basis:** the game is a fan quiz that uses crests only to identify clubs inside puzzles, with a disclaimer worded in the same spirit as the footer of futbolle.com (independent fan project, no affiliation, names and badges used solely to identify within the puzzles). No licence or permission has been obtained; the owner accepts the risk. This is a recorded decision, not a licence. Each crest's `rightsStatus` is set when its puzzle is promoted, with this text as `rightsEvidence`.
2. **Rules that differ from the original spec:** completing the colour under removed text, and splitting figures, are accepted. **Single letters are accepted only if the letter is not the first letter of the club's name** (validator rule `letter-is-initial`). The package supplies initials for **Brighton (B), Everton (E) and Ipswich (I)**: those three letter pieces are kept out of every puzzle until the owner provides different letters. Hull's C is the initial of "City", not of "Hull", and was kept.
3. **Pieces cut at the canvas edge** (Liverpool torso, Tottenham body) are intentional, to make the clues harder. Nothing to fix.
4. **Tiny, scattered pieces:** still open; see below.

## Approval and publication (2026-10-15)
The owner approved **all 38 draft puzzles at once, in writing in chat** ("I approve everything; we can fix things later"), without going through them one by one in the review screen. That is recorded as 38 "approved" decisions by "Liran Telem" with a note on each saying how it was given, and `npm run promote` then published them. They were never play-tested and the reveal orders are the assistant's drafts, so expect to adjust: some open on a thin outline, which says little. To change a puzzle, edit it in the drafts, then publish a **new revision** (a published revision never changes).

## Tiny pieces: decided (2026-10-15)
Some pieces are made of small parts far apart, so on a phone card they shrink to specks (picture sent in chat). Left out of the drafts: Manchester City year, Brentford year, Chelsea roses, Chelsea footballs, Manchester United ornament group, Manchester United curled scrolls. Judged readable and kept: Manchester United footballs, Everton laurels, Crystal Palace 1905.
Owner decision: re-pack them. `scripts/repack.ts` finds the separate parts of each of the six pieces and places them next to each other (a row or a column, whichever fits a phone card better), keeping their reading order. It only MOVES original pixels (nothing is redrawn, recoloured, rotated or resized; a unit test checks the pixel values are identical). This knowingly departs from the package rule that spacing inside a unit stays as in the original; each re-packed piece is flagged in its `sourceMapping.repacked`. The six are back in the drafts (Manchester City year, Brentford year, Chelsea roses and footballs, Manchester United ornaments and scrolls).
