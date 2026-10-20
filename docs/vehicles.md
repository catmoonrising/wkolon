# Vehicle catalog and owned vehicles

The first vehicle data format separates selectable chassis from calculations.
`vehicles` records contain a stable ID, name, pinned primary `sourceId`,
`referenceId`, Manual automation marker, and their source-table `listings`.
Each listing retains its type, printed size and Challenge Level, parent source,
section heading and original link. A page can appear in more than one category.
Table Challenge Levels describe published statistics, not a player crew.

Full articles remain in the existing hashed reference library. A vehicle record
does not duplicate its article in the initial rules pack. Catalog references may
use `referenceId` in place of `ruleId` only for these vehicle records, with an
exact source/record match. Reference validation checks the pinned article and
all listing sources against the official index and Homebrew exclusions.

The importer reads the nine pinned vehicle lists, checks their table headers,
and preserves source membership and provenance. Crew-quality, named-crew and
condition-adjusted statistics remain readable in the complete primary article.
The first catalog does not merge those statistics into player calculations.

Characters optionally store `vehicles`, an array of owned instances with unique
`uid`, `vehicleId` and a bounded plain-text `name`. Multiple instances of one
model are legal. Adding an owned vehicle does not spend credits or claim that it
is available for purchase. The interface loads and validates its full article
before adding it, so selected vehicles remain readable from the offline cache.

Vehicles have a separate module and a manager accessible during equipment
selection. Search uses names, source metadata and full reference text, with
filtering, sorting and pagination. Module visibility never removes ownership.
Vehicle HP, SR, DR, crew roles, purchases, modifications and actions require
later reviewed formats and remain Manual. In particular, a printed NPC crew's
attack bonus is never copied into a player attack calculation.

## Stock construction templates

Twelve stock templates share the pinned Stock Starships article. Their explicit
`stockTemplate` field is the printed table row name, their displayed name is
`Stock ` plus that name, and their listing type is `stock`. Their size comes
from that row; Challenge Level is null because the template supplies none.
Only this explicit format may differ from its reference page's title. Reference
validation checks both the complete pinned article and the template's exact row.
Owned instances use the same independent identities and names as other vehicles.
Construction, prices, licenses and combat effects remain Manual.
