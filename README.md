# Wkolon

A browser character sheet and builder for **Star Wars Saga Edition**.
The primary deployment is https://catmoonrising.github.io/wkolon/.

Create a character, assign abilities, choose species and a starting class, train
skills, select feats and talents, buy and equip gear, and advance through levels.
The sheet calculates ability modifiers, defenses, damage threshold, HP, skills,
BAB and weapon attacks. DR/SR layers apply damage through shields and reduction;
XP, Force Points and Dark Side Score have editable bars. Offensive Routines roll
configured attack sequences and show damage by Reflex Defense. Every defense,
skill and attack shows its calculation.
Build validation identifies missing choices and rejects choices whose
prerequisites were not met at the level when they were taken.

Characters autosave in the browser. Multiple character tabs, duplication, JSON
import/export, pmcrwf's full theme catalog and a Saga stat block with text, Copy and Print are included.
House Rules includes all Saga Jedi Counseling topics with saved optional switches.
Equipment purchasing groups variants and functionality options, adds license
application fees, and supports owned-only items without a market price.
Module layouts support moving, resizing, snapping, collapsing and stacking.
Roll buttons and dice commands feed a persistent character event log and its
corner mirror. Numeric fields accept relative adjustments and arithmetic. Export a
character to move it between browsers or retain a backup. GitHub Pages requires
no application server, account, runtime scraping or external database.

The reviewed builder includes 23 species, the five heroic classes, 25 skills,
20 feats, 21 talents and 17 equipment records. The searchable Rules library has
485 entries, including reference-only options awaiting mechanical review. It is a
partial implementation of the sourcebooks. Prestige classes, droid creation,
Force power selection, vehicles and additional catalogs are future work.
Conditional feats/talents appear as reminders; numeric sheet and attack
modifiers handle table rulings and circumstances.

## Rules data

The [rules-data contract](docs/rules-data.md) was defined before calculations.
The reviewed [core pack](data/core.json) contains stable IDs, explicit mechanics,
structured prerequisites and source revision/history links. Character exports
pin the pack version and store an ordered level ledger instead of derived totals.

Use the wiki's MediaWiki API, not browser HTML scraping:

```sh
python3 tools/wiki-extract.py --titles 'Abilities' 'Heroic Classes' 'Level Benefits'
python3 tools/wiki-extract.py --category Species --output .build/species-snapshot.json
python3 tools/wiki-extract.py --xml export.xml --output .build/export-snapshot.json
```

The importer handles category pagination/subcategories, batched revision capture,
redirect aliases (including talent-tree sections), retries and resume. Use
`--refresh` to refetch requested records. A captured snapshot is **review input**,
not an automatically executable pack. Compilation checks the reviewed revision manifest and refuses changed revisions.
New mechanical mappings need explicit
review of prerequisites, stacking, conditions, timing and errata.

Import the Core Rulebook library and build the browser pack:

```sh
python3 tools/import-wiki.py
python3 tools/compile-core.py
npm run validate
```

The compiler also works offline from the committed `data/wiki-catalog.json` and
`data/mechanics.json`. Use `python3 tools/import-wiki.py --offline` to repeat an
import from previously captured raw snapshots and pinned parse files. Importing
text does not enable unreviewed mechanics. Rules contains the searchable embedded
library; [docs/import-review.md](docs/import-review.md) records source conflicts
and pending mechanical mappings.

Raw snapshots are gitignored. Reviewed structured data is committed so the Pages
site works immediately. Wiki adaptations retain CC BY-SA 4.0 attribution;
application source is MIT licensed. See [DATA-LICENSE.md](DATA-LICENSE.md).

## Sister site to pmcrwf

Wkolon uses [pmcrwf](https://catmoonrising.github.io/pmcrwf/)'s actual base stylesheet,
complete theme catalog, layout stylesheet and editor, theme controller, roll
mirror, arithmetic field handling, dice evaluator and hosted offline workflow.
The toolbar, character tabs, module tables, HP bar and creator/advancement dialogs
follow the same UI conventions. [Reuse details](docs/ui-reuse.md) record the
source version and adaptations.

Both Pages sites share an origin. The theme preference (`charsheet-theme`) is
shared deliberately; Wkolon's roster, event logs, layouts, roll mirror preferences
and offline cache are separate. Existing Wkolon characters and JSON exports are
compatible with the new interface. The Saga rules engine remains independent of
pmcrwf's D&D rules.

After a successful online load, the Pages website works offline, including its
bundled reviewed rules, themes and layout controls. New builds wait for Reload
before replacing the cached app. Local preview servers bypass automatic offline
registration so edits are visible immediately.

## Development and Pages

```sh
npm ci
npm run validate
npm test
npx playwright install chromium
npm run test:browser
```

Browser checks serve the site under `/wkolon/` to test Pages-relative paths.
Desktop/mobile previews are written to `.build/` and uploaded by CI.
To preview locally, `python3 -m http.server 8931` is sufficient.

In GitHub **Settings → Pages**, choose **GitHub Actions**. The Pages workflow
stages only website files, validates the pack and calculations, and deploys on
pushes to `main` or a manual run. CI separately tests browser flows. Publishing a
new rules pack is a reviewed code change; deployment never fetches wiki rules.

The tab icon is the user-supplied cat photograph, stretched horizontally to square.

Planned work is tracked in [TODO.md](TODO.md).
