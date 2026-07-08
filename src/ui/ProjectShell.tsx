const layers = [
  'React UI stays in src/ui and only renders state plus input wiring.',
  'Rules and engine modules will own turn flow, legality checks, and resolution.',
  'Cards, decks, and AI each have separate TypeScript contracts for easy testing.',
]

const currentScope = [
  'Offline-only single player simulator foundation',
  'Frontend scaffold with no backend or database',
  'Placeholder architecture for future human vs AI matches',
]

const guardrails = [
  'No rules logic inside React components',
  'No official logos, card images, or full card database',
  'No card effects, deck parsing, or AI behavior yet',
]

const structure = [
  'src/cards, src/deck, src/engine, and src/ai hold the core domain contracts.',
  'src/rules and src/storage are reserved for future rule resolution and persistence.',
  'tests contains Vitest coverage and docs stores supporting notes beyond root specs.',
]

export function ProjectShell() {
  return (
    <main className="app-shell">
      <div className="app-shell__content">
        <section className="hero-panel">
          <p className="hero-panel__eyebrow">Project Skeleton Ready For Expansion</p>
          <h1>OPTCG Single Player Practice Simulator</h1>
          <p className="hero-panel__copy">
            This placeholder frontend marks out the architecture for an offline
            human-versus-AI practice tool while keeping gameplay rules, deck handling,
            and future AI logic outside the React layer.
          </p>
          <div className="hero-panel__chips" aria-label="Current project goals">
            <span>Core rules first</span>
            <span>Card effects later</span>
            <span>Medium difficulty AI first</span>
            <span>Modular TypeScript architecture</span>
          </div>
        </section>

        <div className="info-grid">
          <section className="info-panel">
            <h2>Current Scope</h2>
            <ul>
              {currentScope.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="info-panel">
            <h2>Guardrails</h2>
            <ul>
              {guardrails.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="info-panel">
            <h2>Architecture Layers</h2>
            <ul>
              {layers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="structure-panel">
          <h2>Folder Intent</h2>
          <div className="structure-grid">
            {structure.map((item) => (
              <div key={item}>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="next-step-panel">
          <h2>Suggested Next Implementation Step</h2>
          <p>
            Build a minimal engine loop next: create setup helpers, phase progression,
            and a small action dispatcher that can validate placeholder turn actions
            before any real card effects or deck import features are introduced.
          </p>
        </section>
      </div>
    </main>
  )
}
