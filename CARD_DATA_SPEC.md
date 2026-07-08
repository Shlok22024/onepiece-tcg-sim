# Card Data Spec

## Purpose

Describe how card data should be represented in a way that is easy to validate, test, and extend without relying on an external API.

## Current Scope

- Define shared card identity and classification fields such as type, color, rarity, and placeholder text.
- Support placeholder or hand-authored sample card records only.
- Keep the model neutral enough for future imports from local JSON or curated card lists.

## Explicitly Out Of Scope

- Full official card catalog.
- Copyrighted scans, logos, or official promotional assets.
- Effect parser design.
- Integration with third-party card APIs.

## Future Expansion Notes

- Add structured effect metadata once rules and action resolution are ready.
- Separate raw card definitions from instantiated in-game card copies.
- Introduce schema validation for local card JSON files.
- Track set, trait, attribute, and legality metadata when deck building is implemented.

## Open Questions

- Should card definitions be JSON-first, TypeScript-first, or generated from a schema?
- How should multilingual names or alternate printings be handled later?
- Which fields need to be mandatory for placeholder testing before the full rules engine exists?
