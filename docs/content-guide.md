# Adding a puzzle

All content is JSON under `content/` (one or more `*.json` files per folder, each an array). Contract: `src/content/schemas.ts`.

1. **Club** — make sure the club exists in `content/clubs/*.json` (stable `id`, `displayName.he/en`, verified `aliases`, `countryCode`, `city` only if needed to tell identical names apart).
2. **Crest version** — add to `content/crests/*.json`: one defined version of the crest. Record `sourceUrl`, `retrievedAt`, `sourceSha256`, `rightsStatus` (`unknown` / `review_required` / `approved_for_project`), `rightsEvidence`, `fidelityReviewed`. Never mix historical, alternative and official versions in one puzzle.
3. **Assets** — put the full crest and each isolated element in `public/assets/` with **neutral ids** (e.g. `c_7f3a.svg`, `e_91b2.svg`), never club-related names. Allowed: remove background, crop transparent margins, uniform scaling. Not allowed: redrawing, completing hidden parts by guesswork, recolouring, rotating, mirroring. External SVG must be sanitised (no scripts, no external references); elements are rendered through `<img>`, never inlined.
4. **Elements** — add to `content/elements/*.json`: `crestVersionId`, `semanticType`, `internalLabel` (internal only), `assetPath` (e.g. `assets/e_91b2.svg`), pixel size, `parentElementId` for a natural sub-element (wheel of a cannon), `containsText`, `extractionMethod`. `fidelityReviewed` / `visualReviewed` are set by a human only.
5. **Puzzle** — add to `content/puzzles/*.json` with `status: "draft"`: `revealOrder` of 3–5 elements from that crest version, `editorialNotes` explaining the order. A sub-element followed by its parent must add meaningful information. Do not reuse an element without new information.
6. **Validate**: `npm run validate:content`. Fix every error.
7. **Review and publish** (human): fidelity vs. source, mobile-size check, rights evidence; then set `reviewedBy`, `reviewedAt`, and `status: "published"`. Published puzzles are immutable — to change one, add a new `revision`.
8. **Daily schedule** (milestone 4): explicit dated entries in `content/daily/*.json`, never computed from array positions.

Fixtures live in `content/fixtures/` (assets in `content/fixtures/assets/`, referenced as `fixtures/<file>.svg`) and use invented clubs only.
