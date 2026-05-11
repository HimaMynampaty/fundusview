import { useState, useRef } from 'react'
import { generateSyntheticFundus } from '../utils/syntheticFundus'

/**
 * ImageGallery
 * Shows loaded image thumbnails. Supports:
 *   - Click thumbnail to switch active image
 *   - Hover thumbnail to reveal × remove button
 *   - "Demo" button to generate a synthetic fundus
 *   - "Upload" button / drag-and-drop to load real images
 */
export default function ImageGallery({ images, activeIdx, onSelect, onAdd, onRemove, accent }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const fileRef = useRef(null)

  const handleFiles = files => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = e => onAdd({ url: e.target.result, name: file.name.replace(/\.[^.]+$/, '') })
      reader.readAsDataURL(file)
    })
  }

  const handleDemo = () => {
    const url = generateSyntheticFundus(600)
    const n = images.filter(i => i.name.startsWith('Demo')).length
    onAdd({ url, name: `Demo ${n + 1}` })
  }

  return (
    <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{
          fontSize: 9, fontWeight: 500, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--color-text-secondary)',
          margin: 0, fontFamily: 'var(--font-mono)',
        }}>
          Images {images.length > 0 && `(${images.length})`}
        </p>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleDemo}
            style={{ fontSize: 10, color: accent, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-sans)' }}
          >
            <i className="ti ti-plus" style={{ fontSize: 12 }} aria-hidden="true" /> Demo
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            style={{ fontSize: 10, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-sans)' }}
          >
            <i className="ti ti-upload" style={{ fontSize: 12 }} aria-hidden="true" /> Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Thumbnail grid */}
      {images.length === 0 ? (
        <p style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0 }}>
          No images yet
        </p>
      ) : (
        <div
          style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        >
          {images.map((img, idx) => (
            <div
              key={img.id}
              onClick={() => onSelect(idx)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              title={img.name}
              style={{
                width: 48, height: 48, borderRadius: 5, overflow: 'hidden',
                cursor: 'pointer', flexShrink: 0, position: 'relative',
                border: `${activeIdx === idx ? 2 : 1}px solid ${activeIdx === idx ? accent : 'var(--color-border-tertiary)'}`,
                transition: 'border-color 0.12s',
              }}
            >
              <img
                src={img.url}
                alt={img.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              {/* Image name bar */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.65)', padding: '1px 3px',
              }}>
                <p style={{
                  fontSize: 7, color: '#fff', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {img.name}
                </p>
              </div>

              {/* Active indicator dot */}
              {activeIdx === idx && (
                <div style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 6, height: 6, borderRadius: '50%', background: accent,
                }} />
              )}

              {/* ── Remove button (shown on hover) ── */}
              {hoveredIdx === idx && (
                <button
                  onClick={e => { e.stopPropagation(); onRemove(idx) }}
                  title="Remove image"
                  style={{
                    position: 'absolute', top: 2, left: 2,
                    width: 16, height: 16, borderRadius: 3,
                    background: 'rgba(0,0,0,0.75)',
                    border: '0.5px solid rgba(255,255,255,0.3)',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
