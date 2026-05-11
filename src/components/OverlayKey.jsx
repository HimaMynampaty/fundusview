import { useEffect, useRef } from 'react'

/**
 * OverlayKey
 * Reads legend items from mode.legendItems — no global MARKER_STYLES constant.
 * Each mode defines its own visual language (shapes, colors, labels).
 */

function ShapePreview({ item, size = 16 }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    cv.width = size; cv.height = size
    const ctx = cv.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    const cx = size/2, cy = size/2, r = size * 0.36
    ctx.strokeStyle = item.color; ctx.lineWidth = 1.5
    ctx.fillStyle = item.color + '30'
    ctx.beginPath()
    if (item.shape === 'circle') {
      ctx.arc(cx, cy, r, 0, Math.PI*2)
    } else if (item.shape === 'diamond') {
      ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r,cy); ctx.lineTo(cx,cy+r); ctx.lineTo(cx-r,cy); ctx.closePath()
    } else if (item.shape === 'triangle') {
      ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r*.87,cy+r*.5); ctx.lineTo(cx-r*.87,cy+r*.5); ctx.closePath()
    } else if (item.shape === 'ring') {
      ctx.arc(cx, cy, r, 0, Math.PI*2)
    }
    ctx.stroke(); ctx.fill()
  }, [item, size])
  return <canvas ref={ref} width={size} height={size} style={{ display: 'block' }} />
}

export default function OverlayKey({ mode, markers, visible, onVisibilityChange }) {
  const legendItems = mode.legendItems || []
  const visibleCount = markers.filter(m => visible[m.type] !== false).length

  return (
    <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <p style={{ fontSize:9, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--color-text-secondary)', margin:0, fontFamily:'var(--font-mono)' }}>
          Overlay Key
        </p>
        {markers.length > 0 && (
          <span style={{ fontSize:9, color:'var(--color-text-secondary)', fontFamily:'var(--font-mono)' }}>
            showing <strong style={{ color:'var(--color-text-primary)' }}>{visibleCount}</strong>/{markers.length}
          </span>
        )}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {legendItems.map(item => {
          const isOn  = visible[item.type] !== false
          const count = markers.filter(m => m.type === item.type).length
          return (
            <label key={item.type} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', opacity:isOn?1:0.45, transition:'opacity 0.15s' }}>
              <input type="checkbox" checked={isOn} onChange={() => onVisibilityChange(item.type, !isOn)}
                style={{ position:'absolute', opacity:0, width:0, height:0 }} />
              <div style={{ width:16, height:16, borderRadius:3, flexShrink:0, border:`1.5px solid ${isOn?item.color:'var(--color-border-secondary)'}`, background:isOn?item.color+'18':'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                {isOn && <i className="ti ti-check" style={{ fontSize:10, color:item.color }} aria-hidden="true" />}
              </div>
              <ShapePreview item={item} size={16} />
              <span style={{ fontSize:11, color:'var(--color-text-primary)', flex:1 }}>{item.label}</span>
              {count > 0 && (
                <span style={{ fontSize:10, color:'var(--color-text-secondary)', fontFamily:'var(--font-mono)', marginLeft:'auto' }}>{count}</span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}
