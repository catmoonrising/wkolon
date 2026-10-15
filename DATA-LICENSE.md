# Data attribution

`data/core.json` is a reviewed adaptation of numeric rules and mechanical facts
from the Star Wars Saga Edition wiki, with short original reminders. The wiki's
MediaWiki siteinfo endpoint advertises **Creative Commons Attribution-ShareAlike
4.0 International (CC BY-SA 4.0)** for wiki contributions:
https://creativecommons.org/licenses/by-sa/4.0/.

Attribution: Star Wars Saga Edition wiki contributors,
https://swse.miraheze.org/wiki/Main_Page.
Each source record includes a permanent revision link, timestamp and a history
link to its contributors. Each adapted game record identifies its source.
Changes consist of normalization into JSON, stable IDs, explicit prerequisite
and effect fields, numeric tables, and concise original reminders.

Adapted wiki content is distributed under CC BY-SA 4.0. The wiki license
statement does not by itself establish ownership of underlying publisher text.
This repository does not distribute rulebook files or publisher artwork.
Star Wars and Saga Edition belong to their respective owners. This project is
an unofficial fan tool and is not endorsed by Lucasfilm or Wizards of the Coast.

The user-supplied favicon is separate from the rules data and application license.

The optional sourcebook library in `data/reference-index.json` and
`data/reference/` retains wiki contributions verbatim in a closed document tree,
with source revisions, wikitext checksums and contributor-history links. Images,
executable markup, comments and site navigation are omitted. This imported wiki
presentation is also distributed under CC BY-SA 4.0; it is kept separate from
reviewed, executable mechanical mappings.

The site replaces em dashes and middle dots in displayed text with plain hyphens
and commas. Pinned source files, wording and mechanical values are unchanged.
