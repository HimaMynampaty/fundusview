export default function ResultsPanel({ mode, results, analyzing, showHeatmap }) {
  const isEmpty = !results && !showHeatmap
  return (
    <div style={{ padding:'10px 12px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
      <p style={{ fontSize:9, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--color-text-secondary)', margin:'0 0 8px', fontFamily:'var(--font-mono)' }}>
        Analysis Results
      </p>
      {isEmpty && !analyzing && (
        <div style={{ padding:'16px 0', textAlign:'center', color:'var(--color-text-secondary)', fontSize:11 }}>
          <i className="ti ti-scan" style={{ fontSize:20, display:'block', marginBottom:5, opacity:.3 }} aria-hidden="true" />
          Run analysis to see metrics
        </div>
      )}
      {showHeatmap && !results && (
        <div style={{ padding:'9px 11px', borderRadius:7, background:'var(--color-bg-secondary)', border:'0.5px solid var(--color-border-tertiary)', fontSize:10, color:'var(--color-text-secondary)', lineHeight:1.55 }}>
          <i className="ti ti-info-circle" style={{ marginRight:5 }} aria-hidden="true" />
          Heatmap active — scripted zones, no pixel analysis
        </div>
      )}
      {analyzing && (
        <div style={{ padding:'16px 0', textAlign:'center', color:'var(--color-text-secondary)', fontSize:11 }}>
          <i className="ti ti-loader-2 spin" style={{ fontSize:18, display:'block', marginBottom:5 }} aria-hidden="true" />
          Analyzing…
        </div>
      )}
      {results && !analyzing && (
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
            {mode.resultFields.filter(f => !f.full && !f.span).map(f => {
              const val = results[f.key]
              if (val === undefined || val === null) return null
              return (
                <div key={f.key} style={{ background:'var(--color-bg-secondary)', borderRadius:7, padding:'7px 9px' }}>
                  <p style={{ fontSize:8, fontWeight:500, color:'var(--color-text-secondary)', letterSpacing:'0.08em', textTransform:'uppercase', margin:0, fontFamily:'var(--font-mono)' }}>{f.label}</p>
                  <p style={{ fontSize:20, fontWeight:500, color:'var(--color-text-primary)', margin:'1px 0 0', fontFamily:'var(--font-mono)', lineHeight:1 }}>{val}</p>
                </div>
              )
            })}
          </div>
          {mode.resultFields.filter(f => f.span).map(f => {
            const val = results[f.key]
            if (val === undefined || val === null) return null
            return (
              <div key={f.key} style={{ background:'var(--color-bg-secondary)', borderRadius:7, padding:'7px 10px' }}>
                <p style={{ fontSize:8, fontWeight:500, color:'var(--color-text-secondary)', letterSpacing:'0.08em', textTransform:'uppercase', margin:0, fontFamily:'var(--font-mono)' }}>{f.label}</p>
                <p style={{ fontSize:16, fontWeight:500, color:'var(--color-text-primary)', margin:'2px 0 0', fontFamily:'var(--font-mono)' }}>{val}</p>
              </div>
            )
          })}
          {mode.resultFields.filter(f => f.full).map(f => {
            const val = results[f.key]
            if (val === undefined || val === null) return null
            return (
              <div key={f.key} style={{ background:'var(--color-bg-secondary)', borderRadius:7, padding:'7px 10px', borderLeft:`2.5px solid ${f.colorKey ? results[f.colorKey] : mode.accent}` }}>
                <p style={{ fontSize:8, fontWeight:500, color:'var(--color-text-secondary)', letterSpacing:'0.08em', textTransform:'uppercase', margin:0, fontFamily:'var(--font-mono)' }}>{f.label}</p>
                <p style={{ fontSize:13, fontWeight:500, margin:'2px 0 0', color: f.colorKey ? results[f.colorKey] : 'var(--color-text-primary)', fontFamily:'var(--font-mono)' }}>{val}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
