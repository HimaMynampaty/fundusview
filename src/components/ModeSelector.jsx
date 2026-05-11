/**
 * ModeSelector
 * Renders a tab strip for switching between modes.
 * Completely mode-agnostic – reads names and accents from the MODES array.
 */
export default function ModeSelector({ modes, activeId, onSelect }) {
  return (
    <div style={{
      display: 'flex', gap: 3,
      background: 'var(--color-bg-secondary)',
      padding: 3, borderRadius: 7,
      border: '0.5px solid var(--color-border-tertiary)',
    }}>
      {modes.map(m => {
        const active = m.id === activeId
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              padding: '4px 12px', borderRadius: 5,
              fontSize: 11, fontWeight: 500, cursor: 'pointer',
              background: active ? 'var(--color-bg)' : 'transparent',
              color: active ? m.accent : 'var(--color-text-secondary)',
              border: active ? '0.5px solid var(--color-border-secondary)' : '0.5px solid transparent',
              fontFamily: 'var(--font-sans)', transition: 'all 0.12s',
            }}
          >
            {m.name}
          </button>
        )
      })}

      {/* Placeholder for adding new modes */}
      <button
        title="Add mode — create a new file in src/modes/ and register it in modes/index.js"
        style={{
          padding: '4px 9px', borderRadius: 5, fontSize: 13,
          cursor: 'pointer', background: 'transparent',
          color: 'var(--color-text-secondary)',
          border: '0.5px solid transparent',
        }}
      >
        <i className="ti ti-plus" aria-hidden="true" />
      </button>
    </div>
  )
}
