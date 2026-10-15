# Legal notice and rights: what the game says, and what it does not settle

I am an AI assistant, not a lawyer; this is a working note for the owner, not legal advice.

## What the game shows now
- A short line in the footer of every screen (Hebrew/English) and a full **Legal notice** page (`#/legal`):
  - independent fan game, not affiliated with, endorsed or sponsored by any club, league or competition;
  - club names, crests and logos are the trademarks / protected works of their owners and are shown for identification only;
  - crests and parts are shown as they are, colours unchanged, with no claim of partnership;
  - no personal data is collected, nothing is sent to a server, progress stays in the browser (true today: local-only app, no analytics);
  - rights holders may ask for removal; a contact address is shown only once `LEGAL.contactEmail` in `src/legal.ts` is filled in (empty on purpose).
- Texts live in `src/i18n/he.ts` and `en.ts` (`legal.*`). Change the wording there.

## What the notice does NOT do
- It does **not** give a licence. A disclaimer ("not affiliated", "trademarks belong to their owners") reduces confusion about endorsement; it does not by itself make using a crest lawful.
- It does not change any content status. Every real crest stays `rightsStatus: review_required` until you record a real basis in `rightsEvidence` (written permission, a licence, an official press/asset kit, or a documented legal assessment) and set `approved_for_project` yourself. The validator blocks publishing otherwise.
- "Fan project", "identification only" and similar arguments are not guaranteed defences, and they vary by country. Risk grows with commercial use (ads, payments, prizes, sponsorship, a paid 1-vs-1 mode) and with using full crests or recognisable pieces at scale.
- The package source named in the manifests (footylogos.com) is a third-party site; its own terms say nothing here about your right to use the files, and I have not checked them.

## Before any public launch with real crests (suggested)
1. Decide the basis per club or per league: permission/licence, official media assets, or a written assessment by a lawyer in the countries you target (Israel, UK/EU at least).
2. Record it in the crest's `rightsEvidence` (and `attributionText` if one is required).
3. Fill in `LEGAL.contactEmail` and make sure someone answers removal requests quickly; keep a way to retire a puzzle (`status: retired`) and remove its assets.
4. Re-read the notice text with your lawyer; add a terms/privacy page if you add accounts, analytics, ads or an online 1-vs-1 mode (that changes the "no personal data" sentence).
5. Keep real crest files out of the public repository until 1–2 are done (the project already git-ignores them).
