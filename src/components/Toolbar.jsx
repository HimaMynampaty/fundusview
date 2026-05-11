/**
 * Toolbar
 * Renders analysis action buttons, pan/measure tool selector,
 * and zoom controls. All labels and actions come from the mode config.
 */
export default function Toolbar({
  mode,
  hasImage,
  analyzing,
  activeAction,
  tool,
  onToolChange,
  onAction,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  hoverCoords,
}) {
  const sep = (
    <div style={{ width: '0.5px', height: 15, background: 'var(--color-border-secondary)', flexShrink: 0 }} />
  )

  return (
    <div style={{
      padding: '7px 14px',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      display: 'flex', alignItems: 'center', gap: 7,
      background: 'var(--color-bg-secondary)',
      flexShrink: 0, flexWrap: 'wrap',
    }}>
      {/* Mode badge */}
      <span style={{
        fontSize: 9, fontWeight: 500, letterSpacing: '0.09em',
        textTransform: 'uppercase', padding: '3px 7px', borderRadius: 4,
        border: `0.5px solid ${mode.accent}`,
        color: mode.accent, background: `${mode.accent}14`,
        fontFamily: 'var(--font-mono)',
      }}>
        {mode.id}
      </span>

      {sep}

      {/* Analysis action buttons */}
      {mode.actions.map(a => {
        const isCurrentlyActive = activeAction === a.id && !analyzing
        let bg    = a.primary ? mode.accent : 'transparent'
        let color = a.primary ? '#fff' : a.ghost ? 'var(--color-text-secondary)' : 'var(--color-text-primary)'
        let border = a.primary ? 'none'
          : isCurrentlyActive ? `0.5px solid ${mode.accent}`
          : a.ghost ? '0.5px solid transparent'
          : '0.5px solid var(--color-border-secondary)'
        if (isCurrentlyActive && !a.primary) color = mode.accent

        return (
          <button
            key={a.id}
            disabled={!hasImage || analyzing}
            onClick={() => onAction(a.id)}
            style={{
              padding: '5px 11px', borderRadius: 5,
              fontSize: 11, fontWeight: 500,
              cursor: !hasImage || analyzing ? 'not-allowed' : 'pointer',
              background: bg, color, border,
              opacity: !hasImage || analyzing ? 0.4 : 1,
              fontFamily: 'var(--font-sans)', transition: 'all 0.12s',
            }}
          >
            {a.label}
          </button>
        )
      })}

      {sep}

      {/* Tool selector */}
      {[
        { id: 'select',  icon: 'hand-grab', tip: 'Pan / zoom (drag + scroll)' },
        { id: 'measure', icon: 'ruler-2',   tip: 'Measure distance (click 2 points)' },
      ].map(t => (
        <button
          key={t.id}
          title={t.tip}
          onClick={() => onToolChange(t.id)}
          style={{
            padding: '5px 7px', borderRadius: 5, fontSize: 13, cursor: 'pointer',
            background: tool === t.id ? 'var(--color-bg)' : 'transparent',
            color: tool === t.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            border: tool === t.id ? '0.5px solid var(--color-border-primary)' : '0.5px solid transparent',
            transition: 'all 0.12s',
          }}
        >
          <i className={`ti ti-${t.icon}`} aria-hidden="true" />
        </button>
      ))}

      {sep}

      {/* Zoom controls */}
      {[
        { icon: 'zoom-out',       fn: onZoomOut, tip: 'Zoom out' },
        { icon: 'focus-centered', fn: onZoomFit, tip: 'Fit to canvas' },
        { icon: 'zoom-in',        fn: onZoomIn,  tip: 'Zoom in' },
      ].map(({ icon, fn, tip }) => (
        <button
          key={icon}
          title={tip}
          onClick={fn}
          disabled={!hasImage}
          style={{
            padding: '5px 7px', borderRadius: 5, fontSize: 13,
            cursor: hasImage ? 'pointer' : 'not-allowed',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            border: '0.5px solid transparent',
            opacity: hasImage ? 1 : 0.35,
          }}
        >
          <i className={`ti ti-${icon}`} aria-hidden="true" />
        </button>
      ))}

      {/* Live coordinates (far right) */}
      {hasImage && hoverCoords && (
        <span style={{
          marginLeft: 'auto', fontSize: 10,
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {hoverCoords.ix}, {hoverCoords.iy}
        </span>
      )}
    </div>
  )
}
