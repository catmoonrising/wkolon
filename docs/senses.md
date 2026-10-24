# Senses view

This is a read-only view contract, preceding implementation. The module reads
existing derived `vision` and `blind` fields; it grants no senses and changes no
checks, attacks, equipment, species or character data. It summarizes the vision
modes already calculated by the sheet. Other sense traits remain in their full
species, equipment and feature rules.

Display Normal Vision, Low-Light Vision or Darkvision; Blinded takes precedence.
Ordinary vision is hidden by default. A special mode or blindness makes the
module relevant. Explicit visibility overrides still work. Reuse the module
registry, layout migration and offline shell; retain existing positions and
preferences without inventing new character fields.
