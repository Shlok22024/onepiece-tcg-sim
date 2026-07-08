# UI Spec

## Purpose

Capture the initial presentation boundaries for a practice-first interface while ensuring all gameplay rules remain outside React components.

## Current Scope

- Provide a simple React shell that reflects project status and future module boundaries.
- Treat UI as a consumer of engine state, AI decisions, and storage adapters.
- Keep components focused on rendering, interaction wiring, and view-only formatting.

## Explicitly Out Of Scope

- Final board layout design.
- Drag-and-drop interactions.
- Animation systems.
- Accessibility polish for full gameplay flows.

## Future Expansion Notes

- Introduce screen-level containers for match setup, active game view, and saved practice sessions.
- Add selectors or view models so components consume stable UI-friendly data shapes.
- Build keyboard-friendly interaction patterns alongside mouse-first affordances.
- Add UI testing once user flows become more concrete.

## Open Questions

- Should the first playable UI target be a debug board, a guided practice screen, or a traditional table layout?
- How much game log and AI explanation detail should be visible by default?
- When save states arrive, should the UI prioritize quick resume, replay browsing, or deck selection first?
