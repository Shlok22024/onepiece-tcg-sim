# UI Spec

## Purpose

Capture the initial presentation boundaries for a practice-first interface while ensuring all gameplay rules remain outside React components.

## Current Scope

- Provide a minimal internal debug gameplay UI for manually driving the engine during development.
- Treat UI as a consumer of engine selectors, legal actions, AI decisions, and storage adapters.
- Keep components focused on rendering, interaction wiring, and view-only formatting.
- Keep gameplay interaction discovery outside components by relying on `getLegalActions` instead of duplicating engine rules in React.
- Call `applyAction` for all gameplay mutations while surfacing engine log output and rejected-action messages.
- Expose debug-only Medium AI controls so Player 2 can be stepped or run through a turn without bypassing the engine contract.
- Surface the latest AI reasoning text for debugging and heuristic verification.
- Use placeholder text-only card rendering with no copyrighted images or official logos.

## Explicitly Out Of Scope

- Final polished board layout design.
- Drag-and-drop interactions.
- Animation systems.
- Accessibility polish for full gameplay flows.
- Production-ready onboarding or tutorials.
- Automated production AI autoplay flows.

## Future Expansion Notes

- Keep the debug UI as a thin validation harness while introducing screen-level containers for match setup, active game view, and saved practice sessions later.
- Build UI screens on top of engine selectors or view models so components consume stable UI-friendly data shapes.
- Build keyboard-friendly interaction patterns alongside mouse-first affordances.
- Add UI testing once user flows become more concrete.
- Add optional auto-run AI hooks only after the debug surface proves stable for repeated legal turn execution.

## Open Questions

- When the final playable UI replaces the debug surface, should it begin as a guided practice screen or a traditional table layout?
- How much of the first playable UI should read directly from selectors versus dedicated UI view models?
- How much game log and AI explanation detail should be visible by default?
- When save states arrive, should the UI prioritize quick resume, replay browsing, or deck selection first?
